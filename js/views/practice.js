/* =====================================================================
   GMAT 750+ Trainer - Practice view
   Hub (#/practice), set composer, question-by-question session,
   error-log review and flagged-question review.
   Session persists in sessionStorage so a refresh does not lose progress.
   ===================================================================== */

'use strict';

const SESSION_KEY = 'gmat750_practice_session';
const SESSION_TTL = 4 * 3600 * 1000; // 4 hours

let ps = null; // current practice session
let lastConfig = null;   // config of most recently finished set (for "do it again")
let lastSnapshot = null; // {questions, answers} for post-set review

/* ---------------------------------------------------------------------
   Session model
   ps = {
     config: {mode, section, topic, difficulty, count, perQSeconds},
     questions: [q],
     idx: number,
     answers: [{chosen, correct, secs, ts}],
     startedAt: number,
     thinkStart: number    // when current question started being answered
   }
   --------------------------------------------------------------------- */
function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.questions && parsed.startedAt && Date.now() - parsed.startedAt < SESSION_TTL) {
        ps = parsed;
        return ps;
      }
    }
  } catch (e) { /* ignore */ }
  ps = null;
  return null;
}

function persistSession() {
  if (ps) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(ps)); } catch (e) { /* ignore */ }
  } else {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }
}

function clearSession() {
  ps = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
}

/* ---------------------------------------------------------------------
   Question pool composition
   --------------------------------------------------------------------- */
