// ── Fireworks ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('fireworks-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const FW_COLORS = [
  '#f4a200','#ffd700','#ffffff','#ff6b6b',
  '#4ecdc4','#a8e6cf','#c44dff','#00d2ff','#ff9ff3',
];

function burst(x, y) {
  const color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  const count = 55 + Math.floor(Math.random() * 30);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.15;
    const speed = 2.5 + Math.random() * 4.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.013 + Math.random() * 0.014,
      color,
      size: 1.8 + Math.random() * 2.2,
    });
  }
}

function drawFireworks() {
  ctx.fillStyle = 'rgba(5,5,25,0.18)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.055;
    p.vx *= 0.99;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(drawFireworks);
}
drawFireworks();

function launchBurst() {
  const x = canvas.width * (0.15 + Math.random() * 0.7);
  const y = canvas.height * (0.1 + Math.random() * 0.55);
  burst(x, y);
}

// Initial salvo
setTimeout(launchBurst, 200);
setTimeout(launchBurst, 500);
setTimeout(launchBurst, 900);
setInterval(launchBurst, 1400);

// ── Confetti ───────────────────────────────────────────────────────────────

const EMOJIS = ['🎉','🎊','⭐','🌟','✨','💛','🏆','🥳','🎈','🎀','🎁','💫'];

function spawnConfetti() {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 35; i++) {
    const el = document.createElement('div');
    el.className = 'conf-p';
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    el.style.left = `${Math.random() * 100}%`;
    el.style.fontSize = `${14 + Math.random() * 22}px`;
    const dur = 3.5 + Math.random() * 4;
    el.style.animationDuration = `${dur}s`;
    el.style.animationDelay = `${Math.random() * 2.5}s`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), (dur + 3) * 1000);
  }
}

spawnConfetti();
setInterval(spawnConfetti, 4500);

// ── Helpers ────────────────────────────────────────────────────────────────

function esc(str) {
  return str
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const MEDALS   = ['🥇','🥈','🥉','🏅'];
const COL_CLS  = ['col-1st','col-2nd','col-3rd'];
const DELAYS   = [0.1, 0.4, 0.7]; // 1st animates first, then 2nd, then 3rd

// Podium visual order: 2nd | 1st | 3rd
const VISUAL_ORDER = [1, 0, 2];

// Block heights (vh-ish via inline style)
const BLOCK_H = [
  'clamp(130px, 22vh, 260px)', // 1st
  'clamp(95px,  16vh, 190px)', // 2nd
  'clamp(75px,  12vh, 150px)', // 3rd
];

// Avatar emojis per rank
const AVATARS = ['👑','🎖️','🎗️'];

let rendered = false;

function renderPodium(state) {
  if (rendered) return; // podio is static once shown

  const sorted = [...state.teams]
    .map((t, i) => ({ ...t, idx: i }))
    .sort((a, b) => b.score - a.score);

  const stage = document.getElementById('podium-stage');
  stage.innerHTML = '';

  // Build the 3 podium columns in visual order (2nd, 1st, 3rd)
  VISUAL_ORDER.forEach(rank => {
    const team = sorted[rank];
    if (!team) return;

    const isTie = rank > 0 && sorted[rank].score === sorted[rank - 1].score;

    const col = document.createElement('div');
    col.className = `podium-col ${COL_CLS[rank]}`;
    col.style.animationDelay = `${DELAYS[rank]}s`;

    col.innerHTML = `
      <div class="podium-avatar" style="animation-delay:${DELAYS[rank] + 0.3}s">
        ${AVATARS[rank]}
      </div>
      <div class="podium-team-name">${esc(team.name)}</div>
      <div class="podium-team-score">${team.score} <span style="font-size:0.45em;opacity:0.6">pts</span></div>
      ${isTie ? '<div class="tie-label">empate</div>' : ''}
      <div class="podium-block" style="height:${BLOCK_H[rank]}">
        <div class="podium-pos-num">${rank + 1}</div>
      </div>
    `;
    stage.appendChild(col);
  });

  // 4th place
  const fourth = sorted[3];
  const fourthWrap = document.getElementById('fourth-wrap');
  if (fourth) {
    fourthWrap.innerHTML = `
      <div class="fourth-card">
        <span class="fourth-medal">🏅</span>
        <div>
          <div class="fourth-pos">4° Lugar</div>
          <div class="fourth-name">${esc(fourth.name)}</div>
        </div>
        <div class="fourth-score">${fourth.score} pts</div>
      </div>
    `;
  } else {
    fourthWrap.style.display = 'none';
  }

  rendered = true;
}

Game.on('STATE_UPDATE', state => {
  if (!state.showPodium) {
    window.location.replace('/');
    return;
  }
  renderPodium(state);
});
