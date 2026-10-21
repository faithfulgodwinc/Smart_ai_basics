// Home: the card, that card's subscriptions, and the overall monthly total.

import {
  cardSubscriptions, cardTotal, escapeHtml, formatDate, formatMoney, overallTotal,
} from "../format.js";

export function renderHome(root, state) {
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
  const card = state.cards.find((c) => c.id === state.currentCardId);
  const subs = cardSubscriptions(state.subscriptions, card.id);

  root.innerHTML = `
    ${topBar()}
    ${cardHtml(card, cardTotal(state.subscriptions, card.id))}

    <section class="mt-10">
      <h2 class="text-sm text-graphite mb-2">On ${escapeHtml(card.nickname)}</h2>
      ${subs.length
        ? `<ul>${subs.map(rowHtml).join("")}</ul>`
        : `<p class="py-6 text-graphite border-t border-line">Nothing here yet.</p>`}
    </section>

    <section class="mt-12 pt-6 border-t border-line">
      <p class="text-sm text-graphite">Every month, across all cards</p>
      <p class="mt-1 text-5xl font-light tracking-tight tabular-nums">${formatMoney(overallTotal(state.subscriptions))}</p>
    </section>`;
}

function topBar() {
  return `
    <header class="flex items-center justify-between pt-10 pb-8">
      <span class="text-sm tracking-[0.08em] uppercase text-graphite">Smart</span>
    </header>`;
}

function cardHtml(card, totalCents) {
  return `
    <article class="bank-card">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-2xl font-semibold tracking-tight">${escapeHtml(card.nickname)}</p>
          <p class="text-sm opacity-60 mt-1">${escapeHtml(card.bank)}</p>
        </div>
      </div>
      <div class="flex items-end justify-between">
        <p class="text-xs uppercase tracking-[0.12em] opacity-70">${escapeHtml(card.name_on_card)}</p>
        <div class="text-right">
          <p class="text-[11px] opacity-60">a month</p>
          <p class="text-2xl font-light tabular-nums">${formatMoney(totalCents)}</p>
        </div>
      </div>
    </article>`;
}

function rowHtml(sub) {
  return `
    <li class="row-in flex items-center justify-between py-4 border-t border-line">
      <div class="min-w-0">
        <p class="font-medium truncate">${escapeHtml(sub.name)}</p>
        <p class="text-sm text-graphite mt-0.5">Renews ${formatDate(sub.deadline)}</p>
      </div>
      <p class="tabular-nums pl-4">${formatMoney(sub.monthly_cost_cents)}</p>
    </li>`;
}
