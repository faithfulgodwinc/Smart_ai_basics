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

// The in-app inbox's name: "Demo inbox" in Demo, "Inbox" in Live.
export function inboxName(state) {
  return state.demo ? "Demo inbox" : "Inbox";
}

// Where reminders go, in words: "your Demo inbox", "your inbox and you@x.com", or "you@x.com" (laptop).
export function reminderDestination(state) {
  if (state.hosted) {
    const inbox = `your ${state.demo ? "Demo inbox" : "inbox"}`;
    return state.email ? `${inbox} and ${state.email}` : inbox;
  }
  return state.email || "";
}

// The current wall-clock time in a time zone, as a Date whose fields read in that zone.
export function nowInTimeZone(timeZone, now = new Date()) {
  return timeZone ? new Date(now.toLocaleString("en-US", { timeZone })) : now;
}

// A time zone dropdown, grouped by region, each shown like "Lagos (GMT+1)". Nothing to type,
// so nothing can be mistyped. With no `selected`, it starts on "Please select your time zone".
// The device's own zone is offered first, under "Suggested", but never chosen for the person.
export function timeZoneOptions(selected = "", suggested = detectedTimeZone()) {
  const option = (zone) => {
    const city = zone.split("/").slice(1).join(" / ").replace(/_/g, " ") || zone;
    const offset = timeZoneLabel(zone).match(/\((.*)\)/)?.[1];
    return `<option value="${zone}" ${zone === selected ? "selected" : ""}>${escapeHtml(city)}${offset ? ` (${offset})` : ""}</option>`;
  };
  const regions = new Map();
  for (const zone of allTimeZones()) {
    const region = zone.includes("/") ? zone.split("/")[0] : "Other";
    if (!regions.has(region)) regions.set(region, []);
    regions.get(region).push(zone);
  }
  return `
    <option value="" disabled ${selected ? "" : "selected"}>Please select your time zone</option>
    ${suggested && suggested !== selected ? `<optgroup label="Suggested">${option(suggested).replace(" selected", "")}</optgroup>` : ""}
    ${[...regions].map(([region, zones]) => `<optgroup label="${escapeHtml(region)}">${zones.map(option).join("")}</optgroup>`).join("")}`;
}

// "14:05" -> "2:05 PM" (or "14:05"), in the person's own clock style.
export function clockLabel(hhmm) {
  const [hour, minute] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// The time right now in the chosen time zone: "HH:MM", plus words for it ("2:05 PM, Lagos time").
export function timeNow(timeZone = chosenTimeZone) {
  const now = nowInTimeZone(timeZone);
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const city = timeZone ? ` (${timeZone.split("/").pop().replace(/_/g, " ")} time)` : "";
  return { hhmm, words: `${clockLabel(hhmm)}${city}` };
}

// --- Card finishes and service icons ------------------------------------------

// The same finishes as db.CARD_COLORS. A new card takes the first one not used yet.
export const CARD_COLORS = ["ink", "forest", "navy", "plum", "clay", "graphite"];

export function nextCardColor(cards) {
  // Cards from before colours existed show as ink and graphite in turn, so they count as those.
  const used = new Set(cards.map((card, i) => card.color || (i % 2 ? "graphite" : "ink")));
  return CARD_COLORS.find((color) => !used.has(color)) || CARD_COLORS[cards.length % CARD_COLORS.length];
}

// A subscription's icon: its website's own (found by the server), or a soft monogram in a calm tint.
const MONOGRAM_TINTS = [["#E4EEE9", "#1F5F4A"], ["#E6EAF3", "#2B3F66"], ["#F0E7EE", "#5A2F52"], ["#F3EAE2", "#7A4A36"], ["#ECECEA", "#3A3A3A"]];

export function serviceIconHtml(sub) {
  if (sub.icon) return `<img src="${escapeHtml(sub.icon)}" alt="" class="service-icon" aria-hidden="true">`;
  const name = sub.name.trim() || "?";
  const [background, color] = MONOGRAM_TINTS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % MONOGRAM_TINTS.length];
  return `<span class="service-icon service-icon--monogram" style="background:${background};color:${color}" aria-hidden="true">${escapeHtml([...name][0].toUpperCase())}</span>`;
}
