// The subscription form (add and edit), the card sheet that opens over it, and their checks.
// The server repeats the same checks, so a message always appears next to the right field.

import * as api from "../api.js";
import { ApiError } from "../api.js";
import {
  allTimeZones, cleanMoney, escapeHtml, timeNow, timeZoneOptions, todayIso, reminderAtText, reminderDestination, setTimeZone, timeZoneLabel,
} from "../format.js";
import { toast } from "../toast.js";
import { whileBusy } from "../busy.js";
import { dateField, setPickerValue, timeField, wirePickers } from "../pickers.js";

const NEW_CARD = "__new";

// The guided tour can hand the add form a ready-made subscription to show, filled in.
let pendingDraft = null;
export function setFormDraft(draft) {
  pendingDraft = draft;
}

// ...and the card sheet a ready-made card ({ nickname, bank, name_on_card }).
let pendingCardDraft = null;
export function setCardDraft(draft) {
  pendingCardDraft = draft;
}
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Subscription form ---------------------------------------------------

// subId given -> edit that subscription; otherwise add a new one.
export function renderSubscriptionForm(root, state, subId = null) {
  const editing = subId ? state.subscriptions.find((sub) => sub.id === Number(subId)) : null;
  if (subId && !editing) {
    location.hash = "#home";
    return;
  }
  const needsEmail = !state.email && !state.hosted; // on the public site, reminders always reach the in-app inbox
  const needsTimeZone = !state.time_zone;
  const backTo = editing ? `#details/${editing.id}` : "#home";

  root.innerHTML = `
    <header class="pt-10 pb-8">
      <a href="${backTo}" ${editing ? "data-replace" : ""} class="text-sm text-graphite">&larr; Back</a>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight">${editing ? "Edit subscription" : "New subscription"}</h1>
    </header>

    <form novalidate class="space-y-6">
      ${field("name", "Name", `<input id="name" name="name" class="field-input" placeholder="Netflix" autocomplete="off">`)}
      ${field("monthly_cost", "Monthly cost", `<input id="monthly_cost" name="monthly_cost" class="field-input" inputmode="decimal" placeholder="15.49">`)}

      <div data-tour="trial" class="flex items-center justify-between gap-4 py-1">
        <label for="is_trial" class="leading-snug">Free trial I intend to cancel?</label>
        <span class="switch"><input type="checkbox" id="is_trial" name="is_trial"><span></span></span>
      </div>

      <div data-tour="when" class="grid grid-cols-[1fr_auto] gap-3">
        ${field("deadline", "Next billing date", dateField("deadline"))}
        ${field("reminder_time", "Remind me at", timeField("reminder_time"))}
      </div>
      <p id="time-now-hint" class="-mt-3 text-sm text-ink" hidden></p>
      <p id="reminder-settings-line" class="-mt-3 text-sm text-graphite leading-relaxed"></p>

      ${field("card_id", "Card", `
        <select id="card_id" name="card_id" class="field-input">
          ${cardOptions(state, editing?.card_id)}
        </select>`)}

      <div>
        <span class="field-label">Where did you subscribe?</span>
        <div class="segmented" role="group" aria-label="Where did you subscribe?">
          <button type="button" data-source="website" aria-pressed="true">Website</button>
          <button type="button" data-source="app" aria-pressed="false">App</button>
        </div>
        <p class="field-error" data-error-for="source_type"></p>
      </div>
      ${field("source_value", "Cancel or plans link", `<input id="source_value" name="source_value" class="field-input" placeholder="https://" autocomplete="off">`)}

      ${needsEmail ? emailField("Where should reminders go?") : ""}
      ${needsTimeZone ? timeZoneField("Your time zone", "") : ""}

      <p class="field-error" data-error-for="form"></p>
      <button type="submit" class="btn-primary">${editing ? "Save changes" : "Save"}</button>
    </form>`;

  const form = root.querySelector("form");
  const inputs = form.elements;
  showReminderSettingsLine(root, state);
  let sourceType = "website";
  let lastCardValue = inputs.card_id.value;

  const showTrialLabel = () => {
    root.querySelector('[for="deadline"]').textContent = inputs.is_trial.checked ? "Trial ends" : "Next billing date";
  };
  inputs.is_trial.addEventListener("change", showTrialLabel);
  // The calendar greys out days before today; the time wheel says what time it is now when the date is today.
  const isToday = () => inputs.deadline.value === todayIso();
  wirePickers(root, {
    min: todayIso(),
    timeNote: () => (isToday() ? `It's ${timeNow().words} now. Choose a later time for today.` : null),
  });
  const showTimeNow = () => {
    const hint = root.querySelector("#time-now-hint");
    hint.hidden = !isToday();
    if (isToday()) hint.textContent = `It's ${timeNow().words} now. A reminder for today needs a later time.`;
  };
  form.addEventListener("change", showTimeNow);
  showTimeNow();

  // Only numbers in the price: anything else is removed as you type or paste.
  inputs.monthly_cost.addEventListener("input", () => {
    const cleaned = cleanMoney(inputs.monthly_cost.value);
    if (cleaned !== inputs.monthly_cost.value) inputs.monthly_cost.value = cleaned;
  });

  const chooseSource = (type, keepValue = false) => {
    sourceType = type;
    for (const b of root.querySelectorAll("[data-source]")) b.setAttribute("aria-pressed", String(b.dataset.source === type));
    const isWebsite = type === "website";
    root.querySelector('[for="source_value"]').textContent = isWebsite ? "Cancel or plans link" : "App name";
    inputs.source_value.placeholder = isWebsite ? "https://" : "Duolingo";
    if (!keepValue) inputs.source_value.value = "";
    clearError(root, "source_value");
  };
  for (const button of root.querySelectorAll("[data-source]")) {
    button.addEventListener("click", () => chooseSource(button.dataset.source));
  }

  if (editing) {
    inputs.name.value = editing.name;
    inputs.monthly_cost.value = (editing.monthly_cost_cents / 100).toFixed(2);
    inputs.is_trial.checked = Boolean(editing.is_trial);
    setPickerValue(inputs.deadline, editing.deadline);
    setPickerValue(inputs.reminder_time, editing.reminder_time);
    inputs.source_value.value = editing.source_value;
    chooseSource(editing.source_type, true);
    showTrialLabel();
  } else if (pendingDraft) {
    const draft = pendingDraft;
    pendingDraft = null;
    inputs.name.value = draft.name;
    inputs.monthly_cost.value = draft.monthly_cost;
    inputs.is_trial.checked = draft.is_trial;
    setPickerValue(inputs.deadline, draft.deadline);
    setPickerValue(inputs.reminder_time, draft.reminder_time);
    if (draft.card_id) inputs.card_id.value = String(draft.card_id);
    chooseSource(draft.source_type, true);
    inputs.source_value.value = draft.source_value;
    showTrialLabel();
  }

  inputs.card_id.addEventListener("change", () => {
    if (inputs.card_id.value !== NEW_CARD) {
      lastCardValue = inputs.card_id.value;
      return;
    }
    openCardSheet({
      onSaved(card) {
        state.cards.push(card);
        inputs.card_id.innerHTML = cardOptions(state);
        inputs.card_id.value = String(card.id);
        lastCardValue = inputs.card_id.value;
        clearError(root, "card_id");
      },
      onClosed() {
        if (inputs.card_id.value === NEW_CARD) inputs.card_id.value = lastCardValue;
      },
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = {
      name: inputs.name.value.trim(),
      monthly_cost: inputs.monthly_cost.value.trim(),
      is_trial: inputs.is_trial.checked,
      deadline: inputs.deadline.value,
      reminder_time: inputs.reminder_time.value,
      card_id: inputs.card_id.value,
      source_type: sourceType,
      source_value: inputs.source_value.value.trim(),
    };
    const settings = {};
    if (needsEmail) settings.email = inputs.email.value.trim();
    if (needsTimeZone) settings.time_zone = inputs.time_zone.value.trim();

    clearErrors(root);
    const errors = { ...checkSubscription(values), ...checkSettings(settings) };
    const keptOldDate = editing && values.deadline === editing.deadline;
    if (values.deadline && !keptOldDate && values.deadline < todayIso()) errors.deadline = "Pick today or a later date.";
    // A reminder for today has to be later than right now (an untouched old date and time is fine).
    const keptOldTime = keptOldDate && values.reminder_time === editing.reminder_time;
    if (values.deadline === todayIso() && !keptOldTime && values.reminder_time <= timeNow().hhmm) {
      errors.reminder_time = `It's ${timeNow().words} now. Pick a reminder time after that.`;
    }
    if (showErrors(root, errors)) return;

    const button = form.querySelector('[type="submit"]');
    await whileBusy(button, async () => { try {
      if (Object.keys(settings).length) {
        applySettings(state, await api.saveSettings(settings));
      }
      if (editing) {
        const result = await api.updateSubscription(editing.id, values);
        state.subscriptions = state.subscriptions.map((sub) => (sub.id === editing.id ? result.subscription : sub));
        location.replace(`#details/${editing.id}`); // so Back doesn't reopen the form
        toast(reminderNote(result, state).replace("Saved.", "Changes saved."));
        return;
      }
      const result = await api.saveSubscription(values);
      state.subscriptions.push(result.subscription);
      state.currentCardId = result.subscription.card_id;
      location.hash = "#home";
      toast(reminderNote(result, state));
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      showErrors(root, { [error.field || "form"]: error.message });
    } });
  });
}

function cardOptions(state, selectedId = state.currentCardId) {
  const options = state.cards.map((card) =>
    `<option value="${card.id}" ${card.id === selectedId ? "selected" : ""}>${escapeHtml(card.nickname)} · ${escapeHtml(card.bank)}</option>`);
  const placeholder = state.cards.length ? "" : `<option value="" selected disabled>Choose a card</option>`;
  return `${placeholder}${options.join("")}<option value="${NEW_CARD}">New card…</option>`;
}

export function checkSubscription(values) {
  const errors = {};
  if (!values.name) errors.name = "Add a name.";
  const cost = Number(values.monthly_cost);
  if (values.monthly_cost === "" || Number.isNaN(cost)) errors.monthly_cost = "Add the monthly cost as a number, like 9.99.";
  else if (cost < 0) errors.monthly_cost = "The cost can't be below 0.";
  if (!values.deadline) errors.deadline = "Pick a date.";
  if (!TIME_PATTERN.test(values.reminder_time)) errors.reminder_time = "Pick a time for the reminder.";
  if (!values.card_id || values.card_id === NEW_CARD) errors.card_id = "Choose the card it's on.";
  if (values.source_type === "website" && !/^https?:\/\//.test(values.source_value)) {
    errors.source_value = "Paste the full link, starting with https://";
  }
  if (values.source_type === "app" && !values.source_value) errors.source_value = "Add the app's name.";
  return errors;
}

// Checks whichever settings are present ({ email, time_zone }).
export function checkSettings(settings) {
  const errors = {};
  if ("email" in settings && !EMAIL_PATTERN.test(settings.email)) {
    errors.email = "That email doesn't look right. Try name@example.com.";
  }
  if ("time_zone" in settings && !allTimeZones().includes(settings.time_zone)) {
    errors.time_zone = settings.time_zone ? "Choose a time zone from the list." : "Please select your time zone.";
  }
  return errors;
}

// What happened to the reminder when this subscription was saved.
export function reminderNote({ reminder, reminder_at: reminderAt }, state) {
  const destination = reminderDestination(state);
  if (reminder === "sent") return `Saved. Reminder sent to ${destination}.`;
  if (reminder === "scheduled") return `Saved. Reminder set for ${reminderAtText(reminderAt)}, to ${destination}.`;
  if (reminder === "failed") return "Saved. The reminder email couldn't be sent — check the email settings in .env.";
  return "Saved.";
}

// --- Card sheet ------------------------------------------------------------

// card given -> edit it; otherwise create a new one.
export function openCardSheet({ card: existing = null, onSaved, onClosed = () => {} }) {
  const { sheet, close } = openSheet(`
    <div class="mx-auto mb-6 h-1 w-10 rounded-full bg-line"></div>
    <h2 class="text-2xl font-semibold tracking-tight">${existing ? "Edit card" : "New card"}</h2>
    <p class="mt-2 text-sm text-graphite">No card number. Just enough to recognise it.</p>
    <form novalidate class="mt-6 space-y-5">
      ${field("nickname", "Nickname", `<input id="nickname" name="nickname" class="field-input" placeholder="Side card" autocomplete="off">`)}
      ${field("bank", "Bank", `<input id="bank" name="bank" class="field-input" placeholder="Your bank" autocomplete="off">`)}
      ${field("name_on_card", "Name on card", `<input id="name_on_card" name="name_on_card" class="field-input" autocomplete="off">`)}
      <p class="field-error" data-error-for="form"></p>
      <button type="submit" class="btn-primary">Save card</button>
      <button type="button" data-close class="w-full py-3 text-graphite">Cancel</button>
    </form>`, onClosed);

  const form = sheet.querySelector("form");
  const inputs = form.elements;
  const prefill = existing || pendingCardDraft;
  pendingCardDraft = null;
  if (prefill) {
    inputs.nickname.value = prefill.nickname;
    inputs.bank.value = prefill.bank;
    inputs.name_on_card.value = prefill.name_on_card;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const card = {
      nickname: inputs.nickname.value.trim(),
      bank: inputs.bank.value.trim(),
      name_on_card: inputs.name_on_card.value.trim(),
    };
    clearErrors(sheet);
    const errors = {};
    if (!card.nickname) errors.nickname = "Add a nickname.";
    if (!card.bank) errors.bank = "Add the bank.";
    if (!card.name_on_card) errors.name_on_card = "Add the name on the card.";
    if (showErrors(sheet, errors)) return;

    await whileBusy(form.querySelector('[type="submit"]'), async () => { try {
      onSaved(await (existing ? api.updateCard(existing.id, card) : api.saveCard(card)));
      close();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      showErrors(sheet, { [error.field || "form"]: error.message });
    } });
  });
}

// --- Renew sheet: "It renewed" -> when is the next billing date? ----------------

export function openRenewSheet(sub, state, onRenewed) {
  const { sheet, close } = openSheet(`
    <div class="mx-auto mb-6 h-1 w-10 rounded-full bg-line"></div>
    <h2 class="text-2xl font-semibold tracking-tight">${escapeHtml(sub.name)} renewed</h2>
    <p class="mt-2 text-sm text-graphite">When is the next billing date? Smart will remind you before it, at ${escapeHtml(sub.reminder_time)}.</p>
    <form novalidate class="mt-6 space-y-5">
      ${field("deadline", "Next billing date", dateField("deadline"))}
      <p class="field-error" data-error-for="form"></p>
      <button type="submit" class="btn-primary">Save</button>
      <button type="button" data-close class="w-full py-3 text-graphite">Cancel</button>
    </form>`);

  const form = sheet.querySelector("form");
  wirePickers(sheet, { min: todayIso() });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const deadline = form.elements.deadline.value;
    clearErrors(sheet);
    const dateError = !deadline ? "Pick a date." : deadline < todayIso() ? "Pick today or a later date." : null;
    if (showErrors(sheet, dateError ? { deadline: dateError } : {})) return;
    await whileBusy(form.querySelector('[type="submit"]'), async () => { try {
      const result = await api.renewSubscription(sub.id, deadline);
      close();
      onRenewed(result.subscription);
      toast(reminderNote(result, state).replace("Saved.", `${sub.name} is active again.`));
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      showErrors(sheet, { [error.field || "form"]: error.message });
    } });
  });
}

