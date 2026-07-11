'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('life-canvas');
const ctx = canvas.getContext('2d');

const state = {
  rows: 48,
  cols: 64,
  generation: 0,
  wrap: true,
  speed: 120,
  density: 0.28,
  running: false,
  timer: null,
  grid: [],
  ages: [],
  previous: [],
  history: [],
  proposal: null,
  messages: [],
  rules: { mode: 'standard', birth: [3], survive: [2, 3] },
  colors: { alive: '#15231b', born: '#2f8b72', dying: '#b76d46' },
};

function blank(rows = state.rows, cols = state.cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(false));
}

function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

function snapshot() {
  return {
    rows: state.rows,
    cols: state.cols,
    generation: state.generation,
    wrap: state.wrap,
    speed: state.speed,
    density: state.density,
    grid: cloneGrid(state.grid),
    ages: state.ages.map((row) => row.slice()),
    rules: JSON.parse(JSON.stringify(state.rules)),
    colors: { ...state.colors },
  };
}

function restore(snap) {
  Object.assign(state, {
    rows: snap.rows,
    cols: snap.cols,
    generation: snap.generation,
    wrap: snap.wrap,
    speed: snap.speed,
    density: snap.density,
    grid: cloneGrid(snap.grid),
    ages: snap.ages.map((row) => row.slice()),
    rules: JSON.parse(JSON.stringify(snap.rules)),
    colors: { ...snap.colors },
  });
  syncInputs();
  draw();
}

function parseCounts(value) {
  const counts = String(value).split(/[,\s]+/).map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 8);
  return [...new Set(counts)].sort((a, b) => a - b);
}

function countNeighbors(row, col) {
  let total = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      let rr = row + dr;
      let cc = col + dc;
      if (state.wrap) {
        rr = (rr + state.rows) % state.rows;
        cc = (cc + state.cols) % state.cols;
      } else if (rr < 0 || cc < 0 || rr >= state.rows || cc >= state.cols) {
        continue;
      }
      if (state.grid[rr][cc]) total += 1;
    }
  }
  return total;
}

function currentRule() {
  if (state.rules.mode === 'alternating' && Array.isArray(state.rules.alternate) && state.rules.alternate.length) {
    return state.rules.alternate[state.generation % state.rules.alternate.length];
  }
  return state.rules;
}

function compileScript(script) {
  try {
    return new Function('alive', 'neighbors', 'row', 'col', 'age', 'generation', 'rows', 'cols', 'get', `"use strict";\n${script.includes('return') ? script : `return (${script});`}`);
  } catch (error) {
    console.warn('Invalid rule script', error);
    return null;
  }
}

function step() {
  const next = blank();
  const nextAges = Array.from({ length: state.rows }, () => Array(state.cols).fill(0));
  const rule = currentRule();
  const fn = state.rules.mode === 'script' && state.rules.script ? compileScript(state.rules.script) : null;
  const get = (r, c) => {
    const rr = state.wrap ? (r + state.rows) % state.rows : r;
    const cc = state.wrap ? (c + state.cols) % state.cols : c;
    return rr >= 0 && cc >= 0 && rr < state.rows && cc < state.cols ? state.grid[rr][cc] : false;
  };

  state.previous = cloneGrid(state.grid);
  for (let r = 0; r < state.rows; r += 1) {
    for (let c = 0; c < state.cols; c += 1) {
      const alive = state.grid[r][c];
      const neighbors = countNeighbors(r, c);
      let willLive;
      if (fn) {
        try {
          willLive = Boolean(fn(alive, neighbors, r, c, state.ages[r][c], state.generation, state.rows, state.cols, get));
        } catch (error) {
          willLive = alive ? [2, 3].includes(neighbors) : neighbors === 3;
        }
      } else {
        willLive = alive ? (rule.survive || []).includes(neighbors) : (rule.birth || []).includes(neighbors);
      }
      next[r][c] = willLive;
      nextAges[r][c] = willLive ? state.ages[r][c] + 1 : 0;
    }
  }
  state.grid = next;
  state.ages = nextAges;
  state.generation += 1;
  draw();
}

function randomize() {
  state.previous = cloneGrid(state.grid);
  state.grid = blank().map((row) => row.map(() => Math.random() < state.density));
  state.ages = state.grid.map((row) => row.map((alive) => (alive ? 1 : 0)));
  state.generation = 0;
  draw();
}

function clearGrid() {
  state.previous = cloneGrid(state.grid);
  state.grid = blank();
  state.ages = blank().map((row) => row.map(() => 0));
  state.generation = 0;
  draw();
}

