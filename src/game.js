import { clamp } from "./engine/math.js";
import { createPlayer, resetPlayer, updatePlayer, drawPlayer } from "./entities/player.js";
import { createSeed, touchesSeed, drawSeed } from "./entities/seed.js";
import { createHazard, touchesHazard, drawHazard } from "./entities/hazard.js";
import { createPlatform, drawPlatform } from "./entities/platform.js";
import { burst, updateParticles, drawParticles } from "./entities/particles.js";
import {
  generateDecor, drawBackground, drawDecor, drawGround, drawCheckpoint, drawFinish,
} from "./render/scenery.js";
import { updateHUD, drawProgress } from "./ui/hud.js";
import { say, updateToast } from "./ui/toast.js";
import { showOverlay, hideOverlay, setIntro } from "./ui/overlay.js";
import { hideAlert } from "./ui/alert.js";
import { loadLevel, LEVELS } from "./levels/loader.js";
import { initFlood, updateFlood, onFloodHit, drawFloodWorld, drawFloodOverlay, drawFloodHud } from "./flood.js";

const START_LIVES = 3;
const KNOCKBACK = 170;
const INVULNERABLE_TIME = 1.5;

// Estado de uma partida e regras do jogo, a partir dos dados de uma fase.
export function createGame(view, input, levelData) {
  const g = {
    state: "menu",
    level: levelData,
    player: createPlayer(),
    camera: 0,
    platforms: [],
    seeds: [],
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
    initFlood(g, L);
    setIntro(L.intro);
    resetPlayer(g.player, L.spawnX, L.ground);
    updateHUD(g);
  }

  let starting = false;

  // Depois de vencer, o botão leva à próxima fase (ou volta à primeira).
  async function start() {
    if (g.state === "playing" || starting) return;
    starting = true;
    try {
      if (g.state === "won") g.level = await loadLevel(g.level.next ?? LEVELS[0]);
      build();
      g.state = "playing";
      hideOverlay();
      say(g.flood ? "Alerta de enchente! Limpe os bueiros e ache os moradores." : "Encontre as sementes e ajude a cidade!");
    } finally {
      starting = false;
    }
  }

  function hit() {
    const p = g.player;
    if (p.inv > 0) return;
    g.lives--;
    updateHUD(g);
    if (g.lives <= 0) {
      g.state = "over";
      hideAlert();
      showOverlay(
        ["FIM DE", "JOGO."],
        "A cidade ainda precisa da sua ajuda. Tente novamente e recolha as sementes para recuperar o parque.",
        "TENTAR DE NOVO",
      );
      return;
    }
    onFloodHit(g);
    p.x = Math.max(g.checkpoint, p.x - KNOCKBACK);
    p.y = g.level.ground - p.h;
    p.vy = 0;
    p.inv = INVULNERABLE_TIME;
    say("Cuidado! Você perdeu uma vida.");
  }

  function finish() {
    g.state = "won";
    showOverlay(
      ["CIDADE", "RENOVADA!"],
      "Você recuperou o parque e mostrou que pequenas atitudes ajudam a construir cidades mais sustentáveis. A ODS 11 começa com todos nós.",
      g.level.next ? "PRÓXIMA FASE" : "JOGAR NOVAMENTE",
    );
  }

  function floodWin(rescued, total) {
    g.state = "won";
    showOverlay(
      ["BAIRRO", "A SALVO!"],
      `Você resgatou ${rescued} de ${total} moradores. Cidades resilientes precisam de alerta, drenagem limpa e solidariedade (ODS 11.5).`,
      g.level.next ? "PRÓXIMA FASE" : "JOGAR NOVAMENTE",
    );
  }

  function floodLose() {
    g.state = "over";
    showOverlay(
      ["A ÁGUA", "VENCEU."],
      "Moradores demais ficaram para trás. Limpe os bueiros para a água subir mais devagar e leve todos ao ponto alto a tempo.",
      "TENTAR DE NOVO",
    );
  }

  function update(dt) {
    if (g.state !== "playing") return;
    const p = g.player;
    const L = g.level;
    updatePlayer(p, dt, input, L);

    for (const s of g.seeds) {
      if (!touchesSeed(s, p)) continue;
      s.got = true;
      g.collected++;
      g.score += 100;
      updateHUD(g);
      burst(g.particles, s.x, s.y);
      say(
        g.collected === g.seedGoal
          ? "🌳 Todas as sementes! Corra até a bandeira."
          : "+100 pontos · Semente coletada!",
      );
    }

    if (g.flood) {
      updateFlood(g, dt, { hit, win: floodWin, lose: floodLose });
      if (g.state !== "playing") return;
    }

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
    if (!g.flood && p.x > L.width - 100) {
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
    drawFloodWorld(ctx, g, scene);
    for (const s of g.seeds) drawSeed(ctx, s, g.camera, scene.viewW);
    drawParticles(ctx, g.particles, g.camera);
    if (!g.flood) drawFinish(ctx, scene);
    drawPlayer(ctx, g.player, g.camera);
    drawFloodOverlay(ctx, g, scene);
    if (g.flood) drawFloodHud(ctx, scene.viewW, g);
    else drawProgress(ctx, scene.viewW, g.collected, g.seedGoal);
    ctx.restore();
  }

  build();
  return { start, update, render, state: g };
}
