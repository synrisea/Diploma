import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.environ.get("TOPICS_DB_PATH", str(Path(__file__).parent / "topics.db")))

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY,
                place_id TEXT NOT NULL,
                comment TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        existing_columns = {row["name"] for row in conn.execute("PRAGMA table_info(comments)")}
        if "sentiment" not in existing_columns:
            conn.execute("ALTER TABLE comments ADD COLUMN sentiment TEXT")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cursor (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_processed_at TEXT,
                comments_at_last_run INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.execute("INSERT OR IGNORE INTO cursor (id, last_processed_at, comments_at_last_run) VALUES (1, NULL, 0)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT NOT NULL,
                keywords TEXT NOT NULL,
                comment_count INTEGER NOT NULL,
                place_ids TEXT NOT NULL,
                computed_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS dimensions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT NOT NULL,
                keywords TEXT NOT NULL,
                sentiment TEXT NOT NULL DEFAULT 'mixed',
                centroid TEXT NOT NULL,
                comment_count INTEGER NOT NULL,
                place_counts TEXT NOT NULL,
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                times_matched INTEGER NOT NULL DEFAULT 1
            )
        """)
        conn.commit()