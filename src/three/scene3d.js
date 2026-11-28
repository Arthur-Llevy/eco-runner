// Renderizador 2.5D: lê o estado do jogo (`g`, de game.js) e desenha em 3D com Three.js.
// As regras e colisões continuam 2D; aqui só se traduz posição (x, y) -> (x, y, z).
import {
  THREE, U, mat, box, sphere, cyl,
  makePlayer, makeResident, animatePerson, makeSeed, makeTrash, makeDebris, makeDrain, makeSmog, makeBin, makeVent, updateVent,
  makeDeadTree, makeGreenTree, makeLamp, makeChimney, makeFlag, bannerSprite,
} from "./models.js";
import { ventState } from "../entities/hazard.js";
import { lerpHex, clamp } from "../engine/math.js";

// Ajustes pela URL, ex.: 3d.html?fov=60&lado=-7&altura=7&frente=1
//   fov    perspectiva (maior = profundidade mais forte; padrão 52)
//   lado   deslocamento lateral da câmera (negativo = olha de 3/4 pela esquerda; 0 = de frente)
//   altura altura da câmera
//   frente 1/0 liga ou desliga os objetos em primeiro plano
const params = new URLSearchParams(location.search);
const num = (k, d) => (params.has(k) && Number.isFinite(+params.get(k)) ? +params.get(k) : d);
const FOV = num("fov", 46);
const CAM_SIDE = num("lado", -3);
const CAM_H = num("altura", 5.1);
const FOREGROUND = num("frente", 1) !== 0;
const VISIBLE_H = 15; // altura do mundo visível (o 2D mostrava ≈ 18)
const MIN_VISIBLE_W = 24;
const PLATFORM_DEPTH = 4.6;

