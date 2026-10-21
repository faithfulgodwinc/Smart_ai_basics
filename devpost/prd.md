---
doc: prd
status: approved
---

# Smart — Product Requirements

**Smart — "Be way ahead."** A calm, black-and-white app where young people log their free trials and subscriptions under the card each one charges, see what they'll pay each month, and get a reminder email before they're billed, with the exact place to go to cancel.

Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

## The Core Journey

1. **First visit.** The person opens Smart and sees a calm **landing page** that introduces Smart and its promise, "Be way ahead." They tap through to the home screen.
2. **Empty home.** They have no cards or subscriptions yet. Home shows the floating nav bar and a gentle prompt pointing at the **plus button** to add their first subscription.
3. **Add a subscription.** They tap plus and fill in the name, the monthly cost, whether it's a **free trial they intend to cancel**, the trial end / next billing date, the card it's on, and **where they subscribed** (a website link, or the app's name).
   - If the card doesn't exist yet, they create it here: nickname, bank, name on card. No card number.
   - If Smart has no email address or time zone yet, it asks for them here (the time zone pre-filled from the device), before the first subscription can be saved. After that, the form shows where reminders go and in which time zone, with a **Change** link to Reminder settings.
4. **See it land.** Home updates. The subscription appears under its card, with the time left and the renewal date. Free trials are labelled and shown first. The card's monthly total and the overall monthly total both update.
5. **More cards.** They add more subscriptions and cards, and **swipe between cards** on home to see what each card is carrying.
6. **Reminder.** Two days before the deadline, and again one day before, at the **reminder time** they chose for that subscription, Smart sends a **reminder email** naming the subscription, when it renews, and how to cancel: the website link, or the app to go to. The email has an **"Open Smart"** button.
   - If a reminder is already due when they save (the deadline is within 2 days and the reminder time has passed), Smart sends it **right away**. Otherwise Smart tells them when it will arrive, e.g. "Reminder set for 14:32 today."
7. **In-app check.** In Smart, anything due soon or past due rises **to the top** and asks **"Have you cancelled this?"**
   - **Yes, cancelled** → it moves from the active list to **Cancelled history** and the totals drop.
   - **It renewed** → Smart asks for the next billing date. It becomes active again and reminders continue.
8. **Come back later.** Opening Smart again goes straight to home, where everything is still there.

**Success:** a subscription is added, a real reminder email arrives with precise cancel directions, and marking it cancelled visibly lowers the totals.

## Screens and Layout

Five calm screens. Detail is kept tucked away until someone asks for it.

- **Landing page.** Shown on first visit. Name, the "Be way ahead." tagline, and a short, intriguing statement of what Smart stands for (staying ahead of charges, knowing which card is exposed). One clear way in.
- **Home (dashboard).** Where the tracking happens.
  - Top: a profile icon on the right.
  - **Card carousel:** each card is drawn like a real, polished bank card (nickname, bank, name on card) with its monthly total and a small decorative row of card-network logos. Swipe between cards.
  - Below the card: that card's subscriptions as clean, minimal rows showing name, cost, time left, and renewal date. Free trials carry a "Trial" label and come first.
  - An overall monthly total across all cards.
  - Anything due soon or needing a check sits at the top with the "Have you cancelled this?" prompt.
  - A **floating nav bar**: a **vertical** pill at the **bottom right** holding Home, Add (+), and Profile, rather than the usual straight bottom bar.
- **Add / edit.** The forms for a subscription and for a card. The card form can open from inside the subscription form.
- **Subscription details.** Opened by tapping a row. A calm "learn more" view: cost, card, dates, time left, how to cancel (link or app name), plus edit and the cancelled/renewed actions.
- **Profile.** A soft summary: the reminder email (editable), light summary stats about their subscription spending (for example, the overall monthly total, the number of active subscriptions, and the number of cards), and a way into **Cancelled history**.
- **Cancelled history.** A calm list of what they've cancelled: name, card, and the date they marked it cancelled.

## Look and Feel

- **Black and white.** A monochrome palette in the spirit of Grok's look: mostly white space and black type, with black (or near-black) for emphasis and cards. No rainbow of category colors (scope: Samsung Health's calm without "too many colors").
- **Apple design principles:** generous white space, neat alignment, smooth and soft transitions, very little text, and nothing noisy.
- **Detail is hidden until tapped:** rows stay minimal; the details view holds the rest and is still calm.
- **Cards look like real cards:** polished, fanciful card illustrations are the visual centerpiece of home.
- **Floating nav bar:** a soft, vertical pill at the bottom right, not a standard flat bottom tab bar.
- **Feeling:** comfort, security, calm. It should suit a mature Gen Z user and still feel gentle for a 13-year-old. It must not look "very coded," heavy, AI-generated, or generic.
- **Typography:** clean, modern sans-serif lettering in the spirit of Grok and Apple (think SF Pro): crisp, confident, and uncluttered.

