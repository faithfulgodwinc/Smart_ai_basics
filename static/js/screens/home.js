// Home: anything needing attention, the card carousel, the visible card's subscriptions,
// and the overall monthly total.

import * as api from "../api.js";
import {
  cardSubscriptions, cardTotal, daysLeft, escapeHtml, formatDate, formatMoney,
  needsAttention, overallTotal, sortSubscriptions, timeLeftText,
} from "../format.js";
import { openRenewSheet } from "./forms.js";
import { toast } from "../toast.js";

let cardObserver = null;

export function renderHome(root, state) {
  cardObserver?.disconnect();

  if (!state.cards.length) {
    root.innerHTML = `
      ${topBar()}
      <div class="pt-24">
        <h1 class="text-3xl font-semibold tracking-tight">Nothing here yet.</h1>
        <p class="mt-3 text-graphite leading-relaxed">Add your first trial or subscription,<br>and the card it's on.</p>
        <p class="mt-10 text-sm text-graphite text-right pr-20">Tap + to begin &rarr;</p>
      </div>`;
    return;
  }

  if (!state.cards.some((card) => card.id === state.currentCardId)) {
    state.currentCardId = state.cards[0].id;
  }

  root.innerHTML = `
    ${topBar()}
    ${needsAttentionHtml(state)}
    <div class="card-carousel" aria-label="Your cards">
      ${state.cards.map((card, index) => cardHtml(card, index, cardTotal(state.subscriptions, card.id))).join("")}
    </div>
    ${state.cards.length > 1 ? `<div class="card-dots" role="tablist" aria-label="Choose a card">
      ${state.cards.map((card) => `<button type="button" role="tab" data-card-id="${card.id}" aria-label="${escapeHtml(card.nickname)}"></button>`).join("")}
    </div>` : ""}

    <section id="card-subscriptions" class="mt-8"></section>

    <section class="mt-12 pt-6 border-t border-line">
      <p class="text-sm text-graphite">Every month, across all cards</p>
      <p class="mt-1 text-5xl font-light tracking-tight tabular-nums">${formatMoney(overallTotal(state.subscriptions))}</p>
    </section>`;

  const carousel = root.querySelector(".card-carousel");
  const slideFor = (cardId) => carousel.querySelector(`[data-card-id="${cardId}"]`);

  // Start on the current card (e.g. the one you just added to), without animating.
  carousel.scrollLeft = slideFor(state.currentCardId).offsetLeft - carousel.offsetLeft;
  showCard(root, state);

  // When a card snaps into view, switch the list below to that card.
  cardObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const cardId = Number(entry.target.dataset.cardId);
      if (entry.isIntersecting && cardId !== state.currentCardId) {
        state.currentCardId = cardId;
        showCard(root, state);
      }
    }
  }, { root: carousel, threshold: 0.6 });
  for (const slide of carousel.children) cardObserver.observe(slide);

  wireNeedsAttention(root, state);

  for (const dot of root.querySelectorAll(".card-dots button")) {
    dot.addEventListener("click", () => {
      carousel.scrollTo({ left: slideFor(dot.dataset.cardId).offsetLeft - carousel.offsetLeft, behavior: "smooth" });
    });
  }
}

// Redraws only the part that depends on which card is showing.
function showCard(root, state) {
  const card = state.cards.find((c) => c.id === state.currentCardId);
  const subs = sortSubscriptions(cardSubscriptions(state.subscriptions, card.id));

  for (const dot of root.querySelectorAll(".card-dots button")) {
    dot.setAttribute("aria-selected", String(Number(dot.dataset.cardId) === card.id));
  }
  root.querySelector("#card-subscriptions").innerHTML = `
    <h2 class="text-sm text-graphite mb-2">On ${escapeHtml(card.nickname)}</h2>
    ${subs.length
      ? `<ul>${subs.map(rowHtml).join("")}</ul>`
      : `<p class="py-6 text-graphite border-t border-line">Nothing here yet.</p>`}`;
}

