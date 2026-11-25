import { rect, circle } from "../render/draw.js";

const COLORS = ["#d9774a", "#6a8fd0", "#c46aa0", "#e0b93a"];

// `y` é a superfície onde o morador está (chão ou telhado).
export function createResident({ x, y }, ground, i = 0) {
  const h = 40;
  return { x, y: (y ?? ground) - h, w: 22, h, state: "waiting", color: COLORS[i % COLORS.length], danger: false, t: i * 1.7 };
}

export function drawResident(ctx, r, camera, viewW) {
  if (r.state === "lost") return;
  const x = r.x - camera + r.w / 2;
  if (x < -40 || x > viewW + 40) return;
  const now = performance.now() * 0.001 + r.t;
  const waving = r.state === "waiting";
  ctx.save();
  ctx.translate(x, r.y + r.h);
  ctx.fillStyle = "#314b3d30";
  ctx.beginPath();
  ctx.ellipse(0, 1, 13, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, -7, -16, 5, 16, "#3a4d5a", 2);
  rect(ctx, 2, -16, 5, 16, "#3a4d5a", 2);
  rect(ctx, -9, -30, 18, 18, r.color, 5);
  // Braços: acenando por socorro enquanto espera.
  const arm = waving ? Math.sin(now * 7) * 5 : 0;
  rect(ctx, -13, waving ? -42 + arm : -28, 5, waving ? 16 : 14, "#e8bd91", 2);
  rect(ctx, 8, waving ? -42 - arm : -28, 5, waving ? 16 : 14, "#e8bd91", 2);
  circle(ctx, 0, -38, 9, "#e8bd91");
  ctx.fillStyle = "#4a3b34";
  ctx.beginPath();
  ctx.arc(0, -41, 9, Math.PI, Math.PI * 2);
  ctx.fill();
  if (r.danger && r.state === "waiting") {
    ctx.fillStyle = "#d9534f";
    ctx.font = "900 18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("!", 0, -58 + Math.sin(now * 8) * 2);
  }
  ctx.restore();
}
