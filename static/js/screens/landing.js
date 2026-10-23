// The first thing someone sees: what Smart stands for, and the way in. On the public site
// that's the guided demo, with a clear option to skip it and use Smart for real (Live).

import { switchTo } from "../modes.js";

export const SEEN_LANDING_KEY = "smart_seen_landing";

export function hasSeenLanding() {
  try {
    return localStorage.getItem(SEEN_LANDING_KEY) === "1";
  } catch {
    return true; // storage blocked: don't trap them on the landing page
  }
}

export function renderLanding(root, state) {
  root.innerHTML = `
    <div class="landing">
      <p class="text-sm tracking-[0.08em] uppercase text-graphite">Smart</p>
      <h1 class="mt-6 text-5xl font-semibold tracking-tight leading-[1.05]">Be way<br>ahead.</h1>
      <p class="mt-8 text-lg text-graphite leading-relaxed max-w-[30ch]">
        Know which card every trial and subscription is sitting on.
        Get a calm reminder before you're charged, with the exact place to cancel.
      </p>
      <ul class="mt-10 space-y-3 text-[15px]">
        <li class="flex gap-3"><span class="landing-dot"></span>Your protected card stays protected.</li>
        <li class="flex gap-3"><span class="landing-dot"></span>No card numbers. No bank logins.</li>
        <li class="flex gap-3"><span class="landing-dot"></span>A reminder at the time you choose.</li>
      </ul>
      <button type="button" data-start class="btn-primary mt-14">${state.hosted ? "Try the guided demo" : "Get started"}</button>
      ${state.hosted ? `
        <p class="mt-3 text-sm text-graphite text-center">The demo is practice and resets each time.</p>
        <button type="button" data-live class="mt-4 w-full py-3 text-[15px] underline underline-offset-4">Skip the demo, use Smart for real</button>` : ""}
    </div>`;

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_LANDING_KEY, "1");
    } catch {
      // storage blocked: they'll see the landing page again next time, which is harmless
    }
  };

  root.querySelector("[data-live]")?.addEventListener("click", async () => {
    markSeen();
    await switchTo("live");
  });

  root.querySelector("[data-start]").addEventListener("click", async () => {
    markSeen();
    if (state.hosted && state.mode !== "demo") return switchTo("demo");
    if (location.hash === "#home") {
      // The address is already #home, so changing it fires nothing. Ask for a redraw directly.
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      location.hash = "#home";
    }
  });
}
