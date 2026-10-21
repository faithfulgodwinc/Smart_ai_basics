// Starts Smart: loads everything from the server, keeps it in one `state` object,
// and shows one screen at a time based on the URL hash (#home, #add, ...),
// so the browser's back button works.

import * as api from "./api.js";
import { renderHome } from "./screens/home.js";
import { renderSubscriptionForm } from "./screens/forms.js";

export const state = {
  email: null,
  cards: [],
  subscriptions: [],
  currentCardId: null, // which card Home is showing
};

const screens = {
  home: renderHome,
  add: renderSubscriptionForm,
};

function show() {
  const name = location.hash.slice(1) || "home";
  const target = screens[name] ? name : "home";
  for (const section of document.querySelectorAll(".screen")) {
    section.hidden = section.id !== target;
  }
  screens[target](document.getElementById(target), state);
  for (const link of document.querySelectorAll(".nav-item")) {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${target}`);
  }
  window.scrollTo(0, 0);
}

async function start() {
  try {
    Object.assign(state, await api.getState());
  } catch (error) {
    document.getElementById("home").hidden = false;
    document.getElementById("home").innerHTML =
      `<p class="pt-24 text-graphite">${error.message}</p>`;
    return;
  }
  window.addEventListener("hashchange", show);
  show();
}

start();
