let currentState = null;

// ── Connection status ──────────────────────────────────────────────────────

Game.on('__connected', () => {
  const dot = document.getElementById('conn-dot');
  if (dot) { dot.classList.add('connected'); dot.title = 'Conectado'; }
  const label = document.getElementById('conn-label');
  if (label) label.textContent = 'Conectado';
});

Game.on('__disconnected', () => {
  const dot = document.getElementById('conn-dot');
  if (dot) { dot.classList.remove('connected'); dot.title = 'Desconectado'; }
  const label = document.getElementById('conn-label');
  if (label) label.textContent = 'Reconectando…';
});

// ── State render ───────────────────────────────────────────────────────────

Game.on('STATE_UPDATE', state => {
  currentState = state;
  renderAll(state);
});

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAll(state) {
  renderStatus(state);
  renderQuestionSelect(state);
  renderAnswers(state);
  renderStrikes(state);
  renderTeams(state);
  renderPodioBtn(state);
}

function renderPodioBtn(state) {
  const btn = document.getElementById('btn-podio');
  if (!btn) return;
  if (state.showPodium) {
    btn.textContent = '◀ Volver al Juego';
    btn.style.background = '#374151';
  } else {
    btn.textContent = '🏆 Ver Podio Final';
    btn.style.background = '';
  }
}

function renderStatus(state) {
  const q = state.questions[state.currentQuestionIndex];
  setText('status-question', `${state.currentQuestionIndex + 1} / ${state.questions.length}`);
  setText('status-team', state.teams[state.activeTeamIndex].name);
  setText('status-strikes', `${state.teams[state.activeTeamIndex].strikes} / 3`);
  const revealed = state.revealedAnswers.length;
  setText('status-revealed', `${revealed} / ${q.answers.length}`);
}

function renderQuestionSelect(state) {
  const sel = document.getElementById('question-select');
  if (!sel) return;
  // Only rebuild options if needed
  if (sel.dataset.built !== 'true') {
    sel.innerHTML = state.questions.map((q, i) =>
      `<option value="${i}">${i + 1}. ${escHtml(q.question)}</option>`
    ).join('');
    sel.dataset.built = 'true';
  }
  sel.value = state.currentQuestionIndex;
}

function renderAnswers(state) {
  const list = document.getElementById('answers-list');
  if (!list) return;
  const q = state.questions[state.currentQuestionIndex];

  list.innerHTML = q.answers.map((a, i) => {
    const isRevealed = state.revealedAnswers.includes(i);
    return `
      <div class="answer-row ${isRevealed ? 'revealed' : ''}">
        <span class="answer-rank">${i + 1}</span>
        <div class="answer-info">
          <div class="answer-text">${escHtml(a.text)}</div>
          <div class="answer-pts">${a.points} puntos</div>
        </div>
        <button class="btn-reveal" data-index="${i}" ${isRevealed ? 'disabled' : ''}>
          ${isRevealed ? '✓ Revelada' : 'Revelar'}
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.btn-reveal').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      Game.send('REVEAL_ANSWER', {
        questionId: state.currentQuestionIndex,
        answerIndex: idx,
      });
    });
  });
}

function renderStrikes(state) {
  const display = document.getElementById('strikes-display');
  if (!display) return;
  const strikes = state.teams[state.activeTeamIndex].strikes;
  display.innerHTML = [0, 1, 2].map(i => `
    <div class="h-strike ${i < strikes ? 'active' : ''}">✕</div>
  `).join('');
}

function renderTeams(state) {
  const list = document.getElementById('teams-list');
  if (!list) return;
  list.innerHTML = state.teams.map((team, i) => `
    <div class="team-row ${i === state.activeTeamIndex ? 'active' : ''}" data-team="${i}">
      <div class="team-indicator"></div>
      <div class="team-label">${escHtml(team.name)}</div>
      <div class="team-score-display">${team.score}</div>
      <div class="score-btns">
        <button data-team="${i}" data-delta="10" title="+10">+</button>
        <button data-team="${i}" data-delta="-10" title="-10">−</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.team-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.score-btns')) return;
      const idx = parseInt(row.dataset.team, 10);
      if (idx !== currentState.activeTeamIndex) {
        Game.send('SET_ACTIVE_TEAM', { teamIndex: idx });
      }
    });
  });

  list.querySelectorAll('.score-btns button').forEach(btn => {
    btn.addEventListener('click', () => {
      Game.send('ADJUST_SCORE', {
        teamIndex: parseInt(btn.dataset.team, 10),
        delta: parseInt(btn.dataset.delta, 10),
      });
    });
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── Wiring static controls ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Question selector
  const qSel = document.getElementById('question-select');
  if (qSel) {
    qSel.addEventListener('change', () => {
      Game.send('SET_QUESTION', { questionId: parseInt(qSel.value, 10) });
    });
  }

  // Game control buttons
  on('btn-strike',       () => Game.send('ADD_STRIKE'));
  on('btn-next-team',    () => Game.send('NEXT_TEAM'));
  on('btn-reset-round',  () => Game.send('RESET_ROUND'));
  on('btn-next-question',() => Game.send('NEXT_QUESTION'));
  on('btn-podio', () => {
    const showing = currentState?.showPodium;
    Game.send(showing ? 'HIDE_PODIUM' : 'SHOW_PODIUM');
  });
  on('btn-reset-game', () => {
    if (confirm('¿Reiniciar el juego completo? Se borran todos los puntajes.')) {
      Game.send('RESET_GAME');
    }
  });

  // Team names form
  on('btn-apply-names', () => {
    const teams = [0, 1, 2, 3].map(i => ({
      name: (document.getElementById(`team-name-${i}`)?.value || '').trim() || `Equipo ${i + 1}`,
    }));
    Game.send('SET_TEAMS', { teams });
  });

  // Sync name inputs with current state when state arrives
  Game.on('STATE_UPDATE', state => {
    state.teams.forEach((team, i) => {
      const input = document.getElementById(`team-name-${i}`);
      if (input && document.activeElement !== input) {
        input.value = team.name;
      }
    });
  });
});

function on(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}
