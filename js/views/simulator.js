/* =====================================================================
   GMAT 750+ Trainer - Simulator view
   Full-length or single-section timed exams with the GMAT Focus rules:
   45-minute sections, review screen, up to 3 answer changes, auto-submit.
   Session persists in localStorage so an accidental refresh does not
   destroy an in-progress exam.
   ===================================================================== */

'use strict';

const SIM_KEY = 'gmat750_sim_session';

let sim = null; // current sim session

const SIM_SECTIONS = {
  quant: { key: 'quant', name: 'Quantitative', icon: '🔢', count: 21, time: 2700 },
  verbal: { key: 'verbal', name: 'Verbal', icon: '📖', count: 23, time: 2700 },
  dataInsights: { key: 'dataInsights', name: 'Data Insights', icon: '📊', count: 20, time: 2700 }
};

/* Official counts are fixed; the mix of difficulties inside each section is
   balanced so every exam contains enough easy, medium and hard items to
   stress-test the full span of the section (easy / medium / hard). */
const SIM_BLUEPRINT = {
  quant: [['easy', 4], ['medium', 12], ['hard', 5]],
  verbal: [['easy', 4], ['medium', 13], ['hard', 6]],
  dataInsights: [['easy', 2], ['medium', 13], ['hard', 5]]
};

function simLoadSession() {
  try {
    const raw = localStorage.getItem(SIM_KEY);
    if (raw) { sim = JSON.parse(raw); return sim; }
  } catch (e) { /* ignore */ }
  sim = null;
  return null;
}
function simSave() {
  try { localStorage.setItem(SIM_KEY, JSON.stringify(sim)); } catch (e) { /* ignore */ }
}
function simClear() {
  sim = null;
  try { localStorage.removeItem(SIM_KEY); } catch (e) { /* ignore */ }
}

/* ---------------------------------------------------------------------
   Hub
   --------------------------------------------------------------------- */
