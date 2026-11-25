import { rect, circle, cloud } from "../render/draw.js";

// Tamanho e altura acima do chão de cada tipo de perigo.
const TYPES = {
  smog: { w: 42, h: 38, lift: 22 },
  bin: { w: 34, h: 35, lift: 20 },
};

export function createHazard({ x, y, type = "smog" }, ground) {
  const t = TYPES[type] ?? TYPES.smog;
  return { x, y: y ?? ground - t.lift, w: t.w, h: t.h, type, phase: Math.random() * 6 };
}

export function touchesHazard(h, p) {
  const hx = h.x - h.w / 2,
    hy = h.y - h.h / 2;
  return (
    p.x + p.w - 5 > hx &&
    p.x + 5 < hx + h.w &&
    p.y + p.h - 4 > hy &&
    p.y + 5 < hy + h.h
  );
}

export function drawHazard(ctx, h, camera, viewW) {
  const x = h.x - camera;
  if (x < -70 || x > viewW + 70) return;
  if (h.type === "bin") {
    rect(ctx, x - h.w / 2, h.y - h.h / 2, h.w, h.h, "#477f70", 5);
    rect(ctx, x - h.w / 2 - 3, h.y - h.h / 2 - 5, h.w + 6, 8, "#315f53", 3);
    rect(ctx, x - 7, h.y - 4, 14, 4, "#c3dfad", 2);
    rect(ctx, x - 4, h.y + 5, 8, 8, "#c3dfad", 2);
  } else {
    const bob = Math.sin(performance.now() * 0.002 + h.phase) * 4;
    cloud(ctx, x, h.y + bob, 0.72, "#82988c");
    circle(ctx, x - 12, h.y - 4 + bob, 4, "#a8b8a9");
    circle(ctx, x + 15, h.y + 6 + bob, 3, "#a8b8a9");
  }
}
