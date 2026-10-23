"""The only file that talks to the database (smart.db).

Every function opens the file, does one small job, and closes it again.

Everything belongs to a *space*. On your own laptop there is one, 'local'. In demo mode
every visitor gets their own, so nobody sees anyone else's cards. The server says which
space a request is for with `set_space`, and every query below only ever sees that space.
"""

import os
import sqlite3
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
DB_PATH = Path(os.getenv("SMART_DB", HERE / "smart.db"))  # SMART_DB lets tests use a separate file
SCHEMA_PATH = HERE / "schema.sql"

LOCAL = "local"
_space = ContextVar("space", default=LOCAL)


def set_space(space_id):
    """From now on (in this request or thread), read and write only this space."""
    _space.set(space_id)


def current_space():
    return _space.get()


@contextmanager
def in_space(space_id):
    """Temporarily work in another space (used by the reminder watcher)."""
    token = _space.set(space_id)
    try:
        yield
    finally:
        _space.reset(token)


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
    """Create the tables from schema.sql, and bring an older smart.db up to date."""
    with connect() as conn:
        conn.executescript(SCHEMA_PATH.read_text())

        def columns(table):
            return [row["name"] for row in conn.execute(f"PRAGMA table_info({table})")]

        # Older smart.db files: add the columns that came later. Existing rows join the 'local' space.
        if "reminder_time" not in columns("subscriptions"):
            conn.execute("ALTER TABLE subscriptions ADD COLUMN reminder_time TEXT NOT NULL DEFAULT '09:00'")
        for table in ("cards", "subscriptions"):
            if "space_id" not in columns(table):
                conn.execute(f"ALTER TABLE {table} ADD COLUMN space_id TEXT NOT NULL DEFAULT '{LOCAL}'")

        # The old one-person settings table moves into the 'local' space.
        if conn.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'settings'").fetchone():
            conn.execute(
                "INSERT OR IGNORE INTO space_settings (space_id, key, value) "
                "SELECT ?, key, value FROM settings", (LOCAL,))
            conn.execute("DROP TABLE settings")

        conn.execute("INSERT OR IGNORE INTO spaces (id, is_demo, created_at) VALUES (?, 0, ?)", (LOCAL, now()))
        conn.execute("CREATE INDEX IF NOT EXISTS cards_by_space ON cards (space_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS subscriptions_by_space ON subscriptions (space_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS inbox_by_space ON inbox (space_id)")


def now():
    # With the server's UTC offset (e.g. "+00:00"), so a browser in another time zone reads the right moment.
    return datetime.now().astimezone().isoformat(timespec="seconds")


# --- Spaces ---------------------------------------------------------------

def space_exists(space_id):
    with connect() as conn:
        return conn.execute("SELECT 1 FROM spaces WHERE id = ?", (space_id,)).fetchone() is not None


def create_space(space_id, is_demo):
    with connect() as conn:
        conn.execute("INSERT INTO spaces (id, is_demo, created_at) VALUES (?, ?, ?)",
                     (space_id, 1 if is_demo else 0, now()))


# --- Settings -------------------------------------------------------------

def get_setting(key):
    with connect() as conn:
        row = conn.execute("SELECT value FROM space_settings WHERE space_id = ? AND key = ?",
                           (current_space(), key)).fetchone()
    return row["value"] if row else None


def set_setting(key, value):
    with connect() as conn:
        conn.execute(
            "INSERT INTO space_settings (space_id, key, value) VALUES (?, ?, ?) "
            "ON CONFLICT(space_id, key) DO UPDATE SET value = excluded.value",
            (current_space(), key, value),
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
        rows = conn.execute("SELECT * FROM cards WHERE space_id = ? ORDER BY id", (current_space(),)).fetchall()
    return [dict(row) for row in rows]


def get_card(card_id):
    with connect() as conn:
        row = conn.execute("SELECT * FROM cards WHERE id = ? AND space_id = ?",
                           (card_id, current_space())).fetchone()
    return dict(row) if row else None


def insert_card(nickname, bank, name_on_card):
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO cards (space_id, nickname, bank, name_on_card, created_at) VALUES (?, ?, ?, ?, ?)",
            (current_space(), nickname, bank, name_on_card, now()),
        )
        card_id = cursor.lastrowid
    return get_card(card_id)


def update_card(card_id, nickname, bank, name_on_card):
    with connect() as conn:
        conn.execute(
            "UPDATE cards SET nickname = ?, bank = ?, name_on_card = ? WHERE id = ? AND space_id = ?",
            (nickname, bank, name_on_card, card_id, current_space()),
        )
    return get_card(card_id)


