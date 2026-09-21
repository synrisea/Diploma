import numpy as np

from clustering import embed_comments
from db import get_connection

MAX_PROFILE_TOPICS = 6

_cache: dict[str, tuple[str, np.ndarray]] = {}


def _topic_labels_by_place() -> dict[str, list[str]]:
    """Every topic a place appears in, strongest first. Deliberately not filtered by
    the badge thresholds - retrieval wants all available signal, not just what is
    prominent enough to display."""
    import json

    by_place: dict[str, list[tuple[str, int]]] = {}
    with get_connection() as conn:
        rows = conn.execute("SELECT label, place_counts FROM topics").fetchall()

    for row in rows:
        for place_id, count in json.loads(row["place_counts"]).items():
            by_place.setdefault(place_id, []).append((row["label"], count))

    return {
        place_id: [label for label, _ in sorted(labels, key=lambda x: -x[1])[:MAX_PROFILE_TOPICS]]
        for place_id, labels in by_place.items()
    }


def _profile_text(candidate: dict, labels: list[str]) -> str:
    parts = [candidate["name"], candidate.get("categoryName") or "place"]
    parts.extend(labels)
    return ". ".join(parts)


def profile_matrix(candidates: list[dict]) -> tuple[list[str], np.ndarray]:
    """Embedding per candidate place, built from its name, category and discovered
    topics. Cached across requests and recomputed only when a retrain changes the
    topics a place belongs to."""
    labels_by_place = _topic_labels_by_place()

    texts = {c["id"]: _profile_text(c, labels_by_place.get(c["id"], [])) for c in candidates}
    stale = [pid for pid, text in texts.items() if _cache.get(pid, (None, None))[0] != text]

    if stale:
        fresh = embed_comments([texts[pid] for pid in stale])
        for pid, embedding in zip(stale, fresh):
            _cache[pid] = (texts[pid], embedding)

    place_ids = [c["id"] for c in candidates]
    return place_ids, np.vstack([_cache[pid][1] for pid in place_ids])


def retrieve(query: str, place_ids: list[str], matrix: np.ndarray, top_k: int) -> list[tuple[str, float]]:
    """Cosine-rank places against a query. Embeddings are normalized, so a dot
    product is the cosine."""
    if not query.strip() or not place_ids:
        return []

    query_embedding = embed_comments([query])[0]
    scores = matrix @ query_embedding
    order = np.argsort(-scores)[:top_k]
    return [(place_ids[i], float(scores[i])) for i in order]
