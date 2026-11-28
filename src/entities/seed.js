import { circle } from "../render/draw.js";

const PICKUP_RADIUS = 34;

export function createSeed([x, y]) {
  return { x, y, r: 10, t: Math.random() * 6, got: false };
}

// Devolve true se o jogador encostou na semente.
export function touchesSeed(s, p) {
  if (s.got) return false;
  const dx = p.x + p.w / 2 - s.x;
  const dy = p.y + p.h / 2 - s.y;
  return dx * dx + dy * dy < PICKUP_RADIUS * PICKUP_RADIUS;
}

export function drawSeed(ctx, s, camera, viewW) {
  if (s.got) return;
  const now = performance.now();
  const x = s.x - camera;
  const y = s.y + Math.sin(now * 0.003 + s.t) * 5;
  if (x < -30 || x > viewW + 30) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(now * 0.002 + s.t) * 0.18);
  ctx.fillStyle = "#c8ef65";
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 11, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6aab4e";
  ctx.beginPath();
  ctx.ellipse(2, 1, 2, 7, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  circle(ctx, x - 10, y + 10, 2, "#f6e9a9");
}
