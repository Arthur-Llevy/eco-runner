import { rect, circle } from "../render/draw.js";

export function createDrain({ x }) {
  return { x, clogged: false };
}

// Bueiro na calçada: grade escura quando livre, entupido de lixo e com alerta quando não.
export function drawDrain(ctx, d, camera, viewW, ground) {
  const x = d.x - camera;
  if (x < -50 || x > viewW + 50) return;
  rect(ctx, x - 26, ground - 1, 52, 9, "#3d4a44", 3);
  for (let i = -20; i <= 14; i += 9) rect(ctx, x + i, ground + 1, 5, 5, d.clogged ? "#6a5a45" : "#1f2a26", 1);
  if (d.clogged) {
    circle(ctx, x - 9, ground - 4, 8, "#8c4f4a");
    circle(ctx, x + 5, ground - 6, 9, "#b5894a");
    circle(ctx, x + 14, ground - 3, 6, "#5b6d8a");
    ctx.fillStyle = "#d9534f";
    ctx.font = "900 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("!", x, ground - 26 + Math.sin(performance.now() * 0.008) * 2);
  }
}
