import os

import httpx
from dotenv import load_dotenv

load_dotenv()

FEEDBACK_API_BASE = os.environ.get("FEEDBACK_API_BASE_URL", "")
FETCH_LIMIT = int(os.environ.get("FEEDBACK_FETCH_LIMIT", ""))


async def fetch_comments_after(after: str | None) -> list[dict]:
    params: dict = {"limit": FETCH_LIMIT}
    if after:
        params["after"] = after

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{FEEDBACK_API_BASE}/api/feedback/comments", params=params)
        response.raise_for_status()
        return response.json()
