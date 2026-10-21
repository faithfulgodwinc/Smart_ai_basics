"""Builds one reminder email and sends it through Gmail.

How sending works, step by step:
  1. Fill in the email templates (plain text + HTML) with the subscription's details.
  2. Wrap them in an EmailMessage with From, To and Subject.
  3. Connect to Gmail's mail server over an encrypted connection (SSL, encrypted from
     the very first moment), and log in with your Gmail app password.
  4. Hand over the message. Gmail delivers it to the inbox.

This file never decides *when* to send. That's reminders.py's job.
"""

import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv
from flask import render_template

load_dotenv()

SMTP_HOST = "smtp.gmail.com"
# Port 465 is encrypted from the start. (Gmail's other door, 587, starts plain and then
# switches with STARTTLS, but some networks block it, so Smart uses 465.)
SMTP_PORT = 465


def when_text(days_left):
    """2 -> 'in 2 days', 1 -> 'tomorrow', 0 -> 'today'."""
    if days_left <= 0:
        return "today"
    if days_left == 1:
        return "tomorrow"
    return f"in {days_left} days"


def format_money(cents):
    return f"{cents / 100:,.2f}"


def build_reminder(to_address, sub, card_nickname, days_left):
    """Step 1 and 2: fill in the templates and wrap them in an EmailMessage.

    Must run inside a Flask app context, because render_template uses Flask's templates folder.
    """
    details = {
        "name": sub["name"],
        "when": when_text(days_left),
        "cost": format_money(sub["monthly_cost_cents"]),
        "card": card_nickname,
        "source_type": sub["source_type"],    # 'website' or 'app'
        "source_value": sub["source_value"],  # the cancel link, or the app's name
        "app_url": os.getenv("APP_URL", "http://localhost:5000"),
    }

    msg = EmailMessage()
    msg["From"] = f"Smart <{os.getenv('GMAIL_ADDRESS', '')}>"
    msg["To"] = to_address
    msg["Subject"] = f"Heads up: {sub['name']} renews {details['when']}"
    # Plain text first, then the HTML version. Mail apps show the nicest one they can.
    msg.set_content(render_template("email/reminder.txt", **details))
    msg.add_alternative(render_template("email/reminder.html", **details), subtype="html")
    return msg


def send(msg):
    """Step 3 and 4: connect to Gmail securely, log in, hand over the message.

    Returns True if Gmail accepted it, False otherwise (the reason is printed in the terminal).
    """
    address = os.getenv("GMAIL_ADDRESS")
    app_password = os.getenv("GMAIL_APP_PASSWORD")
    if not address or not app_password:
        print("[mailer] Not sent: GMAIL_ADDRESS or GMAIL_APP_PASSWORD is missing from .env")
        return False

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20) as server:  # encrypted from the start
            try:
                server.login(address, app_password.replace(" ", ""))
            except smtplib.SMTPException:
                # After refusing a password, Gmail sometimes just hangs up instead of
                # answering, so any failure at this step means "login refused".
                print("[mailer] Not sent: Gmail refused the login. Check GMAIL_ADDRESS and "
                      "GMAIL_APP_PASSWORD in .env (it must be an app password, with 2-Step Verification on).")
                return False
            server.send_message(msg)
        print(f"[mailer] Sent \"{msg['Subject']}\" to {msg['To']}")
        return True
    except (smtplib.SMTPException, OSError) as error:
        print(f"[mailer] Not sent: {type(error).__name__}: {error}")
    return False


def send_reminder(to_address, sub, card_nickname, days_left):
    """Build and send one reminder. Returns True only if Gmail accepted it."""
    return send(build_reminder(to_address, sub, card_nickname, days_left))
