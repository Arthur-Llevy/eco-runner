// Geometrias, materiais e fábricas dos modelos 3D, em estilo cartoon:
// sombreamento "toon" em faixas de cor + contorno escuro (casco invertido).
// Medidas do jogo 2D em pixels viram unidades 3D: 1 unidade = U pixels.
import * as THREE from "../../vendor/three.module.js";

export { THREE };
export const U = 40;
export const PLAYER_SCALE = 1.05; // só visual: a colisão continua a do jogo 2D

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cone: new THREE.ConeGeometry(1, 1, 14),
  ring: new THREE.TorusGeometry(1, 0.28, 8, 24),
  smile: new THREE.TorusGeometry(1, 0.2, 6, 14, Math.PI),
};

// Gradiente do sombreamento toon: 4 faixas de luz.
const toonGradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([105, 165, 215, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const OUTLINE = 0.035; // espessura do contorno em unidades 3D
const outlineMat = new THREE.MeshBasicMaterial({ color: "#1d2b26", side: THREE.BackSide });

const mats = new Map();
// Material toon compartilhado por cor/opções.
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshToonMaterial({ color, gradientMap: toonGradient, ...opts }));
  return mats.get(key);
}
const ghost = (color, opacity, extra = {}) =>
  new THREE.MeshLambertMaterial({ color, transparent: true, opacity, depthWrite: false, ...extra });

// `opts.outline`: false remove o contorno; número muda a espessura.
function solid(geo, color, scale, pos, opts = {}) {
  const { outline = OUTLINE, ...matOpts } = opts;
  const m = new THREE.Mesh(geo, mat(color, matOpts));
  m.scale.set(...scale);
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geo, outlineMat);
    const k = (s) => 1 + (2 * outline) / Math.max(s, 0.02);
    o.scale.set(k(scale[0]), k(scale[1]), k(scale[2]));
    m.add(o);
  }
  return m;
}
function glass(geo, material, scale, pos) {
  const m = new THREE.Mesh(geo, material);
  m.scale.set(...scale);
  m.position.set(...pos);
  return m;
}

export const box = (color, size, pos, opts) => solid(G.box, color, size, pos, opts);
export const sphere = (color, r, pos, opts) => solid(G.sphere, color, Array.isArray(r) ? r : [r, r, r], pos, opts);
export const cyl = (color, r, h, pos, opts) => solid(G.cyl, color, [r, h, r], pos, opts);
export const cone = (color, r, h, pos, opts) => solid(G.cone, color, [r, h, r], pos, opts);
const ghostSphere = (color, opacity, r, pos) => glass(G.sphere, ghost(color, opacity), [r, r, r], pos);

// ---------------------------------------------------------------- sprites
const textures = new Map();
function glowTexture() {
  if (!textures.has("glow")) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.4, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    textures.set("glow", new THREE.CanvasTexture(c));
  }
  return textures.get("glow");
}
export function glowSprite(color, size, opacity = 0.7) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
  );
  s.scale.set(size, size, 1);
  return s;
}

// Texto/ícone (ex.: "!") sempre virado para a câmera.
export function labelSprite(text, color = "#d9534f", size = 0.9) {
  const key = text + color;
  if (!textures.has(key)) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    x.font = "900 54px system-ui, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.lineWidth = 8;
    x.strokeStyle = "#fffdf0";
    x.strokeText(text, 32, 34);
    x.fillStyle = color;
    x.fillText(text, 32, 34);
    textures.set(key, new THREE.CanvasTexture(c));
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.get(key), transparent: true, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1);
  return s;
}

// Faixa com texto (ex.: "PONTO ALTO") virada para a câmera.
export function bannerSprite(text, bg = "#2f6b47", fg = "#ffffff", w = 3.2, h = 0.8) {
  const key = `banner|${text}|${bg}|${fg}`;
  if (!textures.has(key)) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const x = c.getContext("2d");
    x.fillStyle = bg;
    x.beginPath();
    x.roundRect(2, 2, 252, 60, 14);
    x.fill();
    x.lineWidth = 3;
    x.strokeStyle = "#1d2b26";
    x.stroke();
    x.fillStyle = fg;
    x.font = "900 30px system-ui, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, 128, 34);
    textures.set(key, new THREE.CanvasTexture(c));
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.get(key), transparent: true, depthWrite: false, fog: false }));
  s.scale.set(w, h, 1);
  return s;
}

