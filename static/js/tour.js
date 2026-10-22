// A short guided tour for first-time visitors: a soft spotlight on one part of Home at a
// time, with a small card explaining it. Shown once per browser; Profile can replay it.

const TOUR_DONE_KEY = "smart_tour_done";

// Each step points at an element on Home. Steps whose element isn't there are skipped
// (for example, Needs attention when nothing is due, or the inbox outside demo mode).
const STEPS = [
  { target: '[aria-label="Your cards"]', title: "Your cards",
    text: "Every trial and subscription sits under the card it charges. Swipe to see what your other card is carrying." },
  { target: "#card-subscriptions", title: "What this card carries",
    text: "Trials come first, with how long is left and when you'll be charged." },
  { target: '[aria-label="Needs attention"]', title: "Needs attention",
    text: "When something is due, Smart asks: have you cancelled it? Say yes and the totals drop." },
  { target: '[data-tour="total"]', title: "Your monthly total",
    text: "What all your cards cost you each month, if nothing gets cancelled." },
  { target: 'a[href="#inbox"].profile-button', title: "Your Demo inbox",
    text: "Reminders land here, at the time you choose. Netflix's is already waiting." },
  { target: ".nav-add", title: "Add a trial",
    text: "Add a trial or subscription, pick its card, and choose when to be reminded." },
  { target: '.nav-item[href="#profile"]', title: "Profile",
    text: "Where reminders go, your time zone, and everything you've cancelled." },
];

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

let running = false;

export function startTour() {
  const steps = STEPS.filter((step) => document.querySelector(step.target));
  if (running || !steps.length) return;
  running = true;

  const blocker = document.createElement("div"); // catches stray taps while the tour is open
  blocker.className = "tour-blocker";
  const spotlight = document.createElement("div");
  spotlight.className = "tour-spotlight";
  const card = document.createElement("div");
  card.className = "tour-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-live", "polite");
  document.body.append(blocker, spotlight, card);

  let index = 0;

  const place = () => {
    const element = document.querySelector(steps[index].target);
    if (!element) return;
    const box = element.getBoundingClientRect();
    const pad = 8;
    Object.assign(spotlight.style, {
      top: `${box.top - pad}px`, left: `${box.left - pad}px`,
      width: `${box.width + pad * 2}px`, height: `${box.height + pad * 2}px`,
    });
    // The card goes below the highlighted part if there's room, otherwise above it.
    const cardHeight = card.offsetHeight;
    const below = box.bottom + pad + 14;
    const top = below + cardHeight < window.innerHeight - 12 ? below : Math.max(12, box.top - pad - 14 - cardHeight);
    const width = Math.min(360, window.innerWidth - 32);
    const left = Math.min(Math.max(16, box.left + box.width / 2 - width / 2), window.innerWidth - width - 16);
    Object.assign(card.style, { top: `${top}px`, left: `${left}px`, width: `${width}px` });
  };

  const show = () => {
    const step = steps[index];
    const last = index === steps.length - 1;
    card.innerHTML = `
      <p class="text-xs tracking-[0.08em] uppercase text-graphite">${index + 1} of ${steps.length}</p>
      <h2 class="mt-1 text-lg font-semibold tracking-tight">${step.title}</h2>
      <p class="mt-1 text-[15px] leading-relaxed text-graphite">${step.text}</p>
      <div class="mt-4 flex items-center justify-between">
        <button type="button" data-skip class="text-sm text-graphite">${last ? "" : "Skip tour"}</button>
        <button type="button" data-next class="btn-small btn-small--ink px-5">${last ? "Done" : "Next"}</button>
      </div>`;
    card.querySelector("[data-next]").onclick = next;
    card.querySelector("[data-skip]").onclick = finish;
    const element = document.querySelector(step.target);
    const fixed = getComputedStyle(element).position === "fixed" || element.closest(".floating-nav");
    if (!fixed) element.scrollIntoView({ block: "center" });
    requestAnimationFrame(() => {
      place();
      card.querySelector("[data-next]").focus();
    });
  };

  const next = () => {
    if (index === steps.length - 1) return finish();
    index += 1;
    show();
  };

  const onKey = (event) => {
    if (event.key === "Escape") finish();
    if (event.key === "ArrowRight") next();
  };

  function finish() {
    markDone();
    running = false;
    blocker.remove();
    spotlight.remove();
    card.remove();
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    document.removeEventListener("keydown", onKey);
    window.scrollTo({ top: 0 });
  }

  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  document.addEventListener("keydown", onKey);
  show();
}

export function replayTour() {
  try {
    localStorage.removeItem(TOUR_DONE_KEY);
  } catch {
    // storage blocked: it still plays now
  }
}
