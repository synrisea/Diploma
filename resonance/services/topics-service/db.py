import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "topics.db"

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
        conn.commit()