function resizeGrid(rows, cols) {
  const next = blank(rows, cols);
  const nextAges = Array.from({ length: rows }, () => Array(cols).fill(0));
  const copyRows = Math.min(rows, state.rows);
  const copyCols = Math.min(cols, state.cols);
  for (let r = 0; r < copyRows; r += 1) {
    for (let c = 0; c < copyCols; c += 1) {
      next[r][c] = state.grid[r][c];
      nextAges[r][c] = state.ages[r][c];
    }
  }
  state.rows = rows;
  state.cols = cols;
  state.grid = next;
  state.ages = nextAges;
  state.previous = blank(rows, cols);
  draw();
}

function ruleLabel() {
  if (state.rules.mode === 'script') return `Script: ${state.rules.title || 'custom meta rule'}`;
  if (state.rules.mode === 'alternating') {
    return state.rules.alternate.map((r, i) => `${String.fromCharCode(65 + i)} B${r.birth.join('')} / S${r.survive.join('')}`).join('  |  ');
  }
  return `B${(state.rules.birth || []).join('')} / S${(state.rules.survive || []).join('')}`;
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width;
  const h = rect.height;
  const cell = Math.min(w / state.cols, h / state.rows);
  const offsetX = (w - cell * state.cols) / 2;
  const offsetY = (h - cell * state.rows) / 2;
  ctx.fillStyle = '#e8ece3';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d7ded2';
  for (let r = 0; r <= state.rows; r += 1) ctx.fillRect(offsetX, offsetY + r * cell, cell * state.cols, 1);
  for (let c = 0; c <= state.cols; c += 1) ctx.fillRect(offsetX + c * cell, offsetY, 1, cell * state.rows);
  let living = 0;
  for (let r = 0; r < state.rows; r += 1) {
    for (let c = 0; c < state.cols; c += 1) {
      const alive = state.grid[r][c];
      if (!alive) continue;
      living += 1;
      const wasAlive = state.previous[r]?.[c];
      ctx.fillStyle = wasAlive ? state.colors.alive : state.colors.born;
      ctx.fillRect(offsetX + c * cell + 1, offsetY + r * cell + 1, Math.max(1, cell - 1), Math.max(1, cell - 1));
    }
  }
  $('generation').textContent = state.generation;
  $('living-count').textContent = living;
  $('rule-summary').textContent = ruleLabel();
  $('rule-step').textContent = state.rules.mode === 'alternating' ? String.fromCharCode(65 + (state.generation % state.rules.alternate.length)) : '-';
}

function canvasCell(event) {
  const rect = canvas.getBoundingClientRect();
  const cell = Math.min(rect.width / state.cols, rect.height / state.rows);
  const offsetX = (rect.width - cell * state.cols) / 2;
  const offsetY = (rect.height - cell * state.rows) / 2;
  const col = Math.floor((event.clientX - rect.left - offsetX) / cell);
  const row = Math.floor((event.clientY - rect.top - offsetY) / cell);
  if (row < 0 || col < 0 || row >= state.rows || col >= state.cols) return null;
  return { row, col };
}

let drawing = false;
let drawValue = true;
canvas.addEventListener('pointerdown', (event) => {
  const cell = canvasCell(event);
  if (!cell) return;
  drawing = true;
  drawValue = !state.grid[cell.row][cell.col];
  state.previous = cloneGrid(state.grid);
  state.grid[cell.row][cell.col] = drawValue;
  state.ages[cell.row][cell.col] = drawValue ? 1 : 0;
  canvas.setPointerCapture(event.pointerId);
  draw();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drawing) return;
  const cell = canvasCell(event);
  if (!cell) return;
  state.grid[cell.row][cell.col] = drawValue;
  state.ages[cell.row][cell.col] = drawValue ? Math.max(1, state.ages[cell.row][cell.col]) : 0;
  draw();
});
canvas.addEventListener('pointerup', () => { drawing = false; });

function syncInputs() {
  $('rows-input').value = state.rows;
  $('cols-input').value = state.cols;
  $('speed-input').value = state.speed;
  $('density-input').value = Math.round(state.density * 100);
  $('wrap-input').checked = state.wrap;
  if (state.rules.mode === 'standard') {
    $('birth-input').value = (state.rules.birth || []).join(',');
    $('survive-input').value = (state.rules.survive || []).join(',');
  }
}

function playPause() {
  state.running = !state.running;
  $('play-btn').textContent = state.running ? 'Pause' : 'Play';
  if (state.timer) clearInterval(state.timer);
  if (state.running) state.timer = setInterval(step, state.speed);
}

function restartTimer() {
  if (!state.running) return;
  clearInterval(state.timer);
  state.timer = setInterval(step, state.speed);
}

