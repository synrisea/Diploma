import json
import os

from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import init_db, get_connection
from itinerary import plan_itinerary
from models import PlanItineraryRequest
from pipeline import poll_and_maybe_recluster

load_dotenv()

CORS_ORIGINS = os.environ.get("FRONTEND_CORS_ORIGINS", "http://localhost:5173").split(",")

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler.add_job(poll_and_maybe_recluster, "interval", minutes=5)
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="Resonance Topics Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/topics")
def list_topics():
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, label, keywords, comment_count, place_ids, computed_at FROM topics ORDER BY comment_count DESC"
        ).fetchall()

    return [
        {
            "id" : r["id"],
            "label" : r["label"],
            "keywords": json.loads(r["keywords"]),
            "commentCount": r["comment_count"],
            "placeIds": json.loads(r["place_ids"]),
            "computedAt": r["computed_at"],
        } for r in rows
    ] 


BADGE_MIN_LOCAL_COUNT = int(os.environ.get("BADGE_MIN_LOCAL_COUNT", "2"))
BADGE_MIN_LOCAL_RATIO = float(os.environ.get("BADGE_MIN_LOCAL_RATIO", "0.15"))
BADGE_MAX_PER_PLACE = int(os.environ.get("BADGE_MAX_PER_PLACE", "5"))


@app.get("/api/topics/places/{place_id}")
def topics_for_place(place_id: str):
    """A topic is a badge for this place only if enough of this place's own comments
    sit in it. The ratio is against the place's *clustered* comments, not all of them:
    HDBSCAN leaves ~85% of comments as noise, so dividing by the full count made even
    the most-reviewed places fall under the threshold and show nothing."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, label, keywords, comment_count, place_counts, sentiment, computed_at FROM topics"
        ).fetchall()

    local_counts = {r["id"]: json.loads(r["place_counts"]).get(place_id, 0) for r in rows}
    clustered_total = sum(local_counts.values())

    relevant = []
    for r in rows:
        local_count = local_counts[r["id"]]
        if local_count < BADGE_MIN_LOCAL_COUNT:
            continue
        if clustered_total and local_count / clustered_total < BADGE_MIN_LOCAL_RATIO:
            continue
        relevant.append({
            "id": r["id"],
            "label": r["label"],
            "keywords": json.loads(r["keywords"]),
            "commentCount": r["comment_count"],
            "localCommentCount": local_count,
            "sentiment": r["sentiment"],
            "computedAt": r["computed_at"],
        })

    relevant.sort(key=lambda t: t["localCommentCount"], reverse=True)
    return relevant[:BADGE_MAX_PER_PLACE]

@app.post("/api/topics/poll-now")
async def poll_now():
    await poll_and_maybe_recluster()
    return {"status": "polled"}

@app.get("/api/dimensions")
def list_dimensions():
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, label, keywords, sentiment, comment_count, place_counts, first_seen_at, last_seen_at, times_matched FROM dimensions ORDER BY comment_count DESC"
        ).fetchall()

    return [
        {
            "id": r["id"],
            "label": r["label"],
            "keywords": json.loads(r["keywords"]),
            "sentiment": r["sentiment"],
            "commentCount": r["comment_count"],
            "placeCounts": json.loads(r["place_counts"]),
            "firstSeenAt": r["first_seen_at"],
            "lastSeenAt": r["last_seen_at"],
            "timesMatched": r["times_matched"],
        }
        for r in rows
    ]

NEGATIVE_SCORE_WEIGHT = 2.0

@app.get("/api/sentiment/places")
def sentiment_by_place():
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT place_id,
                   SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) AS positive_count,
                   SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negative_count,
                   COUNT(*) AS total_count
            FROM comments
            WHERE sentiment IS NOT NULL
            GROUP BY place_id
        """).fetchall()

    return [
        {
            "placeId": r["place_id"],
            "positiveCount": r["positive_count"],
            "negativeCount": r["negative_count"],
            "totalCount": r["total_count"],
            "score": max(-1.0, min(1.0, (
                r["positive_count"] - NEGATIVE_SCORE_WEIGHT * r["negative_count"]
            ) / r["total_count"])),
        }
        for r in rows
    ]

@app.post("/api/itinerary/plan")
def plan_itinerary_endpoint(body: PlanItineraryRequest):
    matched_ids = plan_itinerary(body.wish, [c.model_dump() for c in body.candidatePlaces])
    return {"placeIds": matched_ids}