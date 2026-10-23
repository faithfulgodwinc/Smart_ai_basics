"""Smart's server: serves the app, answers its requests, and keeps the data.

Start it with:  python app.py   then open http://localhost:5000

Public-site mode (DEMO_MODE=1, for the live link): no sign-in. Each browser has two private
spaces, remembered by cookies, and a switch between them:
  - Demo: a fresh, empty space every time they switch to it; the guided tour fills it in.
  - Live: their own real space; they type everything, and it's kept.
"""

import os
import re
import secrets
from datetime import date
from zoneinfo import available_timezones

from dotenv import load_dotenv
from flask import Flask, g, jsonify, render_template, request

import db
import reminders

load_dotenv()
DEMO_MODE = os.getenv("DEMO_MODE") == "1"
SPACE_COOKIE = "smart_space"  # the browser's Demo space
LIVE_COOKIE = "smart_live"    # the browser's Live space
MODE_COOKIE = "smart_mode"    # which one is open: "demo" (the default) or "live"

app = Flask(__name__)
if DEMO_MODE:
    # On Render, a proxy in front of Smart handles https. Trust what it says about the original
    # request, so Smart knows the visitor is on https and marks their cookie secure.
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)


# --- Which space is this request for? ------------------------------------------

def new_space(is_demo):
    """A new, empty private space (Smart starts empty: the tour helps fill it)."""
    space_id = secrets.token_urlsafe(24)
    db.create_space(space_id, is_demo=is_demo)
    return space_id


@app.before_request
def choose_space():
    g.new_cookies = {}
    g.mode = None
    if not DEMO_MODE:
        db.set_space(db.LOCAL)  # your own laptop: one space for everything
        return
    if request.endpoint == "static":
        return  # files like app.js don't need a space
    g.mode = "live" if request.cookies.get(MODE_COOKIE) == "live" else "demo"
    cookie = LIVE_COOKIE if g.mode == "live" else SPACE_COOKIE
    space_id = request.cookies.get(cookie)
    if not (space_id and db.space_exists(space_id)):
        space_id = new_space(is_demo=g.mode == "demo")
        g.new_cookies[cookie] = space_id
    db.set_space(space_id)


@app.after_request
def remember_space(response):
    for name, value in g.get("new_cookies", {}).items():
        response.set_cookie(name, value, max_age=60 * 60 * 24 * 180,
                            httponly=True, samesite="Lax", secure=request.is_secure)
    return response


@app.post("/api/mode")
def switch_mode():
    """Switch between Demo and Live. Switching to Demo always starts a fresh, empty demo."""
    if not DEMO_MODE:
        raise InvalidInput("form", "Demo and Live are only on the public site.")
    mode = (request.get_json(silent=True) or {}).get("mode")
    if mode == "demo":
        g.new_cookies[SPACE_COOKIE] = new_space(is_demo=True)
    elif mode == "live":
        live_id = request.cookies.get(LIVE_COOKIE)
        if not (live_id and db.space_exists(live_id)):
            g.new_cookies[LIVE_COOKIE] = new_space(is_demo=False)
    else:
        raise InvalidInput("mode", "Choose demo or live.")
    g.new_cookies[MODE_COOKIE] = mode
    return jsonify(mode=mode)


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
TIME_ZONES = available_timezones()  # every real zone name, e.g. 'Africa/Lagos'
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


def valid_time_zone(body):
    time_zone = str(body.get("time_zone") or "").strip()
    if time_zone not in TIME_ZONES:
        raise InvalidInput("time_zone", "Choose a time zone from the list, like Africa/Lagos.")
    return time_zone


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


def not_in_the_past(deadline):
    """A billing date can't be before today (in the person's time zone)."""
    if deadline < reminders.local_now().date().isoformat():
        raise InvalidInput("deadline", "Pick today or a later date.")


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
        hosted=DEMO_MODE,          # the public site: inbox, Demo/Live switch
        mode=g.mode,               # "demo", "live", or None on a laptop
        demo=g.mode == "demo",
        email=db.get_email(),
        time_zone=db.get_time_zone(),
        cards=db.list_cards(),
        subscriptions=db.list_subscriptions(),
    )


