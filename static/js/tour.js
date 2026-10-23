// The guided tour for first-time visitors. A soft spotlight on one thing at a time, with a
// small card explaining it. Shown once per browser; Profile can replay it.
//
// In Demo, Smart starts empty and the tour has the visitor build it: set their time zone and
// how reminders reach them, then add two ready-filled trials, creating the card each one
// charges along the way. Netflix's reminder is two minutes after they save, so they watch it
// arrive. In Live, the tour guides them while they fill in their own trial. On a personal
// laptop it's a short look around Home.

import * as api from "./api.js";
import {
  allTimeZones, escapeHtml, nowInTimeZone, reminderAtText, timeZoneOptions,
} from "./format.js";
import { setPickerValue } from "./pickers.js";
import { applySettings, setCardDraft, setFormDraft } from "./screens/forms.js";
import { switchTo } from "./modes.js";

// One "seen it" note per mode, so switching to Live still gets its own tour.
const tourKey = (state) => `smart_tour_done_${state?.mode || "local"}`;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NEW_CARD = "__new";

export function tourDone(state) {
  try {
    return localStorage.getItem(tourKey(state)) === "1";
  } catch {
    return true; // storage blocked: don't show it on every visit
  }
}

function markDone(state) {
  try {
    localStorage.setItem(tourKey(state), "1");
  } catch {
    // storage blocked: harmless
  }
}

export function replayTour(state) {
  try {
    localStorage.removeItem(tourKey(state));
  } catch {
    // storage blocked: it still plays now
  }
}

// --- The steps ---------------------------------------------------------------------
// A step spotlights `target` (or shows a centred card when there's none) and has either
// a Next button, or `act`: the visitor taps the highlighted control, `act` does what that
// tap means, and the tour moves on once `done()` is true (the screen really changed).

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const tap = (element) => element.click();
const chooseNewCard = (select) => {
  select.value = NEW_CARD;
  select.dispatchEvent(new Event("change")); // opens the card sheet, as choosing "New card…" does
};
const sheetOpen = () => !document.getElementById("sheet").hidden;
const sheetClosed = () => document.getElementById("sheet").hidden;
const onScreen = (hash) => () => location.hash === hash;

// The four taps that add one trial and the card it charges.
function addTrialSteps({ intro, subscription, card, saveText, beforeSave }) {
  return [
    { target: ".nav-add", title: intro.title, text: intro.text, act: tap, done: onScreen("#add"),
      before: () => { setFormDraft(subscription()); setCardDraft(card); } },
    { target: "#add #card_id", title: "Which card does it charge?",
      text: `Smart is about knowing which card is exposed. Tap here to add your ${card.nickname}.`,
      act: chooseNewCard, done: sheetOpen },
    { target: '#sheet [type="submit"]', title: `Your ${card.nickname}`,
      text: `${card.nickname}, ${card.bank}. No card number, ever. Just enough to recognise it. Tap Save card.`,
      act: tap, done: sheetClosed },
    { target: '#add [type="submit"]', title: "Ready to save", text: saveText, before: beforeSave,
      act: tap, done: onScreen("#home") },
  ];
}