# --- Subscriptions --------------------------------------------------------

def list_subscriptions():
    with connect() as conn:
        rows = conn.execute("SELECT * FROM subscriptions WHERE space_id = ? ORDER BY id",
                            (current_space(),)).fetchall()
    return [dict(row) for row in rows]


def get_subscription(sub_id):
    with connect() as conn:
        row = conn.execute("SELECT * FROM subscriptions WHERE id = ? AND space_id = ?",
                           (sub_id, current_space())).fetchone()
    return dict(row) if row else None


def list_active_subscriptions():
    with connect() as conn:
        rows = conn.execute("SELECT * FROM subscriptions WHERE status = 'active' AND space_id = ? ORDER BY id",
                            (current_space(),)).fetchall()
    return [dict(row) for row in rows]


def list_all_active_subscriptions():
    """Every space's active subscriptions. Only the reminder watcher uses this."""
    with connect() as conn:
        rows = conn.execute("SELECT * FROM subscriptions WHERE status = 'active' ORDER BY id").fetchall()
    return [dict(row) for row in rows]


def insert_subscription(fields):
    """fields: card_id, name, monthly_cost_cents, is_trial, deadline, reminder_time, source_type, source_value."""
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO subscriptions (space_id, card_id, name, monthly_cost_cents, is_trial, deadline, "
            "reminder_time, source_type, source_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (current_space(), fields["card_id"], fields["name"], fields["monthly_cost_cents"], fields["is_trial"],
             fields["deadline"], fields["reminder_time"], fields["source_type"], fields["source_value"], now()),
        )
        sub_id = cursor.lastrowid
    return get_subscription(sub_id)


def update_subscription(sub_id, fields, reset_reminders):
    """Saves an edit. reset_reminders=True forgets which reminders were sent (new date or time)."""
    with connect() as conn:
        conn.execute(
            "UPDATE subscriptions SET card_id = ?, name = ?, monthly_cost_cents = ?, is_trial = ?, "
            "deadline = ?, reminder_time = ?, source_type = ?, source_value = ? "
            + (", last_reminded_days = NULL " if reset_reminders else "")
            + "WHERE id = ? AND space_id = ?",
            (fields["card_id"], fields["name"], fields["monthly_cost_cents"], fields["is_trial"],
             fields["deadline"], fields["reminder_time"], fields["source_type"], fields["source_value"],
             sub_id, current_space()),
        )
    return get_subscription(sub_id)


def mark_reminded(sub_id, days_before):
    """Remember which reminder was sent (2, 1 or 0 days before), so it's never sent twice."""
    with connect() as conn:
        conn.execute("UPDATE subscriptions SET last_reminded_days = ? WHERE id = ? AND space_id = ?",
                     (days_before, sub_id, current_space()))


def mark_cancelled(sub_id, cancelled_on):
    with connect() as conn:
        conn.execute(
            "UPDATE subscriptions SET status = 'cancelled', cancelled_on = ? WHERE id = ? AND space_id = ?",
            (cancelled_on, sub_id, current_space()),
        )
    return get_subscription(sub_id)


def renew(sub_id, deadline):
    """It renewed: new deadline, active again, and reminders start over for the new date."""
    with connect() as conn:
        conn.execute(
            "UPDATE subscriptions SET deadline = ?, status = 'active', cancelled_on = NULL, "
            "last_reminded_days = NULL WHERE id = ? AND space_id = ?",
            (deadline, sub_id, current_space()),
        )
    return get_subscription(sub_id)


# --- Demo inbox -----------------------------------------------------------

def add_inbox_item(subscription_id, subject, text_body, html_body, emailed):
    with connect() as conn:
        conn.execute(
            "INSERT INTO inbox (space_id, subscription_id, subject, text_body, html_body, emailed, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (current_space(), subscription_id, subject, text_body, html_body, 1 if emailed else 0, now()),
        )


def list_inbox():
    with connect() as conn:
        rows = conn.execute("SELECT * FROM inbox WHERE space_id = ? ORDER BY id DESC", (current_space(),)).fetchall()
    return [dict(row) for row in rows]


def real_emails_sent_today(all_spaces=False):
    """How many demo reminders went out as real emails today (this space, or every space)."""
    today = datetime.now().date().isoformat()
    with connect() as conn:
        if all_spaces:
            row = conn.execute("SELECT COUNT(*) FROM inbox WHERE emailed = 1 AND created_at >= ?", (today,)).fetchone()
        else:
            row = conn.execute("SELECT COUNT(*) FROM inbox WHERE emailed = 1 AND created_at >= ? AND space_id = ?",
                               (today, current_space())).fetchone()
    return row[0]
