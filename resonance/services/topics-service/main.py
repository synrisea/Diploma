import json
import os

from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import init_db, get_connection
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


@app.get("/api/topics/places/{place_id}")
def topics_for_place(place_id: str):
    with get_connection() as conn:
        rows = conn.execute("SELECT id, label, keywords, comment_count, place_ids, computed_at FROM topics").fetchall()
    return [
        {
            "id": r["id"],
            "label": r["label"],
            "keywords": json.loads(r["keywords"]),
            "commentCount": r["comment_count"],
            "computedAt": r["computed_at"],
     }
        for r in rows
        if place_id in json.loads(r["place_ids"])
    ]

@app.post("/api/topics/poll-now")
async def poll_now():
    await poll_and_maybe_recluster()
    return {"status": "polled"}