export function createScene3D(canvas, wrap, g) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1.7, 0.5, 400);
  scene.fog = new THREE.Fog("#e8e5c9", 22, 95);

  const hemi = new THREE.HemisphereLight("#cfd3c4", "#8c8468", 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#e6dcc0", 0.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 18, bottom: -10, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  // Materiais que mudam com o progresso da restauração.
  const grassMat = new THREE.MeshLambertMaterial();
  const hillFar = new THREE.MeshBasicMaterial({ fog: false });
  const hillNear = new THREE.MeshLambertMaterial();
  const sunMat = new THREE.MeshBasicMaterial({ fog: false });
  const bushMat = new THREE.MeshLambertMaterial();
  const cloudMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, fog: false, depthWrite: false });

  let root = null;
  let cache = {};
  let dyn = {};
  let skyProgress = "";
  let lastNow = 0;
  let aspect = 1.7;
  let camDist = 24;
  let camX = 0;

  function resize() {
    const r = wrap.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(r.width, r.height, false);
    aspect = r.width / r.height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // Em telas estreitas aumenta a altura visível para manter ~26 unidades de largura.
    const visibleH = Math.max(VISIBLE_H, MIN_VISIBLE_W / aspect);
    camDist = visibleH / (2 * Math.tan((FOV * Math.PI) / 360));
  }
  addEventListener("resize", resize);
  resize();

  const X = (px) => px / U;
  const Y = (py) => (g.level.ground - py) / U;

  // ------------------------------------------------------------ construção
  const STORM_SKY = ["#5f7384", "#8d9ca6", "#7d8a8f"];
  function setSky(progress, storm = 0) {
    const key = `${progress}|${storm}`;
    if (key === skyProgress) return;
    skyProgress = key;
    // Mistura com o tom de tempestade (storm 0..1).
    const mix = (a, b, i) => new THREE.Color(lerpHex(a, b, progress)).lerp(new THREE.Color(STORM_SKY[i]), storm * 0.85).getStyle();
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 256;
    const x = c.getContext("2d");
    const grad = x.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, mix("#b8d9d0", "#7ec8e3", 0));
    grad.addColorStop(0.72, mix("#e8e5c9", "#d6f3e4", 1));
    grad.addColorStop(1, mix("#d3cda9", "#bce3c5", 2));
    x.fillStyle = grad;
    x.fillRect(0, 0, 4, 256);
    scene.background?.dispose?.();
    scene.background = new THREE.CanvasTexture(c);
    scene.background.colorSpace = THREE.SRGBColorSpace;
    scene.fog.color.set(mix("#e8e5c9", "#d6f3e4", 1));
    grassMat.color.set(lerpHex("#a6a16f", "#64a95c", progress));
    hillFar.color.set(lerpHex("#b4cbb0", "#86c58b", progress));
    hillNear.color.set(lerpHex("#a8c4a5", "#6eb875", progress));
    sunMat.color.set(lerpHex("#f6e9a9", "#fff3a1", progress));
    cloudMat.color.set(lerpHex("#dce8d9", "#ffffff", progress));
    bushMat.color.set(lerpHex("#6b6f55", "#4f9857", progress));
    // Luz: cinza e baixa na cidade poluída, quente e viva na cidade restaurada.
    hemi.color.set(lerpHex("#cfd3c4", "#fffbea", progress));
    hemi.groundColor.set(lerpHex("#8c8468", "#b9a97a", progress));
    hemi.intensity = (1.05 + 0.5 * progress) * (1 - 0.3 * storm);
    sun.color.set(lerpHex("#e6dcc0", "#fff0c2", progress));
    sun.intensity = (0.6 + 0.6 * progress) * (1 - 0.5 * storm);
  }

  function hills(width, z, material, base, amp, seed) {
    const geo = new THREE.PlaneGeometry(width, 16, Math.ceil(width / 2), 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) {
        const x = pos.getX(i);
        pos.setY(i, base + Math.sin(x * 0.045 + seed) * amp + Math.sin(x * 0.13 + seed * 2) * amp * 0.35);
      } else pos.setY(i, -8);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material);
    m.position.set(width / 2 - 70, 0, z);
    return m;
  }

  function buildings(parent, decor) {
    const wins = [];
    decor.forEach((d, i) => {
      if (d.type !== "building") return;
      const w = d.bw / U;
      const h = (d.bh * 0.58) / U;
      const z = -7 - (i % 3) * 3.2;
      const b = box(["#879c96", "#91a49c", "#7e928c"][d.tint], [w, h, 2.8], [X(d.x) + w / 2, h / 2, z]);
      parent.add(b);
      const cols = Math.max(1, Math.floor((w - 0.5) / 0.65));
      for (let r = 0; r < Math.floor((h - 0.9) / 0.85); r++) {
        for (let c = 0; c < cols; c++) {
          wins.push([X(d.x) + 0.3 + (w - 0.6) * ((c + 0.5) / cols), 0.9 + r * 0.85 + 0.3, z + 1.42]);
        }
      }
    });
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.4, 0.05), mat("#c6c9a8", { emissive: "#6b6e4f", emissiveIntensity: 0.35 }), wins.length);
    const m = new THREE.Matrix4();
    wins.forEach((p, i) => inst.setMatrixAt(i, m.makeTranslation(...p)));
    parent.add(inst);
  }

  // Elementos da fase de enchente: ponto alto, bueiros, lixo, moradores, água e chuva.
  function buildFlood(W) {
    const z = g.safeZone;
    if (z) {
      const w = z.w / U;
      root.add(box("#4e9860", [w, 0.2, PLATFORM_DEPTH + 0.2], [X(z.x) + w / 2, Y(z.y) + 0.1, 0]));
      const sign = bannerSprite("PONTO ALTO");
      sign.position.set(X(z.x) + w / 2, Y(z.y) + 1.9, 0);
      root.add(sign);
      root.add(cyl("#596f68", 0.05, 1.5, [X(z.x) + w / 2, Y(z.y) + 0.85, 0]));
    }
    for (const d of g.drains) {
      const m = makeDrain();
      m.position.set(X(d.x), 0, 0);
      m.userData.d = d;
      root.add(m);
      dyn.drains.push(m);
    }
    for (const d of g.debris) {
      const m = makeDebris(d.kind, d.color);
      m.position.set(X(d.x), Y(d.y) - 0.35, 0);
      m.userData.d = d;
      root.add(m);
      dyn.debris.push(m);
    }
    g.residents.forEach((_, i) => {
      const m = makeResident(i);
      root.add(m.root);
      dyn.residents.push(m);
    });

    // Água: volume translúcido + superfície com ondas que acompanha a câmera.
    const waterMat = new THREE.MeshLambertMaterial({ color: "#3880aa", transparent: true, opacity: 0.5, depthWrite: false });
    dyn.waterBody = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), waterMat);
    dyn.waterBody.scale.set(W + 160, 1, 29);
    dyn.waterBody.position.set(W / 2 - 10, 0, -5.5);
    dyn.waterBody.visible = false;
    root.add(dyn.waterBody);
    const sg = new THREE.PlaneGeometry(70, 29, 70, 29);
    sg.rotateX(-Math.PI / 2);
    dyn.waterSurface = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: "#9bd4ee", transparent: true, opacity: 0.8, depthWrite: false }));
    dyn.waterSurface.position.z = -5.5;
    dyn.waterSurface.visible = false;
    root.add(dyn.waterSurface);

    // Chuva: 320 riscos que caem em volta da câmera.
    const N = 320;
    dyn.rain = { n: N, drops: [], geo: new THREE.BufferGeometry() };
    for (let i = 0; i < N; i++) dyn.rain.drops.push({ x: (Math.random() - 0.5) * 40, y: Math.random() * 16, z: -14 + Math.random() * 24 });
    dyn.rain.geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    dyn.rain.lines = new THREE.LineSegments(dyn.rain.geo, new THREE.LineBasicMaterial({ color: "#d6e8f5", transparent: true, opacity: 0.45, fog: false }));
    dyn.rain.lines.frustumCulled = false;
    root.add(dyn.rain.lines);
  }

  function build() {
    if (root) scene.remove(root);
    root = new THREE.Group();
    scene.add(root);
    const L = g.level;
    const W = X(L.width);
    dyn = { seeds: [], trash: [], hazards: [], cps: [], trees: [], chimneys: [], planted: new Map(), clouds: [], particles: [], drains: [], debris: [], residents: [] };

    // Chão: terra + faixa de grama.
    root.add(box("#786f5b", [W + 160, 8, 29], [W / 2 - 10, -4, -5.5], { outline: false }));
    // Calçada (pista do jogador, z ≈ -1.8..1.8) com meio-fio e faixas.
    root.add(box("#b9b393", [W + 160, 0.14, 4.6], [W / 2 - 10, 0.02, 0.0], { outline: false }));
    root.add(box("#8e8a72", [W + 160, 0.2, 0.2], [W / 2 - 10, 0.04, 2.35], { outline: false }));
    root.add(box("#8e8a72", [W + 160, 0.2, 0.2], [W / 2 - 10, 0.04, -2.35], { outline: false }));
    for (let x = -4; x < W + 20; x += 2.4) root.add(box("#9d9879", [1.2, 0.03, 0.12], [x, 0.1, 0.0], { outline: false }));
    const grass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), grassMat);
    grass.scale.set(W + 160, 0.3, 29);
    grass.position.set(W / 2 - 10, -0.1, -5.5);
    grass.receiveShadow = true;
    root.add(grass);

    root.add(hills(W + 220, -62, hillFar, 3.5, 1.6, 1.0));
    root.add(hills(W + 200, -40, hillNear, 2.2, 1.4, 3.7));

    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 16), sunMat);
    root.add(sunMesh);
    dyn.sun = sunMesh;

    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      [[0, 0, 1.5], [1.7, 0.4, 1.9], [3.4, 0, 1.4]].forEach(([x, y, r]) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), cloudMat);
        s.position.set(x, y, 0);
        c.add(s);
      });
      c.position.set((i / 9) * (W + 80) - 30, 11 + (i % 3) * 2.2, -48 - (i % 2) * 8);
      c.userData.speed = 0.15 + (i % 3) * 0.05;
      root.add(c);
      dyn.clouds.push(c);
    }

    buildings(root, g.decor);

    // Primeiro plano: arbustos e postes entre a câmera e o jogador criam paralaxe.
    if (FOREGROUND) {
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let x = -6; x < W + 20; x += 4 + rnd() * 5) {
        const s = 0.3 + rnd() * 0.35;
        const b = new THREE.Group();
        b.add(sphere("#6b6f55", s, [0, s * 0.7, 0], {}));
        b.add(sphere("#7d8264", s * 0.7, [s * 0.8, s * 0.5, 0.2], {}));
        b.position.set(x, 0, 6 + rnd() * 2.5);
        b.traverse((o) => o.isMesh && o.material.side !== THREE.BackSide && (o.material = bushMat));
        root.add(b);
      }
      for (let x = 22; x < W + 20; x += 42 + rnd() * 14) {
        const pole = new THREE.Group();
        pole.add(cyl("#4a3f33", 0.09, 9, [0, 4.5, 0]));
        pole.add(box("#4a3f33", [1.6, 0.12, 0.12], [0, 8.2, 0]));
        pole.position.set(x, 0, 12.5);
        root.add(pole);
      }
    }

    for (const d of g.decor) {
      if (d.type === "deadTree") {
        const dead = makeDeadTree();
        const green = makeGreenTree();
        const z = -2.6 - (d.treeId % 2) * 1.2;
        dead.position.set(X(d.x), 0, z);
        green.position.set(X(d.x), 0, z);
        green.visible = false;
        root.add(dead, green);
        dyn.trees.push({ id: d.treeId, dead, green });
      } else if (d.type === "greenTree") {
        const t = makeGreenTree();
        t.position.set(X(d.x), 0, -2.2);
        root.add(t);
      } else if (d.type === "lamp") {
        const l = makeLamp();
        l.position.set(X(d.x), 0, -2.4);
        root.add(l);
      }
    }
    for (let x = 220; x < L.width; x += 620) {
      const c = makeChimney();
      c.position.set(X(x), 0, -12);
      root.add(c);
      dyn.chimneys.push(c);
    }

    // Plataformas: bloco + "tampa" mais clara.
    for (const p of g.platforms) {
      const step = p.type === "step";
      const w = p.w / U;
      const h = p.h / U;
      const cx = X(p.x) + w / 2;
      const top = Y(p.y);
      root.add(box(step ? "#a7a17a" : "#777f75", [w, h, PLATFORM_DEPTH], [cx, top - h / 2, 0]));
      root.add(box(step ? "#d0c58d" : "#c3b887", [w + 0.04, 0.16, PLATFORM_DEPTH + 0.04], [cx, top - 0.06, 0]));
    }

    for (const cp of g.checkpoints) {
      const f = makeFlag();
      f.position.set(X(cp.x), 0, 0);
      root.add(f);
      dyn.cps.push({ cp, flag: f });
    }
    dyn.finish = makeFlag(3.1, 1.6);
    dyn.finish.position.set(X(L.width - L.finishOffset), 0, 0);
    const finishPad = box("#4e9860", [2.5, 0.12, 1.6], [X(L.width - L.finishOffset) + 0.7, 0.06, 0]);
    dyn.finish.visible = finishPad.visible = !g.flood;
    root.add(dyn.finish, finishPad);

    if (g.flood) buildFlood(W);

    for (const h of g.hazards) {
      let m;
      if (h.type === "bin") m = makeBin();
      else if (h.type === "vent") m = makeVent();
      else m = makeSmog();
      m.userData.h = h;
      m.userData.baseX = X(h.x);
      m.position.set(X(h.x), h.type === "vent" ? 0 : Y(h.y), 0);
      if (h.type === "bin") m.position.y = Y(h.y);
      root.add(m);
      dyn.hazards.push(m);
    }
    for (const s of g.seeds) {
      const m = makeSeed();
      m.userData.s = s;
      root.add(m);
      dyn.seeds.push(m);
    }
    for (const t of g.trash ?? []) {
      const m = makeTrash(t.type);
      m.userData.t = t;
      root.add(m);
      dyn.trash.push(m);
    }

    dyn.player = makePlayer();
    root.add(dyn.player.root);

    for (let i = 0; i < 80; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial());
      p.visible = false;
      root.add(p);
      dyn.particles.push(p);
    }

    cache = { seeds: g.seeds, decor: g.decor, platforms: g.platforms, level: g.level };
    skyProgress = "";
  }

  // ------------------------------------------------------------ quadro
  function render() {
    if (cache.seeds !== g.seeds || cache.decor !== g.decor || cache.level !== g.level) build();
    const now = performance.now() / 1000;
    const dt = Math.min(Math.max(now - lastNow, 0.001), 0.05);
    lastNow = now;
    const L = g.level;
    const progress = g.seedGoal ? clamp(g.collected / g.seedGoal, 0, 1) : 0;
    const f = g.flood;
    const storm = f ? Math.round((0.45 + 0.55 * (f.h / f.cfg.maxHeight)) * 8) / 8 : 0;
    setSky(Math.round(progress * 13) / 13, storm);

    // Jogador.
    const p = g.player;
    const pl = dyn.player;
    pl.root.position.set(X(p.x + p.w / 2), Y(p.y + p.h), 0);
    pl.root.visible = !(p.inv > 0 && Math.floor(now * 11) % 2 === 0);
    animatePerson(pl, { onGround: p.onGround, vx: p.vx, vy: p.vy, walk: p.walk, face: p.face, now, dt });

    // Sementes e lixo reciclável.
    for (const m of dyn.seeds) {
      const s = m.userData.s;
      m.visible = !s.got;
      m.position.set(X(s.x), Y(s.y) + Math.sin(now * 3 + s.t) * 0.14, 0);
      m.rotation.y = now * 1.8 + s.t;
    }
    for (const m of dyn.trash) {
      const t = m.userData.t;
      m.visible = !t.got;
      m.position.set(X(t.x), Y(t.y) + Math.sin(now * 3 + t.t) * 0.1, 0);
      m.rotation.y = now * 1.2 + t.t;
    }

    // Perigos.
    for (const m of dyn.hazards) {
      const h = m.userData.h;
      if (h.type === "vent") {
        m.position.x = m.userData.baseX;
        updateVent(m, ventState(h), now);
      } else if (h.type !== "bin") {
        const bob = Math.sin(now * 2.4 + h.phase) * 0.12;
        m.position.y = Y(h.y) + bob;
        for (const pf of m.userData.puffs) {
          const d = pf.userData;
          const k = 1 + Math.sin(now * 3.1 + d.phase) * 0.08;
          pf.scale.setScalar(d.r * k);
          pf.position.set(d.x + Math.sin(now * 2.2 + d.phase) * 0.12, d.y + Math.sin(now * 3 + d.phase) * 0.06, 0);
        }
      }
    }

    // Fase de enchente: bueiros, lixo, moradores, água e chuva.
    if (f) {
      for (const m of dyn.drains) {
        const d = m.userData.d;
        m.userData.clog.visible = d.clogged;
        m.userData.clog.userData.warn.position.y = 1.5 + Math.sin(now * 7) * 0.07;
      }
      for (const m of dyn.debris) m.visible = !m.userData.d.got;
      g.residents.forEach((r, i) => {
        const m = dyn.residents[i];
        if (!m) return;
        const carried = r.state === "carried";
        m.root.visible = r.state !== "lost";
        m.root.position.set(X(r.x + r.w / 2), Y(r.y + r.h), 0);
        animatePerson(m, {
          onGround: true,
          vx: carried ? p.vx : 0,
          walk: carried ? p.walk : 0,
          vy: 0,
          face: carried ? p.face : p.x > r.x ? 1 : -1,
          waving: r.state === "waiting" || r.state === "safe",
          now,
          dt,
        });
        m.alert.visible = r.danger && r.state === "waiting";
        m.alert.position.y = 2.5 + Math.sin(now * 8) * 0.08;
      });
      const hh = f.h / U;
      dyn.waterBody.visible = dyn.waterSurface.visible = hh > 0.02;
      dyn.waterBody.scale.y = Math.max(hh, 0.001);
      dyn.waterBody.position.y = hh / 2;
      dyn.waterSurface.position.x = camX;
      dyn.waterSurface.position.y = hh + 0.01;
      const sp = dyn.waterSurface.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        const wx = sp.getX(i) + camX;
        sp.setY(i, Math.sin(wx * 0.8 + now * 2.4) * 0.07 + Math.sin(sp.getZ(i) * 0.7 + now * 1.7) * 0.05);
      }
      sp.needsUpdate = true;
      const rp = dyn.rain.geo.attributes.position;
      dyn.rain.drops.forEach((d, i) => {
        d.y -= 17 * dt;
        if (d.y < 0) d.y += 16;
        const x = camX + d.x;
        rp.setXYZ(i * 2, x, d.y, d.z);
        rp.setXYZ(i * 2 + 1, x - 0.08, d.y + 0.55, d.z);
      });
      rp.needsUpdate = true;
    }

    // Bandeiras.
    for (const { cp, flag } of dyn.cps) flag.userData.cloth.material = mat(cp.reached ? "#8bbf50" : "#9aa59c");
    dyn.finish.userData.cloth.material = mat(g.collected >= g.seedGoal ? "#4d9b63" : "#9aa89e");

    // Restauração: árvores secas viram verdes, fumaça das chaminés some.
    const restored = Math.floor(g.deadTrees * progress);
    for (const t of dyn.trees) {
      const on = t.id < restored;
      t.green.visible = on;
      t.dead.visible = !on;
    }
    const smoke = clamp(1 - progress * 1.15, 0, 1);
    for (const c of dyn.chimneys) {
      c.userData.puffs.forEach((pf, i) => {
        pf.visible = smoke > 0.02;
        pf.material.opacity = 0.32 * smoke;
        pf.position.y = 6.2 + i * 0.7 + Math.sin(now * 0.8 + i) * 0.15;
      });
    }
    // Árvores plantadas ao coletar sementes.
    for (const pt of g.planted ?? []) {
      let t = dyn.planted.get(pt);
      if (!t) {
        t = makeGreenTree();
        t.position.set(X(pt.x), 0, 1.6);
        root.add(t);
        dyn.planted.set(pt, t);
      }
      t.scale.setScalar(Math.min(1, 0.25 + (pt.age / 1.5) * 0.75));
    }

    // Partículas do jogo 2D (g.particles) viram esferas pequenas.
    dyn.particles.forEach((m, i) => {
      const q = g.particles[i];
      m.visible = Boolean(q);
      if (!q) return;
      m.position.set(X(q.x), Y(q.y), 0.6);
      m.scale.setScalar((q.r / U) * 1.6);
      m.material.color.set(q.color);
    });

    // Nuvens e sol acompanham a câmera com paralaxe.
    for (const c of dyn.clouds) {
      c.position.x += c.userData.speed * 0.016;
      if (c.position.x > X(L.width) + 50) c.position.x = -40;
    }

    // Névoa piora com o ar poluído.
    const air = g.air ?? 100;
    scene.fog.far = 60 + clamp(air, 0, 100) * 0.4;
    scene.fog.near = 14 + clamp(air, 0, 100) * 0.12;

    // Câmera lateral que segue o jogador.
    const px = X(p.x + p.w / 2);
    const minX = Math.min(X(L.width) / 2, 11);
    const maxX = Math.max(X(L.width) / 2, X(L.width) - 11);
    camX += (clamp(px + 2.6, minX, maxX) - camX) * 0.12;
    const shake = g.shake > 0 ? g.shake * 0.8 : 0;
    camera.position.set(camX + CAM_SIDE + (Math.random() - 0.5) * shake, CAM_H + (Math.random() - 0.5) * shake, camDist);
    camera.lookAt(window.__lookX ?? camX, window.__lookY ?? 4.0, 0);
    dyn.sun.position.set(camX + 11, 12, -75);

    sun.position.set(px + 12, 24, 14);
    sun.target.position.set(px, 0, 0);

    renderer.render(scene, camera);
  }

  build();
  camX = X(g.player.x) + 2.6;
  return { render, renderer, scene, camera };
}