function demoSteps(state) {
  const reminder = {};
  const zoneNow = () => nowInTimeZone(state.time_zone);

  // Netflix ends today; its reminder is two minutes after the visitor taps Save.
  const twoMinutesFromNow = () => new Date(zoneNow().getTime() + (zoneNow().getSeconds() > 40 ? 3 : 2) * 60000);
  const netflix = () => {
    const at = twoMinutesFromNow();
    return {
      name: "Netflix", monthly_cost: "15.49", is_trial: true, deadline: isoDate(at),
      reminder_time: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
      source_type: "website", source_value: "https://www.netflix.com/cancelplan",
    };
  };
  const setNetflixReminder = () => {
    // Re-time it now, so "two minutes" holds however long they spent reading.
    const at = twoMinutesFromNow();
    const fields = document.querySelector("#add form").elements;
    setPickerValue(fields.deadline, isoDate(at));
    setPickerValue(fields.reminder_time, `${pad(at.getHours())}:${pad(at.getMinutes())}`);
    reminder.time = reminderAtText(`${isoDate(at)}T${fields.reminder_time.value}`).replace(" today", "");
  };
  const duolingo = () => {
    const ends = new Date(zoneNow().getTime() + 9 * 86400000);
    return {
      name: "Duolingo Max", monthly_cost: "13.99", is_trial: true, deadline: isoDate(ends),
      reminder_time: "09:00", source_type: "app", source_value: "Duolingo",
    };
  };

  return [
    { title: "Welcome to Smart", welcome: true },
    ...addTrialSteps({
      intro: { title: "Your Smart is empty", text: "Let's build it. You just started a Netflix free trial: tap + to add it." },
      subscription: netflix,
      card: { nickname: "Side card", bank: "Online Bank", name_on_card: "ALEX DEMO" },
      beforeSave: setNetflixReminder,
      saveText: () => `Netflix, a free trial that ends today, on your Side card. Its reminder is set for ${reminder.time}, two minutes away. Tap Save.`,
    }),
    { target: '[aria-label="Your cards"]', title: "Your first card",
      text: "Made from what you just saved, with Netflix on it and its monthly total. Nothing here was pre-built." },
    ...addTrialSteps({
      intro: { title: "Now the card you protect", text: "You also tried Duolingo Max, and it went on your main account. Tap + to add it." },
      subscription: duolingo,
      card: { nickname: "Main card", bank: "Savings Bank", name_on_card: "ALEX DEMO" },
      saveText: () => "Duolingo Max, a free trial ending in 9 days, on your Main card. Tap Save.",
    }),
    { target: '[aria-label="Your cards"]', title: "Which card is exposed",
      text: "Two cards now, both made by you. After the tour, swipe between them: the trial you forgot sits on the card you meant to protect. That's what Smart shows you at a glance." },
    { target: '[aria-label="Needs attention"]', title: "Needs attention",
      text: "Netflix ends today, so it's up here. When something is due, Smart asks: have you cancelled it? Say yes and the totals drop. Leave it for now." },
    { target: '[data-tour="total"]', title: "Your monthly total", text: "What your cards will cost you each month, if nothing gets cancelled." },
    { target: 'a[href="#inbox"].profile-button', title: "Your Demo inbox",
      text: () => `Netflix's reminder lands here at ${reminder.time}${state.email ? `, and in ${state.email}` : ""}, with the link to cancel. Keep Smart open and watch for it.` },
    { target: '.nav-item[href="#profile"]', title: "Profile",
      text: () => `Where reminders go, your time zone, and everything you've cancelled. That's the tour. Netflix's reminder arrives at ${reminder.time}.` },
  ];
}

// Live: their own Smart. The tour points the way; they type everything themselves.
function liveSteps(state) {
  let before = 0;
  return [
    { title: "Welcome to your Smart", welcome: true,
      intro: "This is Live: your own Smart, kept in this browser. You'll add a trial you've really started, and the card it charges. First, two quick things." },
    { target: ".nav-add", title: () => (state.cards.length ? "Add a trial" : "Add your first trial"),
      text: "Tap + to add a free trial or subscription you've actually started.",
      act: tap, done: onScreen("#add"), before: () => { before = state.subscriptions.length; } },
    { free: true, title: "Fill it in yourself",
      text: "Its name, the monthly cost, and the date it ends or renews. For Card, choose \u201cNew card\u2026\u201d to add the card it charges. Pick when you'd like to be reminded, then tap Save.",
      done: () => location.hash === "#home" && state.subscriptions.length > before },
    { target: '[aria-label="Your cards"]', title: () => (state.cards.length > 1 ? "Your cards" : "Your first card"),
      text: "Made from what you just entered. Every trial sits under the card it charges, so you can see what each card is carrying." },
    { target: '[aria-label="Needs attention"]', title: "Needs attention",
      text: "When something is due, Smart asks: have you cancelled it? Say yes and the totals drop." },
    { target: '[data-tour="total"]', title: "Your monthly total", text: "What your cards will cost you each month, if nothing gets cancelled." },
    { target: 'a[href="#inbox"].profile-button', title: "Your inbox",
      text: () => `Reminders land here at the time you chose${state.email ? `, and in ${state.email}` : ". Add your email in Profile to get them by email too"}.` },
    { target: '.nav-item[href="#profile"]', title: "Profile",
      text: "Where reminders go, your time zone, and what you've cancelled. You can switch to Demo here anytime for a fresh guided demo; your Live Smart stays as it is." },
  ];
}

function lookAroundSteps() {
  return [
    { target: '[aria-label="Needs attention"]', title: "Needs attention",
      text: "When something is due, Smart asks: have you cancelled it? Say yes and the totals drop." },
    { target: '[aria-label="Your cards"]', title: "Your cards",
      text: "Every trial and subscription sits under the card it charges. Swipe to see what each card is carrying." },
    { target: "#card-subscriptions", title: "What this card carries", text: "Trials come first, with how long is left and when you'll be charged." },
    { target: '[data-tour="total"]', title: "Your monthly total", text: "What all your cards cost you each month, if nothing gets cancelled." },
    { target: ".nav-add", title: "Add a trial", text: "Add a trial or subscription, pick its card, and choose when to be reminded." },
    { target: '.nav-item[href="#profile"]', title: "Profile", text: "Where reminders go, your time zone, and everything you've cancelled." },
  ];
}