// ---------------------------------------------------------------- pessoas
// Pessoa cartoon (jogador e moradores). Pés em y = 0, olhando para +x.
function buildPerson({
  hoodie = "#3f9668",
  hoodieDark = "#2f7a52",
  pants = "#2f5b50",
  hair = "#3a2e2a",
  skin = "#f0c49a",
  backpack = false,
  scarf = false,
  sprout = false,
} = {}) {
  const root = new THREE.Group();
  const face = new THREE.Group(); // gira para olhar para a direita/esquerda
  const lean = new THREE.Group(); // inclina o corpo todo em torno dos pés
  const torso = new THREE.Group(); // respiração e pulinhos
  root.add(face);
  face.add(lean);
  lean.add(torso);

  // Pernas e tênis.
  const leg = (z) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.44, z);
    pivot.add(cyl(pants, 0.11, 0.36, [0, -0.19, 0]));
    pivot.add(sphere("#f4efe0", [0.2, 0.1, 0.13], [0.06, -0.38, 0]));
    pivot.add(box("#d65a4a", [0.34, 0.035, 0.22], [0.05, -0.45, 0], { outline: 0.02 }));
    torso.add(pivot);
    return pivot;
  };
  const legL = leg(0.15);
  const legR = leg(-0.15);

  // Tronco (moletom).
  torso.add(sphere(hoodie, [0.33, 0.3, 0.27], [0, 0.7, 0]));
  torso.add(cyl(hoodie, 0.3, 0.2, [0, 0.54, 0], { outline: 0.03 }));
  torso.add(sphere(hoodieDark, [0.17, 0.13, 0.2], [-0.15, 0.95, 0], { outline: 0.02 }));
  torso.add(box(hoodieDark, [0.04, 0.12, 0.2], [0.27, 0.58, 0], { outline: 0.015 }));

  // Braços e mãos.
  const arm = (z) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.82, z);
    pivot.add(cyl(hoodie, 0.085, 0.3, [0, -0.15, 0], { outline: 0.03 }));
    pivot.add(sphere(skin, 0.1, [0, -0.34, 0], { outline: 0.03 }));
    torso.add(pivot);
    return pivot;
  };
  const armL = arm(0.38);
  const armR = arm(-0.38);

  // Cachecol.
  let scarfTail = null;
  if (scarf) {
    const ring = new THREE.Mesh(G.ring, mat("#d5f06d", { emissive: "#8aa020", emissiveIntensity: 0.45 }));
    ring.scale.set(0.27, 0.27, 0.32);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.93;
    ring.castShadow = true;
    torso.add(ring);
    scarfTail = new THREE.Group();
    scarfTail.position.set(-0.2, 0.93, 0.12);
    scarfTail.add(box("#d5f06d", [0.42, 0.11, 0.09], [-0.2, 0, 0], { emissive: "#8aa020", emissiveIntensity: 0.45, outline: 0.02 }));
    torso.add(scarfTail);
  }

  // Mochila com garrafinha.
  if (backpack) {
    torso.add(box("#e0983f", [0.22, 0.42, 0.4], [-0.4, 0.66, 0]));
    torso.add(box("#b86f27", [0.25, 0.12, 0.42], [-0.4, 0.84, 0], { outline: 0.025 }));
    torso.add(cyl("#4aa8d8", 0.06, 0.24, [-0.42, 0.55, 0.25], { outline: 0.025 }));
  }

  // Cabeça: cabelo, rosto e folhinha.
  const head = new THREE.Group();
  head.position.set(0, 1.18, 0);
  torso.add(head);
  head.add(sphere(skin, [0.37, 0.35, 0.34], [0, 0, 0]));
  head.add(sphere(hair, [0.4, 0.31, 0.37], [-0.03, 0.1, 0]));
  head.add(sphere(hair, [0.16, 0.09, 0.3], [0.2, 0.21, 0], { outline: 0.02 }));
  head.add(sphere(hair, 0.11, [-0.37, 0.0, 0], { outline: 0.02 }));
  head.add(sphere(hair, 0.07, [-0.45, -0.12, 0], { outline: 0.02 }));

  const eyes = [];
  for (const z of [0.13, -0.13]) {
    const white = sphere("#ffffff", [0.035, 0.078, 0.066], [0.33, 0.02, z], { outline: false });
    const pupil = sphere("#1f2a26", [0.028, 0.056, 0.042], [0.36, 0.02, z * 1.02], { outline: false });
    const shine = sphere("#ffffff", 0.014, [0.382, 0.05, z * 0.92], { outline: false });
    const brow = box(hair, [0.02, 0.026, 0.075], [0.345, 0.125, z], { outline: false });
    head.add(white, pupil, shine, brow);
    for (const e of [white, pupil, shine]) {
      e.userData.baseY = e.scale.y;
      eyes.push(e);
    }
  }
  const mouth = new THREE.Mesh(G.smile, mat("#8a3b3b"));
  mouth.scale.setScalar(0.06);
  mouth.rotation.set(0, Math.PI / 2, Math.PI);
  mouth.position.set(0.345, -0.09, 0);
  head.add(mouth);
  head.add(sphere("#f29a9a", [0.02, 0.04, 0.055], [0.33, -0.05, 0.22], { outline: false }));
  head.add(sphere("#f29a9a", [0.02, 0.04, 0.055], [0.33, -0.05, -0.22], { outline: false }));
  head.add(sphere("#e3ac80", 0.03, [0.375, -0.03, 0], { outline: false }));

  let sproutGroup = null;
  if (sprout) {
    sproutGroup = new THREE.Group();
    sproutGroup.position.set(0, 0.38, 0);
    sproutGroup.add(cyl("#4d965a", 0.018, 0.16, [0, 0.08, 0], { outline: 0.015 }));
    const l1 = sphere("#8fc65a", [0.13, 0.04, 0.075], [0.1, 0.19, 0], { outline: 0.02 });
    l1.rotation.z = -0.4;
    const l2 = sphere("#a6d96a", [0.11, 0.04, 0.065], [-0.09, 0.16, 0], { outline: 0.02 });
    l2.rotation.z = 0.45;
    sproutGroup.add(l1, l2);
    head.add(sproutGroup);
  }

  return {
    root, face, lean, torso, head, legL, legR, armL, armR, scarfTail, sproutGroup, eyes,
    state: { prevGround: true, squash: 0, blinkAt: 2, blinkUntil: 0 },
  };
}

