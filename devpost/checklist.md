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

- [x] **4. Reminders arrive at the time you chose, on their own**
  Becomes usable: Each subscription has a "Remind me at" time. After saving, Smart either sends the reminder right away (already due) or says when it will arrive ("Reminder set for 14:32 today"), and the server's once-a-minute check sends it at that time without anyone touching the app. The 2-day, 1-day and "today" reminders each go out exactly once, never for cancelled subscriptions. If Gmail fails, the subscription still saves with a soft note and the next check retries.
  Why now: This connects the email from slice 1 to real subscriptions — the moment Smart becomes useful on its own. It needs subscriptions and cards to exist first.
  PRD ref: `prd.md > Reminder Emails`, `prd.md > The Core Journey` (step 6)
  Spec ref: `spec.md > Reminder logic — reminders.py`, `spec.md > Mailer — mailer.py`, `spec.md > Important Failure Modes`, `spec.md > Data Model` (`last_reminded_days`)
  Build: `reminder_time` column (added to an existing `smart.db` automatically); "Remind me at" field in the form with validation on both sides; `reminders.py` (`next_reminder`, `check_one`, `check_all`, a lock against double sends, `start_watcher` background thread checking every 60 seconds, started once); call `check_one` after saving and return `reminder: sent | scheduled | not_due | failed` with `reminder_at`; show a soft note in the app (sent / set for a time / couldn't send).
  Verify (mechanical): Unit-style checks of the rule with a stubbed mailer and fixed clocks (2 days before the time → scheduled, at/after the time → send once, then 1 day → send, same day again → no send, today with none sent → send, today after an earlier reminder → nothing, past due → no send, cancelled → skip, failure → not marked sent and retried); a real save through the API with a reminder time 1–2 minutes ahead returns `scheduled` and the background watcher sends one real email at that time; a save due today with the time already passed returns `sent`; restarting the server does not resend.
  Learner check: In Smart, add "Netflix, free trial, expires today" with its plans link and "Remind me at" set two minutes from now. You should see "Reminder set for …". Leave Smart alone; at that time the email should arrive in Gmail with the Netflix link. Restart the server — no second email.
  Commit: `Send reminders at their chosen time and watch deadlines every minute`

- [x] **5. "Have you cancelled this?" — cancel it or say it renewed**
  Becomes usable: Anything due within 2 days or past due rises into a "Needs attention" section at the top of Home. "Yes, cancelled" removes it from the active list and the card and overall totals drop. "It renewed" asks for the next billing date; it goes back to active with the new date and reminders resume for it.
  Why now: This closes the core loop — reminder → act → totals drop — which is the success moment of the demo.
  PRD ref: `prd.md > In-App Reminder and the "Needs Check" Loop`, `prd.md > Monthly Totals`
  Spec ref: `spec.md > Home screen — static/js/screens/home.js`, `spec.md > Forms — static/js/screens/forms.js` (renew sheet), `spec.md > API Routes` (cancel, renew), `spec.md > Reminder logic — reminders.py`
  Build: `POST /api/subscriptions/<id>/cancel` and `/renew` (renew sets the new deadline, keeps the reminder time, clears `last_reminded_days`, runs `check_one`); Needs attention section with both actions; renew date sheet; totals redraw.
  Verify (mechanical): API checks that cancel sets `status=cancelled` and `cancelled_on`, renew updates the deadline and clears `last_reminded_days`, and a renewed date within 2 days triggers a reminder; `format.js` `needsAttention` returns true for 2/1/0/past-due active subscriptions and false for cancelled; page loads with no console errors and the section appears only when needed.
  Learner check: Your Netflix from step 4 should now sit at the top asking "Have you cancelled this?" Tap "Yes, cancelled" — it disappears and the totals drop. Add another short trial, tap "It renewed," pick a date a month away — it returns to the normal list with the new date.
  Commit: `Add needs-attention check with cancel and renew`

- [x] **6. Open a subscription to see the details and edit it**
  Becomes usable: Tapping a row opens a calm details view (cost, card, dates, time left, how to cancel as a tappable link or "Cancel in the [app] app") with Edit, "Yes, cancelled," and "It renewed." Editing a subscription or a card updates Home immediately; changing a deadline resets its reminders.
  Why now: Rows stay minimal by design, so details and editing come once the main loop works.
  PRD ref: `prd.md > Screens and Layout` (Subscription details), `prd.md > Adding and Editing Subscriptions` (editing)
  Spec ref: `spec.md > Details screen — static/js/screens/details.js`, `spec.md > Forms — static/js/screens/forms.js`, `spec.md > API Routes` (`PUT /api/subscriptions/<id>`, `PUT /api/cards/<id>`)
  Build: `screens/details.js`; edit mode for the subscription and card forms; the two PUT routes with validation, clearing `last_reminded_days` when the deadline or reminder time changes and running `check_one`; URL-hash navigation so the back button works.
  Verify (mechanical): API checks that both PUT routes update fields, reject invalid input with 400, and that a changed deadline clears `last_reminded_days`; in the browser, open a details view, edit the cost, and confirm Home and totals reflect it with no console errors; browser back returns to Home.
  Learner check: Tap a subscription, check the details read clearly, tap Edit, change its price, save — Home and the totals should show the new price. Tap the cancel link in details and it should open the service's page.
  Commit: `Add subscription details and editing`

- [x] **7. Landing page, Profile, and Cancelled history**
  Becomes usable: A first visit shows the calm "Smart — Be way ahead." landing page with one way in; later visits go straight to Home. The profile icon and nav open Profile with your editable reminder email, overall monthly total, active subscription count, and card count, plus a way into Cancelled history listing each cancelled subscription with its card and date.
  Why now: These complete the full journey around the working core; none of them change how tracking or reminders work.
  PRD ref: `prd.md > Landing Page`, `prd.md > Profile`, `prd.md > Cancelled History`, `prd.md > The Core Journey` (steps 1 and 8)
  Spec ref: `spec.md > Landing screen — static/js/screens/landing.js`, `spec.md > Profile screen — static/js/screens/profile.js`, `spec.md > Cancelled history screen — static/js/screens/history.js`, `spec.md > Look and Feel`
  Build: `screens/landing.js` with the `smart_seen_landing` note; `screens/profile.js` with email editing via `PUT /api/settings` and summary stats; `screens/history.js` newest first; soft screen transitions; `README.md` with setup and Gmail app-password steps.
  Verify (mechanical): In a fresh browser profile (cleared `localStorage`) the landing page shows, and after tapping through and reloading it doesn't; `PUT /api/settings` rejects an invalid email and saves a valid one; Profile stats match sample data; history lists cancelled items newest first and they're excluded from totals; no console errors on any screen.
  Learner check: Open Smart in a private window — you should see the landing page first. Tap through, open Profile, change your reminder email, and open Cancelled history: Netflix should be there with its card and the date you cancelled it.
  Commit: `Add landing page, profile, and cancelled history`

- [x] **8. Every visitor gets their own private Smart, already filled in**
  Becomes usable: In demo mode (`DEMO_MODE=1`), the first visit gives that browser its own private space (a cookie, no sign-in), seeded with two cards, a few trials and subscriptions (one due tomorrow, one trial on the protected main card) and one cancelled item. Visitors never see each other's data. Without demo mode (your laptop), Smart works exactly as before, and your existing `smart.db` moves into a single local space with nothing lost.
  Why now: Hosting Smart for judges is unsafe without it (one shared notebook, one reminder email, anyone could use your Gmail), and every later slice builds on spaces.
  PRD ref: `prd.md > Live Demo for Judges`
  Spec ref: `spec.md > Live Demo Mode`, `spec.md > Data Model`
  Build: `spaces` and `space_settings` tables; `space_id` on cards and subscriptions; automatic migration of an existing `smart.db` into the `local` space; every `db.py` query scoped to a space; the server picks the space from a cookie (demo) or uses `local`; reminders look up email and time zone per space; sample data seeded for new demo spaces; the app sets the visitor's detected time zone automatically in demo mode.
  Verify (mechanical): Migration check on a copy of an old-format database (data kept, all in `local`); API checks that two different cookies see only their own cards and subscriptions and can't read or change each other's by id; a new demo space has the sample data; the reminder rule checks still pass; local mode (no `DEMO_MODE`) behaves as before; browser walkthrough of a fresh demo visit with a clean console.
  Learner check: Run Smart in demo mode, open it in a normal window and in a private window: each should show its own sample Smart, and a change in one shouldn't appear in the other. Then run it normally and confirm your own data is all still there.
  Commit: `Give every demo visitor a private, pre-filled space`

- [x] **9. Watch a reminder arrive in the Demo inbox**
  Becomes usable: In demo mode, reminders land in a Demo inbox inside Smart, shown exactly as the email would look, at the time the visitor chose; the sample data already has one waiting. A visitor can optionally add their real email to also receive it, capped per space per day to protect the sender's Gmail. Smart notices new inbox items while open and says so.
  Why now: Judges shouldn't have to hand over a real email to see the core promise, a reminder arriving on its own.
  PRD ref: `prd.md > Live Demo for Judges`, `prd.md > Reminder Emails`
  Spec ref: `spec.md > Live Demo Mode`, `spec.md > Reminder logic — reminders.py`
  Build: `inbox` table; the reminder check stores each reminder in the inbox in demo mode and only sends real email when the space has an address and is under the cap; email optional in demo; inbox screen (list + the email rendered safely in a sandboxed frame); polling for new items with a calm note; "Reminders go to your Demo inbox" wording.
  Verify (mechanical): Rule checks with a fake mailer (demo: stored in inbox, real email only with an address and under the cap; local: unchanged); a scheduled reminder 1–2 minutes ahead appears in the inbox via the background watcher; inbox items are private to their space; browser check of the inbox and the arrival note with a clean console.
  Learner check: In demo mode, add a trial ending today with "Remind me at" two minutes ahead, leave Smart open, and watch the note appear; open the Demo inbox and read the reminder.
  Commit: `Add the Demo inbox for reminders`

- [ ] **10. Smart is live on the internet**
  Becomes usable: A public link where anyone can open Smart in demo mode, with the reminder watcher always running and data kept across restarts.
  Why now: Judges asked to try it directly; this only makes sense once visitors are kept separate (slices 8–9).
  PRD ref: `prd.md > Live Demo for Judges`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Live Demo Mode`
  Build: Choose a host with the learner (always-on, persistent disk for `smart.db`, cost agreed first); a production web server; secrets set in the host's settings, never in code; `APP_URL` set to the live address; README deployment notes.
  Verify (mechanical): The live URL loads without signing in; two fresh browsers get separate sample spaces; a reminder scheduled 1–2 minutes ahead lands in the Demo inbox on the live site; data survives a redeploy/restart; no secrets in the repository.
  Learner check: Open the live link on your phone and in a private window on your laptop, try the core journey, and watch a reminder arrive in the Demo inbox.
  Commit: `Deploy Smart for the live demo`

- [x] **11. A short guided tour on first visit**
  Becomes usable: After the landing page, a soft spotlight walks a first-time visitor through the card, the totals, Needs attention, the + button and Profile, with Next and Skip; it shows once and can be replayed from Profile.
  Why now: Last, because it's the most optional: if the night runs long, Smart ships without it and still works.
  PRD ref: `prd.md > Live Demo for Judges`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Live Demo Mode`, `spec.md > Look and Feel`
  Build: `static/js/tour.js` (spotlight, step card, Next/Skip/Done, seen-flag in the browser), steps tied to the existing Home and nav elements, "Replay tour" in Profile, styles in Smart's pressed-in look, respecting reduced motion.
  Verify (mechanical): Browser walkthrough of every step on a fresh visit; it doesn't return after finishing or skipping; Replay works; keyboard (Esc/Enter) works; clean console.
  Learner check: Open Smart in a private window, follow the tour to the end, then replay it from Profile.
  Commit: `Add a first-visit guided tour`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 3 (two cards, swiping, the card look), so feedback on the feel can shape the rest. Feedback: loved the look; asked for a reminder time so a live demo can show an email arriving on its own (see Revisions).
- [ ] Live demo explored on the public link (after slices 8–11)
- [x] Final kick-the-tires exploration and feedback completed (learner explored, asked for number-only cost, no past dates, and native-feeling pickers; all built, verified and retried)

## Final Review

- [x] Monthly cost field only accepts numbers as you type (digits and one decimal point, max 2 decimals) — learner found letters could be typed
- Website link: learner reviewed and chose to keep requiring the full https:// link (copied from the browser) to avoid wrong websites — no change
- [x] Billing dates can't be before today (add, edit if the date changes, renew; client and server) — learner: a past next-billing date is a logical error
- [x] Custom date and time pickers in Smart's own soft pressed-in style, replacing the browser's generic ones — learner: they should feel native to the app
- [x] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Guided route offered, tied to the learner's goal of understanding how email sending works: follow "save a subscription that's due" to the email. Stops were shared with live links; the learner engaged with the optional edit (liked the "Heads up" subject idea). Whether they walked every stop in the editor wasn't confirmed. Practice connected to real build evidence: `send_test_email.py` proving Gmail first (slice 1), and the port 587/465 connection test that separated a network problem from a code problem (Revisions).
Route and stops: `static/js/screens/forms.js` `api.saveSubscription(values)` → `static/js/api.js` `saveSubscription` → `app.py` `post_subscription` / `reminders.check_one` → `reminders.py` `next_reminder`, `_check` (`db.mark_reminded`) → `mailer.py` `build_reminder`, `send` (`SMTP_SSL`, `login`, `send_message`). Shared as a guided route; completion of each stop not confirmed.
Edit outcome: Kept. Learner chose the "Heads up" subject idea; the agent applied it at their request (`mailer.py` `build_reminder`: "Heads up: {name} renews {when}"). Verified all three subjects (in 2 days / tomorrow / today) render; committed b4b7681.
Reflection: offered and answered (kept in the private learner profile).
Activity mode: live app and editor (guided route with clickable code links).

## Revisions

- Added a per-subscription "Remind me at" time and changed the deadline check from hourly to every minute (PRD Reminder Emails, spec Reminder logic/Data Model/API, slice 4) — at the early checkpoint the learner found that "expires today" only proves send-on-save; for a real live demo they want to watch a reminder arrive on its own at a chosen time. They chose per subscription over one global time. Automatic time-zone detection stays for later: the server uses the laptop's clock, which is already the learner's time zone.
- Switched the mailer from port 587 (STARTTLS) to port 465 (SSL) (spec Mailer, External Services) — during slice 4, Gmail's port 587 started timing out on the learner's network while 465 connected instantly; same four steps, encryption just starts immediately.
- Added a time-zone setting (one for all reminders, pre-filled from the device, changeable in a Reminder settings sheet) and showed "Reminders go to … · [zone] · Change" in the add form and in the after-save note (PRD Core Journey/Reminder Emails/Profile, spec Reminder logic/API/Data Model, slice 4; Profile in slice 7 reuses the sheet) — while testing slice 4 the learner's laptop was set to US Pacific time while they live on Nigerian time, and reminders went to an address they couldn't see in the app (their school email, which wasn't receiving). They chose a user-set time zone over changing the laptop clock, so travel works too.
- Gave the floating nav a soft pressed-in active state (spec Look and Feel, slice 7) — at the slice 7 check the learner couldn't tell which screen was active (only the icon colour changed) and chose a soft neumorphic pressed-in look over a moving black circle.
- Added slices 8–11 for a live, judge-friendly demo: private pre-filled spaces per visitor (no sign-in), a Demo inbox with optional capped real email, hosting, and a first-visit tour (PRD Live Demo for Judges, spec Live Demo Mode) — after the proof of concept was finished, the learner decided to share a live link with judges, and hosting the single-user app as-is would have let every visitor see and change the same data and send email through the learner's Gmail. Speech-to-add was considered and moved to "What's next": browser support is uneven and parsing speech into fields would need extra services, too risky for the night's deadline.
- Built the guided tour (slice 11) before hosting (slice 10) — so Smart is deployed once with everything in; the tour is front-end only and doesn't depend on hosting.
- Made the demo tour interactive (slice 11, spec Live Demo Mode): the visitor sets their time zone and chooses in-app only or also email, then taps + and Save to add a ready-filled Netflix trial whose reminder is two minutes away, and looks around while it arrives; the pre-made Netflix and its pre-filled inbox reminder were removed from the sample data — the learner wanted judges to take part in the core journey rather than find it already done.
- Demo spaces now start empty and the tour has the visitor create both cards and both trials themselves (removed `demo.py` sample data; the Netflix reminder is re-timed to two minutes after they tap Save) — the learner wanted judges to see that nothing was pre-built.
- Added a Demo | Live switch on the public site (spec Live Demo Mode): Demo restarts fresh with the build-it tour each time; Live is the visitor's own kept space with a guide-only tour; reminders reach the in-app inbox in both, plus real email whenever one is given — the learner wanted judges to try a guided demo and also use Smart for real, like a demo/live account switch.
- In Demo, Profile's "Replay the tour" became "Restart the demo" (a fresh, empty demo and the tour from the start), the landing page and the Demo welcome now say it's a practice demo and offer "use Smart for real (Live)", and switching to an empty Live always starts its guided tour — replaying the build-it tour on an old demo added the same cards twice, and the learner wanted Demo to be obvious from the start with an easy way into Live.
- A reminder for today must be later than the current time in the person's time zone (form, time wheel and server); the form and time wheel show the time now when the date is today, and an earlier time is refused with that time in the message — the learner noticed a same-day reminder could be set for a time that had already passed and would never fire.
- Problems with a field now show in red (outline and message), and the tour's welcome card focuses the missing time zone — the learner wanted it obvious at once when Continue is pressed without one; red is the app's only colour and is used for nothing else.
- The Demo tour now walks through the Netflix form field by field (name, cost, trial, date and time with the time now in their zone, how reminders work, the cancel link, the card), with a "Type it in" button that fills each field while they watch; Duolingo stays pre-filled — the learner wanted judges to understand every field and feel they filled it in themselves. Also: the highlight now follows its control as things move, and a tap on either counts.
- Buttons that wait on the server (Save, Save card, Cancel, Renew, reminder settings, the Demo | Live switch, Restart the demo, the tour's Continue) now lock at once so they can't be tapped twice, and show a calm spinning ring if the wait lasts more than a moment; quick saves never flash a spinner, and people who ask for less motion get a still ring — the learner wanted no dull moment: a calm circle while the server works, and instant changes to just happen.
- On the public site the guided tour now starts by itself only on an empty Smart, so opening a demo that's already filled in (in another window, or after leaving the tour partway) no longer starts it over; "Restart the demo", switching to Demo, switching to an empty Live, and Profile's "Replay the tour" still play it — the learner opened a second window mid-demo and the tour began again on top of what they'd built.
- Inbox times now show in the time zone the person chose, like every other time in Smart (`db.now()` saves the server's UTC offset; the inbox formats with that zone) — the recorded demo video showed a reminder set for 12:04 PM Lagos time as "11:04 AM", because the live server's clock is UTC and the browser read the time as its own.
- Added colour while keeping Smart calm (spec Look and Feel): each card has a finish (ink, forest, navy, plum, clay, graphite), picked automatically so two cards never match and changeable in the card sheet; subscriptions with a website show that site's own icon (Netflix's N), found while the cancel link is typed and shown inside the field, with a soft monogram for apps or sites without one; the + and Save buttons use one deep-green accent. Red still only means "fix this". Icons come from the site itself (never a third-party favicon service, which would learn what each person pays for), only from public addresses, with time and size limits, cached once per site, and lookups are limited per visitor — a hackathon judge said the app looked good but was "ALL black/white buttons and forms"; the learner chose card colours plus an accent, and proposed the automatic icons.
