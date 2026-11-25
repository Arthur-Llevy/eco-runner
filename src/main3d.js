// Protótipo 2.5D: mesmas regras do jogo 2D (game.js), desenho em 3D (Three.js).
// A tela 2D (#game) vira uma camada transparente só para os medidores do HUD.
import { createViewport } from "./engine/canvas.js";
import { createInput } from "./engine/input.js";
import { startLoop } from "./engine/loop.js";
import { loadLevel } from "./levels/loader.js";
import { createGame } from "./game.js";
import { onAction } from "./ui/overlay.js";
import { ensureAudio, toggleMute } from "./engine/audio.js";
import { drawProgress, drawAirMeter, drawTrashCounts } from "./ui/hud.js";
import { createScene3D } from "./three/scene3d.js";

const wrap = document.getElementById("game-wrap");
const view = createViewport(document.getElementById("game"), wrap);
let game = null;
const input = createInput({ onStart: () => game?.start() });

// Protótipo: só a fase 1 (sem "próxima fase", que seria a enchente 2D).
const level = await loadLevel("fase-1");
level.next = null;
game = createGame(view, input, level);
const g = game.state;
const scene3d = createScene3D(document.getElementById("game3d"), wrap, g);

onAction(() => game.start());
addEventListener("pointerdown", ensureAudio);
addEventListener("keydown", ensureAudio);
document.getElementById("btn-mute").addEventListener("click", (e) => {
  e.currentTarget.textContent = toggleMute() ? "🔇" : "🔊";
});
document.getElementById("btn-restart").addEventListener("click", () => game.restart());

function render() {
  scene3d.render();
  const ctx = view.ctx;
  ctx.clearRect(0, 0, view.W, view.H);
  ctx.save();
  ctx.scale(view.scale, view.scale);
  const viewW = view.W / view.scale;
  drawProgress(ctx, viewW, g.collected, g.seedGoal);
  drawAirMeter(ctx, viewW, g.air);
  drawTrashCounts(ctx, viewW, g.trashCount);
  ctx.restore();
}

startLoop(game.update, render);
window.ecoRunner = game;
window.scene3d = scene3d;
