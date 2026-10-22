// The guided tour for first-time visitors. A soft spotlight on one thing at a time, with a
// small card explaining it. Shown once per browser; Profile can replay it.
//
// On the live demo it's interactive: the visitor sets their time zone and how reminders
// reach them, taps + and Save to add a ready-filled Netflix trial whose reminder is two
// minutes away, then looks around Home while they wait for it to arrive.
// On a personal laptop it's a short look around Home.

import * as api from "./api.js";
import {
  allTimeZones, detectedTimeZone, escapeHtml, nowInTimeZone, reminderAtText,
} from "./format.js";
import { applySettings, setFormDraft } from "./screens/forms.js";

const TOUR_DONE_KEY = "smart_tour_done";
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function tourDone() {
  try {
    return localStorage.getItem(TOUR_DONE_KEY) === "1";
  } catch {
    return true; // storage blocked: don't show it on every visit
  }
}

function markDone() {
  try {
    localStorage.setItem(TOUR_DONE_KEY, "1");
  } catch {
    // storage blocked: harmless
  }
}

export function replayTour() {
  try {
    localStorage.removeItem(TOUR_DONE_KEY);
  } catch {
    // storage blocked: it still plays now
  }
}

// --- The steps ---------------------------------------------------------------------
// A step has a `target` to spotlight (or none, for a centred card), a title and text,
// and either a Next button or `tap: "#hash"`: the visitor taps the highlighted thing,
// and the tour moves on when Smart arrives at that screen.

function lookAroundSteps(state, reminder) {
  return [
    { target: '[aria-label="Needs attention"]', title: "Needs attention",
      text: () => reminder?.time
        ? "Netflix ends today, so it's up here. When something is due, Smart asks: have you cancelled it? Say yes and the totals drop. Leave it for now, your reminder is on its way."
        : "When something is due, Smart asks: have you cancelled it? Say yes and the totals drop." },
    { target: '[aria-label="Your cards"]', title: "Your cards",
      text: "Every trial and subscription sits under the card it charges. Swipe to the Main card: a trial is quietly charging the card you meant to protect." },
    { target: "#card-subscriptions", title: "What this card carries",
      text: "Trials come first, with how long is left and when you'll be charged." },
    { target: '[data-tour="total"]', title: "Your monthly total",
      text: "What all your cards cost you each month, if nothing gets cancelled." },
    { target: 'a[href="#inbox"].profile-button', title: "Your Demo inbox",
      text: () => reminder?.time
        ? `Your Netflix reminder lands here at ${reminder.time}${state.email ? `, and in ${state.email}` : ""}. Keep Smart open and watch for it.`
        : "Reminders land here, at the time you choose." },
    { target: ".nav-add", title: "Add more", text: "Add any trial or subscription, pick its card, and choose when to be reminded." },
    { target: '.nav-item[href="#profile"]', title: "Profile",
      text: "Where reminders go, your time zone, and everything you've cancelled." },
  ];
}

function demoSteps(state) {
  const reminder = {}; // filled in when the visitor reaches the + step
  const steps = [
    { title: "Welcome to Smart", welcome: true },
    { target: ".nav-add", title: "Add your first trial", tap: "#add",
      text: "Tap + to add a free trial. We'll fill it in for you.",
      before: () => Object.assign(reminder, netflixDraft(state)) },
    { target: '#add [type="submit"]', title: "All filled in",
      text: () => `Netflix, a free trial that ends today, on your Side card. Your reminder is set for ${reminder.time}. Tap Save.`,
      tap: "#home" },
    ...lookAroundSteps(state, reminder),
  ];
  steps[steps.length - 1].text = () =>
    `Where reminders go, your time zone, and everything you've cancelled. Now keep an eye out: Netflix's reminder arrives at ${reminder.time}.`;
  return steps;
}

