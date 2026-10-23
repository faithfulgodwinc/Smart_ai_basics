# Smart - Be way ahead.

**Smart stops free trials from turning into charges you didn't expect.** It groups every trial and subscription under the card it charges, shows what each card is carrying a month, and reminds you before you're billed, with where to cancel.

### ▶ Try it live: **https://smart-pf9k.onrender.com**

No sign-up, no password, no real email needed. Tap **Try the guided demo** and the tour has you build your own Smart in about three minutes, then watch a real reminder arrive.

I'm **Faithful Godwin**, and I built Smart for the Devpost *Build With AI: Basics* hackathon, planned and built with AI from an empty folder to a live app.

---

## Why Smart exists

You start a free trial "just to try it." You mean to cancel. You get busy. Weeks later a bank alert tells you the trial became a subscription, and it was charged to the account you were trying to protect.

That happened to me: Netflix kept charging me for months before I noticed. Many people like me keep a protected main account and pay for things online from a side card, so the real question isn't only *when* will I be charged, but **which card is exposed?**

## What makes it different

Most trackers list dates. **Smart tracks which card is exposed.**

- **Your cards, as cards.** Swipe between them. Each one shows the trials and subscriptions it's paying for and its monthly total, with an overall total underneath.
- **A reminder you can act on.** Two days before, then one day before, at the time you chose, in your time zone, by email and in the app. Every reminder shows where to cancel: a direct link, or which app to open.
- **It asks, instead of assuming.** Once a deadline passes, Smart asks *"Did you cancel, or did it renew?"* Cancel it and the totals drop. Say it renewed, give the next date, and the reminders carry on.
- **No card numbers, no bank logins, ever.** A card is a nickname, a bank and the name on it. Nothing worth stealing.
- **Calm by design.** Soft and quiet. Colour is kept for what helps: each card has its own finish, each subscription shows its service's own icon (found automatically from the cancel link), and one rule keeps it calm: deep green means *do it* or *chosen*, red means *fix this*, and black is what you read.

## What a judge can do in three minutes

The live site has two modes, switched in **Profile**, like a trading app's demo and live accounts:

| | **Demo** | **Live** |
|---|---|---|
| Starts | Empty, every time | Empty, then it's yours |
| Guided tour | Builds Smart with you, field by field | A short guide to find your way around |
| Your data | Thrown away when you restart the demo | Kept in your browser |

**The Demo walkthrough:**

1. Choose your time zone (and, if you like, an email address for a real reminder).
2. Add a **Netflix free trial** one field at a time. Tap **Type it in** and watch each field fill: name, cost, trial switch, the date and a reminder time two minutes from now, and the cancel link.
3. Add the **Side card** it charges, then save. A second trial, Duolingo Max, goes on the main card.
4. See both cards, what each is carrying, and the total.
5. Two minutes later the **reminder arrives** in Smart's inbox (and in your email, if you gave one), with Netflix's cancel link.

Everything you see is real: real saves to a real database, a real background watcher, a real email.

## Built with AI, planned before a line of code

I built Smart in a few days with **Claude Code** as my pair-programming partner, following the Devpost *Build With AI: Basics* kit. The kit's six steps took my idea from a conversation to a deployed app:

| Step | What it produced |
|---|---|
| **1 · Start** | A profile of me and my idea, so every later step fit the person building it |
| **2 · Scope** | [`scope.md`](devpost/scope.md): an interview that found the unique kernel (*which card is exposed*) and cut everything else |
| **3 · PRD** | [`prd.md`](devpost/prd.md): the core journey, every behaviour, every state and edge case, in plain words |
| **4 · Spec** | [`spec.md`](devpost/spec.md): the technical blueprint, sized to a proof of concept |
| **5 · Build** | [`checklist.md`](devpost/checklist.md): the app built in small slices, each one verified in a real browser and committed |
| **6 · Ship** | This repository, the live site and the demo |

