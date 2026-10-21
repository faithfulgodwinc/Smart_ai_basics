-- Smart's tables. Created on first run if they don't exist yet.

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,   -- one row: 'reminder_email'
    value TEXT
);

CREATE TABLE IF NOT EXISTS cards (
    id           INTEGER PRIMARY KEY,
    nickname     TEXT NOT NULL,
    bank         TEXT NOT NULL,
    name_on_card TEXT NOT NULL,
    created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id                 INTEGER PRIMARY KEY,
    card_id            INTEGER NOT NULL REFERENCES cards(id),
    name               TEXT NOT NULL,
    monthly_cost_cents INTEGER NOT NULL,          -- 15.49 stored as 1549, so totals never drift
    is_trial           INTEGER NOT NULL DEFAULT 0, -- 0/1
    deadline           TEXT NOT NULL,             -- 'YYYY-MM-DD' trial end / next billing date
    reminder_time      TEXT NOT NULL DEFAULT '09:00', -- 'HH:MM' local time the reminders go out
    source_type        TEXT NOT NULL,             -- 'website' | 'app'
    source_value       TEXT NOT NULL,             -- cancel link, or app name
    status             TEXT NOT NULL DEFAULT 'active', -- 'active' | 'cancelled'
    cancelled_on       TEXT,                      -- 'YYYY-MM-DD' when marked cancelled
    last_reminded_days INTEGER,                   -- 2, 1, 0, or NULL = none sent for this deadline
    created_at         TEXT NOT NULL
);