// --- Reminder settings (email + time zone) -----------------------------------

export function applySettings(state, settings) {
  state.email = settings.email;
  state.time_zone = settings.time_zone;
  setTimeZone(settings.time_zone);
}

// "Reminders go to you@gmail.com · Lagos time (GMT+1) · Change"
function showReminderSettingsLine(root, state) {
  const line = root.querySelector("#reminder-settings-line");
  if (!reminderDestination(state) || !state.time_zone) {
    line.hidden = true;
    return;
  }
  line.hidden = false;
  line.innerHTML = `Reminders go to <span class="text-ink">${escapeHtml(reminderDestination(state))}</span>
    · ${escapeHtml(timeZoneLabel(state.time_zone))}
    · <button type="button" class="underline underline-offset-2 text-ink">Change</button>`;
  line.querySelector("button").onclick = () =>
    openReminderSettings(state, () => showReminderSettingsLine(root, state));
}

// The one place to change where reminders go and which time zone they follow.
export function openReminderSettings(state, onSaved = () => {}) {
  const { sheet, close } = openSheet(`
    <div class="mx-auto mb-6 h-1 w-10 rounded-full bg-line"></div>
    <h2 class="text-2xl font-semibold tracking-tight">Reminder settings</h2>
    <p class="mt-2 text-sm text-graphite">One email and one time zone for all your reminders.</p>
    <form novalidate class="mt-6 space-y-5">
      ${emailField(state.hosted ? "Also email me (optional)" : "Send reminders to", state.email || "")}
      ${state.hosted ? `<p class="-mt-3 text-sm text-graphite">Reminders always land in your ${state.demo ? "Demo inbox" : "inbox"} here. Add an email to get real ones too, up to 5 a day.</p>` : ""}
      ${timeZoneField("Time zone", state.time_zone || "")}
      <p class="field-error" data-error-for="form"></p>
      <button type="submit" class="btn-primary">Save</button>
      <button type="button" data-close class="w-full py-3 text-graphite">Cancel</button>
    </form>`);

  const form = sheet.querySelector("form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = {
      email: form.elements.email.value.trim(),
      time_zone: form.elements.time_zone.value.trim(),
    };
    if (state.hosted && !settings.email) delete settings.email; // optional on the public site
    clearErrors(sheet);
    if (showErrors(sheet, checkSettings(settings))) return;
    await whileBusy(form.querySelector('[type="submit"]'), async () => { try {
      applySettings(state, await api.saveSettings(settings));
      close();
      onSaved();
      toast(`Reminders go to ${reminderDestination(state)}, on ${timeZoneLabel(state.time_zone)}.`);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      showErrors(sheet, { [error.field || "form"]: error.message });
    } });
  });
}

