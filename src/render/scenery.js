import { rand } from "../engine/math.js";
import { rect, circle, cloud } from "./draw.js";

// Gera prédios, árvores secas e postes ao longo da fase, mais o jardim final.
export function generateDecor(level) {
  const decor = [];
  const ground = level.ground;
  for (let x = -40, i = 0; x < level.width + 100; x += rand(115, 185), i++) {
    decor.push({ type: "building", x, bw: rand(75, 125), bh: rand(150, 330), tint: i % 3 });
    if (i % 3 === 1) decor.push({ type: "deadTree", x: x + rand(-20, 20), y: ground - 5 });
    if (i % 4 === 0) decor.push({ type: "lamp", x: x + 55 });
  }
  for (let x = level.gardenStartX; x < level.width; x += 100) {
    decor.push({ type: "greenTree", x, y: ground - 5 });
  }
  return decor;
}

const wrapX = (x, viewW) => (((x % (viewW + 180)) + viewW + 180) % (viewW + 180)) - 80;

// Céu, sol, nuvens, colinas e silhuetas com paralaxe.
export function drawBackground(ctx, { camera, viewW, viewH, level, decor }) {
  const ground = level.ground;
  const sky = ctx.createLinearGradient(0, 0, 0, viewH);
  sky.addColorStop(0, "#b8d9d0");
  sky.addColorStop(0.72, "#e8e5c9");
  sky.addColorStop(1, "#d3cda9");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, viewH);

  circle(ctx, viewW * 0.78, 125, 47, "#f6e9a9");
  cloud(ctx, wrapX(160 - camera * 0.16, viewW), 125, 0.85, "#dce8d9");
  cloud(ctx, wrapX(690 - camera * 0.12, viewW), 205, 0.65, "#dce8d9");

  // Colinas.
  ctx.fillStyle = "#a8c4a5";
  ctx.beginPath();
  ctx.moveTo(0, 440);
  for (let x = 0; x <= viewW + 30; x += 30) {
    ctx.lineTo(x, 400 + Math.sin((x + camera * 0.12) * 0.006) * 32 + Math.sin(x * 0.013) * 12);
  }
  ctx.lineTo(viewW, viewH);
  ctx.lineTo(0, viewH);
  ctx.fill();

  // Silhuetas da cidade.
  for (const d of decor) {
    if (d.type !== "building") continue;
    const x = d.x - camera * 0.42;
    if (x < -180 || x > viewW + 180) continue;
    const y = ground - d.bh * 0.48;
    rect(ctx, x, y, d.bw, d.bh, ["#879c96", "#91a49c", "#7e928c"][d.tint], 4);
    rect(ctx, x + 8, y + 14, d.bw - 16, 5, "#718780", 2);
    for (let wy = y + 34; wy < ground - 15; wy += 34) {
      for (let wx = x + 12; wx < x + d.bw - 12; wx += 25) {
        rect(ctx, wx, wy, 11, 15, "#c6c9a8", 2);
        rect(ctx, wx + 2, wy + 2, 7, 11, "#aab89f", 1);
      }
    }
  }

  // Chaminés com fumaça discreta.
  for (let x = 220; x < level.width; x += 620) {
    const sx = x - camera * 0.42;
    if (sx > -40 && sx < viewW + 40) {
      rect(ctx, sx, ground - 235, 23, 85, "#71847e", 4);
      rect(ctx, sx - 4, ground - 240, 31, 9, "#657973", 3);
      cloud(ctx, sx + 18, ground - 270 + Math.sin(performance.now() * 0.0005 + x) * 5, 0.42, "#9eaaa0");
    }
  }
}

export function drawDecor(ctx, { camera, viewW, level, decor }) {
  const ground = level.ground;
  for (const d of decor) {
    const x = d.x - camera;
    if (x < -90 || x > viewW + 90) continue;
    if (d.type === "deadTree") {
      rect(ctx, x, ground - 82, 9, 82, "#826b50", 4);
      ctx.strokeStyle = "#826b50";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 4, ground - 52);
      ctx.lineTo(x - 17, ground - 78);
      ctx.moveTo(x + 5, ground - 62);
      ctx.lineTo(x + 24, ground - 91);
      ctx.stroke();
    } else if (d.type === "greenTree") {
      rect(ctx, x, ground - 70, 12, 70, "#795a3e", 4);
      circle(ctx, x + 6, ground - 88, 27, "#64a95c");
      circle(ctx, x - 9, ground - 75, 18, "#83bd69");
      circle(ctx, x + 22, ground - 73, 19, "#4f9857");
    } else if (d.type === "lamp") {
      rect(ctx, x, ground - 105, 5, 105, "#596f68", 2);
      rect(ctx, x - 10, ground - 108, 26, 8, "#596f68", 3);
      circle(ctx, x + 3, ground - 103, 6, "#f3d98a");
    }
  }
}

// Chão em blocos com uma faixa de grama seca.
export function drawGround(ctx, { camera, viewW, level }) {
  const g = level.ground;
  rect(ctx, 0, g, level.width, 160, "#786f5b");
  rect(ctx, 0, g, level.width, 13, "#a6a16f");
  rect(ctx, 0, g + 13, level.width, 5, "#655e50");
  for (let x = Math.floor(camera / 55) * 55; x < camera + viewW + 60; x += 55) {
    const sx = x - camera;
    rect(ctx, sx, g + 34, 24, 4, "#897d65", 2);
    rect(ctx, sx + 29, g + 75, 13, 3, "#897d65", 2);
  }
}

// Bandeirinha de checkpoint: cinza até ser alcançada, verde depois.
export function drawCheckpoint(ctx, x, reached, { camera, viewW, level }) {
  const sx = x - camera;
  if (sx < -60 || sx > viewW + 60) return;
  const g = level.ground;
  rect(ctx, sx, g - 70, 4, 70, "#f6f0d9", 2);
  ctx.fillStyle = reached ? "#8bbf50" : "#9aa59c";
  ctx.beginPath();
  ctx.moveTo(sx + 4, g - 68);
  ctx.lineTo(sx + 34, g - 58);
  ctx.lineTo(sx + 4, g - 48);
  ctx.fill();
}

// Linha de chegada.
export function drawFinish(ctx, { camera, viewW, level }) {
  const g = level.ground;
  const fx = level.width - level.finishOffset - camera;
  if (fx < -100 || fx > viewW + 100) return;
  rect(ctx, fx, g - 125, 7, 125, "#f6f0d9", 3);
  ctx.fillStyle = "#4d9b63";
  ctx.beginPath();
  ctx.moveTo(fx + 7, g - 123);
  ctx.lineTo(fx + 74, g - 102);
  ctx.lineTo(fx + 7, g - 80);
  ctx.fill();
  rect(ctx, fx - 45, g - 7, 100, 7, "#4e9860", 4);
}