function composeQuestions(config) {
  let pool = [];
  const qb = questionBank;

  if (config.mode === 'practice') {
    pool = qb.all.slice();
  } else if (config.mode === 'topic') {
    pool = curriculum.questionsForTopic(config.topic);
  } else if (config.mode === 'section') {
    pool = qb[config.section] || qb.all;
  } else if (config.mode === 'error') {
    const ids = new Set(loadState().practice.errorLog.map(e => e.questionId));
    pool = qb.all.filter(q => ids.has(q.id));
  } else if (config.mode === 'flagged') {
    const ids = new Set(loadState().practice.flagged);
    pool = qb.all.filter(q => ids.has(q.id));
  } else if (config.mode === 'due') {
    const dueIds = new Set(questionDueIds());
    pool = qb.all.filter(q => dueIds.has(q.id));
  } else if (config.mode === 'weak') {
    // two lowest-accuracy topics that you have actually attempted
    const st = loadState();
    const topics = ['arithmetic', 'algebra', 'wordproblems', 'numbers', 'stats', 'rc', 'cr', 'ds', 'ms', 'ta', 'gi', 'tp'];
    const acc = {};
    topics.forEach(t => {
      const d = st.stats.byTopic[t];
      if (d && d.attempts >= 3) acc[t] = d.correct / d.attempts;
    });
    const ranked = Object.keys(acc).sort((a, b) => acc[a] - acc[b]);
    const weakest = ranked.slice(0, 2);
    pool = weakest.length ? qb.all.filter(q => weakest.indexOf(q.topic) >= 0).slice(0, 12) : qb.all.slice();
  } else if (config.mode === 'diagnostic') {
    // 1 quant + 1 verbal + 1 DI worth of a quick baseline: 9 questions
    pool = sample(qb.quant, 3).concat(sample(qb.verbal, 3), sample(qb.dataInsights, 3));
  }

  if (config.difficulty && config.difficulty !== 'any') {
    pool = pool.filter(q => q.difficulty === config.difficulty);
  }
  // dedupe
  const seen = new Set();
  pool = pool.filter(q => { if (seen.has(q.id)) return false; seen.add(q.id); return true; });
  if (config.shuffle !== false) pool = shuffle(pool);
  if (config.count && pool.length > config.count) pool = pool.slice(0, config.count);
  // join reading passages onto RC questions
  pool = pool.map(function (q) {
    if (q.passageId && !q.passage) {
      const p = questionBank.rcPassages.find(function (r) { return r.id === q.passageId; });
      if (p) q = Object.assign({}, q, { passage: p.text, passageTitle: p.title });
    }
    return q;
  });
  return pool;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function sample(arr, n) {
  return shuffle(arr.slice()).slice(0, n);
}

/* ---------------------------------------------------------------------
   Hub
   --------------------------------------------------------------------- */
function renderPracticeHub(el) {
  const st = loadState();
  const errCount = st.practice.errorLog.length;
  const flagCount = st.practice.flagged.length;
  const dueCount = questionDueCount();
  const phase = studyPhase();

  const availableTopics = curriculum.sections.map(s => ({
    key: s.key,
    name: s.short,
    icon: s.icon,
    topics: s.topics.map(t => ({ id: t.id, name: t.name, count: curriculum.questionsForTopic(t.id).length }))
  }));

  el.innerHTML = `
    <div class="page-header">
      <h1>Practice</h1>
      <p class="text-muted">Solidify your skills with realistic GMAT Focus questions, topic by topic.</p>
    </div>

    <div class="study-phase-banner">
      <div class="phase-badge">${phase.icon} ${phase.title}</div>
      <div class="phase-info">
        <div class="phase-label">Where you are now</div>
        <div class="phase-desc">${esc(phase.desc)}</div>
      </div>
      <div class="phase-progress-wrap" title="${esc(phase.next)}">
        <div class="phase-progress-bar" style="width:${Math.max(4, phase.pct)}%"></div>
      </div>
      <div class="phase-next">${esc(phase.next)}</div>
    </div>

    <h2 class="section-title">Quick Start</h2>
    <div class="mode-grid">
      <button class="mode-card" onclick="startQuick()">
        <span class="mode-icon">🔀</span>
        <span class="mode-title">Mixed Practice</span>
        <span class="mode-desc">10 random questions across all sections. Great for daily volume.</span>
      </button>
      <button class="mode-card" onclick="startDiagnostic()">
        <span class="mode-icon">🩺</span>
        <span class="mode-title">Diagnostic (9Q)</span>
        <span class="mode-desc">3-quant / 3-verbal / 3-DI baseline. See where you stand.</span>
      </button>
      <button class="mode-card" onclick="startDue()">
        <span class="mode-icon">🔁</span>
        <span class="mode-title">Spaced Review ${dueCount ? `<span class="badge badge-primary">${dueCount}</span>` : ''}</span>
        <span class="mode-desc">Questions due today from your spaced-repetition schedule. 1→3→7→14→30 day intervals.</span>
      </button>
      <button class="mode-card" onclick="startWeak()">
        <span class="mode-icon">🎯</span>
        <span class="mode-title">Weak Areas</span>
        <span class="mode-desc">Your two lowest-accuracy topics. Drilling these moves your score fastest.</span>
      </button>
      <button class="mode-card" onclick="location.hash='#/practice/error'">
        <span class="mode-icon">🔍</span>
        <span class="mode-title">Error Review ${errCount ? `<span class="badge badge-danger">${errCount}</span>` : ''}</span>
        <span class="mode-desc">Re-do the questions you missed. This is where real gains happen.</span>
      </button>
      <button class="mode-card" onclick="location.hash='#/practice/flagged'">
        <span class="mode-icon">🚩</span>
        <span class="mode-title">Flagged Review ${flagCount ? `<span class="badge badge-accent">${flagCount}</span>` : ''}</span>
        <span class="mode-desc">Revisit the questions you flagged during practice.</span>
      </button>
    </div>

    <h2 class="section-title">Section Practice</h2>
    <div class="section-tabs" id="secTabs">
      ${availableTopics.map((s, i) => `<button class="section-tab-btn ${i === 0 ? 'active' : ''}" data-sec="${s.key}">${s.icon} ${s.name}</button>`).join('')}
    </div>
    ${availableTopics.map((s, si) => `
      <div class="learn-section" data-sec-panel="${s.key}" ${si !== 0 ? 'style="display:none"' : ''}>
        <div class="grid grid-3">
          ${s.topics.map(t => `
            <div class="card card-hover topic-card" style="cursor:pointer" onclick="location.hash='#/practice/topic/${t.id}'">
              <div class="topic-name">${esc(t.name)}</div>
              <div class="topic-meta">${t.count} questions</div>
              <button class="btn btn-sm btn-outline mt-1" type="button">Start →</button>
            </div>`).join('')}
        </div>
      </div>`).join('')}

    <h2 class="section-title">Custom Set</h2>
    <section class="card">
      <div class="field-row">
        <div class="field">
          <label>Difficulty</label>
          <select id="cfDiff">
            <option value="any">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div class="field">
          <label>Format</label>
          <select id="cfFormat">
            <option value="practice">Mixed (all sections)</option>
            <option value="quant">Quant</option>
            <option value="verbal">Verbal</option>
            <option value="dataInsights">Data Insights</option>
          </select>
        </div>
        <div class="field">
          <label>Per-question time (sec)</label>
          <select id="cfTime">
            <option value="0">No limit</option>
            <option value="150">2:30</option>
            <option value="120">2:00</option>
            <option value="90">1:30</option>
            <option value="60">1:00</option>
          </select>
        </div>
        <div class="field">
          <label>Questions</label>
          <select id="cfCount">
            <option value="5">5</option>
            <option value="10" selected>10</option>
            <option value="15">15</option>
            <option value="20">20</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" onclick="startCustom()">Build Set →</button>
    </section>`;

  el.querySelectorAll('#secTabs .section-tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      el.querySelectorAll('#secTabs .section-tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const key = this.getAttribute('data-sec');
      el.querySelectorAll('.learn-section[data-sec-panel]').forEach(s => {
        s.style.display = s.getAttribute('data-sec-panel') === key ? '' : 'none';
      });
    });
  });
}

/* ---------------------------------------------------------------------
   Session starters (exposed globally for button click handlers)
   --------------------------------------------------------------------- */
