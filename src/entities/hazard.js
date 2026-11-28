import { rect, circle, cloud } from "../render/draw.js";

// Tamanho e altura acima do chão de cada tipo de perigo.
// O tubo de vapor (vent) tem hitbox dinâmica: `h` é a altura máxima do jato.
const TYPES = {
  smog: { w: 42, h: 38, lift: 22 },
  bin: { w: 34, h: 35, lift: 20 },
  vent: { w: 26, h: 148, lift: 0 },
};

export function createHazard({ x, y, type = "smog", phase }, ground) {
  const t = TYPES[type] ?? TYPES.smog;
  return {
    x,
    y: y ?? ground - t.lift,
    w: t.w,
    h: t.h,
    type,
    ground,
    phase: phase ?? Math.random() * (type === "vent" ? 4 : 6),
  };
}

// Ciclo do tubo de vapor (4,2 s): parado, aviso, jato subindo, jato cheio, recolhendo.
export function ventState(h, now = performance.now() / 1000) {
  const t = (now + h.phase) % 4.2;
  if (t < 1.8) return { state: "idle", height: 0 };
  if (t < 2.45) return { state: "warn", height: 0 };
  if (t < 2.65) return { state: "active", height: h.h * ((t - 2.45) / 0.2) };
  if (t < 3.95) return { state: "active", height: h.h };
  return { state: "active", height: Math.max(0, h.h * (1 - (t - 3.95) / 0.25)) };
}

export function touchesHazard(h, p) {
  if (h.type === "vent") {
    const v = ventState(h);
    if (v.state !== "active" || v.height <= 12) return false;
    const hx = h.x - h.w / 2;
    const top = h.ground - 10 - v.height;
    return p.x + p.w - 6 > hx && p.x + 6 < hx + h.w && p.y + p.h - 4 > top && p.y + 6 < h.ground - 10;
  }
  const hx = h.x - h.w / 2,
    hy = h.y - h.h / 2;
  return (
    p.x + p.w - 5 > hx &&
    p.x + 5 < hx + h.w &&
    p.y + p.h - 4 > hy &&
    p.y + 5 < hy + h.h
  );
}

function drawVent(ctx, h, x) {
  const now = performance.now() / 1000;
  const v = ventState(h, now);
  const g = h.ground;
  const jitter = v.state === "warn" ? Math.sin(now * 55) * 2.2 : 0;
  const pipeDepth = 160;

  // Tubo descendo pela terra, com reflexo e junta.
  rect(ctx, x - 11, g + 5, 22, pipeDepth, "#323b39");
  rect(ctx, x - 7, g + 5, 5, pipeDepth, "#4a5653");
  rect(ctx, x - 14, g + 64, 28, 8, "#252c2a", 2);
  // Bocal na superfície.
  rect(ctx, x - 16 + jitter, g - 8, 32, 13, "#3c4744", 3);
  rect(ctx, x - 13 + jitter, g - 11, 26, 4, "#232a28", 2);

  // Aviso antes do disparo: faíscas e vapor inicial.
  if (v.state === "warn") {
    circle(ctx, x, g - 15, 4, "#f97316");
    circle(ctx, x, g - 15, 2, "#fde047");
    ctx.save();
    ctx.globalAlpha = 0.5;
    circle(ctx, x - 6, g - 20, 4.5, "#cbd5e1");
    circle(ctx, x + 7, g - 18, 4, "#cbd5e1");
    ctx.restore();
  }

  // Coluna de vapor com núcleo vermelho-alaranjado.
  if (v.state === "active" && v.height > 4) {
    const topY = g - 10 - v.height;
    const wobble = Math.sin(now * 14) * 2.5;
    ctx.save();
    ctx.globalAlpha = 0.42;
    rect(ctx, x - 17, topY + 6, 34, Math.max(0, v.height - 6), "#64748b", 13);
    ctx.globalAlpha = 0.62;
    rect(ctx, x - 11, topY, 22, v.height, "#475569", 10);

    const heatH = v.height * 0.78;
    const heat = ctx.createLinearGradient(0, g - 10, 0, g - 10 - heatH);
    heat.addColorStop(0, "rgba(239, 68, 68, 0.85)");
    heat.addColorStop(0.55, "rgba(249, 115, 22, 0.65)");
    heat.addColorStop(1, "rgba(250, 204, 21, 0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = heat;
    ctx.beginPath();
    ctx.roundRect(x - 6, g - 10 - heatH, 12, heatH, 6);
    ctx.fill();

    ctx.globalAlpha = 0.72;
    circle(ctx, x - 8 + wobble, topY + 4, 12, "#526070");
    circle(ctx, x + 8 - wobble, topY + 4, 12, "#526070");
    circle(ctx, x, topY - 3, 13, "#6e7e91");
    ctx.restore();
  }
}

export function drawHazard(ctx, h, camera, viewW) {
  const x = h.x - camera;
  if (x < -70 || x > viewW + 70) return;
  if (h.type === "vent") {
    drawVent(ctx, h, x);
  } else if (h.type === "bin") {
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
