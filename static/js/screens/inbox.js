// The in-app inbox ("Demo inbox" in Demo, "Inbox" in Live): every reminder, shown exactly as the email looks.

import * as api from "../api.js";
import { escapeHtml, inboxName } from "../format.js";

export const INBOX_SEEN_KEY = "smart_inbox_seen"; // the newest reminder this browser has looked at

export function lastSeenInboxId() {
  try {
    return Number(localStorage.getItem(INBOX_SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function markSeen(id) {
  try {
    if (id > lastSeenInboxId()) localStorage.setItem(INBOX_SEEN_KEY, String(id));
  } catch {
    // storage blocked: the unread dot just stays, which is harmless
  }
}

export async function renderInbox(root, state, itemId) {
  root.innerHTML = `<p class="pt-24 text-graphite">Opening your inbox…</p>`;
  const { items } = await api.getInbox();
  state.inbox = items;
  if (items.length) markSeen(items[0].id);

  const item = itemId ? items.find((i) => i.id === Number(itemId)) : null;
  if (item) {
    renderMessage(root, item, state);
    return;
  }

  root.innerHTML = `
    <header class="pt-10 pb-8">
      <a href="#home" class="text-sm text-graphite">&larr; Home</a>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight">${inboxName(state)}</h1>
      <p class="mt-2 text-graphite leading-relaxed">The reminders Smart sends you land here, exactly as the email looks.
        ${state.email ? `Copies also go to ${escapeHtml(state.email)}.` : "Add your email in Reminder settings to get real ones too."}</p>
    </header>
    ${items.length ? `
      <ul>
        ${items.map((i) => `
          <li class="border-t border-line">
            <a href="#inbox/${i.id}" class="row-link flex items-start justify-between gap-4 py-4">
              <div class="min-w-0">
                <p class="font-medium">${escapeHtml(i.subject)}</p>
                <p class="text-sm text-graphite mt-0.5">${receivedText(i.created_at, state.time_zone)}${i.emailed ? " · also emailed" : ""}</p>
              </div>
              <span class="text-graphite" aria-hidden="true">&rsaquo;</span>
            </a>
          </li>`).join("")}
      </ul>`
    : `<p class="py-6 text-graphite border-t border-line">Nothing yet. Add a trial ending today with a reminder a minute or two away, and watch it arrive here.</p>`}`;
}

function renderMessage(root, item, state) {
  root.innerHTML = `
    <header class="pt-10 pb-6">
      <a href="#inbox" data-replace class="text-sm text-graphite">&larr; ${inboxName(state)}</a>
      <p class="mt-6 text-sm text-graphite">From Smart · ${receivedText(item.created_at, state.time_zone)}</p>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight">${escapeHtml(item.subject)}</h1>
    </header>
    <iframe class="inbox-frame" title="${escapeHtml(item.subject)}" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>`;
  // The email's own HTML, in a sandbox: it can't run scripts or touch Smart. Links open in a new tab.
  root.querySelector("iframe").srcdoc = `<base target="_blank">${item.html_body}`;
}

// When it arrived, on the clock of the time zone they chose (like every other time in Smart),
// not the browser's. Older reminders were saved without a UTC offset, so they're read as before.
function receivedText(createdAt, timeZone) {
  const when = new Date(createdAt);
  return when.toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    ...(timeZone ? { timeZone } : {}) });
}
