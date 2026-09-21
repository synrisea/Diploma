import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from admin_auth import record_action, require_admin
from badge_rules import qualifies_as_badge
from db import get_connection
from models import ApproveTopicRequest, MergeTopicsRequest, RenameDimensionRequest
from pipeline import poll_and_maybe_recluster

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _topic_row(row) -> dict:
    return {
        "id": row["id"],
        "label": row["label"],
        "approvedLabel": row["approved_label"],
        "status": row["status"],
        "keywords": json.loads(row["keywords"]),
        "candidates": json.loads(row["candidates"]),
        "samples": json.loads(row["samples"]),
        "commentCount": row["comment_count"],
        "placeCount": len(json.loads(row["place_counts"])),
        "sentiment": row["sentiment"],
        "computedAt": row["computed_at"],
        "reviewedAt": row["reviewed_at"],
        "mergedInto": row["merged_into"],
    }


@router.get("/topics")
def list_topics_for_review(status: str | None = None, _: str = Depends(require_admin)):
    query = """SELECT id, label, approved_label, status, keywords, candidates, samples,
               comment_count, place_counts, sentiment, computed_at, reviewed_at, merged_into FROM topics"""
    params: tuple = ()
    if status:
        query += " WHERE status = ?"
        params = (status,)
    query += " ORDER BY comment_count DESC"

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_topic_row(r) for r in rows]


