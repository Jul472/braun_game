let prevState = null;
let audioCtx = null;
let audioUnlocked = false;

// ── Audio ──────────────────────────────────────────────────────────────────

function unlockAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume().then(() => {
    if (audioCtx.state === 'running') {
      audioUnlocked = true;
      const btn = document.getElementById('audio-btn');
      if (btn) btn.remove();
    }
  }).catch(() => {});
}

// Intento automático al cargar — funciona en Chrome/localhost si el usuario
// ya visitó la página antes, o si el navegador permite autoplay
window.addEventListener('load', () => {
  unlockAudio();
  // Segundo intento tras un momento, a veces el contexto tarda en iniciar
  setTimeout(unlockAudio, 500);
});

document.addEventListener('click', unlockAudio);
document.addEventListener('keydown', unlockAudio);

function tone(freq, dur, type = 'sine', vol = 0.28, delay = 0) {
  if (!audioUnlocked || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = audioCtx.currentTime + delay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  } catch {}
}

function playReveal() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.25, i * 0.08));
}

function playStrike() {
  tone(180, 0.15, 'sawtooth', 0.35, 0);
  tone(130, 0.4, 'sawtooth', 0.4, 0.12);
  tone(90,  0.5, 'sawtooth', 0.3, 0.28);
}

function playCelebration() {
  const melody = [523, 523, 659, 523, 784, 698, 523, 659, 523, 880, 784];
  melody.forEach((f, i) => tone(f, 0.25, 'sine', 0.3, i * 0.12));
}

// ── Confetti ───────────────────────────────────────────────────────────────

function launchConfetti() {
  const overlay = document.getElementById('celebration-overlay');
  const emojis = ['🎉', '🎊', '⭐', '🌟', '✨', '💛', '🏆', '🥳', '🎈'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = `${Math.random() * 100}%`;
    el.style.fontSize = `${20 + Math.random() * 28}px`;
    const dur = 1.8 + Math.random() * 2.2;
    el.style.animationDuration = `${dur}s`;
    el.style.animationDelay = `${Math.random() * 1.2}s`;
    overlay.appendChild(el);
    setTimeout(() => el.remove(), (dur + 1.5) * 1000);
  }
}

// ── DOM helpers ────────────────────────────────────────────────────────────

function buildAnswerGrid(answers) {
  const grid = document.getElementById('answers-grid');
  grid.innerHTML = answers.map((a, i) => `
    <div class="answer-card" data-index="${i}">
      <div class="card-inner">
        <div class="card-front">
          <span class="card-number">${i + 1}</span>
          <span class="card-points-hidden">${a.points} pts</span>
        </div>
        <div class="card-back">
          <span class="card-text">${escHtml(a.text)}</span>
          <span class="card-points">${a.points}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Main render ────────────────────────────────────────────────────────────

function render(state) {
  if (state.showPodium) {
    window.location.replace('/podio');
    return;
  }

  const q = state.questions[state.currentQuestionIndex];
  const prev = prevState;

  // Question changed → rebuild grid
  if (!prev || prev.currentQuestionIndex !== state.currentQuestionIndex) {
    document.getElementById('question').textContent = q.question;
    buildAnswerGrid(q.answers);
    // Mark already-revealed answers immediately (no animation on load)
    state.revealedAnswers.forEach(idx => {
      const card = document.querySelector(`.answer-card[data-index="${idx}"]`);
      if (card) card.classList.add('revealed');
    });
  } else {
    // Reveal newly-revealed answers with flip + sound
    state.revealedAnswers.forEach(idx => {
      const wasRevealed = prev.revealedAnswers.includes(idx);
      if (!wasRevealed) {
        const card = document.querySelector(`.answer-card[data-index="${idx}"]`);
        if (card) {
          setTimeout(() => {
            card.classList.add('revealed');
            playReveal();
          }, 80);
        }
      }
    });
    // Hide answers that were reset
    prev.revealedAnswers.forEach(idx => {
      if (!state.revealedAnswers.includes(idx)) {
        const card = document.querySelector(`.answer-card[data-index="${idx}"]`);
        if (card) card.classList.remove('revealed');
      }
    });
  }

  // Strikes
  const activeStrikes = state.teams[state.activeTeamIndex].strikes;
  const prevStrikes = prev ? prev.teams[prev.activeTeamIndex].strikes : 0;
  const strikeEls = document.querySelectorAll('.strike-mark');
  strikeEls.forEach((el, i) => {
    const wasActive = i < prevStrikes;
    const isActive = i < activeStrikes;
    el.classList.toggle('active', isActive);
    if (isActive && !wasActive) {
      el.classList.remove('flash');
      void el.offsetWidth; // reflow
      el.classList.add('flash');
      playStrike();
      setTimeout(() => el.classList.remove('flash'), 700);
    }
  });

  // Active team banner
  const banner = document.getElementById('active-team');
  if (banner) banner.textContent = `Turno: ${state.teams[state.activeTeamIndex].name}`;

  // Scoreboard
  const scoreboard = document.getElementById('scoreboard');
  scoreboard.innerHTML = state.teams.map((team, i) => `
    <div class="team-score ${i === state.activeTeamIndex ? 'active' : ''}">
      <div class="team-name">${escHtml(team.name)}</div>
      <div class="team-points">${team.score}</div>
    </div>
  `).join('');

  // Celebration
  const overlay = document.getElementById('celebration-overlay');
  if (state.celebration && !prev?.celebration) {
    overlay.classList.remove('hidden');
    overlay.classList.add('active');
    overlay.innerHTML = '<div class="cel-message">¡FELICITACIONES!</div>';
    playCelebration();
    launchConfetti();
  } else if (!state.celebration && prev?.celebration) {
    overlay.classList.remove('active');
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  }

  prevState = state;
}

// ── Boot ───────────────────────────────────────────────────────────────────

Game.on('STATE_UPDATE', render);
