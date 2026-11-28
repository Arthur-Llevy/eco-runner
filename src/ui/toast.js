const el = () => document.getElementById("toast");
let remaining = 0;

export function say(text, seconds = 2.3) {
  el().textContent = text;
  el().classList.add("show");
  remaining = seconds;
}

export function updateToast(dt) {
  if (remaining <= 0) return;
  remaining -= dt;
  if (remaining <= 0) el().classList.remove("show");
}
