// Profile: a soft summary, where reminders go, and the way into Cancelled history.

import { escapeHtml, formatMoney, isActive, overallTotal, reminderDestination, timeZoneLabel } from "../format.js";
import { openReminderSettings } from "./forms.js";

export function renderProfile(root, state) {
  const active = state.subscriptions.filter(isActive);
  const cancelledCount = state.subscriptions.length - active.length;

  root.innerHTML = `
    <header class="pt-10 pb-8">
      <a href="#home" class="text-sm text-graphite">&larr; Home</a>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight">Profile</h1>
    </header>

    <section>
      <p class="text-sm text-graphite">Every month, across all cards</p>
      <p class="mt-1 text-5xl font-light tracking-tight tabular-nums">${formatMoney(overallTotal(state.subscriptions))}</p>
    </section>

    <dl class="mt-10">
      <div class="detail-row"><dt>Active subscriptions</dt><dd>${active.length}</dd></div>
      <div class="detail-row"><dt>Cards</dt><dd>${state.cards.length}</dd></div>
      <div class="detail-row">
        <dt>Reminders</dt>
        <dd>${reminderDestination(state) ? escapeHtml(reminderDestination(state)) : "Not set yet"}
          <span class="block text-sm text-graphite mt-1">${state.time_zone ? escapeHtml(timeZoneLabel(state.time_zone)) : ""}</span>
          <button type="button" data-settings class="block ml-auto mt-1 text-sm underline underline-offset-2">Change</button></dd>
      </div>
    </dl>

    ${state.demo ? `<a href="#inbox" class="row-link mt-6 flex items-center justify-between py-4 border-t border-line">
      <span>Demo inbox</span>
      <span class="text-graphite">&rarr;</span>
    </a>` : ""}
    <a href="#history" class="row-link ${state.demo ? "" : "mt-6"} flex items-center justify-between py-4 border-t border-b border-line">
      <span>Cancelled history</span>
      <span class="text-graphite">${cancelledCount} &rarr;</span>
    </a>`;

  root.querySelector("[data-settings]").addEventListener("click", () => {
    openReminderSettings(state, () => renderProfile(root, state));
  });
}
