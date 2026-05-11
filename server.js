const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/host',   (_req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/podio',  (_req, res) => res.sendFile(path.join(__dirname, 'public', 'podium.html')));

const QUESTIONS = [
  {
    id: 0,
    question: '¿Qué dice una mamá cuando está enojada contigo?',
    answers: [
      { text: 'Espérate que lleguemos a la casa', points: 10 },
      { text: 'Estoy muy decepcionada de ti', points: 8 },
      { text: 'Porque no piensas antes de actuar', points: 6 },
      { text: 'Mira lo que me hiciste hacer', points: 4 },
      { text: 'A usted le falta es más juicio', points: 2 },
    ],
  },
  {
    id: 1,
    question: '¿Qué dice una mamá cuando tiene visitas en casa?',
    answers: [
      { text: 'Ofrezca algo de tomar', points: 10 },
      { text: 'Salúde a la señora', points: 8 },
      { text: 'No moleste que tenemos visita', points: 6 },
      { text: 'Vaya y cámbiese esa ropa', points: 4 },
      { text: 'Haga el favor y compórtese', points: 2 },
    ],
  },
  {
    id: 2,
    question: '¿Qué dice una mamá cuando llegas tarde a la casa?',
    answers: [
      { text: '¿A qué horas es esto de llegar?', points: 10 },
      { text: 'Lo tenía rezando el rosario', points: 8 },
      { text: '¿Por qué no llamó?', points: 6 },
      { text: 'Con usted no se puede contar', points: 4 },
      { text: 'Ese teléfono es de adorno', points: 2 },
    ],
  },
  {
    id: 3,
    question: '¿Qué dice una mamá cuando no quieres comer?',
    answers: [
      { text: 'Hay niños que se mueren de hambre', points: 10 },
      { text: 'Coma o no hay postre', points: 8 },
      { text: '¿Acaso le parece que soy su sirvienta?', points: 6 },
      { text: 'Pruebe aunque sea un poquito', points: 4 },
      { text: 'Si no come no crece', points: 2 },
    ],
  },
  {
    id: 4,
    question: '¿Qué dice una mamá cuando pide algo y no lo haces de inmediato?',
    answers: [
      { text: '¿Cuántas veces le tengo que repetir?', points: 10 },
      { text: 'Voy a contar hasta tres', points: 8 },
      { text: 'No me haga perder la paciencia', points: 6 },
      { text: '¿Qué espera, que le lloren los ojos?', points: 4 },
      { text: '¡Ya!', points: 2 },
    ],
  },
];

function createInitialState() {
  return {
    questions: QUESTIONS,
    currentQuestionIndex: 0,
    revealedAnswers: [],
    strikes: 0,
    teams: [
      { name: 'Equipo 1', score: 0, strikes: 0 },
      { name: 'Equipo 2', score: 0, strikes: 0 },
      { name: 'Equipo 3', score: 0, strikes: 0 },
      { name: 'Equipo 4', score: 0, strikes: 0 },
    ],
    activeTeamIndex: 0,
    celebration: false,
    showPodium: false,
  };
}

let gameState = createInitialState();
let celebrationTimeout = null;

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

function sendState() {
  broadcast({ type: 'STATE_UPDATE', payload: gameState });
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'STATE_UPDATE', payload: gameState }));

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const q = QUESTIONS[gameState.currentQuestionIndex];

    switch (msg.type) {
      case 'REVEAL_ANSWER': {
        const { answerIndex } = msg.payload;
        if (answerIndex >= 0 && answerIndex < q.answers.length &&
            !gameState.revealedAnswers.includes(answerIndex)) {
          gameState.revealedAnswers = [...gameState.revealedAnswers, answerIndex];
          gameState.teams[gameState.activeTeamIndex].score += q.answers[answerIndex].points;
          if (gameState.revealedAnswers.length === q.answers.length) {
            gameState.celebration = true;
            if (celebrationTimeout) clearTimeout(celebrationTimeout);
            celebrationTimeout = setTimeout(() => {
              gameState.celebration = false;
              sendState();
            }, 5000);
          }
        }
        break;
      }
      case 'ADD_STRIKE': {
        const team = gameState.teams[gameState.activeTeamIndex];
        if (team.strikes < 3) team.strikes++;
        break;
      }
      case 'NEXT_TEAM': {
        gameState.activeTeamIndex = (gameState.activeTeamIndex + 1) % gameState.teams.length;
        break;
      }
      case 'SET_ACTIVE_TEAM': {
        const { teamIndex } = msg.payload;
        if (teamIndex >= 0 && teamIndex < gameState.teams.length) {
          gameState.activeTeamIndex = teamIndex;
        }
        break;
      }
      case 'SET_QUESTION': {
        const { questionId } = msg.payload;
        if (questionId >= 0 && questionId < QUESTIONS.length) {
          gameState.currentQuestionIndex = questionId;
          gameState.revealedAnswers = [];
          gameState.teams.forEach(t => { t.strikes = 0; });
          gameState.celebration = false;
          if (celebrationTimeout) { clearTimeout(celebrationTimeout); celebrationTimeout = null; }
        }
        break;
      }
      case 'RESET_ROUND': {
        gameState.revealedAnswers = [];
        gameState.teams.forEach(t => { t.strikes = 0; });
        gameState.celebration = false;
        if (celebrationTimeout) { clearTimeout(celebrationTimeout); celebrationTimeout = null; }
        break;
      }
      case 'NEXT_QUESTION': {
        gameState.currentQuestionIndex = (gameState.currentQuestionIndex + 1) % QUESTIONS.length;
        gameState.revealedAnswers = [];
        gameState.teams.forEach(t => { t.strikes = 0; });
        gameState.celebration = false;
        if (celebrationTimeout) { clearTimeout(celebrationTimeout); celebrationTimeout = null; }
        break;
      }
      case 'SET_TEAMS': {
        const { teams } = msg.payload;
        if (Array.isArray(teams)) {
          gameState.teams = teams.slice(0, 4).map((t, i) => ({
            name: (t.name || '').trim() || `Equipo ${i + 1}`,
            score: gameState.teams[i]?.score ?? 0,
            strikes: gameState.teams[i]?.strikes ?? 0,
          }));
        }
        break;
      }
      case 'ADJUST_SCORE': {
        const { teamIndex, delta } = msg.payload;
        if (teamIndex >= 0 && teamIndex < gameState.teams.length) {
          gameState.teams[teamIndex].score = Math.max(0, gameState.teams[teamIndex].score + delta);
        }
        break;
      }
      case 'SHOW_PODIUM': {
        gameState.showPodium = true;
        break;
      }
      case 'HIDE_PODIUM': {
        gameState.showPodium = false;
        break;
      }
      case 'RESET_GAME': {
        if (celebrationTimeout) { clearTimeout(celebrationTimeout); celebrationTimeout = null; }
        const names = gameState.teams.map(t => t.name);
        gameState = createInitialState();
        gameState.teams = names.map(name => ({ name, score: 0, strikes: 0 }));
        break;
      }
    }

    sendState();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Panel del host en http://localhost:${PORT}/host`);
});
