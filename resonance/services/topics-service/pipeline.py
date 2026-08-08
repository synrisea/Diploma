import asyncio
import json
import os
from collections import Counter
from datetime import datetime, timezone

import numpy as np

from db import get_connection
from feedback_client import fetch_comments_after, FETCH_LIMIT
from clustering import embed_comments, cluster_embeddings, label_clusters, sample_comments, cluster_centroids
from labeling import refine_label
from sentiment import classify_sentiments

RETRAIN_THRESHOLD = int(os.environ.get("FEEDBACK_RETRAIN_THRESHOLD", "100"))
DIMENSION_SIMILARITY_THRESHOLD = float(os.environ.get("DIMENSION_SIMILARITY_THRESHOLD", "0.85"))
DIMENSION_PROMOTION_MIN_COUNT = int(os.environ.get("DIMENSION_PROMOTION_MIN_COUNT", "20"))

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

def aggregate_sentiment(sentiments: list[str], threshold: float = 0.65) -> str:
    sentiments = [s for s in sentiments if s]
    if not sentiments:
        return "mixed"
    total = len(sentiments)
    if sentiments.count("positive") / total >= threshold:
        return "positive"
    if sentiments.count("negative") / total >= threshold:
        return "negative"
    return "mixed"

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

    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        existing = [
            {"id": r["id"], "centroid": np.array(json.loads(r["centroid"])), "times_matched": r["times_matched"]}
            for r in conn.execute("SELECT id, centroid, times_matched FROM dimensions").fetchall()
        ]

        conn.execute("DELETE FROM topics")
        for cluster_id, keywords in cluster_keywords.items():
            member_place_ids = sorted({pid for pid, lbl in zip(place_ids, labels) if lbl == cluster_id})
            member_count = sum(1 for lbl in labels if lbl == cluster_id)
            place_counts = Counter(pid for pid, lbl in zip(place_ids, labels) if lbl == cluster_id)
            member_sentiments = [s for s, lbl in zip(sentiments, labels) if lbl == cluster_id]
            sentiment = aggregate_sentiment(member_sentiments)

            refined = refine_label(keywords, cluster_samples.get(cluster_id, []))
            label = refined.title() if refined else (keywords[0].capitalize() if keywords else "Uncategorized")

            conn.execute(
                "INSERT INTO topics (label, keywords, comment_count, place_ids, computed_at) VALUES (?, ?, ?, ?, ?)",
                (label, json.dumps(keywords), member_count, json.dumps(member_place_ids), now),
            )

            centroid = centroids.get(cluster_id)
            if centroid is None:
                continue

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