function beginSession(config) {
  const questions = composeQuestions(config);
  if (!questions.length) {
    toast('No questions match that configuration.', 'error');
    return;
  }
  ps = {
    config: config,
    questions: questions,
    idx: 0,
    answers: [],
    startedAt: Date.now(),
    thinkStart: Date.now()
  };
  persistSession();
  location.hash = '#/practice/session';
}

function startQuick() {
  beginSession({ mode: 'practice', difficulty: 'any', count: 10, perQSeconds: 0 });
}
function startDiagnostic() {
  beginSession({ mode: 'diagnostic', difficulty: 'any', count: 9, perQSeconds: 0 });
}
function startDue() {
  beginSession({ mode: 'due', difficulty: 'any', count: 0, perQSeconds: 0 });
}
function startWeak() {
  beginSession({ mode: 'weak', difficulty: 'any', count: 0, perQSeconds: 0 });
}
/** Focused drill: same topic at a specific difficulty (post-answer action). */
function startFocused(topicId, difficulty) {
  beginSession({ mode: 'topic', topic: topicId, difficulty: difficulty || 'any', count: 5, perQSeconds: 0 });
}
function startCustom() {
  const diff = document.getElementById('cfDiff').value;
  const fmt = document.getElementById('cfFormat').value;
  const time = parseInt(document.getElementById('cfTime').value, 10);
  const count = parseInt(document.getElementById('cfCount').value, 10);
  let section = null, mode = 'practice';
  if (fmt === 'quant' || fmt === 'verbal' || fmt === 'dataInsights') {
    section = fmt; mode = 'section';
  }
  beginSession({ mode: mode, section: section, difficulty: diff, count: count, perQSeconds: time });
}

/* ---------------------------------------------------------------------
   Question session renderer
   --------------------------------------------------------------------- */
function renderPracticeSession(el) {
  if (!loadSession()) {
    toast('No active session — start one from the hub.', 'error');
    location.hash = '#/practice';
    return;
  }
  const current = ps.questions[ps.idx];
  if (!current) { renderSummary(el); return; }

  const qn = ps.idx + 1;
  const total = ps.questions.length;
  const mode = ps.config && ps.config.mode;
  const paceTarget = paceTargetFor(current);

  let passageHtml = '';
  if (current.passage) {
    passageHtml = `<div class="clue-box" style="margin-bottom:1rem">
      <div style="font-weight:700;margin-bottom:.5rem">📄 ${esc(current.passageTitle || 'Passage')}</div>
      <div class="passage-text" style="white-space:pre-line">${esc(current.passage)}</div>
    </div>`;
  }

  el.innerHTML = `
    <div class="question-view">
      <div class="question-topbar">
        <div class="row" style="align-items:center;gap:.5rem">
          <span class="badge badge-secondary">Question ${qn}/${total}</span>
          <span class="badge ${difficultyClass(current.difficulty)}">${difficultyLabel(current.difficulty)}</span>
          <span class="badge badge-ghost">${topicTagName(current.topic)}</span>
          <span class="badge badge-ghost pace-target-chip" title="Recommended time for this question">⏱ ~${fmtShort(paceTarget)}</span>
        </div>
        <div class="row" style="align-items:center;gap:.75rem">
          ${ps.config && ps.config.perQSeconds ? `<span class="timer-display" id="qTimer">${fmtClockForTimer(ps.config.perQSeconds)}</span>` : `<span class="timer-display" id="qTimer">${fmtClockForTimer(0)}</span>`}
          <button class="btn btn-sm btn-ghost ${isFlagged(current.id) ? 'flagged-active' : ''}" id="flagBtn" title="Flag for later review (F)">🚩</button>
          <button class="btn btn-sm btn-outline" onclick="quitSession()">Exit</button>
        </div>
      </div>

      ${passageHtml}

      <div class="question-text">${esc(current.text)}</div>

      <div id="options">
        ${current.options.map((o, i) => `
          <button class="option" data-o="${i}" type="button">
            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
            <span>${esc(o)}</span>
          </button>`).join('')}
      </div>

      <div class="practice-actions-row">
        ${current.hint ? `<button class="btn btn-sm btn-ghost" id="hintBtn" title="Show a nudge (H)">💡 Hint</button>` : ''}
        <span class="kbd-hint">1–5 select · Enter next · N next · S skip · F flag ${current.hint ? '· H hint' : ''} · ? help</span>
      </div>
      <div id="hintPanel" style="display:none" class="hint-panel"></div>

      <div id="feedback" style="display:none"></div>
    </div>`;

  // Per-question countdown
  const qStart = Date.now();
  if (ps.config && ps.config.perQSeconds) {
    const limit = ps.config.perQSeconds;
    const timerTick = (rem) => {
      const t = el.querySelector('#qTimer');
      if (t) {
        t.textContent = fmtClockForTimer(rem);
        t.classList.toggle('warning', rem <= 30 && rem > 10);
        t.classList.toggle('danger', rem <= 10);
      }
    };
    Timer.start(limit, timerTick, () => {
      // time up: auto-lock
      submitAnswer(-1, true);
    });
  } else {
    // elapsed stopwatch
    const id = setInterval(() => {
      if (!ps) { clearInterval(id); return; }
      const t = el.querySelector('#qTimer');
      if (t) t.textContent = fmtClockForTimer(Math.round((Date.now() - qStart) / 1000));
    }, 500);
    ps._stopwatch = id;
  }

  // Flag toggle
  const flagBtn = el.querySelector('#flagBtn');
  flagBtn.addEventListener('click', function () {
    if (!ps) return;
    const id = ps.questions[ps.idx].id;
    const st = loadState();
    const has = st.practice.flagged.includes(id);
    updateState(s => {
      if (has) s.practice.flagged = s.practice.flagged.filter(x => x !== id);
      else s.practice.flagged.push(id);
    });
    this.classList.toggle('flagged-active', !has);
    toast(has ? 'Flag removed.' : 'Question flagged for review.', 'success');
  });

  // Answer selection (single selection - click to commit)
  const optionsBox = el.querySelector('#options');
  optionsBox.querySelectorAll('.option').forEach(btn => {
    btn.addEventListener('click', function () {
      if (ps.answers && ps.answers[ps.idx]) return;
      const oi = +this.getAttribute('data-o');
      submitAnswer(oi, false);
    });
  });

  // Hint reveal (graded — never spoils the answer letter)
  const hintBtn = el.querySelector('#hintBtn');
  if (hintBtn) {
    hintBtn.addEventListener('click', revealHint);
  }
  function revealHint() {
    if (ps.answers && ps.answers[ps.idx]) return;
    ps._hintUsed = true;
    playSound('select');
    const panel = el.querySelector('#hintPanel');
    panel.style.display = 'block';
    panel.innerHTML = `<div class="hint-icon">💡</div>
      <div class="hint-text">${esc(current.hint)}</div>
      <button class="btn btn-sm btn-ghost" type="button" onclick="document.getElementById('hintPanel').style.display='none'">Hide</button>`;
  }

  // Keyboard shortcuts (1-5 / A-E select, Enter/next, N next, S skip, F flag, H hint)
  const onKey = (e) => {
    if (!ps) return;
    const qAnswered = !!(ps.answers && ps.answers[ps.idx]);
    const k = e.key.toLowerCase();
    if (k === 'enter') {
      e.preventDefault();
      if (qAnswered) { nextQuestion(); }
      return;
    }
    if (k === 'n') { e.preventDefault(); if (qAnswered) nextQuestion(); return; }
    if (k === 's') { e.preventDefault(); skipQuestion(); return; }
    if (k === 'f') { e.preventDefault(); const fb = el.querySelector('#flagBtn'); if (fb) fb.click(); return; }
    if (k === 'h') { e.preventDefault(); if (hintBtn && !qAnswered) revealHint(); return; }
    if (k === '?') {
      e.preventDefault();
      toast('1–5 / A–E select · Enter or N next · S skip · F flag · H hint', 'info');
      return;
    }
    if (!qAnswered && /^[1-5a-e]$/.test(k)) {
      const idx = /^[a-e]$/.test(k) ? k.charCodeAt(0) - 97 : +k - 1;
      const t = el.querySelector('#options .option[data-o="' + idx + '"]');
      if (t) { playSound('type'); t.classList.add('selected'); t.click(); }
    }
  };
  __kbdHandler = onKey;
}

