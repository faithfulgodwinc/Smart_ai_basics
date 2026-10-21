// Smart's own date and time pickers, in the same soft pressed-in style as the nav.
//
// A picker field is a <button name="deadline" value="2026-12-05">. The button keeps the chosen
// value (so form.elements.deadline.value works like any input) and shows it in words.
// Tapping it opens a sheet: a calendar for dates, scrolling wheels for times.

import { formatDate, parseDate, todayIso } from "./format.js";

const ROW_HEIGHT = 44; // one row on a time wheel, in pixels

// --- Fields ------------------------------------------------------------------

export function dateField(name, value = "") {
  return `<button type="button" id="${name}" name="${name}" value="${value}" data-picker="date"
    class="field-input picker-field"><span data-picker-text></span>${calendarIcon()}</button>`;
}

export function timeField(name, value = "09:00") {
  return `<button type="button" id="${name}" name="${name}" value="${value}" data-picker="time"
    class="field-input picker-field"><span data-picker-text></span>${clockIcon()}</button>`;
}

// Makes every picker field inside `root` open its picker. `min` = earliest allowed date.
export function wirePickers(root, { min = null } = {}) {
  for (const button of root.querySelectorAll("[data-picker]")) {
    showValue(button);
    button.addEventListener("click", () => {
      const pick = (value) => {
        setPickerValue(button, value);
        button.focus();
      };
      const title = root.querySelector(`[for="${button.id}"]`)?.textContent || "";
      if (button.dataset.picker === "date") openDatePicker({ value: button.value, min, title, onPick: pick });
      else openTimePicker({ value: button.value, title, onPick: pick });
    });
  }
}

export function setPickerValue(button, value) {
  button.value = value;
  showValue(button);
  button.dispatchEvent(new Event("change", { bubbles: true }));
}

function showValue(button) {
  const text = button.querySelector("[data-picker-text]");
  const empty = !button.value;
  text.textContent = empty ? "Choose a date"
    : button.dataset.picker === "date" ? formatDate(button.value) : clockText(button.value);
  button.classList.toggle("is-empty", empty);
}

// --- Layer: a sheet above everything, even above another sheet -------------------

function openLayer(html) {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop picker-backdrop";
  const sheet = document.createElement("div");
  sheet.className = "sheet picker-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.innerHTML = html;
  document.body.append(backdrop, sheet);

  const onKey = (event) => { if (event.key === "Escape") close(); };
  const close = () => {
    backdrop.remove();
    sheet.remove();
    document.removeEventListener("keydown", onKey);
  };
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  sheet.querySelector("[data-close]")?.addEventListener("click", close);
  return { sheet, close };
}

// --- Calendar ----------------------------------------------------------------------

