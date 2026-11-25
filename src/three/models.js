// Geometrias e materiais compartilhados + fábricas dos modelos 3D (formas simples).
// Medidas do jogo 2D em pixels viram unidades 3D: 1 unidade = U pixels.
import * as THREE from "../../vendor/three.module.js";

export { THREE };
export const U = 40;

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cone: new THREE.ConeGeometry(1, 1, 12),
};

const mats = new Map();
// Material Lambert compartilhado por cor/opções.
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  return mats.get(key);
}
const ghost = (color, opacity, extra = {}) => mat(color, { transparent: true, opacity, depthWrite: false, ...extra });

function mesh(geo, material, scale, pos, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.scale.set(...scale);
  m.position.set(...pos);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
export const box = (color, size, pos, opts) => mesh(G.box, mat(color, opts), size, pos);
export const sphere = (color, r, pos, opts) => mesh(G.sphere, mat(color, opts), Array.isArray(r) ? r : [r, r, r], pos);
export const cyl = (color, r, h, pos, opts) => mesh(G.cyl, mat(color, opts), [r, h, r], pos);
export const cone = (color, r, h, pos, opts) => mesh(G.cone, mat(color, opts), [r, h, r], pos);
const ghostSphere = (color, opacity, r, pos) => mesh(G.sphere, ghost(color, opacity), [r, r, r], pos, false);

// ---------------------------------------------------------------- jogador
export function makePlayer() {
  const root = new THREE.Group();
  const body = new THREE.Group(); // gira para olhar para a direita/esquerda
  root.add(body);

  body.add(box("#3f9668", [0.62, 0.5, 0.42], [0, 0.6, 0]));
  body.add(box("#d5f06d", [0.66, 0.12, 0.46], [0, 0.88, 0])); // lenço
  body.add(box("#d18c4c", [0.22, 0.44, 0.34], [-0.4, 0.62, 0])); // mochila
  body.add(sphere("#e8bd91", 0.27, [0, 1.04, 0])); // cabeça
  body.add(sphere("#394b3e", [0.29, 0.2, 0.29], [-0.03, 1.15, 0])); // cabelo
  body.add(sphere("#24352d", 0.045, [0.24, 1.06, 0.12]));
  body.add(sphere("#24352d", 0.045, [0.24, 1.06, -0.12]));
  const leaf = cone("#8fc65a", 0.08, 0.26, [0.05, 1.46, 0]);
  leaf.rotation.z = -0.5;
  body.add(leaf);

  const limb = (color, size, y, z, shoe) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, y, z);
    pivot.add(box(color, size, [0, -size[1] / 2, 0]));
    if (shoe) pivot.add(box("#e9e2c9", [0.32, 0.12, 0.26], [0.05, -size[1] + 0.04, 0]));
    body.add(pivot);
    return pivot;
  };
  const legL = limb("#315b4c", [0.2, 0.38, 0.22], 0.38, 0.16, true);
  const legR = limb("#315b4c", [0.2, 0.38, 0.22], 0.38, -0.16, true);
  const armL = limb("#e8bd91", [0.14, 0.42, 0.14], 0.8, 0.38, false);
  const armR = limb("#e8bd91", [0.14, 0.42, 0.14], 0.8, -0.38, false);

  // Sombra "falsa" no chão não é necessária: a luz direcional projeta a real.
  return { root, body, legL, legR, armL, armR };
}

// ---------------------------------------------------------------- coletáveis
export function makeSeed() {
  const g = new THREE.Group();
  const shell = sphere("#c8ef65", [0.17, 0.28, 0.17], [0, 0, 0], { emissive: "#6a9a20", emissiveIntensity: 0.55 });
  shell.rotation.z = -0.45;
  const core = sphere("#6aab4e", [0.06, 0.2, 0.06], [0.03, 0, 0.12], { emissive: "#2f6b20", emissiveIntensity: 0.4 });
  core.rotation.z = -0.45;
  g.add(shell, core);
  return g;
}

const TRASH_COLORS = { paper: "#3b82c4", plastic: "#d9534f", metal: "#e8b923", glass: "#3fa86b" };
export function makeTrash(type) {
  const c = TRASH_COLORS[type];
  const g = new THREE.Group();
  if (type === "paper") {
    g.add(box("#f4f1e6", [0.42, 0.56, 0.08], [0, 0, 0]));
    g.add(box(c, [0.42, 0.12, 0.09], [0, 0.22, 0]));
    g.add(box(c, [0.24, 0.05, 0.09], [0, 0, 0]));
  } else if (type === "plastic") {
    g.add(cyl(c, 0.17, 0.5, [0, -0.04, 0]));
    g.add(cyl(c, 0.07, 0.14, [0, 0.28, 0]));
  } else if (type === "metal") {
    g.add(cyl(c, 0.2, 0.46, [0, 0, 0]));
    g.add(cyl("#b98b0f", 0.21, 0.07, [0, 0.22, 0]));
    g.add(cyl("#b98b0f", 0.21, 0.07, [0, -0.22, 0]));
  } else {
    g.add(cyl(c, 0.2, 0.42, [0, -0.04, 0]));
    g.add(cyl(c, 0.09, 0.2, [0, 0.24, 0]));
  }
  return g;
}

