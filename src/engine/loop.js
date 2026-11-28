// Laço principal com passo de tempo limitado a 33 ms.
export function startLoop(update, render) {
  let last = 0;
  function frame(t) {
    const dt = Math.min((t - last) / 1000 || 0, 0.033);
    last = t;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
