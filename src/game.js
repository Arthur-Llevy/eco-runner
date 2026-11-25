import { clamp } from "./engine/math.js";
import { createPlayer, resetPlayer, updatePlayer, drawPlayer } from "./entities/player.js";
import { createSeed, touchesSeed, drawSeed } from "./entities/seed.js";
import { createHazard, touchesHazard, drawHazard } from "./entities/hazard.js";
import { createPlatform, drawPlatform } from "./entities/platform.js";
import { createTrash, touchesTrash, drawTrash, TRASH_TYPES } from "./entities/trash.js";
import { burst, updateParticles, drawParticles } from "./entities/particles.js";
import {
  generateDecor, drawBackground, drawDecor, drawPlanted, drawGround, drawCheckpoint, drawFinish,
} from "./render/scenery.js";
import { updateHUD, drawProgress, drawAirMeter, drawTrashCounts } from "./ui/hud.js";
import { say, updateToast } from "./ui/toast.js";
import { showOverlay, hideOverlay } from "./ui/overlay.js";

const START_LIVES = 3;
const KNOCKBACK = 170;
const INVULNERABLE_TIME = 1.5;

// Qualidade do ar (0-100): piora perto da fumaça, melhora ao plantar e reciclar.
const AIR_START = 60;
const AIR_LOW = 25;
const SMOG_RADIUS = 150;
const SMOG_DRAIN = 14; // pontos por segundo, no centro da nuvem
const TREE_AIR = 6;
const TRASH_AIR = 2;
const LOW_AIR_SPEED = 0.8;

