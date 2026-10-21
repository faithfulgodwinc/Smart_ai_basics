"""Send one sample reminder email, to check Gmail works before the app relies on it.

Usage:  python send_test_email.py you@example.com
"""

import sys

from flask import Flask

import mailer

if len(sys.argv) != 2:
    print("Usage: python send_test_email.py you@example.com")
    sys.exit(1)

sample = {
    "name": "Netflix",
    "monthly_cost_cents": 1549,
    "source_type": "website",
    "source_value": "https://www.netflix.com/cancelplan",
}

# A tiny Flask app, only so the email templates in templates/ can be filled in.
app = Flask(__name__)
with app.app_context():
    ok = mailer.send_reminder(sys.argv[1], sample, card_nickname="Side card", days_left=0)

print("Done: check your inbox." if ok else "The email was not sent. See the reason above.")
sys.exit(0 if ok else 1)
