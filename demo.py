"""Demo mode: the sample Smart that every new visitor gets, so it's never empty.

Two cards (the protected main card and the everyday side card), a few trials and
subscriptions with dates relative to today, and one cancelled item for the history.
Netflix isn't here on purpose: the guided tour has the visitor add it themselves, with a
reminder two minutes away, so they watch the core journey happen.
"""

from datetime import timedelta

import db
import reminders


def seed(space_id):
    with db.in_space(space_id):
        today = reminders.local_now().date()
        main = db.insert_card("Main card", "Savings Bank", "ALEX DEMO")
        side = db.insert_card("Side card", "Online Bank", "ALEX DEMO")

        def add(card, name, cents, is_trial, days, source_type, source_value):
            return db.insert_subscription({
                "card_id": card["id"], "name": name, "monthly_cost_cents": cents, "is_trial": is_trial,
                "deadline": (today + timedelta(days=days)).isoformat(), "reminder_time": "09:00",
                "source_type": source_type, "source_value": source_value,
            })

        add(side, "Spotify", 1099, 0, 18, "website", "https://www.spotify.com/account/subscription/")
        add(side, "Canva Pro", 1299, 1, 6, "app", "Canva")
        # A trial quietly charging the card you're trying to protect: Smart's whole point.
        add(main, "Duolingo Max", 1399, 1, 9, "app", "Duolingo")
        add(main, "iCloud+", 299, 0, 25, "app", "Settings")
        disney = add(side, "Disney+", 899, 0, 12, "website", "https://www.disneyplus.com/account/subscription")
        db.mark_cancelled(disney["id"], (today - timedelta(days=3)).isoformat())