function renderSimulatorHub(el) {
  const st = loadState();
  const proj = gamification.projectedTotalScore(st.stats);
  const past = st.sims.slice().reverse();
  const last = past[0];

  el.innerHTML = `
    <div class="page-header">
      <h1>Simulator</h1>
      <p class="text-muted">Take a timed exam that mirrors the real GMAT Focus experience.</p>
    </div>

    <section class="card">
      <div class="row row-wrap" style="align-items:center">
        <div style="flex:1;min-width:240px">
          <h2 style="margin:0 0 .5rem">Exam Format (Focus Edition)</h2>
          <table class="formula-table" style="margin:0">
            <thead><tr><th>Section</th><th>Questions</th><th>Time</th></tr></thead>
            <tbody>
              <tr><td>🔢 Quantitative Reasoning</td><td>21</td><td>45 min</td></tr>
              <tr><td>📖 Verbal Reasoning</td><td>23</td><td>45 min</td></tr>
              <tr><td>📊 Data Insights</td><td>20</td><td>45 min</td></tr>
              <tr><th>Total</th><th>64</th><th>2h 15m</th></tr>
            </tbody>
          </table>
        </div>
        <div class="card" style="min-width:220px;text-align:center;border:2px dashed var(--color-border)">
          <div class="text-muted">Projected GMAT Focus score</div>
          <div class="stat-display" style="font-size:2.4rem;line-height:1.2">${proj}</div>
          <div class="text-muted">205–805 scale</div>
          ${past.length ? `<div class="mt-1">Last attempt: <strong>${past[0].total}</strong> (${new Date(past[0].ts).toLocaleDateString()})</div>` : ''}
        </div>
      </div>
    </section>

    <h2 class="section-title">Start an Exam</h2>
    <div class="mode-grid">
      <button class="mode-card" onclick="simStartFull()">
        <span class="mode-icon">🏁</span>
        <span class="mode-title">Full Exam</span>
        <span class="mode-desc">64 questions · 2h 15m · all three sections with breaks. You choose the section order.</span>
      </button>
      <button class="mode-card" onclick="simStart('quant')">
        <span class="mode-icon">🔢</span>
        <span class="mode-title">Quant Only</span>
        <span class="mode-desc">21 questions · 45 minutes. No calculator.</span>
      </button>
      <button class="mode-card" onclick="simStart('verbal')">
        <span class="mode-icon">📖</span>
        <span class="mode-title">Verbal Only</span>
        <span class="mode-desc">23 questions · 45 minutes.</span>
      </button>
      <button class="mode-card" onclick="simStart('dataInsights')">
        <span class="mode-icon">📊</span>
        <span class="mode-title">Data Insights Only</span>
        <span class="mode-desc">20 questions · 45 minutes. Calculator allowed.</span>
      </button>
    </div>

    <h2 class="section-title">Exam Rules You Will Experience</h2>
    <div class="row row-wrap">
      <div class="lesson-box lesson-box-tip">You can change up to <strong>3 answers</strong> per section before submitting.</div>
      <div class="lesson-box lesson-box-tip">Mark questions for review; the review screen lists them at the end.</div>
      <div class="lesson-box lesson-box-tip">Difficulty is balanced per section: a mix of easy, medium and hard items.</div>
      <div class="lesson-box lesson-box-danger">No calculator in Quant or Verbal. An on-screen 4-function calculator appears in the Data Insights section only.</div>
    </div>
    <p class="text-muted fs-small" style="margin-top:.5rem">Section scores (60–90) are calibrated to the GMAT Focus band scale. They use accuracy as input and are <b>estimates</b> — the real GMAT adaptively adjusts difficulty in real time and is not reproducible by raw-accuracy mapping alone. Trends matter more than any single number.</p>

    ${past.length ? `
      <h2 class="section-title">Past Attempts</h2>
      <div class="table-scroll">
        <table class="formula-table">
          <thead><tr><th>Date</th><th>Mode</th><th>Total</th><th>Quant</th><th>Verbal</th><th>DI</th><th>Accuracy</th></tr></thead>
          <tbody>
            ${past.map(s => `<tr>
              <td>${new Date(s.ts).toLocaleDateString()}</td>
              <td>${s.mode === 'full' ? 'Full' : s.mode}</td>
              <td><strong>${s.total}</strong></td>
              <td>${s.sectionScores.quant || '—'}</td>
              <td>${s.sectionScores.verbal || '—'}</td>
              <td>${s.sectionScores.dataInsights || '—'}</td>
              <td>${Math.round(s.accuracy * 100)}%</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    `;
}

/* ---------------------------------------------------------------------
   Session builders
   --------------------------------------------------------------------- */
function shuffleQuestions(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSimSection(key) {
  const meta = SIM_SECTIONS[key];
  const blueprint = SIM_BLUEPRINT[key] || [['any', meta.count]];
  let chosen = [];
  const used = new Set();
  blueprint.forEach(function (pair) {
    const diff = pair[0], n = pair[1];
    const pool = diff === 'any' ? questionBank[key].slice() : questionBank[key].filter(q => q.difficulty === diff && !used.has(q.id));
    const picked = shuffleQuestions(pool).slice(0, n);
    picked.forEach(q => used.add(q.id));
    chosen = chosen.concat(picked);
  });
  // Guarantee Data Insights covers every item type (DS/MS/TA/GI/TP).
  if (key === 'dataInsights') {
    const types = ['ds', 'ms', 'ta', 'gi', 'tp'];
    const have = new Set(chosen.map(q => q.topic));
    types.forEach(t => {
      if (!have.has(t)) {
        const cand = questionBank.dataInsights.filter(q => q.topic === t && !used.has(q.id));
        if (cand.length) {
          const q = cand[0];
          chosen.unshift(q);
          used.add(q.id);
          have.add(t);
        }
      }
    });
  }
  // Defensive: never serve a section short of its official length — top up
  // from the remaining bank (any difficulty) until the count is reached.
  if (chosen.length < meta.count) {
    const fill = questionBank[key].filter(q => !used.has(q.id) && !chosen.some(c => c.id === q.id));
    chosen = chosen.concat(shuffleQuestions(fill).slice(0, meta.count - chosen.length));
  }
  chosen = chosen.slice(0, meta.count);
  return {
    key: key,
    questions: chosen.map(function (q) {
      if (q.passageId && !q.passage) {
        const p = questionBank.rcPassages.find(function (r) { return r.id === q.passageId; });
        if (p) q = Object.assign({}, q, { passage: p.text, passageTitle: p.title });
      }
      return q;
    }),
    answers: new Array(chosen.length).fill(null),
    marked: new Array(chosen.length).fill(false),
    qTime: new Array(chosen.length).fill(0),
    qSeenAt: new Array(chosen.length).fill(null),
    changesLeft: 3,
    elapsed: 0,
    submitted: false,
    timeAllowed: meta.time
  };
}

/* Per-question clock: accumulate the seconds spent on whichever question is
   on screen, then carry that value into the post-exam review. */
function simStampTime() {
  if (!sim) return;
  const sec = sim.sections[sim.sectionIdx];
  if (!sec || sim.qIdx === undefined) return;
  if (sec.qSeenAt[sim.qIdx] != null) {
    const delta = Math.max(0, Math.round((Date.now() - sec.qSeenAt[sim.qIdx]) / 1000));
    sec.qTime[sim.qIdx] = (sec.qTime[sim.qIdx] || 0) + delta;
  }
  sec.qSeenAt[sim.qIdx] = Date.now();
}

function simStartFull() {
  const modal = openModal(`
    <h3 style="margin-top:0">Choose your section order</h3>
    <p class="text-muted">The GMAT Focus lets you pick the order of its three 45-minute sections. Sports-science tip: bank your strongest section first for confidence, and put the section that drains you in the middle, not last.</p>
    <div class="field">
      <label>1st section</label>
      <select id="ord0">
        <option value="quant">🔢 Quantitative · 21 questions</option>
        <option value="verbal">📖 Verbal · 23 questions</option>
        <option value="dataInsights">📊 Data Insights · 20 questions</option>
      </select>
    </div>
    <div class="field">
      <label>2nd section</label>
      <select id="ord1">
        <option value="verbal">📖 Verbal · 23 questions</option>
        <option value="quant">🔢 Quantitative · 21 questions</option>
        <option value="dataInsights">📊 Data Insights · 20 questions</option>
      </select>
    </div>
    <div class="field">
      <label>3rd section</label>
      <select id="ord2">
        <option value="dataInsights">📊 Data Insights · 20 questions</option>
        <option value="quant">🔢 Quantitative · 21 questions</option>
        <option value="verbal">📖 Verbal · 23 questions</option>
      </select>
    </div>
    <div class="row">
      <button class="btn btn-primary" id="startFullBtn">Start Exam →</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
  modal.querySelector('#startFullBtn').addEventListener('click', function () {
    const a = modal.querySelector('#ord0').value;
    const b = modal.querySelector('#ord1').value;
    const c = modal.querySelector('#ord2').value;
    if (new Set([a, b, c]).size !== 3) { closeModal(); toast('Pick three different sections.', 'error'); return; }
    closeModal();
    simStartFullOrder([a, b, c]);
  });
}

function simStartFullOrder(order) {
  sim = {
    mode: 'full',
    order: order,
    sections: order.map(buildSimSection),
    sectionIdx: 0,
    qIdx: 0,
    phase: 'question', // question | review | intermission | done
    startedAt: Date.now(),
    secStartedAt: Date.now()
  };
  simSave();
  location.hash = '#/simulator/run';
}

function simStart(key) {
  sim = {
    mode: key,
    sections: [buildSimSection(key)],
    sectionIdx: 0,
    qIdx: 0,
    phase: 'question',
    startedAt: Date.now(),
    secStartedAt: Date.now()
  };
  simSave();
  location.hash = '#/simulator/run';
}

/* ---------------------------------------------------------------------
   Runner
   --------------------------------------------------------------------- */
function renderSimulatorRun(el) {
  if (!simLoadSession()) {
    toast('No active simulator session.', 'error');
    location.hash = '#/simulator';
    return;
  }
  if (sim.phase === 'intermission') { renderIntermission(el); return; }
  if (sim.phase === 'review') { renderReview(el); return; }
  if (sim.phase === 'done') { renderSimDone(el); return; }
  renderQuestion(el);
}

function renderQuestion(el) {
  const sec = sim.sections[sim.sectionIdx];
  const q = sec.questions[sim.qIdx];
  const qn = sim.qIdx + 1;
  const total = sec.questions.length;
  simStampTime();

  let passageHtml = '';
  if (q.passage) {
    passageHtml = `<div class="clue-box" style="margin-bottom:1rem">
      <div style="font-weight:700;margin-bottom:.5rem">📄 ${esc(q.passageTitle || 'Passage')}</div>
      <div style="white-space:pre-line">${esc(q.passage)}</div>
    </div>`;
  }

  const calcHtml = sec.key === 'dataInsights' ? `
      <div class="sim-calc-wrap" style="margin-top:1rem">
        <button class="btn btn-sm btn-outline" type="button" id="simCalcToggle">🧮 Calculator <span id="simCalcCaret">▼</span></button>
        <div class="sim-calc" id="simCalc" style="display:none">
          <div class="sim-calc-display" id="simCalcDisp">0</div>
          <div class="sim-calc-grid">
            <button class="calc-key fn" data-k="C" type="button">C</button>
            <button class="calc-key fn" data-k="BS" type="button">⌫</button>
            <button class="calc-key op" data-k="/" type="button">÷</button>
            <button class="calc-key op" data-k="*" type="button">×</button>
            <button class="calc-key" data-k="7" type="button">7</button>
            <button class="calc-key" data-k="8" type="button">8</button>
            <button class="calc-key" data-k="9" type="button">9</button>
            <button class="calc-key op" data-k="-" type="button">−</button>
            <button class="calc-key" data-k="4" type="button">4</button>
            <button class="calc-key" data-k="5" type="button">5</button>
            <button class="calc-key" data-k="6" type="button">6</button>
            <button class="calc-key op" data-k="+" type="button">+</button>
            <button class="calc-key" data-k="1" type="button">1</button>
            <button class="calc-key" data-k="2" type="button">2</button>
            <button class="calc-key" data-k="3" type="button">3</button>
            <button class="calc-key eq" data-k="=" type="button">=</button>
            <button class="calc-key" data-k="0" type="button">0</button>
            <button class="calc-key" data-k="." type="button">.</button>
          </div>
        </div>
      </div>` : '';

  el.innerHTML = `
    <div class="question-view">
      <div class="question-topbar">
        <div class="row" style="align-items:center;gap:.5rem;flex-wrap:wrap">
          <span class="badge badge-primary">${sec.icon} ${esc(SIM_SECTIONS[sec.key].name)}</span>
          <span class="badge badge-secondary">Q ${qn}/${total}</span>
          <span class="badge badge-ghost" id="changesBadge">Changes left: ${sec.changesLeft}</span>
        </div>
        <div class="row" style="align-items:center;gap:.75rem">
          <span class="timer-display" id="simTimer">45:00</span>
          <button class="btn btn-sm btn-ghost" id="simMarkBtn" title="Mark for review">${sec.marked[sim.qIdx] ? '📌 Marked' : '🏷️ Mark'}</button>
          <button class="btn btn-sm btn-outline" onclick="simGoReview()">Review & Submit</button>
        </div>
      </div>

      ${passageHtml}
      <div class="question-text">${esc(q.text)}</div>

      <div id="simOptions">
        ${q.options.map((o, i) => `
          <button class="option ${sec.answers[sim.qIdx] === i ? 'selected' : ''}" data-o="${i}" type="button">
            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
            <span>${esc(o)}</span>
          </button>`).join('')}
      </div>

      ${calcHtml}

      <div class="row" style="justify-content:space-between;margin-top:1rem">
        <button class="btn btn-outline" id="simPrev" ${sim.qIdx === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="btn btn-primary" id="simNext">${sim.qIdx === total - 1 ? 'Go to Review →' : 'Next →'}</button>
      </div>
    </div>`;

  // Options
  el.querySelectorAll('#simOptions .option').forEach(btn => {
    btn.addEventListener('click', function () {
      if (sec.submitted) return;
      const oi = +this.getAttribute('data-o');
      if (sec.answers[sim.qIdx] !== null && sec.answers[sim.qIdx] !== oi) {
        if (sec.changesLeft > 0) {
          sec.changesLeft -= 1;
        } else {
          toast('No answer changes left for this section.', 'error');
          return;
        }
      }
      sec.answers[sim.qIdx] = oi;
      el.querySelectorAll('#simOptions .option').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      const cb = el.querySelector('#changesBadge');
      if (cb) cb.textContent = 'Changes left: ' + sec.changesLeft;
      playSound('type');
      simSave();
    });
  });
  // Mark
  el.querySelector('#simMarkBtn').addEventListener('click', function () {
    sec.marked[sim.qIdx] = !sec.marked[sim.qIdx];
    this.textContent = sec.marked[sim.qIdx] ? '📌 Marked' : '🏷️ Mark';
    simSave();
  });
  // Nav
  el.querySelector('#simPrev').addEventListener('click', function () {
    if (sim.qIdx > 0) { simStampTime(); sim.qIdx -= 1; simSave(); render(); }
  });
  el.querySelector('#simNext').addEventListener('click', function () {
    if (sim.qIdx < total - 1) { simStampTime(); sim.qIdx += 1; simSave(); render(); }
    else simGoReview();
  });

  // On-screen calculator (Data Insights only)
  const calcToggle = el.querySelector('#simCalcToggle');
  if (calcToggle) {
    bindSimCalc(el);
    calcToggle.addEventListener('click', function () {
      const panel = el.querySelector('#simCalc');
      const open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : '';
      el.querySelector('#simCalcCaret').textContent = open ? '▼' : '▲';
    });
  }

  startSimTimer(el, sec.timeAllowed - secElapsedNow(sim.sectionIdx));
}

const SIM_CALC = { acc: 0, op: null, entry: '', fresh: false };

function simCalcApply(a, b, op) {
  let r = 0;
  if (op === '+') r = a + b;
  else if (op === '-') r = a - b;
  else if (op === '*') r = a * b;
  else if (op === '/') r = b === 0 ? NaN : a / b;
  if (isNaN(r) || !isFinite(r)) return NaN;
  return Math.round(r * 1e10) / 1e10;
}

function simCalcRender() {
  const d = document.querySelector('#simCalcDisp');
  if (d) d.textContent = SIM_CALC.entry !== '' ? SIM_CALC.entry : String(SIM_CALC.acc);
}

function simCalcKey(k) {
  if (SIM_CALC.fresh) { SIM_CALC.acc = 0; SIM_CALC.op = null; SIM_CALC.entry = ''; SIM_CALC.fresh = false; }
  if (k >= '0' && k <= '9') {
    if (SIM_CALC.entry.length >= 12) { simCalcRender(); return; }
    SIM_CALC.entry = SIM_CALC.entry === '0' ? k : SIM_CALC.entry + k;
  } else if (k === '.') {
    if (SIM_CALC.entry.indexOf('.') < 0) SIM_CALC.entry = (SIM_CALC.entry === '' ? '0' : SIM_CALC.entry) + '.';
  } else if (k === '+' || k === '-' || k === '*' || k === '/') {
    const v = SIM_CALC.entry === '' ? SIM_CALC.acc : parseFloat(SIM_CALC.entry);
    if (SIM_CALC.op && SIM_CALC.entry !== '' && !isNaN(v)) {
      const r = simCalcApply(SIM_CALC.acc, v, SIM_CALC.op);
      if (isNaN(r)) { SIM_CALC.acc = 0; SIM_CALC.op = null; SIM_CALC.entry = ''; SIM_CALC.fresh = true; }
      else { SIM_CALC.acc = r; SIM_CALC.entry = ''; }
    } else {
      if (SIM_CALC.entry !== '') SIM_CALC.acc = v;
      SIM_CALC.entry = '';
    }
    SIM_CALC.op = k;
  } else if (k === '=') {
    const v = SIM_CALC.entry === '' ? SIM_CALC.acc : parseFloat(SIM_CALC.entry);
    if (SIM_CALC.op !== null) {
      const r = simCalcApply(SIM_CALC.acc, v, SIM_CALC.op);
      if (isNaN(r)) { SIM_CALC.acc = 0; SIM_CALC.op = null; SIM_CALC.entry = ''; SIM_CALC.fresh = true; }
      else { SIM_CALC.acc = r; SIM_CALC.op = null; SIM_CALC.entry = ''; SIM_CALC.fresh = true; }
    } else {
      SIM_CALC.acc = isNaN(v) ? 0 : v;
      SIM_CALC.entry = '';
      SIM_CALC.fresh = true;
    }
  } else if (k === 'C') {
    SIM_CALC.acc = 0; SIM_CALC.op = null; SIM_CALC.entry = ''; SIM_CALC.fresh = false;
  } else if (k === 'BS') {
    SIM_CALC.entry = SIM_CALC.entry.slice(0, -1);
  }
  simCalcRender();
}

function bindSimCalc(el) {
  el.querySelectorAll('.sim-calc .calc-key').forEach(function (btn) {
    btn.addEventListener('click', function () {
      simCalcKey(this.getAttribute('data-k'));
      playSound('select');
    });
  });
}

function secElapsedNow(secIdx) {
  const sec = sim.sections[secIdx];
  const started = sim.secStartedAt || sim.startedAt;
  return Math.min(sec.timeAllowed, Math.round((Date.now() - started) / 1000));
}

function startSimTimer(el, remaining) {
  Timer.stop();
  const t = el.querySelector('#simTimer');
  const tick = (rem) => {
    if (t) {
      t.textContent = fmtClockForTimer(rem);
      t.classList.toggle('warning', rem <= 300 && rem > 60);
      t.classList.toggle('danger', rem <= 60);
    }
  };
  Timer.start(Math.max(0, remaining), tick, () => {
    const sec = sim.sections[sim.sectionIdx];
    sec.elapsed = sec.timeAllowed;
    playSound('timeup');
    simSave();
    simGoReview(true);
  });
}

/* ---------------------------------------------------------------------
   Review screen (with up-to-3 answer changes)
   --------------------------------------------------------------------- */
function renderReview(el) {
  const sec = sim.sections[sim.sectionIdx];
  el.innerHTML = `
    <div class="lesson-container">
      <div class="page-header">
        <h1>${sec.icon} Review &amp; Submit</h1>
        <p class="text-muted">${SIM_SECTIONS[sec.key].name} · you can change up to <strong>${sec.changesLeft}</strong> answer${sec.changesLeft === 1 ? '' : 's'} before submitting.</p>
      </div>
      <section class="card">
        ${sec.questions.map((q, i) => {
          const status = sec.answers[i] === null ? '<span class="badge badge-error">Unanswered</span>'
            : sec.marked[i] ? '<span class="badge badge-accent">Marked</span>'
            : '<span class="badge badge-success">Answered</span>';
          const ans = sec.answers[i] === null ? '—' : String.fromCharCode(65 + sec.answers[i]);
          return `
          <div class="feed-item" style="cursor:pointer" onclick="simJumpToQuestion(${i})">
            <span class="feed-icon">Q${i + 1}</span>
            <span>${esc(q.text.slice(0, 70))}${q.text.length > 70 ? '…' : ''}</span>
            <span class="feed-icon" style="font-weight:700">${ans}</span>
            ${status}
          </div>`;
        }).join('')}
      </section>
      <div class="row mt-2" style="margin-top:1rem">
        <button class="btn btn-primary" onclick="simSubmitSection()">Submit Section</button>
        <button class="btn btn-outline" onclick="simJumpBackToQuestions()">Back to Questions</button>
      </div>
    </div>`;
}

function simJumpBackToQuestions() {
  Timer.stop();
  simStampTime();
  sim.phase = 'question';
  sim.qIdx = 0;
  simSave();
  render();
}

function simJumpToQuestion(i) {
  Timer.stop();
  simStampTime();
  sim.phase = 'question';
  sim.qIdx = i;
  simSave();
  render();
}

function simGoReview(autoTimeUp) {
  if (!sim) return;
  const sec = sim.sections[sim.sectionIdx];
  simStampTime();
  sec.elapsed = secElapsedNow(sim.sectionIdx);
  Timer.stop();
  sim.phase = 'review';
  simSave();
  render();
}

/* ---------------------------------------------------------------------
   Intermission between sections (full exam)
   --------------------------------------------------------------------- */
function renderIntermission(el) {
  const secIdx = sim.sectionIdx;
  const next = sim.sections[secIdx];
  const doneCount = secIdx;
  el.innerHTML = `
    <div class="lesson-container text-center">
      <div class="stat-display" style="font-size:3rem;margin-bottom:.5rem">☕</div>
      <h1>Section ${doneCount} complete</h1>
      <p class="text-muted">Take a short break — you're in the driver's seat. Next: ${SIM_SECTIONS[next.key].name} (${SIM_SECTIONS[next.key].count} questions, 45 minutes).</p>
      <button class="btn btn-primary" onclick="simBeginNextSection()">Begin ${SIM_SECTIONS[next.key].name} →</button>
      <p class="text-muted mt-1"><button class="btn btn-ghost" onclick="simAbandon()">Abandon exam</button></p>
    </div>`;
}

function simBeginNextSection() {
  simStampTime();
  sim.sectionIdx += 1;
  sim.qIdx = 0;
  sim.phase = 'question';
  sim.secStartedAt = Date.now();
  simSave();
  render();
}

function simAbandon() {
  simClear();
  toast('Simulator abandoned.', 'error');
  location.hash = '#/simulator';
}

/* ---------------------------------------------------------------------
   Submit a section
   --------------------------------------------------------------------- */
function simSubmitSection() {
  if (!sim) return;
  const sec = sim.sections[sim.sectionIdx];
  simStampTime();
  sec.elapsed = secElapsedNow(sim.sectionIdx);
  Timer.stop();

  // record answers
  let answeredCount = 0;
  sec.questions.forEach((q, i) => {
    const chosen = sec.answers[i];
    if (chosen === null) return; // skipped questions don't count as attempts
    answeredCount += 1;
    const correct = chosen === q.correct;
    const k = sectionForQuest(q);
    recordAnswer(q, correct, 40, k);
    if (!correct) addErrorLog(q.id, chosen, k);
  });
  if (answeredCount > 0) addStudySession(answeredCount, sec.elapsed, sec.key);
  sec.submitted = true;

  // advance after the phase transition so the persisted state is never stale
  // (renderSimulatorRun re-loads from storage on every render)
  if (sim.mode === 'full' && sim.sectionIdx < sim.sections.length - 1) {
    sim.phase = 'intermission';
    simSave();
    playSound('done');
    render();
  } else {
    simFinish();
  }
}

function sectionForQuest(q) {
  if (q.topic === 'rc' || q.topic === 'cr') return 'verbal';
  if (q.topic === 'ds' || q.topic === 'ms' || q.topic === 'ta' || q.topic === 'gi' || q.topic === 'tp') return 'dataInsights';
  return 'quant';
}

/* ---------------------------------------------------------------------
   Finish: scoring
   --------------------------------------------------------------------- */
function simFinish() {
  const st = loadState();
  const sectionScores = {};
  const totals = { attempts: 0, correct: 0 };
  const reviewRows = [];

  sim.sections.forEach(sec => {
    let att = 0, cor = 0;
    sec.questions.forEach((q, i) => {
      const chosen = sec.answers[i];
      const answered = chosen !== null;
      if (answered) {
        att += 1;
        if (chosen === q.correct) cor += 1;
      }
      reviewRows.push({
        section: sec.key,
        question: q,
        chosen: chosen,
        correct: answered ? chosen === q.correct : false,
        unanswered: !answered,
        diff: q.difficulty,
        secs: (sec.qTime && sec.qTime[i]) || 0
      });
    });
    const acc = att ? cor / att : 0;
    sectionScores[sec.key] = gamification.sectionScoreFromAccuracy(acc);
    totals.attempts += att;
    totals.correct += cor;
  });

  const accuracy = totals.attempts ? totals.correct / totals.attempts : 0;
  let total, basis;
  if (sim.mode === 'full') {
    // Official endpoints: 60+60+60 → 205, 90+90+90 → 805, monotonic in between.
    const sum = ['quant', 'verbal', 'dataInsights'].reduce((s, k) => s + (sectionScores[k] || 60), 0);
    total = Math.max(205, Math.min(805, Math.round(205 + (sum - 180) / 90 * 600)));
    basis = 'full';
  } else {
    // Single section only: treat as directional, not a real total.
    total = gamification.projectedTotalScore(st.stats);
    basis = 'single';
  }

  updateState(s => {
    s.sims.push({
      ts: Date.now(),
      mode: sim.mode,
      total: total,
      sectionScores: sectionScores,
      accuracy: accuracy,
      basis: basis
    });
    s.stats.simsCompleted += 1;
    grantXp(gamification.xpRules.simCompleted);
    addFeed('🏁', 'Completed a ' + (sim.mode === 'full' ? 'full-length' : 'single-section') + ' simulator.');
  });
  checkBadges();

  // save result + full per-question data for the post-exam review
  sim._result = {
    total: total,
    sectionScores: sectionScores,
    accuracy: accuracy,
    basis: basis,
    mode: sim.mode,
    secOrder: sim.sections.map(s => s.key),
    review: reviewRows
  };
  lastSimResult = sim._result;
  sim.phase = 'done';
  simSave();
  render();
}

let lastSimResult = null;

function renderSimDone(el) {
  const r = (sim && sim._result) || lastSimResult;
  if (!r) { location.hash = '#/simulator'; return; }
  const secOrder = r.secOrder;
  const bySec = {};
  r.review.forEach(row => { (bySec[row.section] = bySec[row.section] || []).push(row); });

  const answered = r.review.length;
  const correctCount = r.review.filter(x => x.correct).length;

  const secPanels = secOrder.map(key => {
    const rows = bySec[key] || [];
    const att = rows.filter(x => !x.unanswered).length;
    const cor = rows.filter(x => x.correct).length;
    const totSecs = rows.reduce((s, x) => s + (x.secs || 0), 0);
    return `
      <div class="card" style="margin-top:1rem">
        <div class="row" style="align-items:center;gap:.5rem;flex-wrap:wrap">
          <h3 style="margin:0">${SIM_SECTIONS[key].icon} ${SIM_SECTIONS[key].name}</h3>
          <span class="badge ${cor / Math.max(1, att) >= 0.7 ? 'badge-success' : 'badge-ghost'}">${cor}/${att}</span>
          <span class="text-muted fs-small" style="margin-left:auto">${fmtShort(totSecs)} total · avg ${fmtShort(att ? Math.round(totSecs / att) : 0)}/q</span>
        </div>
        <div class="sim-review-grid" style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.75rem">
          ${rows.map((row, i) => `
            <button class="sim-review-chip ${row.unanswered ? 'chip-un' : row.correct ? 'chip-ok' : 'chip-bad'}" data-sec="${key}" data-i="${i}" type="button" title="${esc(row.question.text.slice(0, 90))}">
              ${row.unanswered ? '—' : String.fromCharCode(65 + row.chosen)}
            </button>`).join('')}
        </div>
        <div class="text-muted fs-small" style="margin-top:.5rem">Chips show your answer letter · green = correct, red = wrong, grey = unanswered. Click one to review it.</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="lesson-container">
      <div class="text-center">
        <div class="stat-display" style="font-size:3rem">🏁</div>
        <h1>Exam Complete</h1>
        <p class="text-muted">${new Date().toLocaleString()}</p>
        <div class="row" style="justify-content:center;align-items:baseline;gap:1rem;margin:1.5rem 0">
          <div>
            <div class="stat-display" style="font-size:3rem;color:var(--color-primary)">${r.total}</div>
            <div class="stat-label">GMAT Focus Total ${r.basis === 'single' ? '(directional)' : ''}</div>
          </div>
          <div class="text-muted" style="font-size:1.4rem">/ 805</div>
        </div>
      </div>

      <div class="grid grid-2" style="max-width:520px;margin:0 auto 1rem">
        ${secOrder.map(k => `
          <div class="card text-center">
            <div class="stat-value">${r.sectionScores[k]}</div>
            <div class="stat-label">${SIM_SECTIONS[k].icon} ${SIM_SECTIONS[k].name}</div>
            <div class="text-muted fs-small">Section score (60–90) · est.</div>
          </div>`).join('')}
      </div>
      <div class="text-center">
        <div class="text-muted">Overall accuracy: ${Math.round(r.accuracy * 100)}% · ${correctCount}/${answered} correct</div>
        <p class="text-muted fs-small" style="max-width:640px;margin:1rem auto 0">
          Scores here are <b>estimates</b>. On the real GMAT Focus, the Section Adaptive algorithm
          recalibrates each question to your ability, so identical accuracy can map to different
          scores. Use this number to <b>track trends</b>, not as a guaranteed forecast.
          ${r.basis === 'single' ? '<b>You completed one section</b> — the total is projected directionally from practice history.' : ''}
        </p>
      </div>

      <div style="margin-top:1.5rem">
        <h2>Post-Exam Review</h2>
        ${secPanels}
        <div id="simReviewDetail"></div>
      </div>

      <div class="row" style="justify-content:center;margin-top:1.5rem">
        <button class="btn btn-primary" onclick="location.hash='#/practice/error'">Review Missed Questions</button>
        <button class="btn btn-outline" onclick="location.hash='#/analytics'">Analytics</button>
        <button class="btn btn-ghost" onclick="simAbandon()">Back to Simulator</button>
      </div>
    </div>`;

  el.querySelectorAll('.sim-review-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      const key = this.getAttribute('data-sec');
      const i = +this.getAttribute('data-i');
      const rows = bySec[key];
      if (!rows) return;
      renderSimReviewDetail(el, rows[i]);
    });
  });

  simClear();
}

function renderSimReviewDetail(el, row) {
  const q = row.question;
  const box = el.querySelector('#simReviewDetail');
  box.innerHTML = `
    <div class="example-block" style="margin-top:1rem">
      <div class="row" style="align-items:center;gap:.5rem;flex-wrap:wrap">
        <span class="badge ${q.difficulty === 'hard' ? 'badge-hard' : q.difficulty === 'medium' ? 'badge-medium' : 'badge-easy'}">${difficultyLabel(q.difficulty)}</span>
        <span class="badge badge-ghost">${topicTagName(q.topic)}</span>
        <span class="badge badge-ghost">⏱ ${fmtShort(row.secs || 0)}</span>
        <span class="text-muted fs-small" style="margin-left:auto">You answered: ${row.unanswered ? '—' : String.fromCharCode(65 + row.chosen)} · Correct: ${String.fromCharCode(65 + q.correct)}</span>
      </div>
      ${q.passage ? `<div class="clue-box" style="margin:1rem 0"><div style="font-weight:700;margin-bottom:.5rem">📄 ${esc(q.passageTitle || 'Passage')}</div><div style="white-space:pre-line">${esc(q.passage)}</div></div>` : ''}
      <div class="example-question">${esc(q.text)}</div>
      <div>
        ${q.options.map((o, oi) => `
          <div class="option ${oi === q.correct ? 'correct' : ''} ${row.chosen === oi && oi !== q.correct ? 'incorrect' : ''} disabled">
            <span class="option-letter">${String.fromCharCode(65 + oi)}</span>
            <span>${esc(o)} ${oi === q.correct ? '<span class="badge badge-success">Correct answer</span>' : row.chosen === oi ? '<span class="badge badge-error">Your answer</span>' : ''}</span>
          </div>`).join('')}
      </div>
      <div class="example-reason" style="margin-top:.5rem">${esc(q.explanation || '')}</div>
      <button class="btn btn-sm btn-ghost" type="button" onclick="document.getElementById('simReviewDetail').innerHTML=''">✕ Close review</button>
    </div>`;
}

/* ---------------------------------------------------------------------
   Answer changes: hook into review actions (used by renderReview handlers)
   --------------------------------------------------------------------- */
function simChangeAnswer(questionIdx, choice) {
  const sec = sim.sections[sim.sectionIdx];
  const prev = sec.answers[questionIdx];
  if (prev !== null && prev !== choice && sec.changesLeft > 0) {
    sec.changesLeft -= 1;
  } else if (prev === choice) {
    // same answer, no change consumed
  } else if (sec.answers[questionIdx] === null) {
    // first answer in review doesn't consume a "change"
  }
  sec.answers[questionIdx] = choice;
  simSave();
}

// expose globally used by inline handlers
window.simStartFull = simStartFull;
window.simStart = simStart;
window.simGoReview = simGoReview;
window.simSubmitSection = simSubmitSection;
window.simJumpToQuestion = simJumpToQuestion;
window.simJumpBackToQuestions = simJumpBackToQuestions;
window.simBeginNextSection = simBeginNextSection;
window.simAbandon = simAbandon;
window.simFinish = simFinish;

/* Register route */
App.register('simulator', {
  title: 'Simulator',
  menuKey: 'simulator',
  render: function (el, args) {
    if (args && args[0] === 'run') renderSimulatorRun(el);
    else renderSimulatorHub(el);
  }
});