// A small, calm note that slides up for a few seconds ("Reminder set for 14:32 today.").

let hideTimer = null;

export function toast(message) {
  let note = document.getElementById("toast");
  if (!note) {
    note = document.createElement("div");
    note.id = "toast";
    note.className = "toast";
    note.setAttribute("role", "status");
    document.body.append(note);
  }
  note.textContent = message;
  note.classList.add("is-shown");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => note.classList.remove("is-shown"), 5000);
}
