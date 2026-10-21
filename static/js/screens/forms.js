// The subscription form, the card sheet that opens over it, and their checks.
// The server repeats the same checks, so a message always appears next to the right field.

import * as api from "../api.js";
import { ApiError } from "../api.js";
import { escapeHtml, reminderAtText } from "../format.js";
import { toast } from "../toast.js";

const NEW_CARD = "__new";
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Subscription form ---------------------------------------------------

export function renderSubscriptionForm(root, state) {
  const needsEmail = !state.email;

  root.innerHTML = `
    <header class="pt-10 pb-8">
      <a href="#home" class="text-sm text-graphite">&larr; Back</a>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight">New subscription</h1>
    </header>

    <form novalidate class="space-y-6">
      ${field("name", "Name", `<input id="name" name="name" class="field-input" placeholder="Netflix" autocomplete="off">`)}
      ${field("monthly_cost", "Monthly cost", `<input id="monthly_cost" name="monthly_cost" class="field-input" inputmode="decimal" placeholder="15.49">`)}

      <div class="flex items-center justify-between gap-4 py-1">
        <label for="is_trial" class="leading-snug">Free trial I intend to cancel?</label>
        <span class="switch"><input type="checkbox" id="is_trial" name="is_trial"><span></span></span>
      </div>

      <div class="grid grid-cols-[1fr_auto] gap-3">
        ${field("deadline", "Next billing date", `<input id="deadline" name="deadline" type="date" class="field-input">`)}
        ${field("reminder_time", "Remind me at", `<input id="reminder_time" name="reminder_time" type="time" value="09:00" class="field-input">`)}
      </div>

      ${field("card_id", "Card", `
        <select id="card_id" name="card_id" class="field-input">
          ${cardOptions(state)}
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

      ${needsEmail ? field("email", "Where should reminders go?", `<input id="email" name="email" type="email" class="field-input" placeholder="you@example.com" autocomplete="email">`) : ""}

      <p class="field-error" data-error-for="form"></p>
      <button type="submit" class="btn-primary">Save</button>
    </form>`;

  const form = root.querySelector("form");
  const inputs = form.elements;
  let sourceType = "website";
  let lastCardValue = inputs.card_id.value;

  inputs.is_trial.addEventListener("change", () => {
    root.querySelector('[for="deadline"]').textContent = inputs.is_trial.checked ? "Trial ends" : "Next billing date";
  });

  for (const button of root.querySelectorAll("[data-source]")) {
    button.addEventListener("click", () => {
      sourceType = button.dataset.source;
      for (const b of root.querySelectorAll("[data-source]")) b.setAttribute("aria-pressed", String(b === button));
      const isWebsite = sourceType === "website";
      root.querySelector('[for="source_value"]').textContent = isWebsite ? "Cancel or plans link" : "App name";
      inputs.source_value.placeholder = isWebsite ? "https://" : "Duolingo";
      inputs.source_value.value = "";
      clearError(root, "source_value");
    });
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
    const email = needsEmail ? inputs.email.value.trim() : null;

    clearErrors(root);
    const errors = checkSubscription(values, email, needsEmail);
    if (showErrors(root, errors)) return;

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      if (needsEmail) {
        state.email = (await api.saveEmail(email)).email;
      }
      const result = await api.saveSubscription(values);
      state.subscriptions.push(result.subscription);
      state.currentCardId = result.subscription.card_id;
      location.hash = "#home";
      toast(reminderNote(result, state.email));
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      showErrors(root, { [error.field || "form"]: error.message });
      button.disabled = false;
    }
  });
}

function cardOptions(state) {
  const options = state.cards.map((card) =>
    `<option value="${card.id}" ${card.id === state.currentCardId ? "selected" : ""}>${escapeHtml(card.nickname)} · ${escapeHtml(card.bank)}</option>`);
  const placeholder = state.cards.length ? "" : `<option value="" selected disabled>Choose a card</option>`;
  return `${placeholder}${options.join("")}<option value="${NEW_CARD}">New card…</option>`;
}

export function checkSubscription(values, email, needsEmail) {
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
  if (needsEmail && !EMAIL_PATTERN.test(email || "")) errors.email = "That email doesn't look right. Try name@example.com.";
  return errors;
}

// What happened to the reminder when this subscription was saved.
function reminderNote({ reminder, reminder_at: reminderAt }, email) {
  if (reminder === "sent") return `Saved. Reminder sent to ${email}.`;
  if (reminder === "scheduled") return `Saved. Reminder set for ${reminderAtText(reminderAt)}.`;
  if (reminder === "failed") return "Saved. The reminder email couldn't be sent — check the email settings in .env.";
  return "Saved.";
}

// --- Card sheet ------------------------------------------------------------

function openCardSheet({ onSaved, onClosed }) {
  const sheet = document.getElementById("sheet");
  const backdrop = document.getElementById("sheet-backdrop");

  sheet.innerHTML = `
    <div class="mx-auto mb-6 h-1 w-10 rounded-full bg-line"></div>
    <h2 class="text-2xl font-semibold tracking-tight">New card</h2>
    <p class="mt-2 text-sm text-graphite">No card number. Just enough to recognise it.</p>
    <form novalidate class="mt-6 space-y-5">
      ${field("nickname", "Nickname", `<input id="nickname" name="nickname" class="field-input" placeholder="Side card" autocomplete="off">`)}
      ${field("bank", "Bank", `<input id="bank" name="bank" class="field-input" placeholder="Your bank" autocomplete="off">`)}
      ${field("name_on_card", "Name on card", `<input id="name_on_card" name="name_on_card" class="field-input" autocomplete="off">`)}
      <p class="field-error" data-error-for="form"></p>
      <button type="submit" class="btn-primary">Save card</button>
      <button type="button" data-close class="w-full py-3 text-graphite">Cancel</button>
    </form>`;
  sheet.hidden = false;
  backdrop.hidden = false;
  sheet.querySelector("input").focus();

  const close = () => {
    sheet.hidden = true;
    backdrop.hidden = true;
    sheet.innerHTML = "";
    onClosed();
  };
  backdrop.onclick = close;
  sheet.querySelector("[data-close]").onclick = close;

  const form = sheet.querySelector("form");
  const inputs = form.elements;
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

    try {
      onSaved(await api.saveCard(card));
      close();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      showErrors(sheet, { [error.field || "form"]: error.message });
    }
  });
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