let __kbdHandler = null;
document.addEventListener('keydown', function (e) {
  if (__kbdHandler) __kbdHandler(e);
});

function isFlagged(id) {
  return loadState().practice.flagged.includes(id);
}

function submitAnswer(chosen, timedOut) {
  if (!ps) return;
  const q = ps.questions[ps.idx];
  const secs = Math.round((Date.now() - ps.thinkStart) / 1000);
  const correct = !timedOut && chosen === q.correct;
  const hintUsed = !!(ps._hintUsed || false);
  ps._hintUsed = false;

  // Stopwatch cleanup
  if (ps._stopwatch) { clearInterval(ps._stopwatch); ps._stopwatch = null; }
  if (ps.config && ps.config.perQSeconds) Timer.stop();

  const sectionKey = sectionForQuestion(q);
  saveAnswerDetailed(q, sectionKey, {
    selected: chosen, timedOut: timedOut, secs: secs, hintUsed: hintUsed,
    felt: null, errorTag: null, confidence: null
  });

  ps.answers.push({ chosen: chosen, correct: correct, secs: secs, ts: Date.now(), hintUsed: hintUsed });
  ps.thinkStart = Date.now();
  persistSession();

  // Reveal
  const el = document.getElementById('app');
  const optionsBox = el.querySelector('#options');
  optionsBox.querySelectorAll('.option').forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
    const oi = +btn.getAttribute('data-o');
    if (oi === q.correct) btn.classList.add('correct');
    if (oi === chosen && chosen !== q.correct) btn.classList.add('incorrect');
  });

  playSound(correct ? 'correct' : 'incorrect');

  const fb = el.querySelector('#feedback');
  fb.style.display = '';
  const expl = esc(q.explanation || '');
  const target = paceTargetFor(q);
  const pc = paceClass(secs, target);
  const paceMsg = secs < 15 ? 'Blink answer — under 15s. Make sure you solved it, not pattern-matched.'
    : pc === 'pace-fast' ? 'Faster than recommended — good, but slow down if it means guessing.'
    : pc === 'pace-slow' ? 'Over the ~target. Before answering, name the approach: which concept, which formula.'
    : 'Right pace for this question.';
  const topicKey = curriculum.topicKeyForQTopic(q.topic);
  const correctLetter = String.fromCharCode(65 + q.correct);

  fb.innerHTML = `
    <div class="clue-box ${correct ? 'lesson-box-success' : 'lesson-box-danger'}" style="margin:1rem 0">
      <div class="verdict-row">
        ${timedOut ? '⏰ Time up!' : correct ? '✅ Correct — well done!' : '❌ Incorrect.'}
        ${!correct && !timedOut ? ' Correct answer: <span class="example-answer">' + correctLetter + '</span>' : ''}
      </div>
      <div class="pace-line pace-${pc}">⏱ You took ${fmtShort(secs)} · recommended ~${fmtShort(target)} — ${esc(paceMsg)}</div>
      <div class="explanation-body">${expl}</div>
    </div>

    ${!correct ? `
    <div class="meta-tag-row" id="errTagRow">
      <span class="meta-label">Why wrong?</span>
      <button class="meta-btn mt-careless" data-err="careless" title="Silly/rushed mistake">😅 Careless</button>
      <button class="meta-btn mt-conceptual" data-err="conceptual" title="Didn't know the concept">📚 Conceptual</button>
      <button class="meta-btn mt-timing" data-err="timing" title="Ran out of time">⏱ Timing</button>
      <button class="meta-btn mt-misread" data-err="misread" title="Misunderstood the question">🔍 Misread</button>
    </div>` : ''}

    <div class="meta-tag-row">
      <span class="meta-label">Felt difficulty</span>
      <button class="meta-btn" data-felt="1" title="Very easy">😊</button>
      <button class="meta-btn" data-felt="2" title="Easy">🙂</button>
      <button class="meta-btn" data-felt="3" title="Medium">😐</button>
      <button class="meta-btn" data-felt="4" title="Hard">😤</button>
      <button class="meta-btn" data-felt="5" title="Very hard">🥵</button>
    </div>

    <div class="meta-tag-row">
      <span class="meta-label">Confidence</span>
      <button class="meta-btn" data-conf="sure">✓ Sure</button>
      <button class="meta-btn" data-conf="unsure">~ Unsure</button>
      <button class="meta-btn" data-conf="guessed">? Guessed</button>
    </div>

    <div class="note-row">
      <textarea id="qNote" maxlength="500" rows="2" placeholder="Note to self — strategy, trap, formula (helps your Error Journal)"></textarea>
      <button class="btn btn-sm btn-outline" id="noteSave">Save note</button>
    </div>

    <div class="row feedback-actions">
      ${ps.idx < ps.questions.length - 1
        ? `<button class="btn btn-primary" id="fbNext">Next →</button>`
        : `<button class="btn btn-primary" id="fbResults">See Results 🏁</button>`}
      <button class="btn btn-sm btn-ghost" data-act="theory">📚 Theory</button>
      ${topicKey ? `<button class="btn btn-sm btn-ghost" data-act="topic">↺ Practice topic</button>` : ''}
      <button class="btn btn-sm btn-ghost" data-act="hard" ${!topicKey ? 'disabled' : ''}>↑ Harder</button>
      <button class="btn btn-sm btn-ghost" data-act="easy" ${!topicKey ? 'disabled' : ''}>↓ Easier</button>
      ${isFlagged(q.id) ? `<button class="btn btn-sm btn-ghost" id="fbUnflag">Unflag</button>` : ''}
    </div>`;

  // Wire meta-tag interactions (persist immediately — feeds the SR + error journal)
  fb.querySelectorAll('[data-err]').forEach(b => {
    b.addEventListener('click', function () {
      fb.querySelectorAll('[data-err]').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
      updateReviewMeta(q.id, { errorTag: this.getAttribute('data-err') });
      if (!correct) playSound('select');
    });
  });
  fb.querySelectorAll('[data-felt]').forEach(b => {
    b.addEventListener('click', function () {
      fb.querySelectorAll('[data-felt]').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
      updateReviewMeta(q.id, { felt: +this.getAttribute('data-felt') });
      playSound('select');
    });
  });
  fb.querySelectorAll('[data-conf]').forEach(b => {
    b.addEventListener('click', function () {
      fb.querySelectorAll('[data-conf]').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
      updateReviewMeta(q.id, { confidence: this.getAttribute('data-conf') });
      playSound('select');
    });
  });
  const noteBtn = fb.querySelector('#noteSave');
  if (noteBtn) {
    noteBtn.addEventListener('click', function () {
      const v = fb.querySelector('#qNote').value.trim();
      updateReviewMeta(q.id, { note: v });
      this.textContent = v ? '✓ Note saved' : 'Save note';
      playSound('type');
    });
  }

  const nextBtn = fb.querySelector('#fbNext');
  if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
  const resBtn = fb.querySelector('#fbResults');
  if (resBtn) resBtn.addEventListener('click', showResults);
  fb.querySelectorAll('[data-act]').forEach(b => {
    if (b.disabled) return;
    b.addEventListener('click', function () {
      const act = this.getAttribute('data-act');
      if (act === 'theory' && topicKey) { location.hash = '#/learn/' + topicKey; return; }
      if (topicKey) startFocused(topicKey, act === 'hard' ? 'hard' : act === 'easy' ? 'easy' : 'any');
    });
  });
  const unflagBtn = fb.querySelector('#fbUnflag');
  if (unflagBtn) unflagBtn.addEventListener('click', function () { unflagQuestion(q.id); });

  if (isFlagged(q.id)) {
    const flagBtn = el.querySelector('#flagBtn');
    if (flagBtn) { flagBtn.classList.add('flagged-active'); }
  }
}

