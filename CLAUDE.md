# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run with Docker (recommended)
docker-compose up --build

# Run directly (Node.js required)
npm start
```

No tests or linter are configured.

## Architecture

This is a single-process Node.js app with no build step and no frontend framework.

**server.js** — Express serves static files from `public/`. All game logic lives here as a single in-memory `gameState` object. A WebSocket server broadcasts `STATE_UPDATE` to all connected clients whenever state changes. There is no persistence; state resets on server restart. Questions are hardcoded in the `QUESTIONS` array at the top of the file.

**WebSocket message flow:**
- Server → clients: `STATE_UPDATE` (full state snapshot, sent after every mutation)
- Client → server: action messages (`REVEAL_ANSWER`, `ADD_STRIKE`, `NEXT_TEAM`, `SET_ACTIVE_TEAM`, `SET_QUESTION`, `RESET_ROUND`, `NEXT_QUESTION`, `SET_TEAMS`, `ADJUST_SCORE`, `SHOW_PODIUM`, `HIDE_PODIUM`, `RESET_GAME`)

**public/game.js** — Shared WebSocket client exposed as `window.Game`. Provides `Game.on(type, fn)` and `Game.send(type, payload)`. Auto-reconnects on disconnect. Both `board.js` and `host.js` import this implicitly via script order in their HTML files.

**Pages:**
- `/` (`index.html` + `board.js`) — Game board for the projector. Renders answer cards with CSS flip animations, strike marks, scoreboard, and celebration overlay with Web Audio API sounds.
- `/host` (`host.html` + `host.js`) — Host control panel. Reveals answers, adds strikes, rotates teams, navigates questions, adjusts scores manually.
- `/podio` (`podium.html` + `podium.js`) — Final podium screen triggered by `SHOW_PODIUM` from the host; the board page auto-redirects to this route when `state.showPodium` is true.

## Adding questions

Edit the `QUESTIONS` array in `server.js`. Each question has an `id`, `question` string, and `answers` array of `{ text, points }` objects (8 answers per question, points 10–3).
