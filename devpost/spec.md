---
doc: spec
status: approved
---

# Smart — Technical Spec

## How This Works, In Plain Language

Smart has three parts.

1. **The app (frontend).** The screens you see and tap: the landing page, home with the card carousel, the forms, details, Profile, and Cancelled history. They're written in plain HTML, CSS and JavaScript and styled with Tailwind, and they run in your browser, designed for a phone screen first. The app doesn't keep anything itself. Every time you save something, it sends the details to the server, and every time it opens, it asks the server for everything.

2. **The server (backend).** A small Python program built with Flask that stays running on your laptop. It does three jobs:
   - **Keeps your data** in a database: one file, `smart.db` (SQLite), which works like a spreadsheet the program reads and writes. It holds your cards, your subscriptions, your reminder email and your time zone.
   - **Answers the app.** When the app says "save this subscription" or "mark this cancelled," the server updates the database and replies.
   - **Watches the deadlines.** Every minute, and once each time it starts, it asks: *"Is any active subscription due in 2 days, tomorrow or today, has its reminder time passed, and haven't I already sent that reminder?"* It also checks the moment you save something, so a subscription whose reminder is already due gets its email right away. Set the reminder time a couple of minutes ahead and you can watch it arrive on its own. That's the demo.

3. **Gmail (the email service).** When a reminder is due, the server writes the email and connects to Gmail's mail server (`smtp.gmail.com`) using **SMTP**, the basic language every email system uses to pass mail along. It logs in with a Gmail **app password** (a special password just for Smart, kept in a hidden `.env` file that never goes to GitHub) and hands over the message. Gmail then delivers it to the inbox.

**Why this shape:** a web page stops completely when its tab is closed, so it can't send an email two days from now. Something has to stay awake, and that's the server. Everything else is kept as small as possible: one database file instead of a hosted database, Python's built-in email tools instead of an extra service, and no sign-in, because Smart only needs one thing about you, your email address.

**The honest limit:** the server only watches deadlines while it's running on your laptop. If the laptop is off when a reminder was due, the server catches up as soon as it starts again. Putting the server online later would make it always-on.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

```
 Browser (app)                    Flask server (app.py)                 smart.db        Gmail
 ─────────────                    ─────────────────────                 ────────        ─────
 open Smart ───GET /api/state──►  read everything ───────────────────►  cards, subs,
            ◄── cards, subs, email                                       settings
 tap + , fill form, Save
            ───POST /api/subscriptions──► validate → save ───────────►  new row
                                          reminders.check_one()
                                            due within 2 days? ──yes──► mailer.send() ──SMTP──► inbox
                                            mark reminder sent ──────►  last_reminded_days
            ◄── saved subscription (+ "reminder sent")
 home redraws: row under its card, totals update

 (every minute)                   reminders.check_all() → same steps for every active subscription
```

1. **First visit.** The browser loads `index.html`. `app.js` checks a small browser note (`localStorage`: `smart_seen_landing`). If it's missing, it shows the **Landing** screen. Tapping the one button sets the note and shows Home.
2. **Empty home.** `app.js` asks the server for everything (`GET /api/state`). There are no cards or subscriptions yet, so Home shows the empty prompt pointing at the plus button in the floating nav.
3. **Add a subscription.** Plus opens the subscription form.
   - "New card…" in the card picker opens the card form on top, without clearing the subscription form. Saving the card (`POST /api/cards`) adds it to the picker and selects it.
   - If no email is saved yet, an email field appears inline in the form. On save, the app first sends `PUT /api/settings`, then the subscription.
   - Save sends `POST /api/subscriptions`. The server validates, stores the row, and immediately runs the reminder check for that subscription.
