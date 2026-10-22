-- Smart's tables. Created on first run if they don't exist yet.
-- Everything belongs to a space: 'local' on your own laptop, or one private space per
-- visitor in demo mode.

CREATE TABLE IF NOT EXISTS spaces (
    id         TEXT PRIMARY KEY,           -- 'local', or a random id kept in the visitor's cookie
    is_demo    INTEGER NOT NULL DEFAULT 0, -- 1 = a judge's demo space
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS space_settings (
    space_id TEXT NOT NULL,
    key      TEXT NOT NULL,                -- 'reminder_email', 'time_zone'
    value    TEXT,
    PRIMARY KEY (space_id, key)
);

CREATE TABLE IF NOT EXISTS cards (
    id           INTEGER PRIMARY KEY,
    space_id     TEXT NOT NULL DEFAULT 'local',
    nickname     TEXT NOT NULL,
    bank         TEXT NOT NULL,
    name_on_card TEXT NOT NULL,
    created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id                 INTEGER PRIMARY KEY,
    space_id           TEXT NOT NULL DEFAULT 'local',
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

-- Demo mode: every reminder lands here, shown in the app exactly as the email looks.
CREATE TABLE IF NOT EXISTS inbox (
    id              INTEGER PRIMARY KEY,
    space_id        TEXT NOT NULL,
    subscription_id INTEGER,
    subject         TEXT NOT NULL,
    text_body       TEXT NOT NULL,
    html_body       TEXT NOT NULL,
    emailed         INTEGER NOT NULL DEFAULT 0, -- 1 = also sent as a real email
    created_at      TEXT NOT NULL
);
