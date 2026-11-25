// Teclado e botões de toque. `jumpPressed` marca só a borda de descida.
export function createInput({ onStart }) {
  const input = { left: false, right: false, jump: false, jumpPressed: false };

  const pressJump = () => {
    if (!input.jump) input.jumpPressed = true;
    input.jump = true;
  };

  addEventListener("keydown", (e) => {
    const k = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(k))
      e.preventDefault();
    if (k === "ArrowLeft" || k === "KeyA") input.left = true;
    if (k === "ArrowRight" || k === "KeyD") input.right = true;
    if (k === "Space" || k === "ArrowUp" || k === "KeyW") pressJump();
    if (k === "Enter") onStart();
  });

  addEventListener("keyup", (e) => {
    const k = e.code;
    if (k === "ArrowLeft" || k === "KeyA") input.left = false;
    if (k === "ArrowRight" || k === "KeyD") input.right = false;
    if (k === "Space" || k === "ArrowUp" || k === "KeyW") input.jump = false;
  });

  document.querySelectorAll("[data-key]").forEach((b) => {
    const key = b.dataset.key;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (key === "jump") pressJump();
      else input[key] = true;
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
      b.addEventListener(ev, () => {
        input[key] = false;
      }),
    );
  });

  // Consome o pulo pendente (chamado uma vez por quadro).
  input.consumeJump = () => {
    const p = input.jumpPressed;
    input.jumpPressed = false;
    return p;
  };

  return input;
}
