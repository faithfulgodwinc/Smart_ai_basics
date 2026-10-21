// Cancelled history: everything marked cancelled, newest first. None of it counts toward totals.

import { escapeHtml, formatDate, formatMoney } from "../format.js";

export function renderHistory(root, state) {
  const cancelled = state.subscriptions
    .filter((sub) => sub.status === "cancelled")
    .sort((a, b) => (b.cancelled_on || "").localeCompare(a.cancelled_on || "") || b.id - a.id);
  const cardName = (id) => state.cards.find((card) => card.id === id)?.nickname || "";

  root.innerHTML = `
    <header class="pt-10 pb-8">
      <a href="#profile" class="text-sm text-graphite">&larr; Profile</a>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight">Cancelled</h1>
      <p class="mt-2 text-graphite">${cancelled.length ? "Nice work. These no longer count toward your totals." : ""}</p>
    </header>

    ${cancelled.length ? `
      <ul>
        ${cancelled.map((sub) => `
          <li class="border-t border-line">
            <a href="#details/${sub.id}" class="row-link flex items-center justify-between py-4">
              <div class="min-w-0">
                <p class="font-medium truncate">${escapeHtml(sub.name)}</p>
                <p class="text-sm text-graphite mt-0.5">${escapeHtml(cardName(sub.card_id))} · Cancelled ${sub.cancelled_on ? formatDate(sub.cancelled_on) : ""}</p>
              </div>
              <p class="tabular-nums pl-4 text-graphite line-through">${formatMoney(sub.monthly_cost_cents)}</p>
            </a>
          </li>`).join("")}
      </ul>`
    : `<p class="py-6 text-graphite border-t border-line">Nothing cancelled yet.</p>`}`;
}
