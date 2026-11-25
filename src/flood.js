// Regras da fase de enchente (ODS 11.5): alerta, água subindo, bueiros entupidos
// por lixo e resgate de moradores até um ponto alto.
import { burst } from "./entities/particles.js";
import { createDebris, touchesDebris, drawDebris } from "./entities/debris.js";
import { createDrain, drawDrain } from "./entities/drain.js";
import { createResident, drawResident } from "./entities/resident.js";
import { drawWater, drawStorm } from "./entities/water.js";
import { updateHUD } from "./ui/hud.js";
import { showAlert, hideAlert } from "./ui/alert.js";
import { say } from "./ui/toast.js";
import { rect } from "./render/draw.js";

const CLOG_RADIUS = 80; // lixo a esta distância do bueiro o entope
const CARRY_MAX = 2;
const DEBRIS_SCORE = 30;
const RESCUE_SCORE = 200;
const DANGER_DISTANCE = 90; // "!" aparece quando a água chega perto dos pés
const HIT_WATER_DROP = 80; // a água recua um pouco após perder uma vida

export function initFlood(g, L) {
  g.flood = null;
  g.drains = [];
  g.debris = [];
  g.residents = [];
  g.rescued = 0;
  g.rescueGoal = 0;
  g.safeZone = null;
  hideAlert();
  if (!L.flood) return;
  g.flood = { cfg: L.flood, phase: "alert", timer: L.flood.alertSeconds, h: 0, clogged: 0, submerged: 0 };
  g.drains = (L.drains ?? []).map(createDrain);
  g.debris = (L.debris ?? []).map((d, i) => createDebris(d, L.ground, i));
  g.residents = (L.residents ?? []).map((r, i) => createResident(r, L.ground, i));
  g.rescueGoal = L.rescueGoal ?? g.residents.length;
  g.safeZone = L.safeZone;
}

export const waterTop = (g) => g.level.ground - g.flood.h;

function isClogged(g, drain) {
  return g.debris.some((d) => !d.got && Math.abs(d.x - drain.x) < CLOG_RADIUS);
}

// Ao perder uma vida: moradores carregados caem e a água recua um pouco.
export function onFloodHit(g) {
  if (!g.flood) return;
  g.flood.h = Math.max(0, g.flood.h - HIT_WATER_DROP);
  for (const r of g.residents) {
    if (r.state !== "carried") continue;
    r.state = "waiting";
    r.y = g.level.ground - r.h;
  }
}

