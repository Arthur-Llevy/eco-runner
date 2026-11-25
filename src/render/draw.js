// Primitivas de desenho compartilhadas.
export function rect(ctx, x, y, w, h, color, r = 0) {
  ctx.fillStyle = color;
  if (r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  } else ctx.fillRect(x, y, w, h);
}

export function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function cloud(ctx, x, y, s = 1, color = "#879b91") {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 24 * s, y - 10 * s, 28 * s, 0, Math.PI * 2);
  ctx.arc(x + 52 * s, y, 22 * s, 0, Math.PI * 2);
  ctx.fill();
}
