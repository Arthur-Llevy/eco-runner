// Faixa de alerta da Defesa Civil (DOM). Só mexe no DOM quando o texto muda.
const el = () => document.getElementById("alert");
let last = "";

export function showAlert(title, text, tone = "warn") {
  const key = `${title}|${text}|${tone}`;
  if (key === last) return;
  last = key;
  el().querySelector("b").textContent = title;
  el().querySelector("span").textContent = text;
  el().className = `show ${tone}`;
}

export function hideAlert() {
  last = "";
  el().className = "";
}