// --- The engine ----------------------------------------------------------------------

let running = false;

export function startTour(state) {
  if (running) return;
  const steps = state.demo ? demoSteps(state) : state.hosted ? liveSteps(state) : lookAroundSteps();
  running = true;

  const blocker = document.createElement("div"); // only the highlighted control responds
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
  let watching = null; // the timer that waits for an act step to take effect
  let moving = false; // between steps: ignore extra taps on Next, so no step gets skipped

  const place = () => {
    const width = Math.min(360, window.innerWidth - 32);
    const free = steps[index]?.free;
    blocker.classList.toggle("is-dim", !target && !free); // a centred card dims the page itself
    blocker.classList.toggle("is-open", Boolean(free)); // a "fill it in yourself" step: the page stays usable
    if (free) {
      spotlight.hidden = true;
      if (card.className === "tour-card") {
        Object.assign(card.style, { width: `${width}px`, left: `${(window.innerWidth - width) / 2}px`, top: "12px" });
      }
      return;
    }
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
    const gap = 8;
    Object.assign(spotlight.style, {
      top: `${box.top - gap}px`, left: `${box.left - gap}px`,
      width: `${box.width + gap * 2}px`, height: `${box.height + gap * 2}px`,
    });
    const below = box.bottom + gap + 14;
    const top = below + card.offsetHeight < window.innerHeight - 12
      ? below : Math.max(12, box.top - gap - 14 - card.offsetHeight);
    const left = Math.min(Math.max(16, box.left + box.width / 2 - width / 2), window.innerWidth - width - 16);
    Object.assign(card.style, { top: `${top}px`, left: `${left}px`, width: `${width}px` });
  };

  // A tap on the dimmed layer counts only if it lands on the highlighted control.
  blocker.addEventListener("click", (event) => {
    const step = steps[index];
    if (!step?.act || !target || watching) return;
    const box = target.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right
      && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) return;
    step.act(target);
    // Move on once the screen has really changed (the form opened, the card saved...).
    watching = setInterval(() => {
      if (step.done()) {
        clearInterval(watching);
        watching = null;
        setTimeout(next, 350); // let the new screen settle
      }
    }, 120);
  });

  const show = async () => {
    const step = steps[index];
    if (step.free) return showFree(step);
    if (step.welcome) {
      target = null;
      renderWelcome(step);
      return;
    }
    target = await waitFor(step.target);
    if (!target) { // not on this screen (e.g. nothing is due yet): skip it
      index += 1;
      if (index >= steps.length) return finish();
      return show();
    }
    await settled(target); // e.g. a sheet still sliding up: highlight it where it ends up
    step.before?.();
    const text = typeof step.text === "function" ? step.text() : step.text;
    const last = index === steps.length - 1;
    card.innerHTML = `
      <p class="text-xs tracking-[0.08em] uppercase text-graphite">${index + 1} of ${steps.length}</p>
      <h2 class="mt-1 text-lg font-semibold tracking-tight">${escapeHtml(typeof step.title === "function" ? step.title() : step.title)}</h2>
      <p class="mt-1 text-[15px] leading-relaxed text-graphite">${escapeHtml(text)}</p>
      <div class="mt-4 flex items-center justify-between">
        <button type="button" data-skip class="text-sm text-graphite">${last ? "" : "Skip tour"}</button>
        ${step.act ? "" : `<button type="button" data-next class="btn-small btn-small--ink px-5">${last ? "Done" : "Next"}</button>`}
      </div>`;
    card.querySelector("[data-next]")?.addEventListener("click", next);
    card.querySelector("[data-skip]").addEventListener("click", finish);
    if (!target.closest(".floating-nav")) target.scrollIntoView({ block: "center" });
    requestAnimationFrame(() => {
      place();
      (card.querySelector("[data-next]") || card.querySelector("[data-skip]")).focus();
    });
  };

  // A step where the visitor does the work: a small note at the top, the page fully usable.
  // "Got it" folds the note into a slim pill; the tour moves on by itself once done() is true.
  const showFree = (step) => {
    target = null;
    const fold = () => {
      card.className = "tour-pill";
      card.removeAttribute("style");
      card.innerHTML = `<span>${escapeHtml(step.title)}: tap Save when you're done</span><button type="button" data-skip>Skip tour</button>`;
      card.querySelector("[data-skip]").addEventListener("click", finish);
    };
    card.className = "tour-card";
    card.innerHTML = `
      <p class="text-xs tracking-[0.08em] uppercase text-graphite">${index + 1} of ${steps.length}</p>
      <h2 class="mt-1 text-lg font-semibold tracking-tight">${escapeHtml(step.title)}</h2>
      <p class="mt-1 text-[15px] leading-relaxed text-graphite">${escapeHtml(step.text)}</p>
      <div class="mt-4 flex items-center justify-between">
        <button type="button" data-skip class="text-sm text-graphite">Skip tour</button>
        <button type="button" data-fold class="btn-small btn-small--ink px-5">Got it</button>
      </div>`;
    card.querySelector("[data-skip]").addEventListener("click", finish);
    card.querySelector("[data-fold]").addEventListener("click", fold);
    requestAnimationFrame(place);
    watching = setInterval(() => {
      if (step.done()) {
        clearInterval(watching);
        watching = null;
        card.className = "tour-card";
        setTimeout(next, 450);
      }
    }, 200);
  };

  const renderWelcome = (step) => {
    card.innerHTML = `
      <p class="text-xs tracking-[0.08em] uppercase text-graphite">${state.demo ? "Demo mode" : "Live mode"}</p>
      <h2 class="mt-1 text-xl font-semibold tracking-tight">${step.title}</h2>
      <p class="mt-1 text-[15px] leading-relaxed text-graphite">${step.intro || "This is a practice Smart: it starts empty, you build it in a few taps, then watch a reminder arrive. It resets every time you come back to Demo."}</p>
      ${state.demo ? `<button type="button" data-go-live class="mt-2 text-[15px] underline underline-offset-4">Use Smart for real instead (Live)</button>` : ""}
      <form novalidate class="mt-4 space-y-4">
        <div>
          <label for="tour-time-zone" class="field-label">Your time zone</label>
          <select id="tour-time-zone" class="field-input" required>${timeZoneOptions("")}</select>
          <p class="field-error" data-error-for="tour-time-zone"></p>
        </div>
        <div>
          <span class="field-label">Reminders reach you</span>
          <p class="text-[15px]">In Smart's ${state.demo ? "Demo inbox" : "inbox"}, always.</p>
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
    // The red clears as soon as they fix it.
    card.querySelector("#tour-time-zone").addEventListener("change", (event) => {
      event.target.classList.remove("has-error");
      card.querySelector('[data-error-for="tour-time-zone"]').textContent = "";
    });
    card.querySelector("#tour-also-email").addEventListener("change", (event) => {
      emailInput.hidden = !event.target.checked;
      if (event.target.checked) emailInput.focus();
      place();
    });
    card.querySelector("[data-skip]").addEventListener("click", finish);
    card.querySelector("[data-go-live]")?.addEventListener("click", async () => {
      finish(); // the demo's tour is done with; Live starts its own
      await switchTo("live");
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const timeZone = card.querySelector("#tour-time-zone").value;
      const wantsEmail = card.querySelector("#tour-also-email").checked;
      const email = emailInput.value.trim();
      for (const slot of card.querySelectorAll("[data-error-for]")) slot.textContent = "";
      for (const input of card.querySelectorAll(".has-error")) input.classList.remove("has-error");
      // Show what needs fixing: the field outlined in red, its message, and the focus on it.
      const flag = (id, message) => {
        card.querySelector(`[data-error-for="${id}"]`).textContent = message;
        const field = card.querySelector(`#${id}`);
        field.classList.add("has-error");
        field.focus();
        place();
      };
      if (!allTimeZones().includes(timeZone)) {
        return flag("tour-time-zone", "Please select your time zone.");
      }
      if (wantsEmail && !EMAIL_PATTERN.test(email)) {
        return flag("tour-email", "That email doesn't look right. Try name@example.com.");
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

  async function next() {
    if (moving) return;
    moving = true;
    card.classList.add("is-moving");
    index += 1;
    if (index >= steps.length) {
      moving = false;
      return finish();
    }
    await show();
    card.classList.remove("is-moving");
    moving = false;
  }

  const onKey = (event) => {
    if (event.key === "Escape") finish();
  };

  function finish() {
    markDone(state);
    running = false;
    clearInterval(watching);
    blocker.remove();
    spotlight.remove();
    card.remove();
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    document.removeEventListener("keydown", onKey);
  }

  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  document.addEventListener("keydown", onKey);
  next();
}

// Wait until an element has stopped moving (up to a second), so taps land where it's highlighted.
async function settled(element) {
  let last = "";
  for (let tries = 0; tries < 20; tries++) {
    const box = element.getBoundingClientRect();
    const now = `${Math.round(box.top)},${Math.round(box.left)},${Math.round(box.height)}`;
    if (now === last) return;
    last = now;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
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
