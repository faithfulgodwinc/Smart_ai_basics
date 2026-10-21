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

// Whole days from today to the deadline: 0 = today, 1 = tomorrow, -1 = yesterday.
export function daysLeft(deadline, today = new Date()) {
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
