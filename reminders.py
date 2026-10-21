"""Decides *when* a reminder is due. It never builds or sends an email itself (that's mailer.py).

The rule, for an active subscription:
  - It can get a reminder 2 days before and 1 day before its deadline, plus a "today"
    reminder on the deadline only if no reminder was sent at all.
  - Each one happens at the subscription's reminder time (e.g. 09:00) on that day.
  - Once a reminder is sent, last_reminded_days remembers it (2, 1 or 0), so it's never
    sent twice, and only closer reminders can follow.
  - After the deadline day, no email. The app shows it under "Needs attention" instead.

All times are in the person's chosen time zone (a setting, e.g. Africa/Lagos), not the
server's clock, so reminders still arrive at the right moment when the laptop is set to
another zone, the person travels, or the server runs somewhere else.
"""

import threading
import time
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import db
import mailer

CHECK_EVERY_SECONDS = 60

# The save-time check and the background check run at the same time sometimes.
# This lock lets only one of them look at (and send) reminders at once, so nothing is sent twice.
_lock = threading.Lock()


def local_now():
    """The current date and time in the person's chosen time zone (the laptop's own if none is set)."""
    time_zone = db.get_time_zone()
    if not time_zone:
        return datetime.now()
    return datetime.now(ZoneInfo(time_zone)).replace(tzinfo=None)


def reminder_moments(sub):
    """Every reminder this subscription could still get, earliest first: (moment, days_before)."""
    deadline = date.fromisoformat(sub["deadline"])
    hour, minute = (int(part) for part in sub["reminder_time"].split(":"))
    last = sub["last_reminded_days"]

    moments = []
    for days_before in (2, 1, 0):
        if last is not None and days_before >= last:
            continue  # this one, or a closer one, was already sent
        if days_before == 0 and last is not None:
            continue  # "today" is only for subscriptions that got no earlier reminder
        day = deadline - timedelta(days=days_before)
        moments.append((datetime(day.year, day.month, day.day, hour, minute), days_before))
    return moments


def next_reminder(sub, now):
    """The next reminder whose day isn't over yet, or None."""
    if sub["status"] != "active":
        return None
    for moment, days_before in reminder_moments(sub):
        if moment.date() >= now.date():
            return moment, days_before
    return None


def _check(sub, now):
    """Send this subscription's reminder if it's due. Says what happened."""
    upcoming = next_reminder(sub, now)
    if upcoming is None:
        return {"reminder": "not_due", "reminder_at": None}

    moment, days_before = upcoming
    if moment > now:
        return {"reminder": "scheduled", "reminder_at": moment.isoformat(timespec="minutes")}

    email = db.get_email()
    card = db.get_card(sub["card_id"])
    if email and mailer.send_reminder(email, sub, card["nickname"], days_before):
        db.mark_reminded(sub["id"], days_before)
        return {"reminder": "sent", "reminder_at": None}
    # Not marked as sent, so the next check tries again.
    return {"reminder": "failed", "reminder_at": None}


def check_one(sub_id, now=None):
    """Runs right after a subscription is saved, edited or renewed."""
    with _lock:
        return _check(db.get_subscription(sub_id), now or local_now())


def check_all(now=None):
    """Runs when the server starts and then every minute."""
    with _lock:
        now = now or local_now()
        for sub in db.list_active_subscriptions():
            try:
                _check(sub, now)
            except Exception as error:  # one broken subscription mustn't stop the others
                print(f"[reminders] Couldn't check subscription {sub['id']}: {error}")


def start_watcher(app):
    """Start the background loop: check, sleep a minute, repeat, for as long as the server runs."""
    def loop():
        while True:
            with app.app_context():  # the mailer needs this to fill in the email templates
                check_all()
            time.sleep(CHECK_EVERY_SECONDS)

    threading.Thread(target=loop, name="deadline-watcher", daemon=True).start()
    print(f"[reminders] Watching deadlines every {CHECK_EVERY_SECONDS} seconds.")
