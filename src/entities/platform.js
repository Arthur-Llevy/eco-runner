import { rect } from "../render/draw.js";

export function createPlatform({ x, y, w, h = 22, type = "concrete" }) {
  return { x, y, w, h, type };
}

export function drawPlatform(ctx, p, camera, viewW) {
  const x = p.x - camera;
  if (x + p.w < 0 || x > viewW) return;
  const step = p.type === "step";
  rect(ctx, x, p.y, p.w, p.h, step ? "#a7a17a" : "#777f75", 6);
  rect(ctx, x, p.y, p.w, 6, step ? "#d0c58d" : "#c3b887", 4);
  for (let sx = x + 12; sx < x + p.w - 8; sx += 27) {
    rect(ctx, sx, p.y + 10, 9, 3, "#626f66", 2);
  }
}