function skipQuestion() {
  if (!ps || !ps.questions) return;
  if (ps.answers[ps.idx]) return; // already answered this one
  ps._hintUsed = false;
  ps.idx += 1;
  if (ps.idx >= ps.questions.length) { showResults(); return; }
  ps.thinkStart = Date.now();
  persistenceAndNav();
}

function nextQuestion() {
  if (!ps) return;
  ps._hintUsed = false;
  ps.idx += 1;
  if (ps.idx >= ps.questions.length) { showResults(); return; }
  persistenceAndNav();
}

function persistenceAndNav() {
  persistSession();
  render();
}

function recordSessionStats() {
  // Called exactly once per session (from showResults or quitSession).
  // Aggregates attempts + seconds by section and updates day/total stats,
  // then grants set XP + feed + badges.
  const total = ps.questions.length;
  const answered = ps.answers.length;
  const correct = ps.answers.filter(a => a.correct).length;

  const bySec = {};
  ps.questions.forEach((q, i) => {
    const a = ps.answers[i];
    if (!a) return;
    const k = sectionForQuestion(q);
    if (!bySec[k]) bySec[k] = { attempts: 0, seconds: 0 };
    bySec[k].attempts += 1;
    bySec[k].seconds += a.secs;
  });
  Object.keys(bySec).forEach(k => addStudySession(bySec[k].attempts, bySec[k].seconds, k));

  // XP is granted per-answer inside recordAnswer; here we only add the
  // session feed line + badges so there is no double-granting.
  const pct = total ? Math.round(correct / total * 100) : 0;
  addFeed('📝', 'Completed a ' + total + '-question practice set (' + pct + '%).');
  checkBadges();
}

