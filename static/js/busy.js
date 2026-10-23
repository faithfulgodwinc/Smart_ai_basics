// While a button waits on the server: it's disabled at once (so it can't be tapped twice), and
// if the wait lasts more than a moment, a calm spinning ring replaces its label. Quick saves
// never flash a spinner; slow ones always show something is happening.

const SPINNER_AFTER_MS = 150;

// untilLeave: the page is about to change (e.g. a reload), so keep spinning on success.
export async function whileBusy(button, work, { untilLeave = false } = {}) {
  if (!button) return work();
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  const timer = setTimeout(() => button.classList.add("is-busy"), SPINNER_AFTER_MS);
  let succeeded = false;
  try {
    const result = await work();
    succeeded = true;
    return result;
  } finally {
    if (!(untilLeave && succeeded)) {
      clearTimeout(timer);
      button.classList.remove("is-busy");
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
}
