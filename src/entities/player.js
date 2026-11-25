import { clamp } from "../engine/math.js";
import { rect, circle } from "../render/draw.js";

const SPEED = 245;
const GRAVITY = 1450;
const JUMP_VELOCITY = -570;

export function createPlayer() {
  return { x: 0, y: 0, w: 34, h: 48, vx: 0, vy: 0, onGround: false, face: 1, inv: 0, walk: 0 };
}

export function resetPlayer(p, x, ground) {
  p.x = x;
  p.y = ground - p.h;
  p.vx = 0;
  p.vy = 0;
  p.inv = 0;
  p.speedMul = 1;
  p.waterMul = 1;
}

// Movimento horizontal, gravidade, plataformas de "mão única" e pulo.
export function updatePlayer(p, dt, input, level) {
  const prevBottom = p.y + p.h;
  const speed = SPEED * (p.speedMul ?? 1);
  p.vx = (input.right ? speed : 0) - (input.left ? speed : 0);
  if (p.vx !== 0) p.face = Math.sign(p.vx);
  p.x = clamp(p.x + p.vx * dt, 0, level.width - p.w);

  p.vy += GRAVITY * dt;
  p.y += p.vy * dt;
  p.onGround = false;

  for (const pl of level.platforms) {
    const overlapX = p.x + p.w > pl.x && p.x < pl.x + pl.w;
    const nowBottom = p.y + p.h;
    if (overlapX && p.vy >= 0 && prevBottom <= pl.y + 5 && nowBottom >= pl.y) {
      p.y = pl.y - p.h;
      p.vy = 0;
      p.onGround = true;
    }
  }

  if (p.y + p.h >= level.ground) {
    p.y = level.ground - p.h;
    p.vy = 0;
    p.onGround = true;
  }

  if (input.consumeJump() && p.onGround) {
    p.vy = JUMP_VELOCITY;
    p.onGround = false;
  }

  if (Math.abs(p.vx) > 0 && p.onGround) p.walk += dt * 13;
  if (p.inv > 0) p.inv -= dt;
}

export function drawPlayer(ctx, p, camera) {
  if (p.inv > 0 && Math.floor(performance.now() / 90) % 2 === 0) return;

  ctx.save();
  ctx.translate(p.x - camera + p.w / 2, p.y + p.h / 2);
  if (p.face < 0) ctx.scale(-1, 1);
  const run = p.onGround ? Math.sin(p.walk) * 3 : 0;

  // Sombra.
  ctx.fillStyle = "#314b3d35";
  ctx.beginPath();
  ctx.ellipse(0, p.h / 2 + 3, 19, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mochila.
  rect(ctx, -19, -4, 11, 20, "#d18c4c", 4);
  // Pernas.
  rect(ctx, -11, 8 + run, 9, 16, "#315b4c", 4);
  rect(ctx, 3, 8 - run, 9, 16, "#315b4c", 4);
  rect(ctx, -13, 20 + run, 13, 6, "#e9e2c9", 3);
  rect(ctx, 1, 20 - run, 13, 6, "#e9e2c9", 3);
  // Corpo e braços.
  rect(ctx, -13, -12, 26, 26, "#3f9668", 8);
  rect(ctx, -18, -8, 7, 17, "#e9c18c", 4);
  rect(ctx, 11, -8, 7, 17, "#e9c18c", 4);
  // Lenço.
  ctx.fillStyle = "#d5f06d";
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(11, -8);
  ctx.lineTo(7, -1);
  ctx.lineTo(-8, -1);
  ctx.fill();
  // Cabeça.
  circle(ctx, 0, -20, 13, "#e8bd91");
  // Cabelo.
  ctx.fillStyle = "#394b3e";
  ctx.beginPath();
  ctx.arc(0, -24, 13, Math.PI, Math.PI * 2);
  ctx.lineTo(12, -20);
  ctx.lineTo(-12, -20);
  ctx.fill();
  circle(ctx, 5, -19, 1.6, "#24352d");
  // Folhinha no cabelo.
  ctx.strokeStyle = "#4d965a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-2, -34);
  ctx.quadraticCurveTo(1, -44, 9, -39);
  ctx.stroke();
  ctx.fillStyle = "#8fc65a";
  ctx.beginPath();
  ctx.ellipse(7, -40, 5, 2.8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
