"""One-off parameter sweep for HDBSCAN granularity, per docs/place-tags-design.md section 2C.

Embeddings are computed once and reused across the sweep; no LLM involved, so this
is cheap to re-run when the corpus grows. Run inside the container:

    docker exec -w /app resonance-topics-api python tune_clustering.py
"""
import statistics

import hdbscan

from clustering import embed_comments, label_clusters
from db import get_connection

SWEEP = [
    ("leaf", 3),
    ("leaf", 5),
    ("leaf", 8),
    ("eom", 3),
    ("eom", 5),
    ("eom", 8),
    ("eom", 12),
    ("eom", 15),
]


def main() -> None:
    with get_connection() as conn:
        comments = [r["comment"] for r in conn.execute("SELECT comment FROM comments")]

    print(f"embedding {len(comments)} comments once...")
    embeddings = embed_comments(comments)
    print()
    print(f"{'method':<6} {'min':<4} {'clusters':<9} {'clustered%':<11} {'median':<7} {'max':<6} {'<=5 comments'}")

    results = {}
    for method, min_size in SWEEP:
        labels = hdbscan.HDBSCAN(
            min_cluster_size=min_size, metric="euclidean", cluster_selection_method=method
        ).fit_predict(embeddings)

        sizes = [int((labels == c).sum()) for c in set(labels) if c != -1]
        if not sizes:
            print(f"{method:<6} {min_size:<4} {'0':<9} -")
            continue

        clustered = sum(sizes) * 100 // len(labels)
        tiny = sum(1 for s in sizes if s <= 5)
        print(
            f"{method:<6} {min_size:<4} {len(sizes):<9} {clustered:<11} "
            f"{statistics.median(sizes):<7.0f} {max(sizes):<6} {tiny}"
        )
        results[(method, min_size)] = (labels, comments)

    for key in [("eom", 5), ("eom", 8)]:
        if key not in results:
            continue
        labels, texts = results[key]
        keywords = label_clusters(texts, labels)
        print()
        print(f"--- {key[0]} min={key[1]}: top keywords for the 8 largest clusters ---")
        biggest = sorted(keywords, key=lambda c: -int((labels == c).sum()))[:8]
        for cluster_id in biggest:
            size = int((labels == cluster_id).sum())
            print(f"  n={size:<5} {', '.join(keywords[cluster_id])}")


if __name__ == "__main__":
    main()