// Estado de uma partida e regras do jogo, a partir dos dados de uma fase.
export function createGame(view, input, levelData) {
  const g = {
    state: "menu",
    level: levelData,
    player: createPlayer(),
    camera: 0,
    platforms: [],
    seeds: [],
    trash: [],
    trashCount: {},
    planted: [],
    air: AIR_START,
    airWarned: false,
    hazards: [],
    decor: [],
    particles: [],
    checkpoints: [],
    checkpoint: 0,
    collected: 0,
    seedGoal: 0,
    lives: START_LIVES,
    score: 0,
    finishHintCooldown: 0,
  };

  // Largura visível em coordenadas do mundo (o canvas é escalado por view.scale).
  const viewW = () => view.W / view.scale;
  const viewH = () => view.H / view.scale;

  function build() {
    const L = g.level;
    g.platforms = L.platforms.map(createPlatform);
    g.seeds = L.seeds.map(createSeed);
    g.trash = (L.trash ?? []).map(createTrash);
    g.trashCount = Object.fromEntries(Object.keys(TRASH_TYPES).map((t) => [t, 0]));
    g.planted = [];
    g.air = AIR_START;
    g.airWarned = false;
    g.hazards = L.hazards.map((h) => createHazard(h, L.ground));
    g.decor = generateDecor(L);
    g.particles = [];
    g.checkpoints = (L.checkpoints ?? []).map((x) => ({ x, reached: false }));
    g.checkpoint = L.spawnX;
    g.collected = 0;
    g.seedGoal = L.seedGoal ?? g.seeds.length;
    g.lives = START_LIVES;
    g.score = 0;
    g.camera = 0;
    resetPlayer(g.player, L.spawnX, L.ground);
    updateHUD(g);
  }

  function start() {
    if (g.state === "playing") return;
    build();
    g.state = "playing";
    hideOverlay();
    say("Encontre as sementes e ajude a cidade!");
  }

  function hit() {
    const p = g.player;
    if (p.inv > 0) return;
    g.lives--;
    updateHUD(g);
    if (g.lives <= 0) {
      g.state = "over";
      showOverlay(
        ["FIM DE", "JOGO."],
        "A cidade ainda precisa da sua ajuda. Tente novamente e recolha as sementes para recuperar o parque.",
        "TENTAR DE NOVO",
      );
      return;
    }
    p.x = Math.max(g.checkpoint, p.x - KNOCKBACK);
    p.y = g.level.ground - p.h;
    p.vy = 0;
    p.inv = INVULNERABLE_TIME;
    say("Cuidado! Você perdeu uma vida.");
  }

  function changeAir(delta) {
    g.air = clamp(g.air + delta, 0, 100);
    if (g.air >= AIR_LOW) g.airWarned = false;
  }

  // A fumaça polui o ar enquanto o jogador está por perto.
  function updateAir(dt) {
    const p = g.player;
    const cx = p.x + p.w / 2;
    let drain = 0;
    for (const h of g.hazards) {
      if (h.type !== "smog") continue;
      const d = Math.abs(h.x - cx);
      if (d < SMOG_RADIUS) drain += SMOG_DRAIN * (1 - d / SMOG_RADIUS);
    }
    if (drain > 0) changeAir(-drain * dt);
    if (g.air < AIR_LOW && !g.airWarned) {
      g.airWarned = true;
      say("😷 Ar muito poluído! Plante árvores para respirar melhor.");
    }
  }

  function finish() {
    g.state = "won";
    showOverlay(
      ["CIDADE", "RENOVADA!"],
      "Você recuperou o parque e mostrou que pequenas atitudes ajudam a construir cidades mais sustentáveis. A ODS 11 começa com todos nós.",
      "JOGAR NOVAMENTE",
    );
  }

  function update(dt) {
    if (g.state !== "playing") return;
    const p = g.player;
    const L = g.level;
    p.speedMul = g.air < AIR_LOW ? LOW_AIR_SPEED : 1;
    updatePlayer(p, dt, input, L);

    for (const s of g.seeds) {
      if (!touchesSeed(s, p)) continue;
      s.got = true;
      g.collected++;
      g.score += 100;
      updateHUD(g);
      burst(g.particles, s.x, s.y);
      g.planted.push({ x: s.x, age: 0 });
      changeAir(TREE_AIR);
      say(
        g.collected === g.seedGoal
          ? "🌳 Todas as sementes! Corra até a bandeira."
          : "+100 pontos · Semente coletada!",
      );
    }

    for (const t of g.trash) {
      if (!touchesTrash(t, p)) continue;
      t.got = true;
      g.trashCount[t.type]++;
      g.score += 50;
      updateHUD(g);
      changeAir(TRASH_AIR);
      burst(g.particles, t.x, t.y, TRASH_TYPES[t.type].color, 7);
      say(`♻ ${TRASH_TYPES[t.type].label} na lixeira certa! +50`);
    }

    updateAir(dt);
    for (const tr of g.planted) tr.age += dt;

    if (p.inv <= 0 && g.hazards.some((h) => touchesHazard(h, p))) hit();
    if (g.state !== "playing") return;

    for (const cp of g.checkpoints) {
      if (!cp.reached && p.x >= cp.x) {
        cp.reached = true;
        g.checkpoint = Math.max(g.checkpoint, cp.x);
        say("🚩 Checkpoint salvo!");
      }
    }

    g.particles = updateParticles(g.particles, dt);

    g.finishHintCooldown = Math.max(0, g.finishHintCooldown - dt);
    if (p.x > L.width - 100) {
      if (g.collected >= g.seedGoal) finish();
      else if (g.finishHintCooldown === 0) {
        const left = g.seedGoal - g.collected;
        say(`Faltam ${left} semente${left > 1 ? "s" : ""} para restaurar o parque.`);
        g.finishHintCooldown = 3;
      }
    }

    g.camera = clamp(p.x - viewW() * 0.34, 0, Math.max(0, L.width - viewW()));
    updateToast(dt);
  }

  function render() {
    const ctx = view.ctx;
    ctx.clearRect(0, 0, view.W, view.H);
    ctx.save();
    ctx.scale(view.scale, view.scale);
    const scene = { camera: g.camera, viewW: viewW(), viewH: viewH(), level: g.level, decor: g.decor };
    drawBackground(ctx, scene);
    drawDecor(ctx, scene);
    drawGround(ctx, scene);
    for (const pl of g.platforms) drawPlatform(ctx, pl, g.camera, scene.viewW);
    for (const cp of g.checkpoints) drawCheckpoint(ctx, cp.x, cp.reached, scene);
    for (const h of g.hazards) drawHazard(ctx, h, g.camera, scene.viewW);
    drawPlanted(ctx, g.planted, scene);
    for (const t of g.trash) drawTrash(ctx, t, g.camera, scene.viewW);
    for (const s of g.seeds) drawSeed(ctx, s, g.camera, scene.viewW);
    drawParticles(ctx, g.particles, g.camera);
    drawFinish(ctx, scene);
    drawPlayer(ctx, g.player, g.camera);
    // Névoa de poluição: aparece quando o ar fica abaixo de 55%.
    const haze = Math.max(0, (55 - g.air) / 55) * 0.4;
    if (haze > 0) {
      ctx.fillStyle = `rgba(112, 98, 66, ${haze})`;
      ctx.fillRect(0, 0, scene.viewW, scene.viewH);
    }
    drawProgress(ctx, scene.viewW, g.collected, g.seedGoal);
    drawAirMeter(ctx, scene.viewW, g.air);
    drawTrashCounts(ctx, scene.viewW, g.trashCount);
    ctx.restore();
  }

  build();
  return { start, update, render, state: g };
}
