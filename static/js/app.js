// Starts Smart: loads everything from the server, keeps it in one `state` object,
// and shows one screen at a time based on the URL hash (#home, #add, #details/3, #edit/3),
// so the browser's back button works.

import * as api from "./api.js";
import { setTimeZone } from "./format.js";
import { renderHome } from "./screens/home.js";
import { renderSubscriptionForm } from "./screens/forms.js";
import { renderDetails } from "./screens/details.js";

export const state = {
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
};

function show() {
  const [name, id] = (location.hash.slice(1) || "home").split("/");
  const target = screens[name] ? name : "home";
  for (const section of document.querySelectorAll(".screen")) {
    section.hidden = section.id !== target;
    if (section.hidden) section.innerHTML = ""; // so field ids never appear twice on the page
  }
  screens[target](document.getElementById(target), state, id);
  for (const link of document.querySelectorAll(".nav-item")) {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${target}`);
  }
  window.scrollTo(0, 0);
}

async function start() {
  try {
    Object.assign(state, await api.getState());
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