function emailField(label, value = "") {
  return field("email", label,
    `<input id="email" name="email" type="email" class="field-input" placeholder="you@example.com" autocomplete="email" value="${escapeHtml(value)}">`);
}

// A text box with suggestions: type "Lagos" or "London" and pick from the list.
// A dropdown, so nobody can type a time zone that doesn't exist.
function timeZoneField(label, value) {
  return field("time_zone", label, `
    <select id="time_zone" name="time_zone" class="field-input" required>${timeZoneOptions(value)}</select>`);
}

// Opens the bottom sheet with the given content. Returns the sheet and a close function.
function openSheet(html, onClosed = () => {}) {
  const sheet = document.getElementById("sheet");
  const backdrop = document.getElementById("sheet-backdrop");
  sheet.innerHTML = html;
  sheet.hidden = false;
  backdrop.hidden = false;
  sheet.querySelector("input")?.focus();

  const close = () => {
    sheet.hidden = true;
    backdrop.hidden = true;
    sheet.innerHTML = "";
    onClosed();
  };
  backdrop.onclick = close;
  sheet.querySelector("[data-close]").onclick = close;
  return { sheet, close };
}

// --- Small helpers ---------------------------------------------------------

function field(name, label, input) {
  return `
    <div>
      <label for="${name}" class="field-label">${label}</label>
      ${input}
      <p class="field-error" data-error-for="${name}"></p>
    </div>`;
}

// Shows each message next to its field. Returns true if there were any.
function showErrors(root, errors) {
  const fields = Object.keys(errors);
  for (const name of fields) {
    const slot = root.querySelector(`[data-error-for="${name}"]`) || root.querySelector('[data-error-for="form"]');
    slot.textContent = errors[name];
    root.querySelector(`#${name}`)?.classList.add("has-error");
  }
  if (fields.length) root.querySelector(`#${fields[0]}`)?.focus();
  return fields.length > 0;
}

function clearError(root, name) {
  root.querySelector(`[data-error-for="${name}"]`).textContent = "";
  root.querySelector(`#${name}`)?.classList.remove("has-error");
}

function clearErrors(root) {
  for (const slot of root.querySelectorAll("[data-error-for]")) slot.textContent = "";
  for (const input of root.querySelectorAll(".has-error")) input.classList.remove("has-error");
}
