import { rect } from "../render/draw.js";
import { TRASH_TYPES, drawTrashIcon } from "../entities/trash.js";

const $ = (id) => document.getElementById(id);

export function updateHUD(g) {
  const flood = Boolean(g.flood);
  $("seed-stat").hidden = flood;
  $("res-stat").hidden = !flood;
  $("seeds").textContent = `${g.collected} / ${g.seedGoal}`;
  $("rescued").textContent = `${g.rescued} / ${g.rescueGoal}`;
  $("lives").textContent = g.lives;
  $("score").textContent = String(g.score).padStart(3, "0");
  $("goal-tip").textContent = flood ? `${g.rescueGoal} MORADORES` : `${g.seedGoal} SEMENTES`;
}

// Barra de restauração desenhada no canvas.
export function drawProgress(ctx, viewW, collected, seedGoal) {
  const barW = Math.min(230, viewW * 0.32);
  const x = viewW - barW - 22;
  const y = 90;
  rect(ctx, x, y, barW, 7, "#17352d35", 5);
  rect(ctx, x, y, barW * Math.min(1, collected / seedGoal), 7, "#8bbf50", 5);
  ctx.fillStyle = "#365c4b";
  ctx.font = "800 10px system-ui";
  ctx.textAlign = "right";
  ctx.fillText(`RESTAURAÇÃO URBANA: ${Math.round(Math.min(1, collected / seedGoal) * 100)}%`, viewW - 22, y - 7);
}

// Verde (ar limpo) -> amarelo -> vermelho (ar poluído).
export function airColor(air) {
  return air >= 60 ? "#6fbf5a" : air >= 30 ? "#e0b93a" : "#d9534f";
}

// Medidor de qualidade do ar (11.6).
export function drawAirMeter(ctx, viewW, air) {
  const barW = Math.min(230, viewW * 0.32);
  const x = viewW - barW - 22;
  const y = 120;
  rect(ctx, x, y, barW, 7, "#17352d35", 5);
  rect(ctx, x, y, barW * (air / 100), 7, airColor(air), 5);
  ctx.fillStyle = "#365c4b";
  ctx.font = "800 10px system-ui";
  ctx.textAlign = "right";
  ctx.fillText(`QUALIDADE DO AR · ${Math.round(air)}%`, viewW - 22, y - 7);
}

// Contagem por tipo de material reciclável.
export function drawTrashCounts(ctx, viewW, counts) {
  const types = Object.keys(TRASH_TYPES);
  const gap = 46;
  let x = viewW - 22 - gap * types.length + 12;
  const y = 150;
  ctx.font = "800 12px system-ui";
  ctx.textAlign = "left";
  for (const t of types) {
    drawTrashIcon(ctx, t, x, y, 0.7);
    ctx.fillStyle = "#365c4b";
    ctx.fillText(String(counts[t]), x + 11, y + 4);
    x += gap;
  }
}
