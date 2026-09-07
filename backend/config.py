import json
import os
import sqlite3
from datetime import datetime, timezone

# Config lives outside the app/install directory so it survives running the
# app as a portable ZIP from a different location each time.
CONFIG_DIR = os.path.expanduser("~/.celeste-downloader")
DB_PATH = os.path.join(CONFIG_DIR, "config.db")

DEFAULTS = {
    "download_path": os.path.expanduser("~/Downloads"),
    "theme": "dark",
    "auto_retries": True,
    "max_retries": 3,
    "metadata_cache_ttl": 30,
}


def _connect() -> sqlite3.Connection:
    os.makedirs(CONFIG_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS config ("
        "key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)"
    )
    return conn


def get_config() -> dict:
    conn = _connect()
    try:
        rows = conn.execute("SELECT key, value FROM config").fetchall()
    finally:
        conn.close()
    stored = {key: json.loads(value) for key, value in rows}
    return {**DEFAULTS, **stored}


def set_config(updates: dict) -> dict:
    conn = _connect()
    now = datetime.now(timezone.utc).isoformat()
    try:
        for key, value in updates.items():
            conn.execute(
                "INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value, "
                "updated_at = excluded.updated_at",
                (key, json.dumps(value), now),
            )
        conn.commit()
    finally:
        conn.close()
    return get_config()
