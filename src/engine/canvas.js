// Ajusta o canvas ao contêiner e expõe as medidas da tela.
// O mundo é desenhado em coordenadas lógicas de altura 720 e escalado.
export const LOGICAL_H = 720;

export function createViewport(canvas, wrap) {
  const ctx = canvas.getContext("2d");
  const view = { ctx, W: 1200, H: 720, DPR: 1, scale: 1 };

  function resize() {
    const r = wrap.getBoundingClientRect();
    view.DPR = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(r.width * view.DPR);
    canvas.height = Math.floor(r.height * view.DPR);
    view.W = r.width;
    view.H = r.height;
    view.scale = view.H / LOGICAL_H;
    ctx.setTransform(view.DPR, 0, 0, view.DPR, 0, 0);
  }

  addEventListener("resize", resize);
  resize();
  return view;
}