4. **See it land.** The server replies with the saved subscription. The app adds it to its in-memory copy of the data and redraws Home: the row under its card (trials first), the card total and the overall total.
5. **More cards.** Each card is one slide in a horizontally snapping carousel. When a different card snaps into view, the list below switches to that card's subscriptions.
6. **Reminder.** The server's once-a-minute check (and the check on save) works out each active subscription's next reminder: 2 days before, 1 day before, or "today" if none was sent yet, each at its reminder time. When that moment has passed, it sends the email through Gmail and records that it did. If it hasn't, the save reply says when it will go out.
7. **In-app check.** When Home draws, any active subscription with 2 or fewer days left (including past due) goes into a **Needs attention** section at the top with "Have you cancelled this?"
   - **Yes, cancelled** → `POST /api/subscriptions/<id>/cancel` → status becomes `cancelled`, totals drop, and it appears in Cancelled history.
   - **It renewed** → a date picker → `POST /api/subscriptions/<id>/renew` → new deadline, reminder memory cleared, and reminders continue for the new date.
8. **Come back later.** The landing note is already there, so Smart opens straight to Home, and `GET /api/state` brings everything back from `smart.db`.

## Stack

| Piece | Choice | Why (learner-agreed) | Docs |
|---|---|---|---|
| Frontend | Plain HTML, CSS, JavaScript (ES modules, no framework, no build step) | You already know it, and every line is readable. You accepted a little more hand-written screen-switching code instead of React. | [MDN JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) |
| Styling | **Tailwind CSS v4**, browser build loaded by `<script>` | You asked for Tailwind or something similar. Its default colors and fonts are replaced with Smart's own black-and-white look so it doesn't look generic. Tradeoff: the page needs internet to load it, and the browser build is meant for prototypes, not production. | [Tailwind Play CDN](https://tailwindcss.com/docs/installation/play-cdn) · [Theme variables](https://tailwindcss.com/docs/theme) |
| Card swiping | CSS scroll snap (built into browsers) | A smooth, native-feeling snap with no library. | [MDN scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap) |
| Font | System font (SF Pro on Apple devices), with **Inter** as the fallback | Matches your "Grok / Apple" lettering. Inter is free. | [Inter on Google Fonts](https://fonts.google.com/specimen/Inter) |
| Server | **Python 3.11+ with Flask 3** | Your choice: readable, so the email logic is easy to own and change. Tradeoff: switching between JS (screens) and Python (server). | [Flask docs](https://flask.palletsprojects.com/) |
| Database | **SQLite** via Python's built-in `sqlite3` | One file, nothing to install or host. | [sqlite3](https://docs.python.org/3/library/sqlite3.html) |
| Deadline watcher | A background thread inside the Flask server that wakes up every 60 seconds | No extra scheduling library. It's a plain loop you can read: "check, then sleep a minute." A minute is precise enough for per-subscription reminder times. | [threading](https://docs.python.org/3/library/threading.html) |
| Email | **Gmail via SMTP**, using Python's built-in `smtplib` + `email.message` | Your choice, picked so you'd learn how email sending actually works. Free, and can send to any address. Tradeoff: emails come from your Gmail address, and it isn't how a large product would send. | [smtplib](https://docs.python.org/3/library/smtplib.html) · [email.message](https://docs.python.org/3/library/email.message.html) |
| Secrets | `python-dotenv` reads a hidden `.env` file | Keeps your app password out of the public GitHub repository. | [python-dotenv](https://pypi.org/project/python-dotenv/) |

**To verify early in the build (from memory, not looked up this session):** that Gmail app passwords are still available for your account (they need 2-Step Verification turned on), and the exact current Tailwind v4 browser script URL.

## Where It Runs and How Someone Tries It

- **Runtime:** the Flask server runs on your laptop. The app opens in a browser at `http://localhost:5000`. For the phone-first view on a laptop, use the browser's device toolbar (F12 → phone icon).
- **Needs:** Python 3.11 or newer, internet (for Tailwind, the font, and Gmail), and a Gmail account with 2-Step Verification and an app password.
- **First-time setup (Windows):**
  ```
  python -m venv .venv
  .venv\Scripts\activate
  pip install -r requirements.txt
  copy .env.example .env      # then fill in GMAIL_ADDRESS and GMAIL_APP_PASSWORD
  ```
- **Start:** `python app.py`, then open `http://localhost:5000`.
- **Demo recording:** add two cards and a few subscriptions → swipe between cards and point out the totals → add "Netflix," trial, **expires today**, **remind me at two minutes from now** → Smart says "Reminder set for …" → wait → show the reminder email arriving in Gmail (opened on the same laptop) → back in Smart, tap "Yes, cancelled" → the totals drop → show Cancelled history.
- **Submission:** a short demo video plus a public GitHub repository, both required. Deployment is **not planned**. Running locally and recording it is enough. If you later want a live link, that's a `6-ship` decision. The server would need a host that keeps it running (so the once-a-minute check works), plus the same `.env` values set there.

## Look and Feel

Carried from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`. This is not a new design discovery.

- **Palette:** monochrome. Defined once as Tailwind theme variables in `index.html` (`@theme`), and Tailwind's default color palette is turned off so nothing colorful can slip in:
  - `--color-paper` `#FFFFFF` (background), `--color-mist` `#F5F5F4` (soft panels), `--color-line` `#E7E5E4` (hairlines), `--color-graphite` `#6B6B6B` (secondary text), `--color-ink` `#0A0A0A` (type, cards, emphasis).
  - The only accent is ink itself. "Due soon" uses a filled black pill, not red.
- **Typography:** `-apple-system, "SF Pro Text", Inter, system-ui, sans-serif`. Big, light-weight numbers for totals. Tight letter-spacing on headings, generous line-height on body text. Very little text overall.
- **Space and density:** spacious and calm. A single column at phone width (max ~440px, centered on wider screens), large padding, rows separated by hairlines rather than boxes.
- **Cards:** the centerpiece. Near-black rounded rectangles (credit-card proportions 1.586:1) with a soft gradient sheen, a subtle noise texture, nickname large, bank and name on card small, the card's monthly total, and a small row of decorative network marks drawn as simple inline SVG shapes (never claiming the real network).
- **Floating nav:** a vertical pill fixed at the bottom right, frosted (`backdrop-blur`) on a soft mist surface, holding Home, Add (+, filled ink circle), and Profile. The button for the current screen looks softly **pressed in** (inset shadows, light from the top left); details/edit count as Home and Cancelled history as Profile.
- **Motion:** soft only. 200–300 ms ease-out fades or slides between screens, the card carousel snaps, and rows animate in on add or remove. Respect `prefers-reduced-motion`.
- **Copy tone:** short, warm, calm. "Nothing here yet." "Have you cancelled this?" "You're way ahead."
- **Email look:** the same restraint. White background, black type, one black "Open Smart" button.

## Components

### Frontend

#### Page shell — `templates/index.html`
Loads Tailwind (with Smart's `@theme`), the font, `styles.css`, and `app.js`. Holds one empty container per screen plus the floating nav.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`.

#### App controller — `static/js/app.js`
Starts the app: loads data with `GET /api/state`, keeps it in memory (one `state` object), decides Landing vs Home, and switches screens by showing one container and hiding the rest (`#home`, `#profile`, …, using the URL hash so the browser back button works). After every successful save it updates `state` and redraws the current screen.
PRD ref: `prd.md > Landing Page`, `prd.md > States and Boundaries` (persistence).

#### API helper — `static/js/api.js`
One small function per server route (`getState`, `saveSubscription`, `cancelSubscription`, …) that wraps `fetch`, sends JSON, and turns a server error into a friendly message.

#### Formatting and totals — `static/js/format.js`
Pure helpers with no screen code: money formatting, `daysLeft(deadline)`, "time left" text (days, or months once it's 60+ days away), renewal date text, `cardTotal(cardId)`, `overallTotal()`, sorting (trials first, then soonest deadline), and `needsAttention(sub)` (active and 2 or fewer days left, including past due).
PRD ref: `prd.md > Monthly Totals`, `prd.md > Adding and Editing Subscriptions` (row content and ordering).

#### Landing screen — `static/js/screens/landing.js`
"Smart," "Be way ahead.," a short values statement, and one button. Sets `localStorage.smart_seen_landing = "1"`.
PRD ref: `prd.md > Landing Page`.

#### Home screen — `static/js/screens/home.js`
- Top bar with the profile icon.
- **Needs attention** section (only when there's something in it): each item has "Yes, cancelled" and "It renewed" (the latter opens the renew date picker).
- **Card carousel:** one slide per card. An `IntersectionObserver` notices which card has snapped into view and redraws the list below for that card.
- **Subscription rows** for the visible card: name, "Trial" label, cost, time left, renewal date. Tapping a row opens Details. An empty card shows "Nothing here yet."
- **Overall monthly total.**
- **Empty home** (no cards): a gentle prompt pointing at +.

PRD ref: `prd.md > Cards`, `prd.md > Monthly Totals`, `prd.md > In-App Reminder and the "Needs Check" Loop`, `prd.md > States and Boundaries`.

#### Forms — `static/js/screens/forms.js`
- **Subscription form** (add and edit): name, monthly cost, "Free trial I intend to cancel?" toggle, trial end / next billing date, card picker (with "New card…"), "Where did you subscribe?" (Website → cancel/plans link, or App → app name), and "Remind me at" (a time, default 09:00). If no email exists, it shows an inline email field.
- **Card form** (add and edit): nickname, bank, name on card. It opens as a sheet *over* the subscription form, so typed values are kept.
- **Renew sheet:** a single date field for "next billing date."
- **Validation** next to each field: required fields filled, cost is a number ≥ 0, a valid date, an email that looks like `x@y.z`, and a link that starts with `http://` or `https://`. The server repeats the same checks.

PRD ref: `prd.md > Adding and Editing Subscriptions`, `prd.md > Cards`, `prd.md > States and Boundaries` (missing or unusable input, no email yet).

#### Details screen — `static/js/screens/details.js`
Cost, card, dates, time left, how to cancel (a tappable link, or "Cancel in the [app] app"), plus Edit, "Yes, cancelled," and "It renewed."
PRD ref: `prd.md > Screens and Layout` (Subscription details), `prd.md > In-App Reminder and the "Needs Check" Loop`.

#### Profile screen — `static/js/screens/profile.js`
The reminder email (editable, `PUT /api/settings`), overall monthly total, number of active subscriptions, number of cards, and a link to Cancelled history.
PRD ref: `prd.md > Profile`.

#### Cancelled history screen — `static/js/screens/history.js`
A list of cancelled subscriptions: name, card nickname, and the date it was cancelled, newest first.
PRD ref: `prd.md > Cancelled History`.

### Server

#### Web server and routes — `app.py`
Creates the Flask app, serves `index.html` and the `static/` files, defines the JSON routes (see **API Routes** below), and starts the deadline watcher thread once on startup.
PRD ref: all behavior headings, as the app's single point of contact with the data.

#### Database layer — `db.py` + `schema.sql`
Opens `smart.db`, creates the tables from `schema.sql` if they don't exist yet, and holds the small query functions (`list_cards`, `insert_subscription`, `mark_cancelled`, …). It's the only file that writes SQL.
PRD ref: `prd.md > States and Boundaries` (persistence).

#### Reminder logic — `reminders.py`
Decides *whether* a reminder is due. It never sends anything itself.
- All times are in the person's chosen time zone (`settings.time_zone`, e.g. `Africa/Lagos`), worked out with Python's `zoneinfo`; if none is set yet, the server's own clock. `local_now()` gives "now" in that zone.
- **The rule** for an active subscription: its possible reminders are 2 days before and 1 day before the deadline, plus a "today" reminder on the deadline only if **no** reminder was sent at all. Each one happens at the subscription's `reminder_time` on that day.
  - `next_reminder(sub, now)` picks the earliest of those that hasn't been sent and whose day isn't already over.
  - If that moment has passed (`<= now`) → send it. If it's still ahead → it's "scheduled" for that moment.
  - After the deadline day → no email. The app shows it under Needs attention.
- A lock makes sure the save-time check and the background check can't send the same reminder twice at the same moment.
- After a successful send, it stores `last_reminded_days` (2, 1 or 0), so the same reminder is never sent twice. It also only sends a closer reminder than the last one (saving with 1 day left sends the 1-day email, not the 2-day one).
- `check_one(sub_id)` runs on save, edit and renew, and returns `sent`, `scheduled` (with when), `not_due` or `failed`. `check_all()` runs on startup and every 60 seconds. `start_watcher()` is the background loop: `while True: check_all(); sleep(60)`.
- Cancelled subscriptions are skipped, which is how "reminders stop once updated" happens. Renewing sets a new deadline and clears `last_reminded_days`, which is how "reminders continue for the new date" happens.

PRD ref: `prd.md > Reminder Emails`, `prd.md > In-App Reminder and the "Needs Check" Loop`.

#### Mailer — `mailer.py`
Builds and sends one email.
1. Fill in `templates/email/reminder.txt` and `reminder.html` (Jinja, via Flask's `render_template`) with: the subscription name, when it renews ("in 2 days" / "tomorrow" / "today"), cost, card nickname, how to cancel (the link for a website, or "open the [app] app" for an app), and an **Open Smart** button linking to `APP_URL`.
2. Put it in an `EmailMessage` with a plain-text body plus an HTML version, From = your Gmail, To = the reminder email, Subject e.g. "Netflix renews tomorrow — cancel here if you don't want it."
3. `smtplib.SMTP_SSL("smtp.gmail.com", 465)` (encrypted from the first moment) → `login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)` → `send_message(msg)` → close.
4. Return success or failure. On failure, `reminders.py` does **not** mark it sent, so the next check retries.

PRD ref: `prd.md > Reminder Emails`.

## API Routes

All JSON. Errors come back as `{"error": "message", "field": "fieldName"}` with status 400, so the form can show the message next to the right field.

| Method & path | Body | Returns | Used by |
|---|---|---|---|
| `GET /api/state` | — | `{ email, cards: [...], subscriptions: [...] }` (active and cancelled) | app start, after any refresh |
| `PUT /api/settings` | `{ email?, time_zone? }` (either or both) | `{ email, time_zone }` | add form (first time), Reminder settings sheet, Profile |
| `POST /api/cards` | `{ nickname, bank, name_on_card }` | the card | card form |
| `PUT /api/cards/<id>` | same | the card | card form (edit) |
| `POST /api/subscriptions` | `{ name, monthly_cost, is_trial, deadline, reminder_time, card_id, source_type, source_value }` | `{ subscription, reminder: "sent" \| "scheduled" \| "not_due" \| "failed", reminder_at }` (`reminder_at` = `'YYYY-MM-DDTHH:MM'` when scheduled) | add form |
| `PUT /api/subscriptions/<id>` | same fields | same | edit form |
| `POST /api/subscriptions/<id>/cancel` | — | the subscription | Needs attention, Details |
| `POST /api/subscriptions/<id>/renew` | `{ deadline }` | `{ subscription, reminder }` | renew sheet |

Saving a subscription is refused (400, field `email` or `time_zone`) if no reminder email or time zone is set. That's the server-side half of "no email yet." Editing a deadline also clears `last_reminded_days`, so reminders follow the new date.

## Data Model

`smart.db`, three tables:

```sql
settings      (key TEXT PRIMARY KEY, value TEXT)            -- rows: 'reminder_email', 'time_zone'
cards         (id INTEGER PRIMARY KEY,
               nickname TEXT NOT NULL, bank TEXT NOT NULL, name_on_card TEXT NOT NULL,
               created_at TEXT NOT NULL)
subscriptions (id INTEGER PRIMARY KEY,
               card_id INTEGER NOT NULL REFERENCES cards(id),
               name TEXT NOT NULL,
               monthly_cost_cents INTEGER NOT NULL,        -- 15.49 stored as 1549, so totals never drift
               is_trial INTEGER NOT NULL DEFAULT 0,        -- 0/1
               deadline TEXT NOT NULL,                     -- 'YYYY-MM-DD' trial end / next billing date
               source_type TEXT NOT NULL,                  -- 'website' | 'app'
               source_value TEXT NOT NULL,                 -- cancel link, or app name
               status TEXT NOT NULL DEFAULT 'active',      -- 'active' | 'cancelled'
               cancelled_on TEXT,                          -- 'YYYY-MM-DD' when marked cancelled
               reminder_time TEXT NOT NULL DEFAULT '09:00', -- 'HH:MM' local time the reminders go out
               last_reminded_days INTEGER,                 -- 2, 1, 0, or NULL = none sent for this deadline
               created_at TEXT NOT NULL)
```

There's no separate "needs check" status. It's worked out from `status = 'active'` plus 2 or fewer days left, so it can never get out of date.

| Data | Lives in | Updated by | When you leave and come back |
|---|---|---|---|
| Cards, subscriptions, statuses, email | `smart.db` on the laptop | The API routes | Still there. `GET /api/state` reloads it |
| "Which reminder was sent" | `subscriptions.last_reminded_days` | `reminders.py` after a successful send | Remembered, so no duplicate emails after a restart |
| Totals, time left, Needs attention | Calculated in the browser from the loaded data | Recalculated on every redraw | Recalculated, never stored |
| Which card is showing, which screen is open | Browser memory / URL hash | Swiping and navigating | Resets to the first card on Home |
| "Has seen the landing page" | Browser `localStorage` (`smart_seen_landing`) | The landing button | Stays, so Smart opens straight to Home |
| Gmail address, app password, `APP_URL` | `.env` (never committed) | You, by hand | Read when the server starts |

## File Structure

```
AI Basics/
├── app.py                  # Flask server: serves the app, JSON API routes, starts the deadline watcher
├── db.py                   # The only file that talks to SQLite: open, create tables, queries
├── schema.sql              # Table definitions for settings, cards, subscriptions
├── reminders.py            # "Is a reminder due?" rule, check_one / check_all, once-a-minute watcher loop
├── mailer.py               # Builds the email and sends it through Gmail SMTP
├── requirements.txt        # flask, python-dotenv, tzdata
├── .env.example            # GMAIL_ADDRESS=, GMAIL_APP_PASSWORD=, APP_URL=http://localhost:5000
├── .env                    # Your real values (git-ignored, never pushed)
├── .gitignore              # .env, smart.db, .venv/, __pycache__/
├── smart.db                # Created on first run (git-ignored)
├── templates/
│   ├── index.html          # The one page: Tailwind + @theme palette, screen containers, floating nav
│   └── email/
│       ├── reminder.html   # The reminder email's HTML version (Open Smart button)
│       └── reminder.txt    # Plain-text version for mail apps that don't show HTML
├── static/
│   ├── css/
│   │   └── styles.css      # Things Tailwind doesn't cover neatly: card sheen/texture, scroll snap, transitions
│   ├── img/
│   │   └── networks.svg    # Decorative card-network marks
│   └── js/
│       ├── app.js          # Start-up, in-memory state, screen switching
│       ├── api.js          # fetch wrappers for each route
│       ├── format.js       # Money, dates, time left, totals, sorting, needsAttention
│       └── screens/
│           ├── landing.js
│           ├── home.js     # Needs attention, card carousel, rows, overall total
│           ├── forms.js    # Subscription, card, and renew forms + validation
│           ├── details.js
│           ├── profile.js
│           └── history.js
├── README.md               # What Smart is, setup, how to run, how to get a Gmail app password
└── devpost/                # Devpost learning workspace (planning docs)
```

## External Services and Dependencies

### Gmail SMTP
- **Server:** `smtp.gmail.com`, port `465` with SSL. (Port `587` with STARTTLS also exists, but it timed out on the learner's network during the build.)
- **Auth:** your Gmail address + a 16-character **app password** (Google Account → Security → 2-Step Verification → App passwords). Not your normal Gmail password.
- **Call:** `smtplib.SMTP_SSL(host, 465)` → `.login(user, app_password)` → `.send_message(EmailMessage)` → `.quit()`.
- **Limits:** personal Gmail allows roughly 500 recipients a day, far more than the demo needs. Free.
- **Docs:** [Sign in with app passwords](https://support.google.com/accounts/answer/185833) · [Python smtplib](https://docs.python.org/3/library/smtplib.html) · [Python email examples](https://docs.python.org/3/library/email.examples.html)

### Tailwind CSS v4 browser build (CDN)
- One `<script>` in `index.html`, plus a `<style type="text/tailwindcss">` block holding `@theme`. No key, free. Needs internet while the page loads.
- **Docs:** [Play CDN](https://tailwindcss.com/docs/installation/play-cdn)

### Google Fonts (Inter)
- One `<link>` in `index.html`. Free, no key. Falls back to the system font offline.

### Python packages
- `flask` 3.x ([docs](https://flask.palletsprojects.com/)), `python-dotenv` ([docs](https://pypi.org/project/python-dotenv/)), `tzdata` (the world's time-zone rules, which Windows doesn't ship to Python; [zoneinfo docs](https://docs.python.org/3/library/zoneinfo.html)). Everything else (`sqlite3`, `smtplib`, `email`, `threading`) is built into Python.

## Important Failure Modes

- **Gmail refuses the login or the send** (wrong app password, 2-Step Verification off, no internet) → the subscription **still saves**. The app shows a soft note: "Saved. The reminder email couldn't be sent — check the email settings in `.env`." The server prints the exact error in the terminal, and the reminder isn't marked sent, so the next check (a minute later) retries. The first build step tests sending before anything else depends on it.
- **The server was off when a reminder was due** → it runs `check_all()` on startup and sends whatever is still due. If the deadline has already passed, no email goes out, but the subscription appears under Needs attention.
- **"Open Smart" opened on a phone** → the link points to `http://localhost:5000`, which only exists on the laptop. For the demo, open the email on the laptop. `APP_URL` in `.env` can be changed later (for example to a live address) without touching code.
- **Tailwind fails to load (offline)** → the layout loses most of its styling. Record the demo with internet on. `styles.css` keeps the card and nav basics readable.
- **Two copies of the watcher** → Flask's auto-reload in debug mode starts the program twice. The watcher only starts in the real process (or reload is turned off), so emails aren't doubled.

## What Was Simplified and Why

- **One database file on the laptop** instead of a hosted database. One person, one device, and no infrastructure. A multi-user version would need accounts and a hosted database.
- **A once-a-minute loop inside the server** instead of a separate scheduling service. Reminders happen at a chosen minute, and checking a small table every minute costs nothing. A production version would run the check on an always-on host.
- **Gmail SMTP** instead of a dedicated email service. Free, works for any address, and teaches the real mechanism. For a real product, swap `mailer.py` to an email API with your own domain. The rest of the code doesn't change.
- **Tailwind from a CDN link** instead of a Tailwind build setup. No Node tooling needed. For production, switch to Tailwind's command-line build.
- **Run locally and record** instead of deploying. Submission needs the video and repository, not a live link.
- **The demo uses the real path:** saving a subscription that expires today triggers a real email through the same code as the background check, and a reminder time two minutes ahead shows the background check sending it by itself. Nothing is faked.

## Decisions and Open Issues

**Learner choices (agreed in this conversation):**
- **Phone-first web app** rather than an installable phone app. Builds everything in the PRD with known tools, at the cost of living in a browser tab.
- **Python + Flask** for the server. Readable email logic, at the cost of using two languages.
- **Gmail + SMTP** for email. Chosen to learn how email sending actually works. Reminders come from the learner's Gmail address.
- **Plain HTML/CSS/JS** for the screens, plus **Tailwind** (the learner asked for a styling library that keeps it from looking generic).
- **Run locally and record.** Deployment isn't planned now and can be revisited in `6-ship`.

**Recommended by Claude, accepted by the learner:** the two-part frontend + server shape with an SQLite file, and the background deadline check with catch-up on startup (hourly at first, changed to every minute when per-subscription reminder times were added during the build).

**Implementation details derived from those choices (Claude):** a background thread instead of a scheduler library, money stored in cents, `last_reminded_days` to prevent duplicates, "needs attention" calculated rather than stored, URL-hash screen switching, the `@theme` palette values, and the route list above.

**The learner's open question: how does sending an email actually work?** The learner named the email logic as what they most want to understand and own. It was clarified in conversation as a five-step path: find due reminders → write the email → connect to `smtp.gmail.com`, encrypt, log in with the app password → hand over the message → record it as sent. **To check during the build:** the first build step sends one real test email from a tiny script using `mailer.py`, so the learner sees each step work (and sees what the error looks like when the password is wrong) before the rest of the app relies on it.

**Still open:** none blocking. Carried from `prd.md > Open Questions`: none. To verify early in the build: Gmail app-password availability on the learner's account, and the current Tailwind v4 browser script URL.
