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
      <div class="lesson-box lesson-box-danger">No calculator in Quant. Calculator on-screen in Data Insights only.</div>
    </div>

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
  const pool = questionBank[key].slice();
  const chosen = shuffleQuestions(pool).slice(0, meta.count);
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
    changesLeft: 3,
    elapsed: 0,
    submitted: false,
    timeAllowed: meta.time
  };
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

  let passageHtml = '';
  if (q.passage) {
    passageHtml = `<div class="clue-box" style="margin-bottom:1rem">
      <div style="font-weight:700;margin-bottom:.5rem">📄 ${esc(q.passageTitle || 'Passage')}</div>
      <div style="white-space:pre-line">${esc(q.passage)}</div>
    </div>`;
  }

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
    if (sim.qIdx > 0) { sim.qIdx -= 1; simSave(); render(); }
  });
  el.querySelector('#simNext').addEventListener('click', function () {
    if (sim.qIdx < total - 1) { sim.qIdx += 1; simSave(); render(); }
    else simGoReview();
  });

  startSimTimer(el, sec.timeAllowed - secElapsedNow(sim.sectionIdx));
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
  sim.phase = 'question';
  sim.qIdx = 0;
  simSave();
  render();
}

function simJumpToQuestion(i) {
  Timer.stop();
  sim.phase = 'question';
  sim.qIdx = i;
  simSave();
  render();
}

function simGoReview(autoTimeUp) {
  if (!sim) return;
  const sec = sim.sections[sim.sectionIdx];
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
  simSave();

  // advance
  if (sim.mode === 'full' && sim.sectionIdx < sim.sections.length - 1) {
    sim.phase = 'intermission';
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

  sim.sections.forEach(sec => {
    let att = 0, cor = 0;
    sec.questions.forEach((q, i) => {
      if (sec.answers[i] !== null) {
        att += 1;
        if (sec.answers[i] === q.correct) cor += 1;
      }
    });
    const acc = att ? cor / att : 0;
    sectionScores[sec.key] = gamification.sectionScoreFromAccuracy(acc);
    totals.attempts += att;
    totals.correct += cor;
  });

  const accuracy = totals.attempts ? totals.correct / totals.attempts : 0;
  let total;
  if (sim.mode === 'full') {
    total = gamification.projectedTotalScore(st.stats);
  } else {
    // single-section: still project, but bias by section count
    total = gamification.projectedTotalScore(st.stats);
  }

  updateState(s => {
    s.sims.push({
      ts: Date.now(),
      mode: sim.mode,
      total: total,
      sectionScores: sectionScores,
      accuracy: accuracy
    });
    s.stats.simsCompleted += 1;
    grantXp(gamification.xpRules.simCompleted);
    addFeed('🏁', 'Completed a ' + (sim.mode === 'full' ? 'full-length' : 'single-section') + ' simulator.');
  });
  checkBadges();

  // save result for the results view
  sim._result = { total: total, sectionScores: sectionScores, accuracy: accuracy };
  sim.phase = 'done';
  simSave();
  render();
}

function renderSimDone(el) {
  const r = sim._result;
  const st = loadState();
  const secOrder = sim.sections.map(s => s.key);
  const cards = Object.keys(SIM_SECTIONS).filter(k => secOrder.includes(k));
  el.innerHTML = `
    <div class="lesson-container text-center">
      <div class="stat-display" style="font-size:3rem">🏁</div>
      <h1>Exam Complete</h1>
      <p class="text-muted">${new Date().toLocaleString()}</p>
      <div class="row" style="justify-content:center;align-items:baseline;gap:1rem;margin:1.5rem 0">
        <div>
          <div class="stat-display" style="font-size:3rem;color:var(--color-primary)">${r.total}</div>
          <div class="stat-label">GMAT Focus Total</div>
        </div>
        <div class="text-muted" style="font-size:1.4rem">/ 805</div>
      </div>
      <div class="grid grid-2" style="max-width:520px;margin:0 auto 1rem">
        ${cards.map(k => `
          <div class="card text-center">
            <div class="stat-value">${r.sectionScores[k]}</div>
            <div class="stat-label">${SIM_SECTIONS[k].icon} ${SIM_SECTIONS[k].name}</div>
            <div class="text-muted fs-small">Section score (60–90)</div>
          </div>`).join('')}
      </div>
      <div class="text-muted">Overall accuracy: ${Math.round(r.accuracy * 100)}%</div>
      <p class="text-muted">Section scores are heuristic projections from your accuracy.<br>On the real GMAT, Section Adaptive Scoring calibrates every question.</p>
      <div class="row" style="justify-content:center;margin-top:1rem">
        <button class="btn btn-primary" onclick="location.hash='#/practice/error'">Review Missed Questions</button>
        <button class="btn btn-outline" onclick="location.hash='#/analytics'">Analytics</button>
        <button class="btn btn-ghost" onclick="simClear();location.hash='#/simulator'">Back to Simulator</button>
      </div>
    </div>`;
  simClear();
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