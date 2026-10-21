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
        # A smart.db made before reminder times existed gets the new column added.
        columns = [row["name"] for row in conn.execute("PRAGMA table_info(subscriptions)")]
        if "reminder_time" not in columns:
            conn.execute("ALTER TABLE subscriptions ADD COLUMN reminder_time TEXT NOT NULL DEFAULT '09:00'")


def now():
    return datetime.now().isoformat(timespec="seconds")


# --- Settings -------------------------------------------------------------

def get_setting(key):
    with connect() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def set_setting(key, value):
    with connect() as conn:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )


def get_email():
    return get_setting("reminder_email")


def set_email(email):
    set_setting("reminder_email", email)


def get_time_zone():
    """e.g. 'Africa/Lagos'. None until the person picks one."""
    return get_setting("time_zone")


def set_time_zone(time_zone):
    set_setting("time_zone", time_zone)


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


def list_active_subscriptions():
    with connect() as conn:
        rows = conn.execute("SELECT * FROM subscriptions WHERE status = 'active' ORDER BY id").fetchall()
    return [dict(row) for row in rows]


def insert_subscription(fields):
    """fields: card_id, name, monthly_cost_cents, is_trial, deadline, reminder_time, source_type, source_value."""
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO subscriptions (card_id, name, monthly_cost_cents, is_trial, deadline, "
            "reminder_time, source_type, source_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (fields["card_id"], fields["name"], fields["monthly_cost_cents"], fields["is_trial"],
             fields["deadline"], fields["reminder_time"], fields["source_type"], fields["source_value"], now()),
        )
        sub_id = cursor.lastrowid
    return get_subscription(sub_id)


def mark_reminded(sub_id, days_before):
    """Remember which reminder was sent (2, 1 or 0 days before), so it's never sent twice."""
    with connect() as conn:
        conn.execute("UPDATE subscriptions SET last_reminded_days = ? WHERE id = ?", (days_before, sub_id))