export function makePlayer() {
  const p = buildPerson({ backpack: true, scarf: true, sprout: true });
  p.root.scale.setScalar(PLAYER_SCALE);
  return p;
}

const RESIDENT_LOOKS = [
  { hoodie: "#d9774a", hoodieDark: "#b45a32", pants: "#3a4d5a", hair: "#4a3b34" },
  { hoodie: "#6a8fd0", hoodieDark: "#4a6fb0", pants: "#3a3f58", hair: "#2a2523", skin: "#d9a577" },
  { hoodie: "#c46aa0", hoodieDark: "#a44c82", pants: "#3a4d5a", hair: "#6b4a2b" },
  { hoodie: "#e0b93a", hoodieDark: "#b8921d", pants: "#2f4a4a", hair: "#2a2523", skin: "#a8734a" },
];
export function makeResident(i = 0) {
  const p = buildPerson(RESIDENT_LOOKS[i % RESIDENT_LOOKS.length]);
  p.root.scale.setScalar(0.85);
  p.alert = labelSprite("!", "#d9534f", 0.9);
  p.alert.position.set(0, 2.5, 0);
  p.alert.visible = false;
  p.root.add(p.alert);
  return p;
}

// Anima a pessoa a partir do estado do jogo e do tempo.
export function animatePerson(m, { onGround, vx, vy, walk = 0, face, waving = false, now, dt }) {
  const s = m.state;
  const moving = onGround && Math.abs(vx) > 0;

  // Olha para o lado em que anda.
  // Meio de lado para a câmera (3/4), para o rosto aparecer.
  const targetRot = face >= 0 ? -0.55 : Math.PI + 0.55;
  m.face.rotation.y += (targetRot - m.face.rotation.y) * Math.min(1, dt * 16);

  // Aterrissagem faz "squash".
  if (onGround && !s.prevGround) s.squash = 1;
  s.prevGround = onGround;
  s.squash = Math.max(0, s.squash - dt * 5);

  let legL = 0, legR = 0, armL = 0, armR = 0, lean = 0, bob = 0, sx = 1, sy = 1;
  if (moving) {
    const w = Math.sin(walk);
    legL = w * 0.95;
    legR = -w * 0.95;
    armL = -w * 0.9;
    armR = w * 0.9;
    lean = -0.14;
    bob = Math.abs(Math.cos(walk)) * 0.07;
  } else if (onGround) {
    const breath = Math.sin(now * 2.2);
    sy = 1 + breath * 0.018;
    armL = 0.08 + breath * 0.04;
    armR = 0.08 - breath * 0.04;
  } else if (vy < 0) {
    // Subindo: braços para cima, pernas dobradas, corpo esticado.
    armL = armR = 2.5;
    legL = 0.7;
    legR = -0.5;
    sy = 1.1;
    sx = 0.94;
    lean = -0.08;
  } else {
    // Caindo: braços abertos.
    armL = armR = 1.35;
    legL = 0.35;
    legR = -0.25;
    lean = 0.04;
  }
  if (waving) {
    armL = 2.7 + Math.sin(now * 9) * 0.35;
    armR = 2.7 - Math.sin(now * 9) * 0.35;
  }
  sy *= 1 - 0.16 * s.squash;
  sx *= 1 + 0.1 * s.squash;

  m.legL.rotation.z = legL;
  m.legR.rotation.z = legR;
  m.armL.rotation.z = armL;
  m.armR.rotation.z = armR;
  m.lean.rotation.z += (lean - m.lean.rotation.z) * Math.min(1, dt * 12);
  m.torso.position.y = bob;
  m.torso.scale.set(sx, sy, sx);
  m.head.rotation.z = moving ? -0.05 : Math.sin(now * 1.3) * 0.03;

  if (m.scarfTail) {
    const flutter = Math.sin(now * (moving ? 14 : 4)) * (moving ? 0.35 : 0.1);
    m.scarfTail.rotation.z = (moving ? 0.35 : 0) + (!onGround ? 0.5 : 0) + flutter;
  }
  if (m.sproutGroup) m.sproutGroup.rotation.z = Math.sin(now * 3) * 0.12 + (moving ? -0.2 : 0);

  // Piscar de olhos.
  if (now > s.blinkAt) {
    s.blinkUntil = now + 0.12;
    s.blinkAt = now + 2 + Math.random() * 3;
  }
  const open = now < s.blinkUntil ? 0.1 : 1;
  for (const e of m.eyes) e.scale.y = e.userData.baseY * open;
}

