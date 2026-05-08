# ¿Qué diría tu mamá? 🎮

Family Feud-style party game in Spanish — Colombian context.

## How to run

1. Make sure Docker Desktop is running
2. In this folder, run:
   ```
   docker-compose up --build
   ```
3. Open in browser:
   - **Game board** (for participants / projector): http://localhost:3000
   - **Host panel** (for you): http://localhost:3000/host
4. To stop: `Ctrl+C`, then `docker-compose down`

## How to play

1. Open the **host panel** on your laptop.
2. Open the **game board** on the projector/TV (or share your screen).
3. Set team names in the host panel and click **Aplicar Nombres**.
4. The host reads the question out loud. Players guess answers.
5. When a correct answer is given, click **Revelar** next to it in the host panel — it flips on the board.
6. Wrong answers → click **Agregar Strike** (3 strikes = turn ends).
7. Use **Siguiente Equipo** to pass the turn (resets strikes).
8. Use **Siguiente Pregunta** to advance after a round.
9. Use **Reset Juego** to start over completely.

## File structure

```
/Dockerfile
/docker-compose.yml
/.dockerignore
/README.md
/package.json
/server.js              — Express + WebSocket server, game state
/public/
  index.html            — Game board
  host.html             — Host panel
  game.js               — Shared WebSocket client
  board.js              — Game board rendering + sounds
  host.js               — Host panel logic
  style.css             — Shared CSS variables + reset
  board.css             — Game board dark theme + animations
  host.css              — Host panel functional styles
```