// A Netflix trial ending today, with its reminder two minutes from now in the visitor's time zone.
function netflixDraft(state) {
  const pad = (n) => String(n).padStart(2, "0");
  const now = nowInTimeZone(state.time_zone);
  const at = new Date(now.getTime() + (now.getSeconds() > 40 ? 3 : 2) * 60000);
  const deadline = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const side = state.cards.find((card) => card.nickname === "Side card") || state.cards[0];
  setFormDraft({
    name: "Netflix", monthly_cost: "15.49", is_trial: true, deadline, reminder_time: time,
    card_id: side?.id, source_type: "website", source_value: "https://www.netflix.com/cancelplan",
  });
  return { time: reminderAtText(`${deadline}T${time}`).replace(" today", "") };
}

// --- The engine ----------------------------------------------------------------------

let running = false;

export function startTour(state) {
  if (running) return;
  const steps = state.demo ? demoSteps(state) : lookAroundSteps(state, null);
  running = true;

  const blocker = document.createElement("div"); // only the highlighted thing can be tapped
  blocker.className = "tour-blocker";
  const spotlight = document.createElement("div");
  spotlight.className = "tour-spotlight";
  const card = document.createElement("div");
  card.className = "tour-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-live", "polite");
  document.body.append(blocker, spotlight, card);

  let index = -1;
  let target = null;

  const place = () => {
    const width = Math.min(360, window.innerWidth - 32);
    blocker.classList.toggle("is-dim", !target); // a centred card dims the page itself
    if (!target) {
      spotlight.hidden = true;
      Object.assign(card.style, {
        width: `${width}px`, left: `${(window.innerWidth - width) / 2}px`,
        top: `${Math.max(16, (window.innerHeight - card.offsetHeight) / 2)}px`,
      });
      return;
    }
    spotlight.hidden = false;
    const box = target.getBoundingClientRect();
    const pad = 8;
    Object.assign(spotlight.style, {
      top: `${box.top - pad}px`, left: `${box.left - pad}px`,
      width: `${box.width + pad * 2}px`, height: `${box.height + pad * 2}px`,
    });
    const below = box.bottom + pad + 14;
    const top = below + card.offsetHeight < window.innerHeight - 12
      ? below : Math.max(12, box.top - pad - 14 - card.offsetHeight);
    const left = Math.min(Math.max(16, box.left + box.width / 2 - width / 2), window.innerWidth - width - 16);
    Object.assign(card.style, { top: `${top}px`, left: `${left}px`, width: `${width}px` });
  };

  // A tap on the dimmed layer counts only if it lands on the highlighted thing.
  blocker.addEventListener("click", (event) => {
    const step = steps[index];
    if (!step?.tap || !target) return;
    const box = target.getBoundingClientRect();
    if (event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom) {
      target.click();
    }
  });

  const onHashChange = () => {
    const step = steps[index];
    if (step?.tap && location.hash === step.tap) setTimeout(next, 450); // let the new screen draw
  };

  const show = async () => {
    const step = steps[index];
    step.before?.();
    if (step.welcome) {
      target = null;
      renderWelcome(step);
      return;
    }
    target = await waitFor(step.target);
    if (!target) return next(); // not on this screen (e.g. nothing due yet): skip it
    const text = typeof step.text === "function" ? step.text() : step.text;
    const last = index === steps.length - 1;
    card.innerHTML = `
      <p class="text-xs tracking-[0.08em] uppercase text-graphite">${index + 1} of ${steps.length}</p>
      <h2 class="mt-1 text-lg font-semibold tracking-tight">${escapeHtml(step.title)}</h2>
      <p class="mt-1 text-[15px] leading-relaxed text-graphite">${escapeHtml(text)}</p>
      <div class="mt-4 flex items-center justify-between">
        <button type="button" data-skip class="text-sm text-graphite">${last ? "" : "Skip tour"}</button>
        ${step.tap ? "" : `<button type="button" data-next class="btn-small btn-small--ink px-5">${last ? "Done" : "Next"}</button>`}
      </div>`;
    card.querySelector("[data-next]")?.addEventListener("click", next);
    card.querySelector("[data-skip]").addEventListener("click", finish);
    const fixed = target.closest(".floating-nav");
    if (!fixed) target.scrollIntoView({ block: "center" });
    requestAnimationFrame(() => {
      place();
      (card.querySelector("[data-next]") || card.querySelector("[data-skip]")).focus();
    });
  };

  const renderWelcome = (step) => {
    const zones = allTimeZones().map((zone) => `<option value="${zone}"></option>`).join("");
    card.innerHTML = `
      <p class="text-xs tracking-[0.08em] uppercase text-graphite">Before we start</p>
      <h2 class="mt-1 text-xl font-semibold tracking-tight">${step.title}</h2>
      <p class="mt-1 text-[15px] leading-relaxed text-graphite">You'll add a free trial and watch its reminder arrive. First, two quick things.</p>
      <form novalidate class="mt-4 space-y-4">
        <div>
          <label for="tour-time-zone" class="field-label">Your time zone</label>
          <input id="tour-time-zone" list="tour-zones" class="field-input" value="${escapeHtml(state.time_zone || detectedTimeZone())}" autocomplete="off" spellcheck="false">
          <datalist id="tour-zones">${zones}</datalist>
          <p class="field-error" data-error-for="tour-time-zone"></p>
        </div>
        <div>
          <span class="field-label">Reminders reach you</span>
          <p class="text-[15px]">In Smart's Demo inbox, always.</p>
          <label class="mt-3 flex items-center justify-between gap-4">
            <span class="text-[15px]">Also by email</span>
            <span class="switch"><input type="checkbox" id="tour-also-email"><span></span></span>
          </label>
          <input id="tour-email" type="email" class="field-input mt-3" placeholder="you@example.com" autocomplete="email" hidden>
          <p class="field-error" data-error-for="tour-email"></p>
        </div>
        <div class="flex items-center justify-between pt-1">
          <button type="button" data-skip class="text-sm text-graphite">Skip tour</button>
          <button type="submit" class="btn-small btn-small--ink px-5">Continue</button>
        </div>
      </form>`;
    const form = card.querySelector("form");
    const emailInput = card.querySelector("#tour-email");
    card.querySelector("#tour-also-email").addEventListener("change", (event) => {
      emailInput.hidden = !event.target.checked;
      if (event.target.checked) emailInput.focus();
      place();
    });
    card.querySelector("[data-skip]").addEventListener("click", finish);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const timeZone = card.querySelector("#tour-time-zone").value.trim();
      const wantsEmail = card.querySelector("#tour-also-email").checked;
      const email = emailInput.value.trim();
      for (const slot of card.querySelectorAll("[data-error-for]")) slot.textContent = "";
      if (!allTimeZones().includes(timeZone)) {
        card.querySelector('[data-error-for="tour-time-zone"]').textContent = "Choose a time zone from the list, like Africa/Lagos.";
        return place();
      }
      if (wantsEmail && !EMAIL_PATTERN.test(email)) {
        card.querySelector('[data-error-for="tour-email"]').textContent = "That email doesn't look right. Try name@example.com.";
        return place();
      }
      try {
        applySettings(state, await api.saveSettings({ time_zone: timeZone, ...(wantsEmail ? { email } : {}) }));
      } catch (error) {
        card.querySelector('[data-error-for="tour-email"]').textContent = error.message;
        return place();
      }
      next();
    });
    requestAnimationFrame(() => {
      place();
      card.querySelector('[type="submit"]').focus();
    });
  };

  function next() {
    index += 1;
    if (index >= steps.length) return finish();
    show();
  }

  const onKey = (event) => {
    if (event.key === "Escape") finish();
  };

  function finish() {
    markDone();
    running = false;
    blocker.remove();
    spotlight.remove();
    card.remove();
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    window.removeEventListener("hashchange", onHashChange);
    document.removeEventListener("keydown", onKey);
  }

  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  window.addEventListener("hashchange", onHashChange);
  document.addEventListener("keydown", onKey);
  next();
}

// Wait up to two seconds for an element to appear (a screen may still be drawing).
async function waitFor(selector) {
  for (let tries = 0; tries < 20; tries++) {
    const element = document.querySelector(selector);
    if (element && element.getBoundingClientRect().height > 0) return element;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}