// ---------------------------------------------------------------- coletáveis
export function makeSeed() {
  const g = new THREE.Group();
  const shell = sphere("#c8ef65", [0.17, 0.28, 0.17], [0, 0, 0], { emissive: "#6a9a20", emissiveIntensity: 0.6 });
  shell.rotation.z = -0.45;
  const core = sphere("#6aab4e", [0.06, 0.2, 0.06], [0.03, 0, 0.12], { emissive: "#2f6b20", emissiveIntensity: 0.4, outline: 0.015 });
  core.rotation.z = -0.45;
  g.add(shell, core, glowSprite("#d8ff7a", 1.3, 0.55));
  return g;
}

const TRASH_COLORS = { paper: "#3b82c4", plastic: "#d9534f", metal: "#e8b923", glass: "#3fa86b" };
export function makeTrash(type) {
  const c = TRASH_COLORS[type];
  const g = new THREE.Group();
  if (type === "paper") {
    g.add(box("#f4f1e6", [0.42, 0.56, 0.08], [0, 0, 0]));
    g.add(box(c, [0.42, 0.12, 0.09], [0, 0.22, 0], { outline: 0.02 }));
    g.add(box(c, [0.24, 0.05, 0.09], [0, 0, 0], { outline: 0.015 }));
  } else if (type === "plastic") {
    g.add(cyl(c, 0.17, 0.5, [0, -0.04, 0]));
    g.add(cyl("#f4f1e6", 0.07, 0.14, [0, 0.28, 0], { outline: 0.02 }));
  } else if (type === "metal") {
    g.add(cyl(c, 0.2, 0.46, [0, 0, 0]));
    g.add(cyl("#b98b0f", 0.21, 0.07, [0, 0.22, 0], { outline: 0.02 }));
    g.add(cyl("#b98b0f", 0.21, 0.07, [0, -0.22, 0], { outline: 0.02 }));
  } else {
    g.add(cyl(c, 0.2, 0.42, [0, -0.04, 0]));
    g.add(cyl(c, 0.09, 0.2, [0, 0.24, 0], { outline: 0.02 }));
  }
  g.add(glowSprite(c, 1.1, 0.35));
  return g;
}