The planning wasn't decoration. The scope's "which card is exposed" became the card-first home screen; the PRD's "Did you cancel, or did it renew?" became a real screen; the spec chose a stack small enough to understand and own. When testing changed the plan, the change was written down: the **Revisions** list in [`checklist.md`](devpost/checklist.md) records every one, and why.

The AI wrote code; the decisions stayed mine. Many of the details came from me trying the app and asking for something: a reminder time to demo with, my own time zone, a refusal for times already past, red for a missing field, a tour that teaches every field, a spinner so there's never a dull moment. [`app-map.html`](devpost/app-map.html) is a one-page guide to what powers what (download it and open it in a browser).

## How it works

```
 Phone-first web app ──► Flask server ──► SQLite database
 (HTML, Tailwind, JS)        │
                             ├── Deadline watcher: checks every minute, in each person's time zone
                             └── Mailer: sends the reminder through Gmail (encrypted SMTP)
```

- **The app** (`templates/`, `static/`) is plain HTML, CSS and JavaScript with Tailwind, no framework. Custom date and time-wheel pickers, a guided-tour engine, and an in-app inbox.
- **The server** (`app.py`) is a small Flask app. Every request is checked: costs must be numbers, dates can't be in the past, and a reminder for today must be later than the time now.
- **The deadline watcher** (`reminders.py`) runs inside the server and never sends the same reminder twice. If the server was off when a reminder was due, it catches up when it starts.
- **On the live site**, each browser gets its own private Smart through a cookie. Nobody sees anyone else's, and real emails are capped (5 a day per visitor, 60 a day overall) to protect the sender.

```
app.py              Flask server: pages, JSON routes, Demo/Live spaces, starts the watcher
db.py, schema.sql   The SQLite database: spaces, settings, cards, subscriptions, inbox
reminders.py        When is a reminder due? Checks on save and every minute
mailer.py           Builds the reminder email and sends it through Gmail
templates/          The app page and the email templates
static/js/          Screens, pickers, the guided tour, talking to the server
static/css/         The card look, the floating nav, sheets, motion
render.yaml         The live deployment on Render
```

## Run it yourself (Windows)

You need **Python 3.11+** and, for real emails, a **Gmail account with 2-Step Verification**.

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Fill in `.env` (it's ignored by git, so your password stays on your machine):

```
GMAIL_ADDRESS=you@gmail.com
GMAIL_APP_PASSWORD=your 16-character app password
APP_URL=http://localhost:5000
```

To get an app password: Google Account → **Security** → turn on **2-Step Verification** → search **App passwords** → create one. It is not your normal Gmail password. Check email works with `python send_test_email.py you@example.com`.

```
python app.py
```

Open **http://localhost:5000** (on a laptop, press F12 and switch on the device toolbar for the phone view). To try the public-site version with Demo and Live locally:

```
$env:DEMO_MODE="1"; $env:SMART_DB="demo.db"; $env:PORT="5050"; python app.py
```

### Deploying

`render.yaml` describes the live service: an always-on web service (the watcher must keep running), a persistent disk for the database, and `gunicorn` with one worker so the watcher runs exactly once. On Render choose **New → Blueprint**, pick this repository and fill in `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` and `APP_URL`. Real emails need a paid instance, because free instances block outgoing email.

## Limits of this proof of concept

- There are no accounts: Live Smart is kept in one browser, so it doesn't follow you to another device.
- Reminders are sent from one Gmail account, with daily caps.
- Costs are monthly; yearly plans aren't modelled yet.
- Smart points you to the right place to cancel. It can't cancel for you, because companies don't offer that access.

## What's next

- **Accounts**, so your Smart follows you from phone to laptop.
- **Built-in cancel guides** for common services, including step-by-step help for App Store and Google Play subscriptions.
- **Add a trial by voice**: say "Netflix, free trial, ends Friday, side card" and it's in.
- **Bank statement upload** to find forgotten subscriptions automatically.
- **Yearly and other billing cycles.**

## Credits

Designed, planned and built by me, **Faithful Godwin**, with Claude Code, for Devpost's *Build With AI: Basics*. Released under the [MIT License](LICENSE).