// hooks: { hit(), win(rescued, total), lose() }
export function updateFlood(g, dt, hooks) {
  const f = g.flood;
  const p = g.player;
  const cfg = f.cfg;
  const pcx = p.x + p.w / 2;

  for (const d of g.debris) {
    if (!touchesDebris(d, p)) continue;
    d.got = true;
    g.score += DEBRIS_SCORE;
    burst(g.particles, d.x, d.y, d.color, 6);
    updateHUD(g);
  }
  for (const dr of g.drains) {
    const was = dr.clogged;
    dr.clogged = isClogged(g, dr);
    if (was && !dr.clogged) say("💧 Bueiro desentupido! A água sobe mais devagar.");
  }
  f.clogged = g.drains.filter((d) => d.clogged).length;

  if (f.phase === "alert") {
    f.timer -= dt;
    const s = Math.max(0, Math.ceil(f.timer));
    showAlert("⚠ ALERTA DA DEFESA CIVIL", `Enchente em 0:${String(s).padStart(2, "0")} · limpe os bueiros e avise os moradores`, "warn");
    if (f.timer <= 0) {
      f.phase = "rising";
      say("🌊 A enchente chegou! Leve os moradores ao ponto alto.", 3);
    }
  } else {
    f.h = Math.min(cfg.maxHeight, f.h + (cfg.baseRise + f.clogged * cfg.clogRise) * dt);
    showAlert(
      "🌊 ENCHENTE EM CURSO",
      f.clogged
        ? `${f.clogged} bueiro${f.clogged > 1 ? "s" : ""} entupido${f.clogged > 1 ? "s" : ""}: a água sobe mais rápido`
        : "Bueiros livres: a água sobe devagar",
      "danger",
    );
  }

  const top = waterTop(g);
  p.speedMul = p.y + p.h > top + 10 ? cfg.slowdown : 1;

  // Cabeça debaixo d'água por muito tempo custa uma vida.
  if (top < p.y) {
    f.submerged += dt;
    if (f.submerged >= cfg.drownTime) {
      f.submerged = 0;
      say("🫧 Você ficou tempo demais debaixo d'água!");
      hooks.hit();
      if (g.state !== "playing") return;
    }
  } else f.submerged = Math.max(0, f.submerged - dt * 2);

  const carried = g.residents.filter((r) => r.state === "carried");
  for (const r of g.residents) {
    if (r.state !== "waiting") continue;
    r.danger = top - (r.y + r.h) < DANGER_DISTANCE;
    const near = Math.abs(pcx - (r.x + r.w / 2)) < 40 && Math.abs(p.y + p.h - (r.y + r.h)) < 60;
    if (near && carried.length < CARRY_MAX) {
      r.state = "carried";
      carried.push(r);
      say("🧑 Morador a bordo! Leve-o até o ponto alto.");
    }
    // Água acima da cabeça por mais que a tolerância: o morador é levado.
    r.under = top < r.y ? (r.under ?? 0) + dt : 0;
    if (r.state === "waiting" && r.under > (cfg.residentGrace ?? 2.5)) {
      r.state = "lost";
      say("😢 A água levou um morador.", 3);
    }
  }
  const k = Math.min(1, dt * 10);
  carried.forEach((r, i) => {
    r.x += (pcx - p.face * (30 + i * 28) - r.w / 2 - r.x) * k;
    r.y += (p.y + p.h - r.h - r.y) * k;
  });

  const z = g.safeZone;
  if (z && carried.length && pcx > z.x && pcx < z.x + z.w && p.y + p.h <= z.y + 6) {
    for (const r of carried) {
      r.state = "safe";
      r.x = z.x + 24 + g.rescued * 30;
      r.y = z.y - r.h;
      r.danger = false;
      g.rescued++;
      g.score += RESCUE_SCORE;
      burst(g.particles, r.x + r.w / 2, r.y, "#7fd0ff", 10);
    }
    updateHUD(g);
    say(`🏠 Morador a salvo! ${g.rescued}/${g.rescueGoal}`);
  }

  const viable = g.residents.filter((r) => r.state !== "lost").length;
  if (g.rescued >= g.rescueGoal) {
    hideAlert();
    hooks.win(g.rescued, g.residents.length);
  } else if (viable < g.rescueGoal) {
    hideAlert();
    hooks.lose();
  }
}

// Bueiros, lixo e moradores (desenhados antes do jogador).
export function drawFloodWorld(ctx, g, scene) {
  if (!g.flood) return;
  const { camera, viewW } = scene;
  const z = g.safeZone;
  if (z) {
    const x = z.x - camera;
    rect(ctx, x, z.y - 6, z.w, 6, "#4e9860", 3);
    ctx.fillStyle = "#2f6b47";
    ctx.font = "800 11px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("PONTO ALTO", x + 6, z.y - 14);
  }
  for (const d of g.drains) drawDrain(ctx, d, camera, viewW, g.level.ground);
  for (const d of g.debris) drawDebris(ctx, d, camera, viewW);
  for (const r of g.residents) drawResident(ctx, r, camera, viewW);
}

// Água e tempestade (desenhadas por cima do jogador).
export function drawFloodOverlay(ctx, g, scene) {
  const f = g.flood;
  if (!f) return;
  drawStorm(ctx, scene.viewW, scene.viewH, f.h / f.cfg.maxHeight);
  if (f.h > 0) drawWater(ctx, waterTop(g), scene.camera, scene.viewW, scene.viewH);
}

// Medidor do nível da água e dos bueiros entupidos no HUD.
export function drawFloodHud(ctx, viewW, g) {
  const f = g.flood;
  if (!f) return;
  const barW = Math.min(230, viewW * 0.32);
  const x = viewW - barW - 22;
  const y = 83;
  rect(ctx, x, y, barW, 7, "#17352d35", 5);
  rect(ctx, x, y, barW * (f.h / f.cfg.maxHeight), 7, "#3f8fc4", 5);
  ctx.fillStyle = "#365c4b";
  ctx.font = "800 10px system-ui";
  ctx.textAlign = "right";
  ctx.fillText("NÍVEL DA ÁGUA", viewW - 22, y - 7);
  ctx.fillText(`BUEIROS ENTUPIDOS: ${f.clogged}/${g.drains.length}`, viewW - 22, y + 22);
}
