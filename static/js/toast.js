// A small, calm note that slides up for a few seconds ("Reminder set for 14:32 today.").
// An optional link turns it into a gentle shortcut ("New reminder · Open").

let hideTimer = null;

export function toast(message, link = null) {
  let note = document.getElementById("toast");
  if (!note) {
    note = document.createElement("div");
    note.id = "toast";
    note.className = "toast";
    note.setAttribute("role", "status");
    document.body.append(note);
  }
  note.textContent = message;
  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.className = "toast-link";
    note.append(" ", anchor);
  }
  note.classList.add("is-shown");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => note.classList.remove("is-shown"), link ? 8000 : 5000);
}
