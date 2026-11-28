const $ = (id) => document.getElementById(id);

// Título em duas linhas: a segunda fica em destaque.
export function showOverlay([line1, line2], text, button) {
  $("overlay").style.display = "grid";
  const modal = $("overlay").querySelector(".modal");
  const h1 = modal.querySelector("h1");
  h1.replaceChildren(line1, document.createElement("br"), Object.assign(document.createElement("em"), { textContent: line2 }));
  modal.querySelector("p").textContent = text;
  $("action").textContent = button + "  →";
}

let defaultIntro = null;

// Texto do menu; sem argumento volta ao texto original do HTML.
export function setIntro(text) {
  const p = $("overlay").querySelector(".modal p");
  defaultIntro ??= p.textContent;
  p.textContent = text ?? defaultIntro;
}

export function hideOverlay() {
  $("overlay").style.display = "none";
}

export function onAction(fn) {
  $("action").addEventListener("click", fn);
}
