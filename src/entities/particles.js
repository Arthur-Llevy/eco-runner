import { rand } from "../engine/math.js";
import { circle } from "../render/draw.js";

export function burst(list, x, y, color = "#c9f36a", count = 9) {
  for (let i = 0; i < count; i++) {
    list.push({ x, y, vx: rand(-70, 70), vy: rand(-130, -20), life: 0.65, r: rand(2, 4), color });
  }
}

// Atualiza e devolve só as partículas ainda vivas.
export function updateParticles(list, dt) {
  const alive = list.filter((p) => p.life > 0);
  for (const p of alive) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt;
    p.life -= dt;
  }
  return alive;
}

export function drawParticles(ctx, list, camera) {
  for (const p of list) circle(ctx, p.x - camera, p.y, p.r, p.color);
}
