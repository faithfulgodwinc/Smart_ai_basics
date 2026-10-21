"""Smart's server: serves the app, answers its requests, and keeps the data.

Start it with:  python app.py   then open http://localhost:5000
"""

import os
import re
from datetime import date

from flask import Flask, jsonify, render_template, request

import db
import reminders

app = Flask(__name__)


class InvalidInput(Exception):
    """Raised by a check below. Becomes {"error": ..., "field": ...} with status 400."""

    def __init__(self, field, message):
        self.field = field
        self.message = message


@app.errorhandler(InvalidInput)
def invalid_input(error):
    return jsonify(error=error.message, field=error.field), 400


# --- Checks (the app's forms repeat these, so messages show next to the field) ---

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")  # 24-hour 'HH:MM'


def required_text(body, field, label):
    value = str(body.get(field) or "").strip()
    if not value:
        raise InvalidInput(field, f"Add {label}.")
    if len(value) > 120:
        raise InvalidInput(field, "That's a bit long. Keep it under 120 characters.")
    return value


def valid_email(body):
    email = str(body.get("email") or "").strip()
    if not EMAIL_PATTERN.match(email):
        raise InvalidInput("email", "That email doesn't look right. Try name@example.com.")
    return email


def valid_cost_cents(body):
    try:
        cost = float(str(body.get("monthly_cost", "")).strip())
    except ValueError:
        raise InvalidInput("monthly_cost", "Add the monthly cost as a number, like 9.99.")
    if cost < 0 or cost != cost:  # cost != cost catches "nan"
        raise InvalidInput("monthly_cost", "The cost can't be below 0.")
    return round(cost * 100)


def valid_date(body, field="deadline"):
    try:
        return date.fromisoformat(str(body.get(field) or "")).isoformat()
    except ValueError:
        raise InvalidInput(field, "Pick a date.")


def valid_time(body):
    reminder_time = str(body.get("reminder_time") or "").strip()
    if not TIME_PATTERN.match(reminder_time):
        raise InvalidInput("reminder_time", "Pick a time for the reminder.")
    return reminder_time


def valid_card_id(body):
    try:
        card_id = int(body.get("card_id"))
    except (TypeError, ValueError):
        raise InvalidInput("card_id", "Choose the card it's on.")
    if not db.get_card(card_id):
        raise InvalidInput("card_id", "That card doesn't exist anymore. Choose another.")
    return card_id


def valid_source(body):
    source_type = body.get("source_type")
    if source_type == "website":
        link = str(body.get("source_value") or "").strip()
        if not link.startswith(("http://", "https://")):
            raise InvalidInput("source_value", "Paste the full link, starting with https://")
        return source_type, link
    if source_type == "app":
        return source_type, required_text(body, "source_value", "the app's name")
    raise InvalidInput("source_type", "Choose website or app.")


def subscription_fields(body):
    source_type, source_value = valid_source(body)
    return {
        "name": required_text(body, "name", "a name"),
        "monthly_cost_cents": valid_cost_cents(body),
        "is_trial": 1 if body.get("is_trial") else 0,
        "deadline": valid_date(body),
        "reminder_time": valid_time(body),
        "card_id": valid_card_id(body),
        "source_type": source_type,
        "source_value": source_value,
    }


# --- Pages and routes -------------------------------------------------------

@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/state")
def get_state():
    return jsonify(
        email=db.get_email(),
        cards=db.list_cards(),
        subscriptions=db.list_subscriptions(),
    )


@app.put("/api/settings")
def put_settings():
    email = valid_email(request.get_json(silent=True) or {})
    db.set_email(email)
    return jsonify(email=email)


@app.post("/api/cards")
def post_card():
    body = request.get_json(silent=True) or {}
    card = db.insert_card(
        required_text(body, "nickname", "a nickname"),
        required_text(body, "bank", "the bank"),
        required_text(body, "name_on_card", "the name on the card"),
    )
    return jsonify(card), 201


@app.post("/api/subscriptions")
def post_subscription():
    if not db.get_email():
        raise InvalidInput("email", "Add the email where reminders should go.")
    fields = subscription_fields(request.get_json(silent=True) or {})
    subscription = db.insert_subscription(fields)
    result = reminders.check_one(subscription["id"])  # sends it now if it's already due
    return jsonify(subscription=db.get_subscription(subscription["id"]), **result), 201


db.init_db()

if __name__ == "__main__":
    # Started here, once, so there's only ever one watcher (debug auto-reload would start two).
    reminders.start_watcher(app)
    app.run(port=int(os.getenv("PORT", "5000")), debug=False)