// Lixo de rua da fase de enchente (kind: 0 sacola, 1 caixa, 2 garrafa).
export function makeDebris(kind, color) {
  const g = new THREE.Group();
  if (kind === 0) {
    g.add(sphere(color, 0.28, [0, 0.2, 0]));
    g.add(cyl(color, 0.07, 0.16, [0, 0.52, 0], { outline: 0.02 }));
  } else if (kind === 1) {
    g.add(box(color, [0.55, 0.45, 0.5], [0, 0.22, 0]));
  } else {
    const b = cyl(color, 0.14, 0.55, [0, 0.14, 0]);
    b.rotation.z = Math.PI / 2;
    g.add(b);
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
  g.add(box("#fde68a", [0.34, 0.1, 0.05], [0, 0.05, 0.41], { outline: 0.015 }));
  return g;
}

// Bocal do tubo de vapor + jato (altura e brilho controlados em updateVent).
export function makeVent() {
  const g = new THREE.Group();
  g.add(cyl("#3c4744", 0.45, 0.3, [0, 0.15, 0]));
  g.add(cyl("#232a28", 0.36, 0.08, [0, 0.32, 0], { outline: 0.02 }));
  const outer = glass(G.cyl, ghost("#64748b", 0.42), [0.62, 1, 0.62], [0, 0, 0]);
  const mid = glass(G.cyl, ghost("#475569", 0.6), [0.42, 1, 0.42], [0, 0, 0]);
  const heat = glass(G.cyl, ghost("#f97316", 0.75, { emissive: "#ef4444", emissiveIntensity: 0.9 }), [0.22, 1, 0.22], [0, 0, 0]);
  const cap = ghostSphere("#6e7e91", 0.75, 0.55, [0, 0, 0]);
  const spark = sphere("#f97316", 0.16, [0, 0.45, 0], { emissive: "#fde047", emissiveIntensity: 1, outline: false });
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

// ---------------------------------------------------------------- enchente
// Bueiro na calçada; `userData.clog` aparece quando entupido.
export function makeDrain() {
  const g = new THREE.Group();
  g.add(box("#3d4a44", [1.4, 0.1, 0.9], [0, 0.1, 0], { outline: 0.025 }));
  for (let i = -3; i <= 3; i++) g.add(box("#1f2a26", [0.1, 0.04, 0.7], [i * 0.19, 0.16, 0], { outline: false }));
  const clog = new THREE.Group();
  [["#8c4f4a", -0.4, 0.3], ["#b5894a", 0.0, 0.36], ["#5b6d8a", 0.4, 0.27]].forEach(([c, x, r]) => clog.add(sphere(c, r, [x, 0.2 + r * 0.5, 0])));
  const warn = labelSprite("!", "#d9534f", 1.0);
  warn.position.set(0, 1.5, 0);
  clog.add(warn);
  clog.userData.warn = warn;
  g.add(clog);
  g.userData.clog = clog;
  return g;
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
  const glow = glowSprite("#ffe9a0", 1.2, 0.45);
  glow.position.set(0.42, 2.5, 0);
  g.add(glow);
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
  g.add(cyl("#f6f0d9", 0.05, poleH, [0, poleH / 2, 0], { outline: 0.02 }));
  const cloth = box("#9aa59c", [w, w * 0.5, 0.05], [w / 2 + 0.05, poleH - w * 0.3, 0], { outline: 0.02 });
  g.add(cloth);
  g.userData.cloth = cloth;
  return g;
}