def _load_topic(conn, topic_id: int):
    row = conn.execute(
        """SELECT id, label, approved_label, status, keywords, candidates, samples,
           comment_count, place_counts, sentiment, computed_at, reviewed_at, merged_into
           FROM topics WHERE id = ?""",
        (topic_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Topic not found.")
    return row


@router.post("/topics/{topic_id}/approve")
def approve_topic(topic_id: int, body: ApproveTopicRequest, admin_id: str = Depends(require_admin)):
    label = body.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="Label is required.")

    with get_connection() as conn:
        row = _load_topic(conn, topic_id)
        if body.expectedComputedAt and body.expectedComputedAt != row["computed_at"]:
            raise HTTPException(status_code=409, detail="Topic changed since it was loaded.")
        before = {"status": row["status"], "approvedLabel": row["approved_label"]}
        conn.execute(
            "UPDATE topics SET status = 'approved', approved_label = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?",
            (label, datetime.now(timezone.utc).isoformat(), admin_id, topic_id),
        )
        conn.commit()

    record_action(admin_id, "approve", "topic", topic_id, before, {"status": "approved", "approvedLabel": label})
    return {"status": "approved", "label": label}


@router.post("/topics/{topic_id}/reject")
def reject_topic(topic_id: int, admin_id: str = Depends(require_admin)):
    with get_connection() as conn:
        row = _load_topic(conn, topic_id)
        before = {"status": row["status"], "approvedLabel": row["approved_label"]}
        conn.execute(
            "UPDATE topics SET status = 'rejected', reviewed_at = ?, reviewed_by = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), admin_id, topic_id),
        )
        conn.commit()

    record_action(admin_id, "reject", "topic", topic_id, before, {"status": "rejected"})
    return {"status": "rejected"}


@router.post("/topics/{topic_id}/reopen")
def reopen_topic(topic_id: int, admin_id: str = Depends(require_admin)):
    with get_connection() as conn:
        row = _load_topic(conn, topic_id)
        before = {"status": row["status"], "approvedLabel": row["approved_label"]}
        conn.execute(
            "UPDATE topics SET status = 'pending', reviewed_at = NULL, reviewed_by = NULL WHERE id = ?",
            (topic_id,),
        )
        conn.commit()

    record_action(admin_id, "reopen", "topic", topic_id, before, {"status": "pending"})
    return {"status": "pending"}


@router.post("/topics/merge")
def merge_topics(body: MergeTopicsRequest, admin_id: str = Depends(require_admin)):
    """Point one topic at another instead of folding their rows together. Counts stay
    on their own row and are combined when badges are read, so a retrain can recompute
    each cluster independently and the merge can be undone without losing anything."""
    if body.sourceId == body.targetId:
        raise HTTPException(status_code=400, detail="A topic cannot merge into itself.")

    with get_connection() as conn:
        source = _load_topic(conn, body.sourceId)
        target = _load_topic(conn, body.targetId)

        if target["merged_into"]:
            raise HTTPException(status_code=400, detail="That topic is already merged into another one.")
        if conn.execute("SELECT 1 FROM topics WHERE merged_into = ?", (body.sourceId,)).fetchone():
            raise HTTPException(status_code=400, detail="Other topics are merged into this one. Undo those first.")

        conn.execute("UPDATE topics SET merged_into = ? WHERE id = ?", (body.targetId, body.sourceId))
        conn.commit()

    record_action(
        admin_id, "merge", "topic", body.sourceId,
        {"mergedInto": source["merged_into"], "label": source["label"]},
        {"mergedInto": body.targetId, "targetLabel": target["approved_label"] or target["label"]},
    )
    return {"status": "merged", "targetId": body.targetId}


@router.post("/topics/{topic_id}/unmerge")
def unmerge_topic(topic_id: int, admin_id: str = Depends(require_admin)):
    with get_connection() as conn:
        row = _load_topic(conn, topic_id)
        if not row["merged_into"]:
            raise HTTPException(status_code=400, detail="That topic is not merged.")
        conn.execute("UPDATE topics SET merged_into = NULL WHERE id = ?", (topic_id,))
        conn.commit()

    record_action(admin_id, "unmerge", "topic", topic_id, {"mergedInto": row["merged_into"]}, {"mergedInto": None})
    return {"status": "unmerged"}


@router.get("/dimensions")
def list_dimensions_admin(_: str = Depends(require_admin)):
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT id, label, sentiment, comment_count, times_matched, last_seen_at, hidden
               FROM dimensions ORDER BY hidden, comment_count DESC"""
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/dimensions/{dimension_id}/rename")
def rename_dimension(dimension_id: int, body: RenameDimensionRequest, admin_id: str = Depends(require_admin)):
    label = body.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="Label is required.")

    with get_connection() as conn:
        row = conn.execute("SELECT label FROM dimensions WHERE id = ?", (dimension_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Dimension not found.")
        conn.execute("UPDATE dimensions SET label = ? WHERE id = ?", (label, dimension_id))
        conn.commit()

    record_action(admin_id, "rename", "dimension", dimension_id, {"label": row["label"]}, {"label": label})
    return {"status": "renamed", "label": label}


@router.post("/dimensions/{dimension_id}/hide")
def hide_dimension(dimension_id: int, admin_id: str = Depends(require_admin)):
    """Hidden rather than deleted, so it can be brought back and so a retrain that
    still matches this dimension does not resurrect it silently."""
    with get_connection() as conn:
        row = conn.execute("SELECT label, hidden FROM dimensions WHERE id = ?", (dimension_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Dimension not found.")
        conn.execute("UPDATE dimensions SET hidden = 1 WHERE id = ?", (dimension_id,))
        conn.commit()

    record_action(admin_id, "hide", "dimension", dimension_id, {"hidden": bool(row["hidden"])}, {"hidden": True})
    return {"status": "hidden"}


@router.post("/dimensions/{dimension_id}/restore")
def restore_dimension(dimension_id: int, admin_id: str = Depends(require_admin)):
    with get_connection() as conn:
        row = conn.execute("SELECT label, hidden FROM dimensions WHERE id = ?", (dimension_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Dimension not found.")
        conn.execute("UPDATE dimensions SET hidden = 0 WHERE id = ?", (dimension_id,))
        conn.commit()

    record_action(admin_id, "restore", "dimension", dimension_id, {"hidden": bool(row["hidden"])}, {"hidden": False})
    return {"status": "restored"}


@router.get("/pipeline")
def pipeline_status(_: str = Depends(require_admin)):
    with get_connection() as conn:
        cursor = conn.execute(
            "SELECT last_processed_at, comments_at_last_run FROM cursor WHERE id = 1"
        ).fetchone()
        total = conn.execute("SELECT COUNT(*) AS n FROM comments").fetchone()["n"]
        unclassified = conn.execute(
            "SELECT COUNT(*) AS n FROM comments WHERE sentiment IS NULL"
        ).fetchone()["n"]
        topics = conn.execute("SELECT COUNT(*) AS n FROM topics").fetchone()["n"]
        pending = conn.execute(
            "SELECT COUNT(*) AS n FROM topics WHERE status = 'pending'"
        ).fetchone()["n"]
        last_run = conn.execute("SELECT MAX(computed_at) AS t FROM topics").fetchone()["t"]

    return {
        "totalComments": total,
        "commentsAtLastRun": cursor["comments_at_last_run"],
        "commentsSinceLastRun": total - cursor["comments_at_last_run"],
        "unclassifiedSentiment": unclassified,
        "lastPolledAt": cursor["last_processed_at"],
        "lastReclusteredAt": last_run,
        "topicCount": topics,
        "pendingReview": pending,
    }


@router.post("/pipeline/retrain")
async def force_retrain(admin_id: str = Depends(require_admin)):
    with get_connection() as conn:
        conn.execute("UPDATE cursor SET comments_at_last_run = 0")
        conn.commit()

    record_action(admin_id, "force_retrain", "pipeline", "topics", None, None)
    await poll_and_maybe_recluster()
    return {"status": "retrained"}


@router.get("/overview")
def overview(_: str = Depends(require_admin)):
    with get_connection() as conn:
        total_comments = conn.execute("SELECT COUNT(*) AS n FROM comments").fetchone()["n"]
        places = conn.execute("SELECT COUNT(DISTINCT place_id) AS n FROM comments").fetchone()["n"]
        rows = conn.execute("SELECT status, place_counts FROM topics").fetchall()

    by_status: dict[str, int] = {}
    approved_counts: list[dict[str, int]] = []
    for row in rows:
        by_status[row["status"]] = by_status.get(row["status"], 0) + 1
        if row["status"] == "approved":
            approved_counts.append(json.loads(row["place_counts"]))

    clustered_totals: dict[str, int] = {}
    for counts in approved_counts:
        for place_id, count in counts.items():
            clustered_totals[place_id] = clustered_totals.get(place_id, 0) + count

    badged = {
        place_id
        for counts in approved_counts
        for place_id, count in counts.items()
        if qualifies_as_badge(count, clustered_totals[place_id])
    }

    return {
        "totalComments": total_comments,
        "placesWithComments": places,
        "topicsByStatus": by_status,
        "placesWithApprovedTopics": len(badged),
    }


@router.get("/audit")
def audit_log(limit: int = 50, _: str = Depends(require_admin)):
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT actor_user_id, action, target_type, target_id, before, after, created_at
               FROM admin_actions ORDER BY id DESC LIMIT ?""",
            (min(limit, 200),),
        ).fetchall()

    return [
        {
            "actorUserId": r["actor_user_id"],
            "action": r["action"],
            "targetType": r["target_type"],
            "targetId": r["target_id"],
            "before": json.loads(r["before"]) if r["before"] else None,
            "after": json.loads(r["after"]) if r["after"] else None,
            "createdAt": r["created_at"],
        }
        for r in rows
    ]