// ---------------------------------------------------------------- perigos
export function makeSmog() {
  const g = new THREE.Group();
  const puffs = [];
  [
    [-0.55, 0.0, 0.42, "#3b4744", 0.55],
    [-0.15, 0.12, 0.5, "#293330", 0.7],
    [0.3, 0.0, 0.42, "#1f2725", 0.65],
    [0.62, -0.05, 0.3, "#3b4744", 0.55],
    [0.0, -0.08, 0.38, "#1f2725", 0.6],
  ].forEach(([x, y, r, c, o], i) => {
    const p = ghostSphere(c, o, r, [x, y, 0]);
    p.userData = { x, y, r, phase: i * 1.3 };
    puffs.push(p);
    g.add(p);
  });
  g.userData.puffs = puffs;
  return g;
}

export function makeBin() {
  const g = new THREE.Group();
  g.add(box("#c45d3b", [0.8, 0.82, 0.8], [0, 0, 0]));
  g.add(box("#943e23", [0.92, 0.18, 0.92], [0, 0.48, 0]));
  g.add(box("#fde68a", [0.34, 0.1, 0.05], [0, 0.05, 0.41]));
  return g;
}

// Bocal do tubo de vapor + jato (altura e brilho controlados em updateVent).
export function makeVent() {
  const g = new THREE.Group();
  g.add(cyl("#3c4744", 0.45, 0.3, [0, 0.15, 0]));
  g.add(cyl("#232a28", 0.36, 0.08, [0, 0.32, 0]));
  const outer = mesh(G.cyl, ghost("#64748b", 0.42), [0.62, 1, 0.62], [0, 0, 0], false);
  const mid = mesh(G.cyl, ghost("#475569", 0.6), [0.42, 1, 0.42], [0, 0, 0], false);
  const heat = mesh(G.cyl, ghost("#f97316", 0.75, { emissive: "#ef4444", emissiveIntensity: 0.9 }), [0.22, 1, 0.22], [0, 0, 0], false);
  const cap = ghostSphere("#6e7e91", 0.75, 0.55, [0, 0, 0]);
  const spark = sphere("#f97316", 0.16, [0, 0.45, 0], { emissive: "#fde047", emissiveIntensity: 1 });
  g.add(outer, mid, heat, cap, spark);
  g.userData = { outer, mid, heat, cap, spark };
  return g;
}

export function updateVent(vent, state, now) {
  const { outer, mid, heat, cap, spark } = vent.userData;
  const h = state.height / U;
  const on = state.state === "active" && h > 0.1;
  for (const m of [outer, mid, heat, cap]) m.visible = on;
  spark.visible = state.state === "warn";
  vent.position.x += state.state === "warn" ? Math.sin(now * 55) * 0.02 : 0;
  if (!on) return;
  const base = 0.3;
  outer.scale.y = h;
  outer.position.y = base + h / 2;
  mid.scale.y = h;
  mid.position.y = base + h / 2;
  heat.scale.y = h * 0.78;
  heat.position.y = base + (h * 0.78) / 2;
  cap.position.y = base + h;
  cap.position.x = Math.sin(now * 14) * 0.08;
}

// ---------------------------------------------------------------- cenário
export function makeDeadTree() {
  const g = new THREE.Group();
  g.add(cyl("#826b50", 0.12, 2.0, [0, 1.0, 0]));
  const a = cyl("#826b50", 0.07, 0.9, [-0.3, 1.7, 0]);
  a.rotation.z = 0.7;
  const b = cyl("#826b50", 0.07, 1.0, [0.35, 1.95, 0]);
  b.rotation.z = -0.6;
  g.add(a, b);
  return g;
}

export function makeGreenTree() {
  const g = new THREE.Group();
  g.add(cyl("#795a3e", 0.15, 1.75, [0, 0.88, 0]));
  g.add(sphere("#64a95c", 0.68, [0, 2.2, 0]));
  g.add(sphere("#83bd69", 0.46, [-0.42, 1.88, 0.1]));
  g.add(sphere("#4f9857", 0.48, [0.5, 1.84, -0.1]));
  return g;
}

export function makeLamp() {
  const g = new THREE.Group();
  g.add(cyl("#596f68", 0.06, 2.6, [0, 1.3, 0]));
  g.add(box("#596f68", [0.65, 0.12, 0.12], [0.2, 2.6, 0]));
  g.add(sphere("#f3d98a", 0.16, [0.42, 2.5, 0], { emissive: "#f3d98a", emissiveIntensity: 0.9 }));
  return g;
}

export function makeChimney() {
  const g = new THREE.Group();
  g.add(box("#71847e", [0.7, 5.5, 0.7], [0, 2.75, 0]));
  g.add(box("#657973", [0.9, 0.22, 0.9], [0, 5.6, 0]));
  const puffs = [];
  for (let i = 0; i < 3; i++) {
    const p = ghostSphere("#b3bdb4", 0.32, 0.45 + i * 0.12, [0, 6.2 + i * 0.7, 0]);
    puffs.push(p);
    g.add(p);
  }
  g.userData.puffs = puffs;
  return g;
}

export function makeFlag(poleH = 1.75, w = 0.95) {
  const g = new THREE.Group();
  g.add(cyl("#f6f0d9", 0.05, poleH, [0, poleH / 2, 0]));
  const cloth = box("#9aa59c", [w, w * 0.5, 0.05], [w / 2 + 0.05, poleH - w * 0.3, 0]);
  g.add(cloth);
  g.userData.cloth = cloth;
  return g;
}
