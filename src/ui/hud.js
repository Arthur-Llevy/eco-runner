import { rect } from "../render/draw.js";

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
  const y = 83;
  rect(ctx, x, y, barW, 7, "#17352d35", 5);
  rect(ctx, x, y, barW * Math.min(1, collected / seedGoal), 7, "#8bbf50", 5);
  ctx.fillStyle = "#365c4b";
  ctx.font = "800 10px system-ui";
  ctx.textAlign = "right";
  ctx.fillText("RESTAURAÇÃO", viewW - 22, y - 7);
}
