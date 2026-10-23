// Profile: a soft summary, where reminders go, and the way into Cancelled history.

import { escapeHtml, formatMoney, inboxName, isActive, overallTotal, reminderDestination, timeZoneLabel } from "../format.js";
import { openReminderSettings } from "./forms.js";
import { replayTour, startTour } from "../tour.js";
import { toast } from "../toast.js";
import { switchTo } from "../modes.js";
import { whileBusy } from "../busy.js";

export function renderProfile(root, state) {
  const active = state.subscriptions.filter(isActive);
  const cancelledCount = state.subscriptions.length - active.length;

  root.innerHTML = `
    <header class="pt-10 pb-8">
      <a href="#home" class="text-sm text-graphite">&larr; Home</a>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight">Profile</h1>
    </header>

    ${state.hosted ? `
      <section class="mb-10">
        <div class="segmented" role="group" aria-label="Demo or Live">
          <button type="button" data-mode="demo" aria-pressed="${state.demo}">Demo</button>
          <button type="button" data-mode="live" aria-pressed="${!state.demo}">Live</button>
        </div>
        <p class="mt-3 text-sm text-graphite leading-relaxed">${state.demo
          ? "Demo is for trying Smart: each time you switch to it, it starts fresh and the guided tour fills it in. Live is your own Smart, kept in this browser."
          : "Live is your own Smart, kept in this browser. Switch to Demo anytime for a fresh guided demo; your Live Smart stays as it is."}</p>
      </section>` : ""}

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

    ${state.hosted ? `<a href="#inbox" class="row-link mt-6 flex items-center justify-between py-4 border-t border-line">
      <span>${inboxName(state)}</span>
      <span class="text-graphite">&rarr;</span>
    </a>` : ""}
    <a href="#history" class="row-link ${state.hosted ? "" : "mt-6"} flex items-center justify-between py-4 border-t border-b border-line">
      <span>Cancelled history</span>
      <span class="text-graphite">${cancelledCount} &rarr;</span>
    </a>
    <button type="button" data-replay-tour class="mt-6 text-sm text-graphite underline underline-offset-2">${state.demo ? "Restart the demo" : "Replay the tour"}</button>`;

  for (const button of root.querySelectorAll("[data-mode]")) {
    button.addEventListener("click", async () => {
      const mode = button.dataset.mode;
      if (mode === state.mode) return;
      try {
        await whileBusy(button, () => switchTo(mode), { untilLeave: true });
      } catch (error) {
        toast(error.message);
      }
    });
  }

  root.querySelector("[data-replay-tour]").addEventListener("click", async (event) => {
    if (state.demo) {
      // Start the demo over: a fresh, empty Smart and the tour from the beginning.
      try {
        await whileBusy(event.currentTarget, () => switchTo("demo"), { untilLeave: true });
      } catch (error) {
        toast(error.message);
      }
      return;
    }
    replayTour(state);
    location.hash = "#home";
    setTimeout(() => startTour(state), 400); // asked for, so it plays even on a Smart that has cards
  });

  root.querySelector("[data-settings]").addEventListener("click", () => {
    openReminderSettings(state, () => renderProfile(root, state));
  });
}
