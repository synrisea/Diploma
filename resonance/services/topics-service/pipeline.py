import json
import os
from datetime import datetime, timezone
from db import get_connection
from feedback_client import fetch_comments_after, FETCH_LIMIT
from clustering import embed_comments, cluster_embeddings, label_clusters, sample_comments
from labeling import refine_label

RETRAIN_THRESHOLD = int(os.environ.get("FEEDBACK_RETRAIN_THRESHOLD", "100"))

async def poll_and_maybe_recluster() -> None:
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
    
    with get_connection() as conn:
        total_count = conn.execute("SELECT COUNT(*) AS n FROM comments").fetchone()["n"]
        comments_at_last_run = conn.execute(
            "SELECT comments_at_last_run FROM cursor WHERE id = 1"
        ).fetchone()["comments_at_last_run"]

    if total_count - comments_at_last_run >= RETRAIN_THRESHOLD:
        await recluster(total_count)

async def recluster(total_count: int) -> None:
    with get_connection() as conn:
        rows = conn.execute("SELECT place_id, comment FROM comments").fetchall()

    comments = [r["comment"] for r in rows]
    place_ids = [r["place_id"] for r in rows]

    embeddings = embed_comments(comments)
    labels = cluster_embeddings(embeddings)

    cluster_keywords = label_clusters(comments, labels)
    cluster_samples = sample_comments(comments, embeddings, labels)

    with get_connection() as conn:
        conn.execute("DELETE FROM topics")
        for cluster_id, keywords in cluster_keywords.items():
            member_place_ids = sorted({pid for pid, lbl in zip(place_ids, labels) if lbl == cluster_id})
            member_count = sum(1 for lbl in labels if lbl == cluster_id)
            refined = refine_label(keywords, cluster_samples.get(cluster_id, []))
            label = refined.title() if refined else (keywords[0].capitalize() if keywords else "Uncategorized")

            conn.execute(
                "INSERT INTO topics (label, keywords, comment_count, place_ids, computed_at) VALUES (?, ?, ?, ?, ?)",
                (
                    label,
                    json.dumps(keywords),
                    member_count,
                    json.dumps(member_place_ids),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )

        conn.execute("UPDATE cursor SET comments_at_last_run = ?", (total_count,))
        conn.commit()

        

