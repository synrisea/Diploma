import os

BADGE_MIN_LOCAL_COUNT = int(os.environ.get("BADGE_MIN_LOCAL_COUNT", "2"))
BADGE_MIN_LOCAL_RATIO = float(os.environ.get("BADGE_MIN_LOCAL_RATIO", "0.15"))
BADGE_MAX_PER_PLACE = int(os.environ.get("BADGE_MAX_PER_PLACE", "5"))


def qualifies_as_badge(local_count: int, clustered_total: int) -> bool:
    """Whether a topic is prominent enough at one place to show as a badge. The
    ratio is against that place's clustered comments, not all of them - most of the
    corpus is left unclustered as noise, so the full count is the wrong denominator."""
    if local_count < BADGE_MIN_LOCAL_COUNT:
        return False
    if clustered_total and local_count / clustered_total < BADGE_MIN_LOCAL_RATIO:
        return False
    return True
