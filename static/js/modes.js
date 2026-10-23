// Switching between Demo and Live on the public site.
// Demo always starts a fresh, empty space, so its tour never builds on top of an old demo.

import * as api from "./api.js";
import { replayTour } from "./tour.js";

export async function switchTo(mode) {
  await api.switchMode(mode);
  if (mode === "demo") replayTour({ mode: "demo" }); // a fresh demo always gets the tour again
  if (mode === "live") {
    // An empty Live Smart always gets its guided tour; once it has cards, they know their way around.
    const { cards } = await api.getState();
    if (!cards.length) replayTour({ mode: "live" });
  }
  location.hash = "#home";
  location.reload();
}
