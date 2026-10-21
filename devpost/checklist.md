---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. A real reminder email from Smart lands in your inbox**
  Becomes usable: A small test script, using Smart's own mailer, sends a real reminder email (plain text + the calm black-and-white HTML version with an "Open Smart" button) from your Gmail to your inbox. A wrong app password produces a clear error instead of a crash.
  Why now: Gmail SMTP is the riskiest, least familiar piece (app passwords, 2-Step Verification) and the thing you most want to understand. If it doesn't work, we find out before anything else depends on it. Project setup (virtual environment, requirements, `.env`, `.gitignore`) happens here too.
  PRD ref: `prd.md > Reminder Emails`
  Spec ref: `spec.md > Mailer — mailer.py`, `spec.md > External Services and Dependencies` (Gmail SMTP), `spec.md > Where It Runs and How Someone Tries It`, `spec.md > File Structure`
  Build: Create `.venv`, `requirements.txt` (flask, python-dotenv), `.env.example`, extend `.gitignore` (smart.db, .venv/, __pycache__/); write `mailer.py` (render `templates/email/reminder.txt` + `reminder.html` via Flask's `render_template`, build an `EmailMessage`, SMTP 587 → STARTTLS → login → send → quit, return success/failure with the error printed); add `send_test_email.py` that sends a sample "Netflix renews today" reminder to an address you choose.
  Verify (mechanical): `pip install -r requirements.txt` succeeds; `python send_test_email.py <your address>` reports success (SMTP accepted the message); running it with a deliberately wrong password reports a readable failure and exits without a traceback.
  Learner check: Put your Gmail address and app password in `.env`, run `python send_test_email.py your@email`, then open Gmail: you should see "Netflix renews today…" with the cancel link and a black "Open Smart" button. Tell me how the email looks and reads.
  Commit: `Send a real reminder email through Gmail SMTP`

- [x] **2. Add a card and a subscription, and see it sitting under that card**
  Becomes usable: Running `python app.py` and opening `http://localhost:5000` shows Home with the vertical floating nav. Tapping + opens the subscription form; you can create a card from inside it ("New card…") without losing what you typed, give your reminder email the first time, and save. The subscription appears under its card with the card's monthly total and the overall total. Everything is still there after restarting the server.
  Why now: This is the unique kernel — which card is exposed — so it comes right after the risky email check. It also brings up the whole app shape (Flask, SQLite, page shell, black-and-white theme) that every later slice builds on.
  PRD ref: `prd.md > The Core Journey` (steps 2–4), `prd.md > Cards`, `prd.md > Adding and Editing Subscriptions`, `prd.md > Monthly Totals`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components` (Page shell, App controller, API helper, Formatting and totals, Home screen, Forms, Web server and routes, Database layer), `spec.md > API Routes`, `spec.md > Data Model`, `spec.md > Look and Feel`
  Build: `app.py` serving `index.html`/static and `GET /api/state`, `PUT /api/settings`, `POST /api/cards`, `POST /api/subscriptions` with server-side validation; `db.py` + `schema.sql`; `templates/index.html` with Tailwind v4 browser build and the `@theme` palette; `static/js/app.js`, `api.js`, `format.js`; `screens/home.js` (one card drawn as a polished card, rows, totals, empty states); `screens/forms.js` (subscription form, card sheet, inline email, field validation); floating nav.
  Verify (mechanical): Start the server with no errors; use the API (curl/Python) to confirm validation rejects a bad link/email/cost with `{error, field}` and 400, that a valid card and subscription save, that `GET /api/state` returns them, and that they're still returned after a server restart; load the page in a browser and confirm no console errors and the subscription renders under its card with correct totals.
  Learner check: Start Smart, tap +, add "Spotify, 10.99, website link" on a new card called "Side card," giving your email when asked. You should see it under the Side card with 10.99 as the card total and the overall total. Stop and restart the server, reload — it's still there.
  Commit: `Add cards and subscriptions grouped by card with totals`

- [x] **3. Swipe between cards and see what each one is carrying**
  Becomes usable: With two or more cards, Home shows a snapping card carousel; swiping changes the list below to that card's subscriptions. Cards look like real polished cards (sheen, texture, decorative network marks). Rows show "Trial" labels with trials first, time left (days, or months when far off), and the renewal date.
  Why now: Seeing "main card vs side card" side by side is the heart of the kernel, and the card look is the visual centerpiece — a good moment for your early feedback while there's still plenty of build left to adjust.
  PRD ref: `prd.md > The Core Journey` (step 5), `prd.md > Cards`, `prd.md > Adding and Editing Subscriptions` (row content and ordering), `prd.md > Look and Feel`
  Spec ref: `spec.md > Home screen — static/js/screens/home.js`, `spec.md > Formatting and totals — static/js/format.js`, `spec.md > Look and Feel`
  Build: CSS scroll-snap carousel with `IntersectionObserver` switching the visible card; card illustration in `styles.css` + `static/img/networks.svg`; trials-first sorting, time-left and renewal-date text in `format.js`; soft row animations respecting reduced motion.
  Verify (mechanical): Run small checks of `format.js` (time left in days vs months, sorting trials first, card and overall totals from sample data) with Node or in the browser console; load the page with two cards of data and confirm both slides render, the list switches when the second card is scrolled into view, and there are no console errors.
  Learner check: Add a second card ("Main card") with a trial on it. Swipe between the two cards: the list and card total should change with each, and the trial should say "Trial" and sit at the top. Tell me what you notice about the look and feel, and what you'd change.
  Commit: `Add swipeable card carousel with polished cards and row details`

- [ ] **4. Saving something due soon emails you right away, and Smart keeps watching deadlines**
  Becomes usable: Saving a subscription whose deadline is today, tomorrow, or in 2 days sends the reminder email immediately (the demo path). The server also checks every hour and on startup, sends the 2-day and 1-day reminders exactly once, and never for cancelled subscriptions. If Gmail fails, the subscription still saves with a soft note.
  Why now: This connects the email from slice 1 to real subscriptions — the moment Smart becomes useful on its own. It needs subscriptions and cards to exist first.
  PRD ref: `prd.md > Reminder Emails`, `prd.md > The Core Journey` (step 6)
  Spec ref: `spec.md > Reminder logic — reminders.py`, `spec.md > Mailer — mailer.py`, `spec.md > Important Failure Modes`, `spec.md > Data Model` (`last_reminded_days`)
  Build: `reminders.py` (`days_left`, the send rule, `check_one`, `check_all`, `start_watcher` background thread started once, not doubled by reload); call `check_one` after saving a subscription and return `reminder: sent | not_due | failed`; show "Reminder sent" or the soft failure note in the app.
  Verify (mechanical): Unit-style checks of the rule with a stubbed mailer (2 days → send, then 1 day → send, same day again → no send, 0 days with none sent → send, past due → no send, cancelled → skip, failure → not marked sent); a real save of a subscription due today through the API sends one real email and returns `reminder: "sent"`; restarting the server does not resend it.
  Learner check: In Smart, add "Netflix, free trial, expires today" with its plans link. You should see a "reminder sent" note, and within a minute the email should be in your Gmail with the Netflix link. Restart the server — no second email.
  Commit: `Send reminders on save and watch deadlines hourly`

- [ ] **5. "Have you cancelled this?" — cancel it or say it renewed**
  Becomes usable: Anything due within 2 days or past due rises into a "Needs attention" section at the top of Home. "Yes, cancelled" removes it from the active list and the card and overall totals drop. "It renewed" asks for the next billing date; it goes back to active with the new date and reminders resume for it.
  Why now: This closes the core loop — reminder → act → totals drop — which is the success moment of the demo.
  PRD ref: `prd.md > In-App Reminder and the "Needs Check" Loop`, `prd.md > Monthly Totals`
  Spec ref: `spec.md > Home screen — static/js/screens/home.js`, `spec.md > Forms — static/js/screens/forms.js` (renew sheet), `spec.md > API Routes` (cancel, renew), `spec.md > Reminder logic — reminders.py`
  Build: `POST /api/subscriptions/<id>/cancel` and `/renew` (renew sets the new deadline, clears `last_reminded_days`, runs `check_one`); Needs attention section with both actions; renew date sheet; totals redraw.
  Verify (mechanical): API checks that cancel sets `status=cancelled` and `cancelled_on`, renew updates the deadline and clears `last_reminded_days`, and a renewed date within 2 days triggers a reminder; `format.js` `needsAttention` returns true for 2/1/0/past-due active subscriptions and false for cancelled; page loads with no console errors and the section appears only when needed.
  Learner check: Your Netflix from step 4 should now sit at the top asking "Have you cancelled this?" Tap "Yes, cancelled" — it disappears and the totals drop. Add another short trial, tap "It renewed," pick a date a month away — it returns to the normal list with the new date.
  Commit: `Add needs-attention check with cancel and renew`

- [ ] **6. Open a subscription to see the details and edit it**
  Becomes usable: Tapping a row opens a calm details view (cost, card, dates, time left, how to cancel as a tappable link or "Cancel in the [app] app") with Edit, "Yes, cancelled," and "It renewed." Editing a subscription or a card updates Home immediately; changing a deadline resets its reminders.
  Why now: Rows stay minimal by design, so details and editing come once the main loop works.
  PRD ref: `prd.md > Screens and Layout` (Subscription details), `prd.md > Adding and Editing Subscriptions` (editing)
  Spec ref: `spec.md > Details screen — static/js/screens/details.js`, `spec.md > Forms — static/js/screens/forms.js`, `spec.md > API Routes` (`PUT /api/subscriptions/<id>`, `PUT /api/cards/<id>`)
  Build: `screens/details.js`; edit mode for the subscription and card forms; the two PUT routes with validation, clearing `last_reminded_days` when the deadline changes and running `check_one`; URL-hash navigation so the back button works.
  Verify (mechanical): API checks that both PUT routes update fields, reject invalid input with 400, and that a changed deadline clears `last_reminded_days`; in the browser, open a details view, edit the cost, and confirm Home and totals reflect it with no console errors; browser back returns to Home.
  Learner check: Tap a subscription, check the details read clearly, tap Edit, change its price, save — Home and the totals should show the new price. Tap the cancel link in details and it should open the service's page.
  Commit: `Add subscription details and editing`

- [ ] **7. Landing page, Profile, and Cancelled history**
  Becomes usable: A first visit shows the calm "Smart — Be way ahead." landing page with one way in; later visits go straight to Home. The profile icon and nav open Profile with your editable reminder email, overall monthly total, active subscription count, and card count, plus a way into Cancelled history listing each cancelled subscription with its card and date.
  Why now: These complete the full journey around the working core; none of them change how tracking or reminders work.
  PRD ref: `prd.md > Landing Page`, `prd.md > Profile`, `prd.md > Cancelled History`, `prd.md > The Core Journey` (steps 1 and 8)
  Spec ref: `spec.md > Landing screen — static/js/screens/landing.js`, `spec.md > Profile screen — static/js/screens/profile.js`, `spec.md > Cancelled history screen — static/js/screens/history.js`, `spec.md > Look and Feel`
  Build: `screens/landing.js` with the `smart_seen_landing` note; `screens/profile.js` with email editing via `PUT /api/settings` and summary stats; `screens/history.js` newest first; soft screen transitions; `README.md` with setup and Gmail app-password steps.
  Verify (mechanical): In a fresh browser profile (cleared `localStorage`) the landing page shows, and after tapping through and reloading it doesn't; `PUT /api/settings` rejects an invalid email and saves a valid one; Profile stats match sample data; history lists cancelled items newest first and they're excluded from totals; no console errors on any screen.
  Learner check: Open Smart in a private window — you should see the landing page first. Tap through, open Profile, change your reminder email, and open Cancelled history: Netflix should be there with its card and the date you cancelled it.
  Commit: `Add landing page, profile, and cancelled history`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 3 (two cards, swiping, the card look), so feedback on the feel can shape the rest. Feedback: loved the look; asked for a reminder time so a live demo can show an email arriving on its own (see Revisions).
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions
