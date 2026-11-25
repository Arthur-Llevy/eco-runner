// Ponto de entrada: liga motor, entrada, fase e interface.
import { createViewport } from "./engine/canvas.js";
import { createInput } from "./engine/input.js";
import { startLoop } from "./engine/loop.js";
import { loadLevel, LEVELS } from "./levels/loader.js";
import { createGame } from "./game.js";
import { onAction } from "./ui/overlay.js";

const view = createViewport(document.getElementById("game"), document.getElementById("game-wrap"));
let game = null;
const input = createInput({ onStart: () => game?.start() });

const requested = new URLSearchParams(location.search).get("fase");
game = createGame(view, input, await loadLevel(LEVELS.includes(requested) ? requested : LEVELS[0]));
onAction(() => game.start());
startLoop(game.update, game.render);

// Exposto para depuração no console.
window.ecoRunner = game;
