import json
import os
from datetime import datetime, timezone

import jwt
from fastapi import Header, HTTPException

from db import get_connection

JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_ISSUER = os.environ.get("JWT_ISSUER", "Resonance.Identity")
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", "Resonance")
ADMIN_USER_IDS = {
    uid.strip() for uid in os.environ.get("ADMIN_USER_IDS", "").split(",") if uid.strip()
}


def require_admin(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency gating admin routes. Verifies the same HS256 token the
    .NET services issue, then checks the subject against an allowlist. Deliberately
    server-side on every route - hiding the nav entry is presentation, not access
    control."""
    if not JWT_SECRET:
        raise HTTPException(status_code=503, detail="Admin API is not configured.")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    try:
        claims = jwt.decode(
            authorization.split(" ", 1)[1],
            JWT_SECRET,
            algorithms=["HS256"],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token.")

    user_id = str(claims.get("sub", ""))
    if not user_id or user_id not in ADMIN_USER_IDS:
        raise HTTPException(status_code=403, detail="Not an administrator.")

    return user_id


def record_action(actor_user_id: str, action: str, target_type: str, target_id: str,
                  before: dict | None = None, after: dict | None = None) -> None:
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO admin_actions
               (actor_user_id, action, target_type, target_id, before, after, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                actor_user_id, action, target_type, str(target_id),
                json.dumps(before) if before is not None else None,
                json.dumps(after) if after is not None else None,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
