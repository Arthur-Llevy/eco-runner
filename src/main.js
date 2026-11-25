// Ponto de entrada: liga motor, entrada, fase e interface.
import { createViewport } from "./engine/canvas.js";
import { createInput } from "./engine/input.js";
import { startLoop } from "./engine/loop.js";
import { loadLevel, LEVELS } from "./levels/loader.js";
import { createGame } from "./game.js";
import { onAction } from "./ui/overlay.js";
import { ensureAudio, toggleMute } from "./engine/audio.js";

const view = createViewport(document.getElementById("game"), document.getElementById("game-wrap"));
let game = null;
const input = createInput({ onStart: () => game?.start() });

const requested = new URLSearchParams(location.search).get("fase");
game = createGame(view, input, await loadLevel(LEVELS.includes(requested) ? requested : LEVELS[0]));
onAction(() => game.start());

// Navegadores só liberam áudio depois de um gesto do usuário.
addEventListener("pointerdown", ensureAudio);
addEventListener("keydown", ensureAudio);
document.getElementById("btn-mute").addEventListener("click", (e) => {
  e.currentTarget.textContent = toggleMute() ? "🔇" : "🔊";
});
document.getElementById("btn-restart").addEventListener("click", () => game.restart());
startLoop(game.update, game.render);

// Exposto para depuração no console.
window.ecoRunner = game;
