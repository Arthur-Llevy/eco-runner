import { rect, circle } from "../render/draw.js";

const PICKUP_RADIUS = 32;

// Coleta seletiva: cada material tem a cor da sua lixeira.
export const TRASH_TYPES = {
  paper: { label: "Papel", color: "#3b82c4" },
  plastic: { label: "Plástico", color: "#d9534f" },
  metal: { label: "Metal", color: "#e8b923" },
  glass: { label: "Vidro", color: "#3fa86b" },
};

export function createTrash({ x, y, type }) {
  if (!TRASH_TYPES[type]) throw new Error(`Tipo de lixo desconhecido: ${type}`);
  return { x, y, type, t: Math.random() * 6, got: false };
}

export function touchesTrash(t, p) {
  if (t.got) return false;
  const dx = p.x + p.w / 2 - t.x;
  const dy = p.y + p.h / 2 - t.y;
  return dx * dx + dy * dy < PICKUP_RADIUS * PICKUP_RADIUS;
}

// Ícone do material (usado no cenário e no HUD), centrado em (0, 0).
export function drawTrashIcon(ctx, type, x, y, s = 1) {
  const c = TRASH_TYPES[type].color;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (type === "paper") {
    rect(ctx, -9, -11, 18, 22, "#f4f1e6", 2);
    rect(ctx, -9, -11, 18, 5, c, 2);
    rect(ctx, -5, -1, 10, 2, c);
    rect(ctx, -5, 4, 10, 2, c);
  } else if (type === "plastic") {
    rect(ctx, -3, -13, 6, 6, c, 2);
    rect(ctx, -7, -8, 14, 21, c, 5);
    rect(ctx, -7, -1, 14, 5, "#ffffff80");
  } else if (type === "metal") {
    rect(ctx, -8, -10, 16, 20, c, 3);
    rect(ctx, -8, -10, 16, 4, "#b98b0f", 2);
    rect(ctx, -8, 6, 16, 4, "#b98b0f", 2);
    rect(ctx, -3, -3, 6, 6, "#ffffff90", 2);
  } else {
    rect(ctx, -4, -13, 8, 6, c, 2);
    rect(ctx, -8, -8, 16, 21, c, 6);
    rect(ctx, -5, -4, 3, 12, "#ffffff70", 2);
  }
  ctx.restore();
}

export function drawTrash(ctx, t, camera, viewW) {
  if (t.got) return;
  const x = t.x - camera;
  if (x < -30 || x > viewW + 30) return;
  const y = t.y + Math.sin(performance.now() * 0.003 + t.t) * 3;
  circle(ctx, x, y + 14, 9, "#17352d1a");
  drawTrashIcon(ctx, t.type, x, y);
}