function applyPatch(patch) {
  state.history.push(snapshot());
  if (patch.rules) {
    state.rules = JSON.parse(JSON.stringify(patch.rules));
    state.rules.title = patch.title;
  }
  if (patch.config) {
    if (patch.config.rows || patch.config.cols) resizeGrid(patch.config.rows || state.rows, patch.config.cols || state.cols);
    if (typeof patch.config.wrap === 'boolean') state.wrap = patch.config.wrap;
    if (patch.config.speed) state.speed = patch.config.speed;
    if (typeof patch.config.density === 'number') state.density = patch.config.density;
    if (patch.config.colors) state.colors = { ...state.colors, ...patch.config.colors };
  }
  if (patch.seed?.action === 'clear') clearGrid();
  if (patch.seed?.action === 'randomize') randomize();
  if (patch.seed?.action === 'pattern' && Array.isArray(patch.seed.pattern)) {
    clearGrid();
    const midR = Math.floor(state.rows / 2);
    const midC = Math.floor(state.cols / 2);
    for (const [r, c] of patch.seed.pattern) {
      const rr = midR + r;
      const cc = midC + c;
      if (rr >= 0 && cc >= 0 && rr < state.rows && cc < state.cols) {
        state.grid[rr][cc] = true;
        state.ages[rr][cc] = 1;
      }
    }
  }
  syncInputs();
  restartTimer();
  draw();
}

function renderProposal(patch) {
  state.proposal = patch;
  $('proposal').classList.remove('empty');
  $('proposal').innerHTML = `
    <h3>${escapeHtml(patch.title)}</h3>
    <div>${escapeHtml(patch.summary)}</div>
    <pre>${escapeHtml(JSON.stringify(patch.rules, null, 2))}</pre>
    ${(patch.notes || []).map((n) => `<div>${escapeHtml(n)}</div>`).join('')}
    <div class="proposal-actions">
      <button id="apply-proposal-btn" class="primary">Apply</button>
      <button id="dismiss-proposal-btn">Dismiss</button>
    </div>`;
  $('apply-proposal-btn').addEventListener('click', () => {
    applyPatch(patch);
    $('proposal').innerHTML = 'Applied. Keep prompting to refine this simulation.';
    $('proposal').classList.add('empty');
  });
  $('dismiss-proposal-btn').addEventListener('click', () => {
    state.proposal = null;
    $('proposal').textContent = 'Proposal dismissed.';
    $('proposal').classList.add('empty');
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

async function askAgent() {
  const prompt = $('prompt-input').value.trim();
  if (!prompt) return;
  $('agent-status').textContent = 'Agent thinking';
  $('agent-btn').disabled = true;
  const current = {
    rows: state.rows,
    cols: state.cols,
    generation: state.generation,
    wrap: state.wrap,
    speed: state.speed,
    density: state.density,
    rules: state.rules,
    living: Number($('living-count').textContent || 0),
  };
  try {
    const response = await fetch('/api/life-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, current, history: state.messages, model: $('model-select').value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Agent request failed');
    renderProposal(data.patch);
    state.messages.push({ role: 'user', content: prompt }, { role: 'assistant', content: data.patch.summary });
    $('agent-status').textContent = 'Agent proposal ready';
  } catch (error) {
    state.proposal = null;
    $('proposal').classList.remove('empty');
    $('proposal').innerHTML = `<strong>Proposal unavailable</strong><p>${escapeHtml(error.message || 'The agent request failed.')}</p>`;
    $('agent-status').textContent = 'Agent request failed';
  } finally {
    $('agent-btn').disabled = false;
  }
}

$('play-btn').addEventListener('click', playPause);
$('step-btn').addEventListener('click', step);
$('clear-btn').addEventListener('click', clearGrid);
$('random-btn').addEventListener('click', randomize);
$('apply-rule-btn').addEventListener('click', () => {
  applyPatch({ title: 'Manual B/S rule', summary: 'Manual rule editor update.', rules: { mode: 'standard', birth: parseCounts($('birth-input').value), survive: parseCounts($('survive-input').value) } });
});
$('undo-btn').addEventListener('click', () => {
  const snap = state.history.pop();
  if (snap) restore(snap);
});
$('rows-input').addEventListener('change', (e) => resizeGrid(Number(e.target.value), state.cols));
$('cols-input').addEventListener('change', (e) => resizeGrid(state.rows, Number(e.target.value)));
$('speed-input').addEventListener('input', (e) => { state.speed = Number(e.target.value); restartTimer(); });
$('density-input').addEventListener('input', (e) => { state.density = Number(e.target.value) / 100; });
$('wrap-input').addEventListener('change', (e) => { state.wrap = e.target.checked; draw(); });
$('agent-btn').addEventListener('click', askAgent);
$('prompt-input').addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') askAgent();
});
document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => { $('prompt-input').value = button.dataset.prompt; askAgent(); });
});
window.addEventListener('resize', draw);

state.grid = blank();
state.ages = blank().map((row) => row.map(() => 0));
state.previous = blank();
randomize();
