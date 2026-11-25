// Água da enchente e clima de tempestade.
export function drawStorm(ctx, viewW, viewH, intensity) {
  ctx.fillStyle = `rgba(35, 55, 75, ${0.12 + 0.16 * intensity})`;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.strokeStyle = "rgba(210, 230, 245, 0.35)";
  ctx.lineWidth = 1.5;
  const t = performance.now() * 0.9;
  ctx.beginPath();
  for (let i = 0; i < 70; i++) {
    const x = (i * 97 + t * 0.15) % (viewW + 40);
    const y = (i * 53 + t) % viewH;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + 14);
  }
  ctx.stroke();
}

// Superfície com ondas; `top` é o y do mundo onde a água começa.
export function drawWater(ctx, top, camera, viewW, viewH) {
  const t = performance.now() * 0.003;
  const wave = (x) => top + Math.sin((x + camera) * 0.025 + t) * 4 + Math.sin((x + camera) * 0.011 - t * 0.7) * 3;
  ctx.fillStyle = "rgba(56, 128, 170, 0.58)";
  ctx.beginPath();
  ctx.moveTo(0, viewH);
  for (let x = 0; x <= viewW + 20; x += 20) ctx.lineTo(x, wave(x));
  ctx.lineTo(viewW + 20, viewH);
  ctx.fill();
  ctx.strokeStyle = "rgba(220, 240, 250, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= viewW + 20; x += 20) {
    if (x === 0) ctx.moveTo(x, wave(x));
    else ctx.lineTo(x, wave(x));
  }
  ctx.stroke();
}
