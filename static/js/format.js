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
