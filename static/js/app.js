// Starts Smart: loads everything from the server, keeps it in one `state` object,
// and shows one screen at a time based on the URL hash (#home, #add, #details/3, #edit/3),
// so the browser's back button works.

import * as api from "./api.js";
import { detectedTimeZone, setTimeZone } from "./format.js";
import { renderHome } from "./screens/home.js";
import { renderSubscriptionForm } from "./screens/forms.js";
import { renderDetails } from "./screens/details.js";
import { hasSeenLanding, renderLanding } from "./screens/landing.js";
import { renderProfile } from "./screens/profile.js";
import { renderHistory } from "./screens/history.js";

export const state = {
  demo: false, // true on the live demo: each visitor has their own private, pre-filled Smart
  email: null,
  time_zone: null, // e.g. 'Africa/Lagos': dates and reminders follow this
  cards: [],
  subscriptions: [],
  currentCardId: null, // which card Home is showing
};

const screens = {
  home: renderHome,
  add: renderSubscriptionForm,
  details: renderDetails,
  edit: renderSubscriptionForm,
  landing: renderLanding,
  profile: renderProfile,
  history: renderHistory,
};

// Screens that belong to a nav button: details and edit live under Home, history under Profile.
const NAV_SECTION = { details: "home", edit: "home", history: "profile" };

function show() {
  const [name, id] = (location.hash.slice(1) || "home").split("/");
  let target = screens[name] ? name : "home";
  if (target === "home" && !hasSeenLanding()) target = "landing"; // first visit
  document.querySelector(".floating-nav").hidden = target === "landing";
  for (const section of document.querySelectorAll(".screen")) {
    section.hidden = section.id !== target;
    if (section.hidden) section.innerHTML = ""; // so field ids never appear twice on the page
  }
  screens[target](document.getElementById(target), state, id);
  for (const link of document.querySelectorAll(".nav-item")) {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${NAV_SECTION[target] || target}`);
  }
  window.scrollTo(0, 0);
}

async function start() {
  try {
    Object.assign(state, await api.getState());
    if (state.demo && !state.time_zone) {
      // A demo visitor's reminders follow their own clock without asking.
      Object.assign(state, await api.saveSettings({ time_zone: detectedTimeZone() }));
    }
    setTimeZone(state.time_zone);
  } catch (error) {
    document.getElementById("home").hidden = false;
    document.getElementById("home").innerHTML =
      `<p class="pt-24 text-graphite">${error.message}</p>`;
    return;
  }
  window.addEventListener("hashchange", show);
  // Links marked data-replace swap the current page in history instead of adding one,
  // so going Details -> Edit -> Details and pressing Back returns Home, not to the form.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-replace]");
    if (!link) return;
    event.preventDefault();
    location.replace(link.getAttribute("href"));
  });
  show();
}

start();
