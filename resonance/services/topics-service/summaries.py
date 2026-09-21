import json
from datetime import datetime, timezone
from pathlib import Path

from db import get_connection
from llm import llm

PROMPT = (Path(__file__).parent / "prompts" / "summarise_place.md").read_text()

MIN_COMMENTS = 4
MAX_COMMENTS = 12
MAX_COMMENT_CHARS = 400


def _generate(place_name: str, comments: list[str]) -> str | None:
    rendered = "\n".join(f"- {c[:MAX_COMMENT_CHARS]}" for c in comments)
    prompt = PROMPT.replace("{place}", place_name).replace("{comments}", rendered)

    try:
        result = llm.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.3,
        )
        text = result["choices"][0]["message"]["content"].strip().strip('"')
    except Exception as exc:
        print(f"summarise: LLM call failed: {exc!r}")
        return None

    return text or None


def summarise_place(place_id: str, place_name: str) -> dict | None:
    """Cached per place, keyed by how many comments existed when it was written, so a
    place only costs an LLM call again once new comments actually arrive."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT comment FROM comments WHERE place_id = ? ORDER BY created_at DESC", (place_id,)
        ).fetchall()
        cached = conn.execute(
            "SELECT summary, comment_count, computed_at FROM place_summaries WHERE place_id = ?", (place_id,)
        ).fetchone()

    comments = [r["comment"] for r in rows]
    if len(comments) < MIN_COMMENTS:
        return None

    if cached and cached["comment_count"] == len(comments):
        return {"summary": cached["summary"], "commentCount": cached["comment_count"], "computedAt": cached["computed_at"]}

    summary = _generate(place_name, comments[:MAX_COMMENTS])
    if not summary:
        return None

    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO place_summaries (place_id, summary, comment_count, computed_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(place_id) DO UPDATE SET summary = excluded.summary,
                   comment_count = excluded.comment_count, computed_at = excluded.computed_at""",
            (place_id, summary, len(comments), now),
        )
        conn.commit()

    return {"summary": summary, "commentCount": len(comments), "computedAt": now}