function quitSession() {
  if (!ps) { location.hash = '#/practice'; return; }
  if (ps.answers.length > 0) recordSessionStats();
  clearSession();
  __kbdHandler = null;
  render();
}

function showResults() {
  if (!ps) return;
  lastConfig = ps.config;
  lastSnapshot = { questions: ps.questions, answers: ps.answers };
  recordSessionStats();
  // set-level history for the dashboard spacer card
  recordSetHistory({
    mode: (ps.config && ps.config.mode) || 'practice',
    count: ps.questions.length,
    correct: ps.answers.filter(a => a.correct).length,
    seconds: ps.answers.reduce((s, a) => s + (a.secs || 0), 0),
    secsBySection: (function () {
      const m = {};
      ps.questions.forEach((q, i) => {
        const a = ps.answers[i];
        if (!a) return;
        const k = sectionForQuestion(q);
        m[k] = (m[k] || 0) + (a.secs || 0);
      });
      return m;
    })()
  });

  const total = ps.questions.length;
  const answered = ps.answers.length;
  const correct = ps.answers.filter(a => a.correct).length;
  const pct = total ? Math.round(correct / total * 100) : 0;
  const xpEarned = correct * gamification.xpRules.questionCorrect + (answered - correct) * gamification.xpRules.questionIncorrect;
  const hh = Math.round((Date.now() - ps.startedAt) / 1000);

  // section pacing vs official targets (answered-only)
  const paceRows = (function () {
    const secs = {}; const cnt = {};
    ps.questions.forEach((q, i) => {
      const a = ps.answers[i];
      if (!a) return;
      const k = sectionForQuestion(q);
      secs[k] = (secs[k] || 0) + a.secs;
      cnt[k] = (cnt[k] || 0) + 1;
    });
    return ['quant', 'verbal', 'dataInsights'].map(k => {
      if (!cnt[k]) return null;
      const avg = secs[k] / cnt[k];
      const target = PACE_TARGETS[k];
      const pc = paceClass(avg, target);
      const verdict = pc === 'pace-ok' ? 'On target' : pc === 'pace-fast' ? 'Too fast — check if you guessed' : 'Needs work — shave time';
      return { k, avg, target, pc, verdict };
    }).filter(Boolean);
  })();

  const el = document.getElementById('app');
  el.innerHTML = `
    <div class="practice-summary question-view">
      <h1>Set Complete 🏁</h1>
      <div class="grid grid-2" style="margin-top:.5rem">
        <div class="card text-center">
          <div class="stat-value">${correct}/${total}</div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="card text-center">
          <div class="stat-value">${pct}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="card text-center">
          <div class="stat-value">+${xpEarned}</div>
          <div class="stat-label">XP earned</div>
        </div>
        <div class="card text-center">
          <div class="stat-value">${fmtShort(hh)}</div>
          <div class="stat-label">Wall-clock</div>
        </div>
      </div>
      ${paceRows.length ? `<div class="card mt-2" style="margin-top:1rem">
        <h3 class="card-title">Pace vs target</h3>
        ${paceRows.map(r => `
          <div class="pace-row pace-${r.pc}">
            <span class="pace-sec">${r.k === 'dataInsights' ? 'DI' : r.k.charAt(0).toUpperCase() + r.k.slice(1)}</span>
            <span>${fmtShort(Math.round(r.avg))} avg / ${fmtShort(r.target)} target</span>
            <span class="pace-verdict">${r.verdict}</span>
          </div>`).join('')}
        <div class="text-muted mt-1" style="margin-top:.5rem;font-size:.85rem">Targets: Quant 21q/45min · Verbal 23q/45min · DI 20q/45min</div>
      </div>` : ''}
      <div class="row mt-2" style="margin-top:1rem;justify-content:center">
        <button class="btn btn-primary" onclick="location.hash='#/practice'">Back to Practice</button>
        <button class="btn btn-outline" onclick="location.hash='#/analytics'">View Analytics</button>
        <button class="btn btn-ghost" onclick="sameConfigAgain()">Do it again</button>
      </div>
      <div class="card mt-2" style="margin-top:1rem">
        <h3 class="card-title">Review breakdown</h3>
        <div id="setReview"></div>
      </div>
    </div>`;

  const review = el.querySelector('#setReview');
  ps.questions.forEach((q, idx) => {
    const a = ps.answers[idx];
    const ok = a && a.correct;
    review.insertAdjacentHTML('beforeend', `
      <div class="feed-item">
        <span class="feed-icon">${ok ? '✅' : '❌'}</span>
        <span style="cursor:pointer;text-decoration:underline;color:var(--color-secondary)" onclick="reviewQuestion(${idx})">${esc(q.text.slice(0, 80))}${q.text.length > 80 ? '…' : ''}</span>
        <span class="feed-time ${ok ? 'text-success' : 'text-danger'}">${ok ? 'Correct' : 'Missed'}</span>
      </div>`);
  });

  clearSession();
  __kbdHandler = null;
}

