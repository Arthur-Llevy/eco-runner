# Eco Runner

Jogo de plataforma 2D sobre a ODS 11 (cidades sustentáveis), em HTML, CSS e JavaScript Canvas, sem dependências.

## Como rodar

O jogo usa módulos ES e carrega as fases em JSON, então precisa ser servido por HTTP (abrir o `index.html` direto como arquivo não funciona):

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```

Para abrir uma fase direto: `http://localhost:8000/?fase=fase-2`.

## Estrutura

```
index.html            casca: marcação do HUD e do menu, carrega src/main.js
src/
  main.js             ponto de entrada: liga motor, entrada, fase e interface
  game.js             estado da partida e regras (sementes, vidas, checkpoints, vitória)
  styles.css
  engine/             canvas/escala, entrada (teclado e toque), laço, utilitários
  entities/           jogador, sementes, perigos, plataformas, partículas
  levels/             fases em JSON + loader
  render/             primitivas de desenho e cenário (fundo, chão, bandeiras)
  ui/                 HUD, toast e overlay do menu
```

## Criando uma fase

Copie `src/levels/fase-1.json` e adicione o id em `LEVELS` (`src/levels/loader.js`). Campos:

- `width`, `ground`, `spawnX`, `finishOffset`, `gardenStartX`
- `platforms`: `{ x, y, w, h, type }` com `type` = `roof` ou `step`
- `seeds`: pares `[x, y]`. A meta da fase é o total de sementes (ou `seedGoal`, se informado)
- `hazards`: `{ x, type }` com `type` = `smog`, `bin` ou `vent` (tubo de vapor que sai do chão em ciclo de 4,2 s e causa dano; `phase` desloca o ciclo; `y` opcional)
- `trash`: `{ x, y, type }` com `type` = `paper` (azul), `plastic` (vermelho), `metal` (amarelo) ou `glass` (verde)
- `flood` (fase de enchente): `{ alertSeconds, baseRise, clogRise, maxHeight, slowdown, drownTime, residentGrace }`, com `drains` (`{ x }`), `debris` (`{ x, y? }`), `residents` (`{ x, y? }`), `rescueGoal` e `safeZone` (`{ x, y, w }`). Bueiro com lixo a menos de 80 px fica entupido e soma `clogRise` px/s à subida da água
- `next`: id da fase seguinte; `intro`: texto do menu
- `checkpoints`: posições x; ao passar por uma, o jogador renasce ali ao perder vida