function openDatePicker({ value, min, title, onPick }) {
  let selected = value || null;
  const start = parseDate(selected || min || todayIso());
  let year = start.getFullYear();
  let month = start.getMonth(); // 0 = January

  const { sheet, close } = openLayer(`
    <div class="mx-auto mb-5 h-1 w-10 rounded-full bg-line"></div>
    <p class="text-sm text-graphite">${title}</p>
    <div class="mt-2 flex items-center justify-between">
      <h2 data-month class="text-2xl font-semibold tracking-tight"></h2>
      <div class="flex gap-2">
        <button type="button" data-step="-1" class="soft-round" aria-label="Previous month">&lsaquo;</button>
        <button type="button" data-step="1" class="soft-round" aria-label="Next month">&rsaquo;</button>
      </div>
    </div>
    <div class="calendar-grid mt-5 text-xs text-graphite" aria-hidden="true">
      ${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span class="text-center">${d}</span>`).join("")}
    </div>
    <div data-days class="calendar-grid mt-2" role="grid"></div>
    <button type="button" data-done class="btn-primary mt-6">Done</button>
    <button type="button" data-close class="w-full py-3 mt-1 text-graphite">Cancel</button>`);

  const today = todayIso();
  const draw = () => {
    sheet.querySelector("[data-month]").textContent =
      new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    const first = new Date(year, month, 1);
    const blanks = (first.getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: blanks }, () => "<span></span>");
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const classes = ["calendar-day", iso === today && "is-today", iso === selected && "is-selected"].filter(Boolean).join(" ");
      cells.push(`<button type="button" class="${classes}" data-date="${iso}" ${min && iso < min ? "disabled" : ""}
        aria-pressed="${iso === selected}">${day}</button>`);
    }
    sheet.querySelector("[data-days]").innerHTML = cells.join("");

    // No going back to months that are entirely before the earliest allowed date.
    const minDate = min ? parseDate(min) : null;
    sheet.querySelector('[data-step="-1"]').disabled =
      Boolean(minDate) && (year < minDate.getFullYear() || (year === minDate.getFullYear() && month <= minDate.getMonth()));
    sheet.querySelector("[data-done]").disabled = !selected;
  };

  for (const arrow of sheet.querySelectorAll("[data-step]")) {
    arrow.addEventListener("click", () => {
      month += Number(arrow.dataset.step);
      if (month < 0) { month = 11; year--; }
      if (month > 11) { month = 0; year++; }
      draw();
    });
  }
  sheet.querySelector("[data-days]").addEventListener("click", (event) => {
    const day = event.target.closest("[data-date]");
    if (!day || day.disabled) return;
    selected = day.dataset.date;
    draw();
    sheet.querySelector(`[data-date="${selected}"]`).focus();
  });
  sheet.querySelector("[data-done]").addEventListener("click", () => {
    close();
    onPick(selected);
  });

  draw();
  (sheet.querySelector(".is-selected") || sheet.querySelector(".calendar-day:not([disabled])"))?.focus();
}

// --- Time wheels ---------------------------------------------------------------------

function uses24HourClock() {
  const cycle = new Intl.DateTimeFormat([], { hour: "numeric" }).resolvedOptions().hourCycle;
  return cycle === "h23" || cycle === "h24";
}

function openTimePicker({ value, title, onPick }) {
  const [hour24, minute] = (value || "09:00").split(":").map(Number);
  const twentyFour = uses24HourClock();
  const pad = (n) => String(n).padStart(2, "0");

  const hours = twentyFour ? [...Array(24).keys()] : [12, ...Array.from({ length: 11 }, (_, i) => i + 1)];
  const minutes = [...Array(60).keys()];
  const wheels = [
    { name: "hour", items: hours.map((h) => (twentyFour ? pad(h) : String(h))),
      index: twentyFour ? hour24 : hour24 % 12 },
    { name: "minute", items: minutes.map(pad), index: minute },
  ];
  if (!twentyFour) wheels.push({ name: "period", items: ["AM", "PM"], index: hour24 >= 12 ? 1 : 0 });

  const { sheet, close } = openLayer(`
    <div class="mx-auto mb-5 h-1 w-10 rounded-full bg-line"></div>
    <p class="text-sm text-graphite">${title}</p>
    <h2 class="mt-2 text-2xl font-semibold tracking-tight">Pick a time</h2>
    <div class="wheels mt-6">
      <div class="wheel-band" aria-hidden="true"></div>
      ${wheels.map((wheel) => `
        <div class="wheel" data-wheel="${wheel.name}" tabindex="0" role="listbox" aria-label="${wheel.name}">
          ${wheel.items.map((item, i) => `<div class="wheel-item" data-index="${i}" role="option">${item}</div>`).join("")}
        </div>`).join("")}
    </div>
    <button type="button" data-done class="btn-primary mt-6">Done</button>
    <button type="button" data-close class="w-full py-3 mt-1 text-graphite">Cancel</button>`);

  const chosen = {};
  for (const wheel of wheels) {
    const element = sheet.querySelector(`[data-wheel="${wheel.name}"]`);
    chosen[wheel.name] = wheel.index;
    const mark = () => {
      for (const item of element.children) item.classList.toggle("is-centre", Number(item.dataset.index) === chosen[wheel.name]);
    };
    element.scrollTop = wheel.index * ROW_HEIGHT; // start on the current value
    mark();

    // Whatever row sits in the middle band is the chosen one.
    element.addEventListener("scroll", () => {
      const index = Math.min(wheel.items.length - 1, Math.max(0, Math.round(element.scrollTop / ROW_HEIGHT)));
      if (index !== chosen[wheel.name]) {
        chosen[wheel.name] = index;
        mark();
      }
    });
    // Tapping a row rolls it into the middle.
    element.addEventListener("click", (event) => {
      const item = event.target.closest("[data-index]");
      if (item) element.scrollTo({ top: Number(item.dataset.index) * ROW_HEIGHT, behavior: "smooth" });
    });
    // Arrow keys move one row.
    element.addEventListener("keydown", (event) => {
      const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      element.scrollBy({ top: step * ROW_HEIGHT, behavior: "smooth" });
    });
  }

  sheet.querySelector("[data-done]").addEventListener("click", () => {
    let hour = hours[chosen.hour];
    if (!twentyFour) hour = (hour % 12) + (chosen.period === 1 ? 12 : 0);
    close();
    onPick(`${pad(hour)}:${pad(minutes[chosen.minute])}`);
  });
}

// --- Small helpers ---------------------------------------------------------------------

function clockText(value) {
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function calendarIcon() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`;
}

function clockIcon() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.5"/></svg>`;
}