## Features and Behavior

### Landing Page
*(scope: Inspiration & Identity)*
- [ ] On first visit, the landing page shows "Smart," "Be way ahead.," and a short statement of Smart's values.
- [ ] One action takes the person to home.
- [ ] On later visits, Smart opens straight to home.

### Cards
*(scope: The Unique Kernel)*
- A card has a **nickname**, a **bank name**, and the **name on the card**. Smart never asks for a card number.
- [ ] A person can add as many cards as they want.
- [ ] Each card appears on home as a realistic card illustration showing its nickname, bank, and name on card.
- [ ] Swiping on home moves between cards, and the subscriptions list changes to that card's subscriptions.
- [ ] Each card shows its own monthly total.
- [ ] Each card shows a small, decorative row of card-network logos (e.g. Visa, Mastercard). Smart never claims which network a card is, because it has no card number.

### Adding and Editing Subscriptions
*(scope: The Core Loop, The POC Boundary)*
- Fields: **name**, **monthly cost**, **free trial I intend to cancel?** (yes/no), **trial end / next billing date**, **card**, **where they subscribed**: a **website** (with the cancel/plans link) or an **app** (with the app's name), and **remind me at** (a time of day, 09:00 unless changed).
- A free trial is tracked by the expiry date the person sets (e.g. 7 days from today).
- [ ] The plus button opens the add form. Saving puts the subscription under the chosen card right away.
- [ ] If the chosen card doesn't exist, it can be created from inside the add form without losing what's been typed.
- [ ] If no reminder email is set, the add form asks for one before the first subscription saves, and the email then appears in Profile.
- [ ] A subscription can be edited later from its details view, and changes show on home immediately.
- [ ] Rows show the name, cost, time left (in days, or months when it's far off), and the renewal date.
- [ ] Free trials show a "Trial" label and are listed before regular subscriptions under their card.

### Monthly Totals
*(scope: What "Working" Looks Like)*
- "Billing per month" = the total of all online subscriptions in a month.
- [ ] Each card shows the monthly total of its active subscriptions.
- [ ] An overall monthly total across all cards shows on home and in Profile.
- [ ] Adding, cancelling, or renewing a subscription updates the totals immediately.

### Reminder Emails
*(scope: What "Working" Looks Like, The POC Boundary)*
- [ ] A real email is sent to the person's address **2 days before** and **1 day before** the deadline, once that day's clock reaches the subscription's reminder time, in the person's chosen time zone.
- [ ] Reminders stop once the subscription is marked cancelled or renewed.
- [ ] If a reminder is already due when the subscription is saved (deadline within 2 days, including today, and the reminder time has passed), the email is sent right away.
- [ ] Otherwise, after saving, Smart says when the next reminder will arrive, and it arrives at that time without anyone touching the app. **This is how the live demo works:** add "Netflix, expires today, remind me at" two minutes from now, save, wait, and the email arrives.
- [ ] The email names the subscription and when it renews ("in 2 days" / "tomorrow" / "today").
- [ ] For a **website** subscription, the email includes the cancel link. For an **app** subscription, it names the app to go cancel in.
- [ ] The email has an **"Open Smart"** button that opens the app. The email itself has no update buttons.

### In-App Reminder and the "Needs Check" Loop
*(scope: The Core Loop)*
- [ ] Subscriptions that are due soon (within 2 days) or past their deadline without an update rise to the top of home with **"Have you cancelled this?"**
- [ ] **Yes, cancelled** → the subscription leaves the active list, appears in Cancelled history, and the card total and overall total drop.
- [ ] **It renewed** → Smart asks for the next billing date. The subscription becomes active again with the new date, and reminders continue for that date.

### Profile
- [ ] The profile icon (top right of home) opens Profile.
- [ ] Profile shows the reminder email and time zone, which can be changed (through the same Reminder settings sheet the add form links to).
- [ ] Profile shows calm summary stats about subscription spending, without heavy detail.

### Cancelled History
- [ ] Profile has a way into Cancelled history.
- [ ] Every subscription marked cancelled appears there with its name, card, and the date it was cancelled.
- [ ] Cancelled subscriptions don't count toward any totals.

## States and Boundaries

- **First use:** the landing page, then an empty home with the floating nav bar and a gentle prompt to tap plus.
- **Empty card:** a card with no active subscriptions shows a quiet "nothing here yet" line and a total of 0.
- **No email yet:** a subscription can't be saved until an email is given, and Smart asks for it inline.
- **Missing or unusable input:** if a required field is empty, or the email or link doesn't look valid, Smart shows a soft, specific message next to the field and doesn't save.
- **Due soon / past due:** the subscription rises to the top with the "Have you cancelled this?" check (see above).
- **Persistence:** cards, subscriptions, statuses, and the email are all still there after closing and reopening Smart.
- **Privacy boundary:** no card numbers, no bank connection, no sign-in. One person, one device/browser for the proof of concept.

## Product Decisions

- **Name "Smart," tagline "Be way ahead."** It should make the user feel ahead of their charges.
- **No Google sign-in.** It adds setup and failure points. The only thing Smart truly needs is an email for reminders.
- **"Switch accounts" means switching between cards,** so they can see which billing sits on which card.
- **No card numbers.** Smart doesn't use them; a nickname, bank, and name on card are enough to recognize the card, and it feels safer.
- **The email is required before the first subscription,** collected inside the add flow, so reminders always have somewhere to go.
- **The email's button only opens Smart (Option B),** and updates happen in the app. It's simpler and more reliable for the demo than update buttons in the email.
- **Reminders at 2 days and 1 day before, and they stop once updated.**
- **Send immediately if a reminder is already due.** It makes the demo natural (add something expiring today) with no special demo button.
- **A reminder time per subscription** (added during the build). A live demo can show an email arriving on its own a couple of minutes after saving, proving Smart watches deadlines by itself. Reminder times follow a **time zone the person sets** (pre-filled from their device, changeable any time in Reminder settings), so they stay right when the laptop is set to another region or the person travels.
- **"Where did you subscribe" is captured when adding,** so the email can be precise (a link for websites, the app name for apps).
- **Profile is a summary; home is for tracking.**
- **Black-and-white palette** chosen by the learner, for calm without colorful noise.
- **Free trials get priority:** they're flagged when added, labelled, and listed first, because they're the ones people most intend to cancel.
- **Vertical floating nav at the bottom right** (Home, Add, Profile), so it's different from the native straight bottom bar.
- **A Cancelled history view**, so they can see what they've cancelled.
- **Card-network logos are decorative only**, shown together on every card, since without a card number Smart can't know the network.
- **Grok/Apple-style lettering.**
- **The slider was dropped** in favor of a floating nav bar.

- **Totals are projected, trials included.** A free trial's monthly cost counts toward the totals while it's active, showing what it *would* charge if it isn't cancelled. It drops out once it's marked cancelled.

## What We're Building

- Landing page with "Smart — Be way ahead."
- Home with the swipeable card carousel, per-card subscription rows (free trials labelled and first), per-card and overall monthly totals, the vertical floating nav bar (Home, Add, Profile), and the profile icon
- Add/edit forms for cards (no card number) and subscriptions (including where they subscribed)
- Email captured in the add flow and shown/editable in Profile
- Real reminder emails at 2 days and 1 day before, sent immediately if already due, with cancel directions and an "Open Smart" button
- The in-app "Have you cancelled this?" check, with cancelled → totals drop and renewed → new date
- The subscription details view
- Profile with the email, summary stats, and a way into Cancelled history
- Cancelled history
- Data that persists between visits

## Deferred From the POC

- **Continue with Google / accounts:** sign-in adds setup and failure points the demo doesn't need.
- **Updating from inside the email** ("I cancelled" / "It renewed" buttons): needs secure links. "Open Smart" covers it for now.
- **Using Smart across multiple devices:** it would need accounts.
- **Cartoon greeter character:** lovely personality, but illustration and animation work that doesn't prove the core idea.
- **Yearly or other billing cycles:** cost is a monthly amount for now.

## Possible Later Enhancements

- **Bank statement upload** to detect subscriptions automatically. Reading messy statements reliably is a project of its own (scope: Later).
- **Built-in cancel guides for common services** (Netflix, Claude, LinkedIn…) and step-by-step instructions for Google Play / App Store purchases.
- **Choosing the reminder timing** in Profile.
- **The friendly cartoon character** saying hello.
- **Market-ready polish** for wider use.

## Non-Goals

- **Automatic cancelling or card switching.** Companies don't offer that access. Smart points to the right place instead (scope: Explicitly Cut).
- **Storing real card numbers or connecting to banks.** It isn't needed, and it would undermine the sense of security.
- **A salary or budgeting comparison.** The monthly total is the only spending figure.
- **Push notifications to a phone.** The in-app reminder appears when Smart is open; email is the reminder that reaches them.

## Open Questions

- None blocking `4-spec`.
