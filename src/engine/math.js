export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Mistura duas cores "#rrggbb"; devolve "rgb(r, g, b)".
export function lerpHex(a, b, t) {
  const A = parseInt(a.slice(1), 16);
  const B = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(lerp((A >> shift) & 255, (B >> shift) & 255, t));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

export const rand = (a, b) => a + Math.random() * (b - a);
