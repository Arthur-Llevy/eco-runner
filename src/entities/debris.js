import { rect, circle } from "../render/draw.js";

const PICKUP_RADIUS = 34;
const COLORS = ["#5b6d8a", "#b5894a", "#8c4f4a", "#4f7d6a"];

// Lixo largado na rua: se ficar perto de um bueiro, entope.
export function createDebris({ x, y }, ground, i = 0) {
  return { x, y: y ?? ground - 14, kind: i % 3, color: COLORS[i % COLORS.length], got: false };
}

export function touchesDebris(d, p) {
  if (d.got) return false;
  const dx = p.x + p.w / 2 - d.x;
  const dy = p.y + p.h / 2 - d.y;
  return dx * dx + dy * dy < PICKUP_RADIUS * PICKUP_RADIUS;
}

export function drawDebris(ctx, d, camera, viewW) {
  if (d.got) return;
  const x = d.x - camera;
  if (x < -30 || x > viewW + 30) return;
  const y = d.y;
  if (d.kind === 0) {
    // Sacola.
    circle(ctx, x, y + 2, 11, d.color);
    rect(ctx, x - 4, y - 14, 8, 6, d.color, 2);
    rect(ctx, x - 6, y - 2, 5, 4, "#ffffff55", 2);
  } else if (d.kind === 1) {
    // Caixa amassada.
    rect(ctx, x - 11, y - 8, 22, 18, d.color, 3);
    rect(ctx, x - 11, y - 8, 22, 4, "#00000022", 2);
  } else {
    // Garrafa deitada.
    rect(ctx, x - 12, y - 4, 24, 11, d.color, 5);
    rect(ctx, x + 9, y - 2, 7, 7, d.color, 2);
  }
}
