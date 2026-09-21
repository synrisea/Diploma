import asyncio
import json
import os
from collections import Counter
from datetime import datetime, timezone

import numpy as np

from db import get_connection
from feedback_client import fetch_comments_after, FETCH_LIMIT
from clustering import (
    embed_comments,
    cluster_embeddings,
    label_clusters,
    sample_comments,
    cluster_centroids,
    is_contentless,
    first_meaningful_keyword,
)
from labeling import generate_label_candidates
from sentiment import classify_sentiments

RETRAIN_THRESHOLD = int(os.environ.get("FEEDBACK_RETRAIN_THRESHOLD", "100"))
DIMENSION_SIMILARITY_THRESHOLD = float(os.environ.get("DIMENSION_SIMILARITY_THRESHOLD", "0.85"))
DIMENSION_PROMOTION_MIN_COUNT = int(os.environ.get("DIMENSION_PROMOTION_MIN_COUNT", "10"))
TOPIC_MERGE_THRESHOLD = float(os.environ.get("TOPIC_MERGE_THRESHOLD", "0.82"))
LABEL_DUPLICATE_THRESHOLD = float(os.environ.get("LABEL_DUPLICATE_THRESHOLD", "0.9"))
LABEL_KEYWORD_THRESHOLD = float(os.environ.get("LABEL_KEYWORD_THRESHOLD", "0.4"))

_poll_lock = asyncio.Lock()

async def poll_and_maybe_recluster() -> None:
    if _poll_lock.locked():
        return
    async with _poll_lock:
        await _poll_and_maybe_recluster()

async def _poll_and_maybe_recluster() -> None:
    while True:
        with get_connection() as conn:
            after = conn.execute("SELECT last_processed_at FROM cursor WHERE id = 1").fetchone()["last_processed_at"]

        new_comments = await fetch_comments_after(after)
        if not new_comments:
            break

        with get_connection() as conn:
            for c in new_comments:
                conn.execute(
                    "INSERT OR IGNORE INTO comments (id, place_id, comment, created_at) VALUES (?,?,?,?)",
                    (c["id"], c["placeId"], c["comment"], c["createdAt"])
                )
            latest = max(c["createdAt"] for c in new_comments)
            conn.execute("UPDATE cursor SET last_processed_at = ? WHERE id = 1", (latest,))
            conn.commit()

        if len(new_comments) < FETCH_LIMIT:
            break

    classify_pending_sentiment()

    with get_connection() as conn:
        total_count = conn.execute("SELECT COUNT(*) AS n FROM comments").fetchone()["n"]
        comments_at_last_run = conn.execute(
            "SELECT comments_at_last_run FROM cursor WHERE id = 1"
        ).fetchone()["comments_at_last_run"]

    if total_count - comments_at_last_run >= RETRAIN_THRESHOLD:
        await recluster(total_count)

def classify_pending_sentiment(batch_size: int = 200) -> None:
    with get_connection() as conn:
        rows = conn.execute("SELECT id, comment FROM comments WHERE sentiment IS NULL").fetchall()

    if not rows:
        return

    ids = [r["id"] for r in rows]
    texts = [r["comment"] for r in rows]

    for start in range(0, len(texts), batch_size):
        batch_ids = ids[start:start + batch_size]
        sentiments = classify_sentiments(texts[start:start + batch_size])

        with get_connection() as conn:
            conn.executemany("UPDATE comments SET sentiment = ? WHERE id = ?", list(zip(sentiments, batch_ids)))
            conn.commit()

def aggregate_sentiment(sentiments: list[str], threshold: float = 0.65, negative_weight: float = 2.0) -> str:
    """People write far more positive reviews than negative ones, so a real
    problem can easily stay a minority of comments while still being genuine
    and worth surfacing. Negative comments count double toward the threshold
    - checked first, so a cluster with real negative signal doesn't get
    labeled positive just because happy reviewers were more numerous."""
    sentiments = [s for s in sentiments if s]
    if not sentiments:
        return "mixed"
    total = len(sentiments)
    weighted_negative_ratio = min(sentiments.count("negative") * negative_weight / total, 1.0)
    if weighted_negative_ratio >= threshold:
        return "negative"
    if sentiments.count("positive") / total >= threshold:
        return "positive"
    return "mixed"

def merge_similar_clusters(clusters: list[dict]) -> list[dict]:
    """Fold near-identical clusters together by centroid cosine before labeling, so
    they cost one LLM call instead of several and can't land on the same place as
    separate badges."""
    merged: list[dict] = []

    for cluster in sorted(clusters, key=lambda c: c["member_count"], reverse=True):
        target = None
        for candidate in merged:
            if float(np.dot(cluster["centroid"], candidate["centroid"])) >= TOPIC_MERGE_THRESHOLD:
                target = candidate
                break

        if target is None:
            merged.append(cluster)
            continue

        combined_weight = target["member_count"] + cluster["member_count"]
        centroid = (
            target["centroid"] * target["member_count"] + cluster["centroid"] * cluster["member_count"]
        ) / combined_weight
        target["centroid"] = centroid / np.linalg.norm(centroid)
        target["member_count"] = combined_weight
        target["place_counts"].update(cluster["place_counts"])
        target["sentiments"].extend(cluster["sentiments"])
        target["keywords"] = list(dict.fromkeys(target["keywords"] + cluster["keywords"]))

    return merged