function topBar() {
  return `
    <header class="flex items-center justify-between pt-10 pb-8">
      <span class="text-sm tracking-[0.08em] uppercase text-graphite">Smart</span>
    </header>`;
}

function cardHtml(card, index, totalCents) {
  return `
    <article class="bank-card ${index % 2 ? "bank-card--graphite" : ""}" data-card-id="${card.id}">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-2xl font-semibold tracking-tight truncate">${escapeHtml(card.nickname)}</p>
          <p class="text-sm opacity-60 mt-1 truncate">${escapeHtml(card.bank)}</p>
        </div>
        <img src="/static/img/networks.svg" alt="" class="h-5 w-auto shrink-0 mt-1.5" aria-hidden="true">
      </div>
      <div class="card-chip" aria-hidden="true"></div>
      <div class="flex items-end justify-between gap-4">
        <p class="text-xs uppercase tracking-[0.12em] opacity-70 truncate">${escapeHtml(card.name_on_card)}</p>
        <div class="text-right shrink-0">
          <p class="text-[11px] opacity-60">a month</p>
          <p class="text-2xl font-light tabular-nums">${formatMoney(totalCents)}</p>
        </div>
      </div>
    </article>`;
}

// --- Needs attention: "Have you cancelled this?" -----------------------------

function needsAttentionHtml(state) {
  const subs = sortSubscriptions(state.subscriptions.filter((sub) => needsAttention(sub)));
  if (!subs.length) return "";
  const cardName = (id) => state.cards.find((card) => card.id === id)?.nickname || "";
  return `
    <section class="mb-10" aria-label="Needs attention">
      <h2 class="text-sm text-graphite mb-3">Needs attention</h2>
      <ul class="space-y-3">
        ${subs.map((sub) => `
          <li class="row-in attention-item" data-sub-id="${sub.id}">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="font-medium truncate">${escapeHtml(sub.name)}</p>
                <p class="text-sm text-graphite mt-0.5">${escapeHtml(cardName(sub.card_id))} · ${formatMoney(sub.monthly_cost_cents)} a month</p>
              </div>
              <span class="due-pill">${dueText(daysLeft(sub.deadline))}</span>
            </div>
            <p class="mt-4 text-[15px]">Have you cancelled this?</p>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button type="button" data-action="cancel" class="btn-small btn-small--ink">Yes, cancelled</button>
              <button type="button" data-action="renew" class="btn-small">It renewed</button>
            </div>
          </li>`).join("")}
      </ul>
    </section>`;
}

function dueText(days) {
  if (days < 0) return "Past due";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return "In 2 days";
}

function wireNeedsAttention(root, state) {
  const replace = (updated) => {
    state.subscriptions = state.subscriptions.map((sub) => (sub.id === updated.id ? updated : sub));
    renderHome(root, state);
  };

  for (const item of root.querySelectorAll(".attention-item")) {
    const sub = state.subscriptions.find((s) => s.id === Number(item.dataset.subId));

    const cancelButton = item.querySelector('[data-action="cancel"]');
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

    item.querySelector('[data-action="renew"]').addEventListener("click", () => {
      openRenewSheet(sub, state, (updated) => replace(updated));
    });
  }
}

function rowHtml(sub) {
  const days = daysLeft(sub.deadline);
  return `
    <li class="row-in flex items-center justify-between py-4 border-t border-line">
      <div class="min-w-0">
        <p class="font-medium truncate">
          ${escapeHtml(sub.name)}
          ${sub.is_trial ? `<span class="trial-label">Trial</span>` : ""}
          ${needsAttention(sub) ? `<span class="trial-label trial-label--ink">Due soon</span>` : ""}
        </p>
        <p class="text-sm text-graphite mt-0.5">${timeLeftText(days)} · ${days < 0 ? "Was due" : sub.is_trial ? "Ends" : "Renews"} ${formatDate(sub.deadline)}</p>
      </div>
      <p class="tabular-nums pl-4">${formatMoney(sub.monthly_cost_cents)}</p>
    </li>`;
}
