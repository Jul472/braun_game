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
    question: '¿Qué hace una mamá colombiana cuando llegan visitas?',
    answers: [
      { text: 'Ofrecer tinto o comida', points: 10 },
      { text: 'Ponerse a organizar la casa', points: 8 },
      { text: 'Sacar la loza “fina”', points: 6 },
      { text: 'Decir “¿ya comieron?”', points: 4 },
      { text: 'Mandar a saludar', points: 2 },
    ],
  },
  {
    id: 1,
    question: 'Mencione una frase típica de una mamá colombiana cuando está brava',
    answers: [
      { text: '“Mientras usted viva bajo este techo...”', points: 10 },
      { text: '“¿Y si sus amigos se tiran de un puente?”', points: 8 },
      { text: '“En la casa hablamos”', points: 6 },
      { text: '“Donde yo vaya y lo encuentre...”', points: 4 },
      { text: '“En la casa hay sopa”', points: 2 },
    ],
  },
  {
    id: 2,
    question: 'Mencione una comida que prepara una mamá colombiana para una celebración familiar',
    answers: [
      { text: 'Sancocho', points: 10 },
      { text: 'Tamales', points: 8 },
      { text: 'Lechona', points: 6 },
      { text: 'Arroz con pollo', points: 4 },
      { text: 'Ajiaco', points: 2 },
    ],
  },
  {
    id: 3,
    question: 'Mencione un cantante que pone una mamá colombiana para hacer aseo',
    answers: [
      { text: 'Chayanne', points: 10 },
      { text: 'Ricardo Arjona', points: 8 },
      { text: 'Juan Gabriel', points: 6 },
      { text: 'Shakira', points: 4 },
      { text: 'Ana Gabriel', points: 2 },
    ],
  },
  {
    id: 4,
    question: '¿Qué encuentra uno en un tarro de galletas en casa de mamá?',
    answers: [
      { text: 'Hilos y agujas', points: 10 },
      { text: 'Botones', points: 8 },
      { text: 'Monedas', points: 6 },
      { text: 'Recibos viejos', points: 4 },
      { text: 'Medicamentos', points: 2 },
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