function sameConfigAgain() {
  beginSession(lastConfig || { mode: 'practice', difficulty: 'any', count: 10, perQSeconds: 0 });
}

function reviewQuestion(idx) {
  const snap = ps || lastSnapshot;
  if (!snap) return;
  const q = snap.questions[idx];
  const a = snap.answers[idx];
  const el = document.getElementById('app');
  el.querySelector('#setReview').innerHTML = `
    <div class="example-block">
      <span onclick="render()" style="cursor:pointer;color:var(--color-secondary)">← Back to summary</span>
      <div class="example-question mt-1">${esc(q.text)}</div>
      ${q.options.map((o, i) => `
        <div class="option ${i === q.correct ? 'correct' : ''} ${a && a.chosen === i && i !== q.correct ? 'incorrect' : ''} disabled">
          <span class="option-letter">${String.fromCharCode(65 + i)}</span><span>${esc(o)}</span>
        </div>`).join('')}
      <div class="example-reason">${esc(q.explanation || '')}</div>
    </div>`;
}

function sectionForQuestion(q) {
  if (q.topic === 'rc' || q.topic === 'cr') return 'verbal';
  if (q.topic === 'ds' || q.topic === 'ms' || q.topic === 'ta' || q.topic === 'gi' || q.topic === 'tp') return 'dataInsights';
  return 'quant';
}

function topicTagName(tag) {
  const map = {
    arithmetic: 'Arithmetic', algebra: 'Algebra', wordproblems: 'Word Problems',
    numbers: 'Number Properties', stats: 'Statistics', rc: 'Reading Comp',
    cr: 'Critical Reasoning', ds: 'Data Sufficiency', ms: 'Multi-Source',
    ta: 'Table Analysis', gi: 'Graphics Interpretation', tp: 'Two-Part Analysis'
  };
  return map[tag] || tag;
}

/* ---------------------------------------------------------------------
   Error log review
   --------------------------------------------------------------------- */