def pick_label(
    candidates: list[str],
    centroid: np.ndarray,
    keywords: list[str],
    assigned_embeddings: list[np.ndarray],
) -> str | None:
    """Pick the candidate closest to the cluster's own centroid, skipping any that
    duplicate a label already assigned to another cluster or that describe something
    the cluster's keywords don't mention - the model otherwise invents plausible
    labels unrelated to the comments ("Noisy Restaurant" for rude-waiter complaints)."""
    if not candidates:
        return None

    embeddings = embed_comments(candidates)
    keyword_embeddings = embed_comments(keywords) if keywords else []
    best_label, best_similarity = None, -1.0

    for candidate, embedding in zip(candidates, embeddings):
        if any(float(np.dot(embedding, other)) >= LABEL_DUPLICATE_THRESHOLD for other in assigned_embeddings):
            continue
        if len(keyword_embeddings) and max(float(np.dot(embedding, k)) for k in keyword_embeddings) < LABEL_KEYWORD_THRESHOLD:
            continue
        similarity = float(np.dot(embedding, centroid))
        if similarity > best_similarity:
            best_label, best_similarity = candidate, similarity

    return best_label


async def recluster(total_count: int) -> None:
    with get_connection() as conn:
        rows = conn.execute("SELECT place_id, comment, sentiment FROM comments").fetchall()

    comments = [r["comment"] for r in rows]
    place_ids = [r["place_id"] for r in rows]
    sentiments = [r["sentiment"] for r in rows]

    embeddings = embed_comments(comments)
    labels = cluster_embeddings(embeddings)

    cluster_keywords = label_clusters(comments, labels)
    cluster_samples = sample_comments(comments, embeddings, labels)
    centroids = cluster_centroids(embeddings, labels)

    clusters = []
    for cluster_id, keywords in cluster_keywords.items():
        centroid = centroids.get(cluster_id)
        if centroid is None or is_contentless(keywords):
            continue
        clusters.append({
            "keywords": keywords,
            "samples": cluster_samples.get(cluster_id, []),
            "centroid": centroid,
            "member_count": sum(1 for lbl in labels if lbl == cluster_id),
            "place_counts": Counter(pid for pid, lbl in zip(place_ids, labels) if lbl == cluster_id),
            "sentiments": [s for s, lbl in zip(sentiments, labels) if lbl == cluster_id],
        })

    clusters = merge_similar_clusters(clusters)

    now = datetime.now(timezone.utc).isoformat()
    assigned_label_embeddings: list[np.ndarray] = []

    with get_connection() as conn:
        existing = [
            {"id": r["id"], "centroid": np.array(json.loads(r["centroid"])), "times_matched": r["times_matched"]}
            for r in conn.execute("SELECT id, centroid, times_matched FROM dimensions").fetchall()
        ]

        conn.execute("DELETE FROM topics")
        for cluster in clusters:
            keywords = cluster["keywords"]
            centroid = cluster["centroid"]
            member_count = cluster["member_count"]
            place_counts = cluster["place_counts"]
            sentiment = aggregate_sentiment(cluster["sentiments"])

            candidates = generate_label_candidates(keywords, cluster["samples"])
            chosen = pick_label(candidates, centroid, keywords, assigned_label_embeddings)
            fallback = first_meaningful_keyword(keywords)
            if not chosen and not fallback:
                continue
            label = chosen.title() if chosen else fallback.capitalize()
            assigned_label_embeddings.append(embed_comments([label])[0])

            conn.execute(
                """INSERT INTO topics (label, keywords, comment_count, place_ids, place_counts, sentiment, computed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (label, json.dumps(keywords), member_count, json.dumps(sorted(place_counts)),
                 json.dumps(place_counts), sentiment, now),
            )

            best_match, best_similarity = None, -1.0
            for dim in existing:
                similarity = float(np.dot(centroid, dim["centroid"]))
                if similarity > best_similarity:
                    best_match, best_similarity = dim, similarity

            if best_match is not None and best_similarity >= DIMENSION_SIMILARITY_THRESHOLD:
                conn.execute(
                    """UPDATE dimensions SET label = ?, keywords = ?, sentiment = ?, centroid = ?,
                       comment_count = ?, place_counts = ?, last_seen_at = ?, times_matched = ?
                       WHERE id = ?""",
                    (label, json.dumps(keywords), sentiment, json.dumps(centroid.tolist()),
                     member_count, json.dumps(place_counts), now, best_match["times_matched"] + 1, best_match["id"]),
                )
            elif member_count >= DIMENSION_PROMOTION_MIN_COUNT:
                conn.execute(
                    """INSERT INTO dimensions
                       (label, keywords, sentiment, centroid, comment_count, place_counts, first_seen_at, last_seen_at, times_matched)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)""",
                    (label, json.dumps(keywords), sentiment, json.dumps(centroid.tolist()),
                     member_count, json.dumps(place_counts), now, now),
                )

        conn.execute("UPDATE cursor SET comments_at_last_run = ?", (total_count,))
        conn.commit()
