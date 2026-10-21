// Subscription details: everything about one subscription, plus Edit, "Yes, cancelled" and "It renewed".

import * as api from "../api.js";
import {
  daysLeft, escapeHtml, formatDate, formatMoney, timeLeftText, timeZoneLabel,
} from "../format.js";
import { openCardSheet, openRenewSheet } from "./forms.js";
import { toast } from "../toast.js";

export function renderDetails(root, state, subId) {
  const sub = state.subscriptions.find((s) => s.id === Number(subId));
  if (!sub) {
    location.hash = "#home";
    return;
  }
  const card = state.cards.find((c) => c.id === sub.card_id);
  const active = sub.status === "active";
  const days = daysLeft(sub.deadline);
  const [hour, minute] = sub.reminder_time.split(":").map(Number);
  const reminderClock = new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const howToCancel = sub.source_type === "website"
    ? `<a href="${escapeHtml(sub.source_value)}" target="_blank" rel="noopener" class="underline underline-offset-2">Open the cancel page &nearr;</a>`
    : `Cancel in the ${escapeHtml(sub.source_value)} app`;

  root.innerHTML = `
    <header class="pt-10 pb-8 flex items-center justify-between">
      <a href="#home" class="text-sm text-graphite">&larr; Back</a>
      ${active ? `<a href="#edit/${sub.id}" data-replace class="text-sm font-medium">Edit</a>` : ""}
    </header>

    <h1 class="text-3xl font-semibold tracking-tight">
      ${escapeHtml(sub.name)}
      ${sub.is_trial ? `<span class="trial-label align-middle">Trial</span>` : ""}
    </h1>
    <p class="mt-3 text-5xl font-light tracking-tight tabular-nums">${formatMoney(sub.monthly_cost_cents)}</p>
    <p class="text-sm text-graphite mt-1">a month</p>

    <dl class="mt-10">
      <div class="detail-row">
        <dt>Card</dt>
        <dd>${escapeHtml(card?.nickname || "")} · ${escapeHtml(card?.bank || "")}
          ${active ? `<button type="button" data-edit-card class="block ml-auto mt-1 text-sm text-graphite underline underline-offset-2">Edit card</button>` : ""}</dd>
      </div>
      ${active ? `
        <div class="detail-row"><dt>${sub.is_trial ? "Trial ends" : "Renews"}</dt><dd>${formatDate(sub.deadline)}</dd></div>
        <div class="detail-row"><dt>Time left</dt><dd>${timeLeftText(days)}</dd></div>
        <div class="detail-row">
          <dt>Reminders</dt>
          <dd>${reminderClock}, 2 days and 1 day before
            <span class="block text-sm text-graphite mt-1">to ${escapeHtml(state.email || "")}<br>${state.time_zone ? escapeHtml(timeZoneLabel(state.time_zone)) : ""}</span></dd>
        </div>` : `
        <div class="detail-row"><dt>Cancelled</dt><dd>${sub.cancelled_on ? formatDate(sub.cancelled_on) : ""}</dd></div>`}
      <div class="detail-row"><dt>How to cancel</dt><dd>${howToCancel}</dd></div>
    </dl>

    ${active ? `
      <section class="mt-10">
        <p class="text-[15px]">Have you cancelled this?</p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button type="button" data-action="cancel" class="btn-small btn-small--ink">Yes, cancelled</button>
          <button type="button" data-action="renew" class="btn-small">It renewed</button>
        </div>
      </section>` : ""}`;

  if (!active) return;

  const replace = (updated) => {
    state.subscriptions = state.subscriptions.map((s) => (s.id === updated.id ? updated : s));
    renderDetails(root, state, subId);
  };

  const cancelButton = root.querySelector('[data-action="cancel"]');
  cancelButton.addEventListener("click", async () => {
    cancelButton.disabled = true;
    try {
      replace(await api.cancelSubscription(sub.id));
      toast(`${sub.name} cancelled. You're way ahead.`);
    } catch (error) {
      cancelButton.disabled = false;
      toast(error.message);
    }
  });

  root.querySelector('[data-action="renew"]').addEventListener("click", () => {
    openRenewSheet(sub, state, replace);
  });

  root.querySelector("[data-edit-card]").addEventListener("click", () => {
    openCardSheet({
      card,
      onSaved(updated) {
        state.cards = state.cards.map((c) => (c.id === updated.id ? updated : c));
        renderDetails(root, state, subId);
        toast("Card updated.");
      },
    });
  });
}
