---
doc: scope
status: approved
---

# Subscription & Trial Tracker (name TBD)

A calm, secure-feeling place to log your free trials and subscriptions, see which card each one is charging, and get reminded *before* you're billed, with a clear path to cancel.

## The Unique Kernel
**It tracks which card is exposed, not only when you'll be charged.** Subscriptions are grouped by the card they're attached to, so you can see right away what's sitting on the account you're trying to protect (your main account vs. your side account). Each one carries its own cancel route (a link and/or step-by-step directions), so acting on a reminder takes one tap.

## Who It's For
Young people who sign up for free trials and then forget: students, friends and family, early-career people, and young business owners trying out apps who are "too busy, and then they forget." Many of them, like the learner, keep a protected main account and pay online from a side account. Today they find out about unwanted charges from a bank alert, sometimes months late (Netflix, for months).

## The Core Loop
Sign up for a trial → open the app and add it (name, cost, trial end date, which card, how to cancel) → see it land under that card, with the projected monthly total updating → get an email and in-app reminder a day or two **before** the deadline → follow the cancel link/steps → mark it cancelled and watch the totals drop.

If the deadline passes and nothing was marked, the subscription shows as **needs check** and the app asks: *"Did you cancel, or did it renew?"* If it renewed, the app asks for the next billing date, the subscription goes back to active, and reminders continue, in case they renewed once and don't want to renew again.

They come back every time they start a new trial, and whenever a reminder arrives.

## Inspiration & Identity
- Opening it should feel like entering "a whole world of comfort, security, and calmness."
- Clean and beautiful, Apple design principles: lots of white space, neat, friendly, calm.
- Samsung Health's calm, soft feel, but with a restrained palette (not "too many colors").
- Must not look "very coded or heavy," AI-generated, or generic. It should feel original and personal.

## Why This Matters to the Learner
Unexpected subscription charges hit the main account they most want to protect when the side account ran short, and they paid for Netflix for months without noticing. They also want to understand the code well enough to own it, especially "what powers what" and how sending emails works.

## What "Working" Looks Like
In a one-minute demo: someone adds a few subscriptions across two cards, sees them grouped by card with projected monthly totals per card and overall, and then **an actual reminder email arrives** (and an in-app reminder shows) with clear directions for cancelling, e.g. "Google Pay → Payments & subscriptions → Cancel" or a direct link to the service's plans page. They mark one as cancelled and the totals go down.

Since nobody can wait days on camera, the demo needs a way to trigger a reminder immediately. "Something very presentable and something that works totally."

## The POC Boundary
- Manual entry of a subscription/trial: name, cost, trial end date, card, cancel link and/or the user's own cancel steps
- Subscriptions grouped by card; projected monthly totals per card and overall
- Real reminder emails before the deadline, plus an in-app reminder
- Mark as cancelled, which updates the totals
- After a deadline passes unmarked: a "needs check" status asking "Did you cancel, or did it renew?" If it renewed → the app asks the person for the next billing date, then it's active again with reminders continuing
- A way to fire a reminder on demand for the demo

## Later
- Upload a bank statement to detect subscriptions automatically. Accurately reading messy statements is a project of its own.
- Built-in cancel guides for common services (Netflix, Claude, Google Pay…) so users don't write their own.
- Market-ready polish and features for wider use.

## Explicitly Cut
- **Truly automatic cancelling or card switching.** It would need access to each company's systems, which most don't offer. "Click to cancel" or "switch card" here means opening the right page or showing the right steps.
