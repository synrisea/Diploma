"""Tag-quality metrics, per docs/place-tags-design.md section 3.

Measures the real read path (the HTTP endpoint), not a reimplementation of it,
so before/after numbers stay comparable across pipeline changes.

Run inside the container:  docker exec resonance-topics-api python eval_tags.py
"""
import json
import statistics
import urllib.request

from db import get_connection

API = "http://localhost:8001"
SAMPLE_SIZE = 20


def get_json(path: str):
    with urllib.request.urlopen(f"{API}{path}", timeout=30) as response:
        return json.loads(response.read())


def sample_places(place_comment_counts: dict[str, int]) -> list[str]:
    """Spread the sample across the comment-count range rather than taking the
    top N, so thin places (where badge noise is worst) stay represented."""
    ranked = sorted(place_comment_counts, key=lambda p: place_comment_counts[p])
    if len(ranked) <= SAMPLE_SIZE:
        return ranked
    step = len(ranked) / SAMPLE_SIZE
    return [ranked[int(i * step)] for i in range(SAMPLE_SIZE)]


def main() -> None:
    with get_connection() as conn:
        place_comment_counts = {
            r["place_id"]: r["n"]
            for r in conn.execute("SELECT place_id, COUNT(*) AS n FROM comments GROUP BY place_id")
        }
        total_comments = conn.execute("SELECT COUNT(*) AS n FROM comments").fetchone()["n"]
        cluster_sizes = [r["comment_count"] for r in conn.execute("SELECT comment_count FROM topics")]
        labels = [r["label"] for r in conn.execute("SELECT label FROM topics")]

    print(f"corpus: {total_comments} comments across {len(place_comment_counts)} places")
    print()

    print("CLUSTERING")
    print(f"  clusters              {len(cluster_sizes)}")
    print(f"  distinct labels       {len(set(labels))}")
    print(f"  duplicate labels      {len(labels) - len(set(labels))}")
    if cluster_sizes:
        print(f"  size median / max     {statistics.median(cluster_sizes):.0f} / {max(cluster_sizes)}")
        tiny = sum(1 for s in cluster_sizes if s <= 5)
        print(f"  clusters <=5 comments {tiny} ({tiny * 100 // len(cluster_sizes)}%)")
    print()

    sampled = sample_places(place_comment_counts)
    badge_counts = []
    thin_badges = 0
    total_badges = 0
    has_local_count = False

    for place_id in sampled:
        badges = get_json(f"/api/topics/places/{place_id}")
        badge_counts.append(len(badges))
        for badge in badges:
            total_badges += 1
            local = badge.get("localCommentCount")
            if local is not None:
                has_local_count = True
                if local < 2:
                    thin_badges += 1

    print(f"BADGES (sample of {len(sampled)} places spanning the comment-count range)")
    print(f"  badges per place median / max  {statistics.median(badge_counts):.0f} / {max(badge_counts)}")
    print(f"  total badges across sample     {total_badges}")
    if has_local_count:
        backed = total_badges - thin_badges
        print(f"  backed by >=2 local comments   {backed}/{total_badges} ({backed * 100 // max(total_badges, 1)}%)")
    else:
        print("  backed by >=2 local comments   UNKNOWN - endpoint does not return localCommentCount")
    print()

    worst = max(sampled, key=lambda p: len(get_json(f"/api/topics/places/{p}")))
    badges = get_json(f"/api/topics/places/{worst}")
    print(f"WORST PLACE IN SAMPLE: {worst[:8]} - {len(badges)} badges from {place_comment_counts[worst]} comments")
    for badge in badges:
        local = badge.get("localCommentCount")
        shown = f"local={local}" if local is not None else f"global={badge['commentCount']}"
        sentiment = badge.get("sentiment", "-")
        print(f"    {badge['label']:<28} {shown:<14} {sentiment}")


if __name__ == "__main__":
    main()