function renderErrorReview(el) {
  const st = loadState();
  const log = st.practice.errorLog;
  if (!log.length) {
    el.innerHTML = `<div class="page-header"><h1>Error Review</h1></div>
      <div class="empty-state"><span class="empty-icon">🎉</span><p>Nothing in the error log yet. Miss a question in practice and it shows up here.</p>
      <button class="btn btn-outline" onclick="location.hash='#/practice'">Back to Practice</button></div>`;
    return;
  }
  el.innerHTML = `
    <div class="page-header">
      <h1>Error Review <span class="badge badge-danger">${log.length}</span></h1>
      <p class="text-muted">Re-attempt questions you missed. Retry the full log as a set, or scan them one by one.</p>
    </div>
    <div class="row" style="margin-bottom:1rem">
      <button class="btn btn-primary" onclick="beginErrorSession()">Re-do all ${log.length} questions</button>
      <button class="btn btn-ghost btn-sm" onclick="clearErrorLog()">Clear log</button>
    </div>
    <div class="grid grid-2">
      ${log.slice().reverse().map((e, ri) => {
        const q = questionBank.byId[e.questionId];
        if (!q) return '';
        return `<div class="card">
          <div class="feed-item"><span class="badge badge-secondary">${topicTagName(q.topic)}</span><span class="feed-time">${new Date(e.ts).toLocaleDateString()}</span></div>
          <div class="example-question mt-1">${esc(q.text.slice(0, 140))}${q.text.length > 140 ? '…' : ''}</div>
          <div class="text-muted fs-small">You chose ${e.youChose >= 0 ? String.fromCharCode(65 + e.youChose) : '—'} · Correct: ${String.fromCharCode(65 + q.correct)}</div>
          <button class="btn btn-sm btn-outline mt-1" onclick="location.hash='#/practice/topic/${curriculum.topicKeyForQTopic(q.topic)}'">Practice this topic</button>
        </div>`;
      }).join('')}
    </div>`;
}

function beginErrorSession() {
  beginSession({ mode: 'error', difficulty: 'any', count: 0, perQSeconds: 0 });
}

function clearErrorLog() {
  updateState(st => {
    st.practice.errorLog = [];
    st.stats.errorLogCount = 0;
  });
  toast('Error log cleared.', 'success');
  render();
}

/* ---------------------------------------------------------------------
   Flagged review
   --------------------------------------------------------------------- */
function renderFlaggedReview(el) {
  const st = loadState();
  const flags = st.practice.flagged;
  if (!flags.length) {
    el.innerHTML = `<div class="page-header"><h1>Flagged Questions</h1></div>
      <div class="empty-state"><span class="empty-icon">🚩</span><p>You have not flagged any questions.</p>
      <button class="btn btn-outline" onclick="location.hash='#/practice'">Back to Practice</button></div>`;
    return;
  }
  el.innerHTML = `
    <div class="page-header">
      <h1>Flagged Questions <span class="badge badge-accent">${flags.length}</span></h1>
      <p class="text-muted">Questions you flagged during practice for a second look.</p>
    </div>
    <div class="grid grid-2">
      ${flags.map(id => {
        const q = questionBank.byId[id];
        if (!q) return '';
        return `<div class="card">
          <div class="row" style="margin-bottom:.5rem">
            <span class="badge ${difficultyClass(q.difficulty)}">${difficultyLabel(q.difficulty)}</span>
            <span class="badge badge-ghost">${topicTagName(q.topic)}</span>
            <button class="btn btn-sm btn-ghost ml-auto" onclick="unflagQuestion('${q.id}')">Unflag</button>
          </div>
          <div class="example-question">${esc(q.text.slice(0, 160))}${q.text.length > 160 ? '…' : ''}</div>
          <button class="btn btn-sm btn-outline mt-1" onclick="location.hash='#/practice/topic/${curriculum.topicKeyForQTopic(q.topic)}'">Practice this topic</button>
        </div>`;
      }).join('')}
    </div>`;
}

function unflagQuestion(id) {
  updateState(st => {
    st.practice.flagged = st.practice.flagged.filter(x => x !== id);
  });
  render();
}

window.startQuick = startQuick;
window.startDiagnostic = startDiagnostic;
window.startCustom = startCustom;
window.beginSession = beginSession;
window.nextQuestion = nextQuestion;
window.showResults = showResults;
window.quitSession = quitSession;
window.sameConfigAgain = sameConfigAgain;
window.reviewQuestion = reviewQuestion;
window.unflagQuestion = unflagQuestion;
window.clearErrorLog = clearErrorLog;
window.beginErrorSession = beginErrorSession;
window.startDue = startDue;
window.startWeak = startWeak;
window.startFocused = startFocused;
window.skipQuestion = skipQuestion;

/* Register route */
App.register('practice', {
  title: 'Practice',
  menuKey: 'practice',
  render: function (el, args) {
    if (args && args[0] === 'session') renderPracticeSession(el);
    else if (args && args[0] === 'error') renderErrorReview(el);
    else if (args && args[0] === 'flagged') renderFlaggedReview(el);
    else if (args && args[0] === 'topic' && args[1]) {
      // Always start a fresh topic set when landing on the topic route
      beginSession({ mode: 'topic', topic: args[1], difficulty: 'any', count: 0, perQSeconds: 0 });
    }
    else renderPracticeHub(el);
  }
});