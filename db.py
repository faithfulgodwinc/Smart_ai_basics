"""The only file that talks to the database (smart.db).

Every function opens the file, does one small job, and closes it again.
"""

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
DB_PATH = Path(os.getenv("SMART_DB", HERE / "smart.db"))  # SMART_DB lets tests use a separate file
SCHEMA_PATH = HERE / "schema.sql"


@contextmanager
def connect():
    """Open smart.db, save the changes if everything worked, and always close it."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # rows behave like dictionaries: row["name"]
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create the tables from schema.sql if they don't exist yet."""
    with connect() as conn:
        conn.executescript(SCHEMA_PATH.read_text())


def now():
    return datetime.now().isoformat(timespec="seconds")


# --- Settings -------------------------------------------------------------

def get_email():
    with connect() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = 'reminder_email'").fetchone()
    return row["value"] if row else None


def set_email(email):
    with connect() as conn:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('reminder_email', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (email,),
        )


# --- Cards ----------------------------------------------------------------

def list_cards():
    with connect() as conn:
        rows = conn.execute("SELECT * FROM cards ORDER BY id").fetchall()
    return [dict(row) for row in rows]


def get_card(card_id):
    with connect() as conn:
        row = conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchone()
    return dict(row) if row else None


def insert_card(nickname, bank, name_on_card):
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO cards (nickname, bank, name_on_card, created_at) VALUES (?, ?, ?, ?)",
            (nickname, bank, name_on_card, now()),
        )
        card_id = cursor.lastrowid
    return get_card(card_id)


# --- Subscriptions --------------------------------------------------------

def list_subscriptions():
    with connect() as conn:
        rows = conn.execute("SELECT * FROM subscriptions ORDER BY id").fetchall()
    return [dict(row) for row in rows]


def get_subscription(sub_id):
    with connect() as conn:
        row = conn.execute("SELECT * FROM subscriptions WHERE id = ?", (sub_id,)).fetchone()
    return dict(row) if row else None


def insert_subscription(fields):
    """fields: card_id, name, monthly_cost_cents, is_trial, deadline, source_type, source_value."""
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO subscriptions (card_id, name, monthly_cost_cents, is_trial, deadline, "
            "source_type, source_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (fields["card_id"], fields["name"], fields["monthly_cost_cents"], fields["is_trial"],
             fields["deadline"], fields["source_type"], fields["source_value"], now()),
        )
        sub_id = cursor.lastrowid
    return get_subscription(sub_id)