@app.get("/api/inbox")
def get_inbox():
    return jsonify(items=db.list_inbox())


@app.put("/api/settings")
def put_settings():
    """Updates the reminder email and/or the time zone (whichever is sent)."""
    body = request.get_json(silent=True) or {}
    if DEMO_MODE and str(body.get("email") or "").strip() == "":
        body.pop("email", None)  # in demo mode the email is optional: leave it empty
    email = valid_email(body) if "email" in body else None
    time_zone = valid_time_zone(body) if "time_zone" in body else None
    if email:
        db.set_email(email)
    if time_zone:
        db.set_time_zone(time_zone)
    return jsonify(email=db.get_email(), time_zone=db.get_time_zone())


def card_fields(body):
    return (
        required_text(body, "nickname", "a nickname"),
        required_text(body, "bank", "the bank"),
        required_text(body, "name_on_card", "the name on the card"),
    )


@app.post("/api/cards")
def post_card():
    card = db.insert_card(*card_fields(request.get_json(silent=True) or {}))
    return jsonify(card), 201


@app.put("/api/cards/<int:card_id>")
def put_card(card_id):
    if not db.get_card(card_id):
        raise InvalidInput("form", "That card doesn't exist anymore.")
    return jsonify(db.update_card(card_id, *card_fields(request.get_json(silent=True) or {})))


@app.post("/api/subscriptions")
def post_subscription():
    if not db.get_email() and not DEMO_MODE:  # in demo mode an email is optional
        raise InvalidInput("email", "Add the email where reminders should go.")
    if not db.get_time_zone():
        raise InvalidInput("time_zone", "Choose the time zone your reminders should follow.")
    fields = subscription_fields(request.get_json(silent=True) or {})
    not_in_the_past(fields["deadline"])
    subscription = db.insert_subscription(fields)
    result = reminders.check_one(subscription["id"])  # sends it now if it's already due
    return jsonify(subscription=db.get_subscription(subscription["id"]), **result), 201



def existing_subscription(sub_id):
    subscription = db.get_subscription(sub_id)
    if not subscription:
        raise InvalidInput("form", "That subscription doesn't exist anymore.")
    return subscription


@app.post("/api/subscriptions/<int:sub_id>/cancel")
def cancel_subscription(sub_id):
    existing_subscription(sub_id)
    today = reminders.local_now().date().isoformat()
    return jsonify(db.mark_cancelled(sub_id, today))


@app.post("/api/subscriptions/<int:sub_id>/renew")
def renew_subscription(sub_id):
    existing_subscription(sub_id)
    deadline = valid_date(request.get_json(silent=True) or {})
    not_in_the_past(deadline)
    db.renew(sub_id, deadline)
    result = reminders.check_one(sub_id)  # reminders continue for the new date
    return jsonify(subscription=db.get_subscription(sub_id), **result)



@app.put("/api/subscriptions/<int:sub_id>")
def put_subscription(sub_id):
    before = existing_subscription(sub_id)
    fields = subscription_fields(request.get_json(silent=True) or {})
    if fields["deadline"] != before["deadline"]:
        not_in_the_past(fields["deadline"])  # keeping an old date while fixing a typo is fine
    # A new date or time means new reminders, so forget which ones were already sent.
    reset = (fields["deadline"], fields["reminder_time"]) != (before["deadline"], before["reminder_time"])
    db.update_subscription(sub_id, fields, reset_reminders=reset)
    result = reminders.check_one(sub_id)
    return jsonify(subscription=db.get_subscription(sub_id), **result)


db.init_db()

if __name__ == "__main__":
    # Started here, once, so there's only ever one watcher (debug auto-reload would start two).
    reminders.start_watcher(app)
    app.run(port=int(os.getenv("PORT", "5000")), debug=False)
