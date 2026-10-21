# Smart — Be way ahead.

Smart is a calm, black-and-white app for keeping track of your free trials and subscriptions. It groups each one under the card it charges, so you can see what's sitting on the account you're trying to protect. Before you're billed, it emails you a reminder with the exact place to cancel.

- **Group by card.** Swipe between your cards to see what each one is carrying, with a monthly total per card and an overall total.
- **Reminders at the time you choose.** You get an email 2 days and 1 day before each deadline, at that subscription's "Remind me at" time, in your own time zone. If a reminder is already due when you save, it goes out straight away.
- **"Have you cancelled this?"** Anything due soon or past due rises to the top. Mark it cancelled and the totals drop, or say it renewed and give the next billing date.
- **No card numbers, no bank logins.** A card is just a nickname, a bank, and the name on the card.

Built for the Devpost *Build With AI: Basics* hackathon as a proof of concept.

## How it works

- **The app** (`templates/index.html`, `static/`) is plain HTML, CSS and JavaScript, styled with Tailwind. It runs in your browser and is designed for a phone screen first.
- **The server** (`app.py`) is a small Python program built with Flask. It stores everything in one SQLite file, `smart.db`, and answers the app's requests.
- **The deadline watcher** (`reminders.py`) runs inside the server. It checks every minute whether a reminder is due.
- **The mailer** (`mailer.py`) writes the email and hands it to Gmail over an encrypted SMTP connection, logging in with a Gmail app password.

The server only watches deadlines while it's running. If it was off when a reminder was due, it catches up as soon as it starts again.

## Setup (Windows)

You need **Python 3.11 or newer**, an internet connection, and a **Gmail account with 2-Step Verification turned on**.

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Open `.env` and fill in your values:

```
GMAIL_ADDRESS=you@gmail.com
GMAIL_APP_PASSWORD=your 16-character app password
APP_URL=http://localhost:5000
```

`.env` is ignored by git, so your password never leaves your laptop.

### Getting a Gmail app password

1. Go to your Google Account → **Security** and turn on **2-Step Verification** if it isn't on already.
2. Search for **App passwords** in your Google Account settings and create one (any name, e.g. "Smart").
3. Copy the 16-character password into `GMAIL_APP_PASSWORD`. This is *not* your normal Gmail password.

To check that email works before using the app:

```
python send_test_email.py you@example.com
```

## Run it

```
.venv\Scripts\activate
python app.py
```

Then open **http://localhost:5000**. For the phone-sized view on a laptop, open your browser's developer tools (F12) and switch on the device toolbar.

When the server starts you should see `[reminders] Watching deadlines every 60 seconds.` After changing any code, stop the server (Ctrl+C) and start it again, because a running server keeps the code it started with.

The first time you add a subscription, Smart asks where reminders should go and which time zone they should follow. You can change both later in **Profile**.

## Try the reminder yourself

1. Add a trial whose end date is **today**, and set **Remind me at** to two minutes from now.
2. Smart says "Reminder set for … today."
3. Wait. The terminal prints `[mailer] Sent …` and the email arrives in your inbox.

## Project layout

```
app.py              Flask server: pages, JSON routes, starts the deadline watcher
db.py, schema.sql   The SQLite database: settings, cards, subscriptions
reminders.py        When is a reminder due? Checks on save and every minute
mailer.py           Builds the reminder email and sends it through Gmail
templates/          The app page and the email templates
static/js/          Screens, formatting and totals, talking to the server
static/css/         The card look, the floating nav, sheets, motion
```

## How it was planned

Smart was planned before it was built. The planning documents live in [`devpost/`](devpost/):

- [`scope.md`](devpost/scope.md): the idea, the unique kernel, and what was cut
- [`prd.md`](devpost/prd.md): the core journey and every behavior
- [`spec.md`](devpost/spec.md): the technical blueprint
- [`checklist.md`](devpost/checklist.md): the build, slice by slice, with every change of plan under **Revisions**
- [`app-map.html`](devpost/app-map.html): a one-page guide to what powers what (download and open it in a browser)

The `.md` files are the current versions. The `.html` files are snapshots from the planning reviews, made before the build changed a few details.

## Limits of this proof of concept

- It runs on your own laptop, for one person, in one browser. There are no accounts.
- Reminders are sent from your own Gmail account.
- The "Open Smart" button in emails points to `APP_URL`, which is `localhost` by default and so only works on the same laptop.
