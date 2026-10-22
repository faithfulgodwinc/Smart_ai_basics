// Pure helpers: money, dates and totals. No screen code here, so they're easy to test.

export function formatMoney(cents) {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "2026-11-04" -> a Date at local midnight (not UTC, which can shift the day).
export function parseDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(isoDate) {
  return parseDate(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// --- Time zone -------------------------------------------------------------
// "Today" follows the time zone chosen in Smart's settings, not the device's clock,
// so the app and the reminder emails always agree.

let chosenTimeZone = null;

export function setTimeZone(timeZone) {
  chosenTimeZone = timeZone || null;
}

export function detectedTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function allTimeZones() {
  return Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : [detectedTimeZone()];
}

// Today's date in the chosen time zone, as a Date at local midnight.
export function todayInTimeZone(timeZone = chosenTimeZone, now = new Date()) {
  if (!timeZone) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return parseDate(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now));
}

// "Africa/Lagos" -> "Lagos time (GMT+1)"
export function timeZoneLabel(timeZone, now = new Date()) {
  const city = timeZone.split("/").pop().replace(/_/g, " ");
  const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(now).find((part) => part.type === "timeZoneName")?.value || "";
  return `${city} time${offset ? ` (${offset})` : ""}`;
}

// Whole days from today to the deadline: 0 = today, 1 = tomorrow, -1 = yesterday.
export function daysLeft(deadline, today = todayInTimeZone()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseDate(deadline) - start) / 86_400_000);
}

// "Today", "Tomorrow", "12 days left", or "3 months left" once it's 60+ days away.
export function timeLeftText(days) {
  if (days < 0) return "Past due";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 60) return `${days} days left`;
  return `${Math.round(days / 30)} months left`;
}

// Trials first (they're the ones people mean to cancel), then the soonest deadline.
export function sortSubscriptions(subscriptions) {
  return [...subscriptions].sort((a, b) =>
    (b.is_trial - a.is_trial) || a.deadline.localeCompare(b.deadline) || a.id - b.id);
}

// "2026-11-05T14:32" -> "14:32 today" / "9:00 tomorrow" / "9:00 on 3 Nov", in the person's own clock style.
export function reminderAtText(isoMoment, today = new Date()) {
  const [day, time] = isoMoment.split("T");
  const [hour, minute] = time.split(":").map(Number);
  const clock = new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const days = daysLeft(day, today);
  if (days === 0) return `${clock} today`;
  if (days === 1) return `${clock} tomorrow`;
  return `${clock} on ${parseDate(day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

export function isActive(sub) {
  return sub.status === "active";
}

export function cardSubscriptions(subscriptions, cardId) {
  return subscriptions.filter((sub) => sub.card_id === cardId && isActive(sub));
}

export function cardTotal(subscriptions, cardId) {
  return cardSubscriptions(subscriptions, cardId).reduce((sum, sub) => sum + sub.monthly_cost_cents, 0);
}

export function overallTotal(subscriptions) {
  return subscriptions.filter(isActive).reduce((sum, sub) => sum + sub.monthly_cost_cents, 0);
}

// Makes typed text safe to put inside HTML (so "<b>" shows as text, not bold).
export function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

// Due within 2 days, or past its date, and still active: Smart asks "Have you cancelled this?"
export function needsAttention(sub, today = todayInTimeZone()) {
  return isActive(sub) && daysLeft(sub.deadline, today) <= 2;
}

// Keeps only what a price can contain: digits and one decimal point, at most 2 decimals.
// "$1,299.999abc" -> "1299.99"
export function cleanMoney(text) {
  const [whole, ...rest] = String(text).replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

// Today as 'YYYY-MM-DD' in the chosen time zone (for the "not before today" rule).
export function todayIso(today = todayInTimeZone()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

// Where reminders go, in words: "your Demo inbox", "your Demo inbox and you@x.com", or "you@x.com".
export function reminderDestination(state) {
  if (state.demo) return state.email ? `your Demo inbox and ${state.email}` : "your Demo inbox";
  return state.email || "";
}

// The current wall-clock time in a time zone, as a Date whose fields read in that zone.
export function nowInTimeZone(timeZone, now = new Date()) {
  return timeZone ? new Date(now.toLocaleString("en-US", { timeZone })) : now;
}
