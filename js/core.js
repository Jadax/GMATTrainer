/* =====================================================================
   GMAT 750+ Trainer - Core engine
   Global state, localStorage persistence, XP/streak/tracking, timers,
   toast/modal utilities, general helpers.
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   Namespace / singletons
   --------------------------------------------------------------------- */
const Store = {
  KEYS: {
    state: 'gmat750_state_v1'
  }
};

/* ---------------------------------------------------------------------
   NEW MODEL + XP accounting. On new install we seed default values.
   --------------------------------------------------------------------- */

/** Build the default (fresh) state object. */
function buildDefaultState() {
  const now = Date.now();
  return {
    version: 1,
    user: {
      name: 'GMAT Candidate',
      targetScore: 705,
      targetDate: null,
      dailyGoal: 20
    },
    settings: {
      theme: 'light',
      calculator: true,       // allow on-screen calculator (DI only anyway)
      breaksBetweenSims: true, // 5-minute break option
      spacedRepetition: true
    },
    stats: {
      totalAnswered: 0,
      totalCorrect: 0,
      totalSeconds: 0,          // active study seconds across all modes
      lessonsCompleted: 0,
      checkCorrectStreak: 0,    // used for perfect-set tracking
      perfectSets: 0,
      simsCompleted: 0,
      errorLogCount: 0,
      studyDays: {},            // { '2026-01-01': {questions, seconds, goalHit} }
      bestStreak: 0,
      dailyGoalHits: 0,
      hardCorrect: 0,
      cardsReviewed: 0,
      imports: 0,
      nightAnswers: 0,
      bySection: {
        quant: { attempts: 0, correct: 0, seconds: 0 },
        verbal: { attempts: 0, correct: 0, seconds: 0 },
        dataInsights: { attempts: 0, correct: 0, seconds: 0 }
      },
      byTopic: {},      // keyed by topic tag (arithmetic, algebra, ...) {attempts, correct, seconds}
      byDifficulty: { easy: {attempts: 0, correct: 0}, medium: {attempts: 0, correct: 0}, hard: {attempts: 0, correct: 0} },
      history: []        // recent activity feed (max 12) {type, text, ts}
    },
    practice: {
      history: [],        // one entry per completed set {ts, mode, section, total, correct, seconds, topic, difficulty}
      errorLog: [],       // [{questionId, ts, youChose, section}]
      flagged: [],        // [questionId] user bookmarks
      adaptiveLevel: {}   // { topicTag: difficultyIndex }
    },
    learning: {},        // { topicId: {status: not-started|in-progress|mastered, lastLessonAt, due} }
    sims: [],            // completed full-length attempts {ts, sections, totalScore, sectionScores, accuracy}
    planner: null,       // { goalDate, hoursPerWeek, generatedAt, week: [...] }
    flashcards: [],      // [{front, back, due, reviews}]
    xp: 0,
    badgesEarned: {},    // { badgeId: ts }
    lastSeen: now
  };
}

/* ---------------------------------------------------------------------
   State read / write (with localStorage persistence & safe parsing)
   --------------------------------------------------------------------- */
let __state = null;

function loadState() {
  if (__state) return __state;
  try {
    const raw = localStorage.getItem(Store.KEYS.state);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) {
        __state = deepMerge(buildDefaultState(), parsed);
        return __state;
      }
    }
  } catch (e) {
    // Corrupt storage - fall through to defaults
  }
  __state = buildDefaultState();
  saveState();
  return __state;
}

function saveState() {
  try {
    localStorage.setItem(Store.KEYS.state, JSON.stringify(__state));
  } catch (e) {
    toast('Could not save progress (storage full?).', 'error');
  }
}

/** Deep-merge src into base (base wins for missing keys, src provides values). */
function deepMerge(base, src) {
  if (Array.isArray(base)) {
    return Array.isArray(src) ? src : base;
  }
  if (typeof base === 'object' && base !== null && typeof src === 'object' && src !== null) {
    const out = {};
    Object.keys(base).forEach(k => {
      if (k in src) {
        out[k] = deepMerge(base[k], src[k]);
      } else {
        out[k] = deepMerge(base[k], base[k]);
      }
    });
    // include extra keys that only exist in src (e.g., new history entries)
    Object.keys(src).forEach(k => {
      if (!(k in base)) out[k] = src[k];
    });
    return out;
  }
  return src !== undefined ? src : base;
}

function updateState(fn) {
  const st = loadState();
  fn(st);
  st.lastSeen = Date.now();
  saveState();
  App.emit('state', st);
  return st;
}

/* ---------------------------------------------------------------------
   Misc utilities
   --------------------------------------------------------------------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function fmtTime(seconds) {
  seconds = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = n => String(n).padStart(2, '0');
  if (h > 0) return h + ':' + pad(m) + ':' + pad(s);
  return m + ':' + pad(s);
}

function fmtClockForTimer(totalSeconds) {
  // mm:ss
  totalSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function todayKey(ts) {
  const d = ts ? new Date(ts) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function dateKeyFromOffset(daysAgo) {
  return todayKey(Date.now() - daysAgo * 86400000);
}

function getStudyDay(key) {
  const st = loadState();
  if (!st.stats.studyDays[key]) st.stats.studyDays[key] = { questions: 0, seconds: 0, goalHit: false };
  return st.stats.studyDays[key];
}

function addStudySession(questions, seconds, sectionKey) {
  updateState(st => {
    const day = getStudyDay(todayKey());
    day.questions += questions;
    day.seconds += seconds;
    st.stats.totalSeconds += seconds;
    st.stats.totalAnswered += questions;
    const sec = st.stats.bySection[sectionKey];
    if (sec) { sec.seconds += seconds; }
    // Notify daily goal
    const goal = st.user.dailyGoal || 20;
    if (day.questions >= goal && !day.goalHit) {
      day.goalHit = true;
      st.stats.dailyGoalHits += 1;
      grantXp(gamification.xpRules.dailyGoalHit);
      addFeed('🎯', 'Daily goal reached!');
      toast('Daily goal reached — great work!', 'success');
    }
    recalcStreak(st);
  });
}

function recordAnswer(question, correct, secs, sectionKey) {
  updateState(st => {
    const qt = st.stats.byTopic[question.topic] || (st.stats.byTopic[question.topic] = { attempts: 0, correct: 0, seconds: 0 });
    qt.attempts += 1;
    if (correct) qt.correct += 1;
    qt.seconds += secs;

    const df = st.stats.byDifficulty[question.difficulty];
    if (df) { df.attempts += 1; if (correct) df.correct += 1; }

    const sec = st.stats.bySection[sectionKey];
    if (sec) { sec.attempts += 1; if (correct) sec.correct += 1; }

    st.stats.totalCorrect += (correct ? 1 : 0);

    if (question.difficulty === 'hard' && correct) st.stats.hardCorrect += 1;

    const now = new Date();
    if (now.getHours() >= 22 || now.getHours() < 4) st.stats.nightAnswers += 1;

    if (correct) {
      grantXp(gamification.xpRules.questionCorrect, st);
      pushPerfectContext(st, true);
    } else {
      grantXp(gamification.xpRules.questionIncorrect, st);
      pushPerfectContext(st, false);
    }
    recalcStreak(st);
  });
  App.emit('state', loadState());
}

/** Track perfect sets: any contiguous run where every answer was correct within a session. */
function pushPerfectContext(st, correct) {
  if (correct) {
    st._perfectRun = (st._perfectRun || 0) + 1;
    if (st._perfectRun >= 5) {
      st.stats.perfectSets += 1;
      grantXp(gamification.xpRules.perfectSet, st);
      addFeed('✨', 'Perfect set — 5+ correct in a row!');
    }
  } else {
    st._perfectRun = 0;
  }
}

function addErrorLog(questionId, selectedIndex, sectionKey) {
  updateState(st => {
    // Remove old entry for same question (dedupe)
    st.practice.errorLog = st.practice.errorLog.filter(e => e.questionId !== questionId);
    st.practice.errorLog.push({
      questionId: questionId,
      youChose: selectedIndex,
      ts: Date.now(),
      section: sectionKey
    });
    st.stats.errorLogCount = st.practice.errorLog.length;
  });
}

function addFeed(icon, text) {
  updateState(st => {
    st.stats.history.unshift({ icon: icon, text: text, ts: Date.now() });
    if (st.stats.history.length > 12) st.stats.history.length = 12;
  });
}

function grantXp(amount, stOverride) {
  const st = stOverride || loadState();
  st.xp = (st.xp || 0) + amount;
}

function recalcStreak(st) {
  // Streak = number of consecutive days (ending today or yesterday) with activity
  let streak = 0;
  let offset = 0;
  const today = todayKey();
  // If today has activity, count backward from today; otherwise allow an active yesterday.
  let key = dateKeyFromOffset(offset);
  if (!st.stats.studyDays[key] || st.stats.studyDays[key].questions === 0) {
    offset = 1;
  }
  while (true) {
    key = dateKeyFromOffset(offset);
    const d = st.stats.studyDays[key];
    if (d && d.questions > 0) {
      streak += 1;
      offset += 1;
    } else {
      break;
    }
    if (offset > 1000) break;
  }
  st.stats.bestStreak = Math.max(st.stats.bestStreak || 0, streak);
}

/* ---------------------------------------------------------------------
   Badges evaluation - run after state changes.
   Guarded so emitting 'state' from inside cannot recurse infinitely.
   --------------------------------------------------------------------- */
let __badgeCheckGuard = false;
function checkBadges() {
  if (__badgeCheckGuard) return;
  __badgeCheckGuard = true;
  try {
    const st = loadState();
    let changed = false;
    gamification.badges.forEach(b => {
      if (!st.badgesEarned[b.id] && b.check(st)) {
        st.badgesEarned[b.id] = Date.now();
        changed = true;
        toast('Badge unlocked: ' + b.name + ' ' + b.icon, 'success');
        st.stats.history.unshift({
          icon: b.icon,
          text: 'Badge earned: ' + b.name,
          ts: Date.now()
        });
        if (st.stats.history.length > 12) st.stats.history.length = 12;
      }
    });
    if (changed) {
      saveState();
      App.emit('state', loadState());
    }
  } finally {
    __badgeCheckGuard = false;
  }
}

/* ---------------------------------------------------------------------
   Daily-goal helpers (for dashboard)
   --------------------------------------------------------------------- */
function todayProgress() {
  const st = loadState();
  const day = st.stats.studyDays[todayKey()] || { questions: 0, seconds: 0, goalHit: false };
  const goal = st.user.dailyGoal || 20;
  return {
    questions: day.questions,
    seconds: day.seconds,
    goal: goal,
    goalHit: day.goalHit,
    pct: Math.min(100, Math.round(day.questions / goal * 100))
  };
}

/* ---------------------------------------------------------------------
   Topic-level helpers for learning progress
   --------------------------------------------------------------------- */
function learningStatus(topicId) {
  const st = loadState();
  return st.learning[topicId] ||
    { status: 'not-started', lastLessonAt: null, due: null, masteredAt: null };
}

function markTopicLearned(topicId) {
  updateState(st => {
    const t = st.learning[topicId] || (st.learning[topicId] = {});
    t.status = 'mastered';
    t.masteredAt = Date.now();
    st.stats.lessonsCompleted += 1;
    grantXp(gamification.xpRules.lessonCompleted);
    addFeed('📘', 'Lesson completed: ' + topicName(topicId));
  });
  // spaced repetition schedule: due in 3, 7, 14 days
  scheduleRepetition(topicId);
}

function scheduleRepetition(topicId) {
  updateState(st => {
    const t = st.learning[topicId] || (st.learning[topicId] = {});
    t.due = Date.now() + (t.reviews === 1 ? 7 : 3) * 86400000;
    t.reviews = (t.reviews || 0) + 1;
  });
}

function topicName(topicId) {
  const t = curriculum.topics.find(x => x.id === topicId);
  return t ? t.name : topicId;
}

/* ---------------------------------------------------------------------
   Timer service (countdown with pause/resume/auto-submit callback)
   --------------------------------------------------------------------- */
const Timer = {
  handle: null,
  remaining: 0,
  total: 0,
  running: false,
  callbacks: { tick: null, end: null },
  start(totalSeconds, onTick, onEnd) {
    this.stop();
    this.total = totalSeconds;
    this.remaining = totalSeconds;
    this.callbacks = { tick: onTick, end: onEnd };
    this.running = true;
    this.handle = setInterval(() => this._tick(), 1000);
  },
  pause() { this.running = false; },
  resume() {
    if (!this.running && this.handle) {
      this.running = true;
      this.handle = setInterval(() => this._tick(), 1000);
    }
  },
  _tick() {
    if (!this.running) return;
    this.remaining -= 1;
    if (this.callbacks.tick) this.callbacks.tick(this.remaining);
    if (this.remaining <= 0) {
      this.stop();
      if (this.callbacks.end) this.callbacks.end();
    }
  },
  stop() {
    this.running = false;
    if (this.handle) { clearInterval(this.handle); this.handle = null; }
  }
};

/* ---------------------------------------------------------------------
   Toast + modal utilities
   --------------------------------------------------------------------- */
function toast(message, type) {
  const wrap = document.getElementById('toastContainer');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

function openModal(html) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = '<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true">' +
    '<div class="modal-header"><h3>Dialog</h3>' +
    '<button class="modal-close" aria-label="Close">&times;</button></div>' +
    '<div class="modal-body">' + html + '</div></div></div>';
  root.querySelector('.modal-close').addEventListener('click', closeModal);
  root.querySelector('.modal-overlay').addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay')) closeModal();
  });
  return root.querySelector('.modal');
}

function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
}

function ymd(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDuration(seconds) {
  const s = seconds || 0;
  if (s < 60) return Math.round(s) + 's';
  const m = Math.round(s / 60);
  if (m < 60) return m + 'min';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

/* ---------------------------------------------------------------------
   Difficulty label helper
   --------------------------------------------------------------------- */
function difficultyClass(d) { return d === 'easy' ? 'badge-easy' : d === 'medium' ? 'badge-medium' : 'badge-hard'; }
function difficultyLabel(d) { return d.charAt(0).toUpperCase() + d.slice(1); }

/* ---------------------------------------------------------------------
   Section meta helpers
   --------------------------------------------------------------------- */
const APP_VERSION = '1.3.0';

const SECTION_META = {
  quant: { key: 'quant', name: 'Quantitative Reasoning', short: 'Quant', icon: '🔢', count: 21, time: 2700 },
  verbal: { key: 'verbal', name: 'Verbal Reasoning', short: 'Verbal', icon: '📖', count: 23, time: 2700 },
  dataInsights: { key: 'dataInsights', name: 'Data Insights', short: 'Data Insights', icon: '📊', count: 20, time: 2700 }
};

function sectionLabel(key) {
  const m = SECTION_META[key];
  return m ? m.name : key;
}

/* ---------------------------------------------------------------------
   Export / import
   --------------------------------------------------------------------- */
function exportBackup() {
  const st = loadState();
  const data = JSON.stringify({ app: 'GMAT 750+ Trainer', exportedAt: new Date().toISOString(), state: st }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gmat750-backup-' + todayKey() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(file, onDone) {
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!parsed.state || !parsed.state.stats) { toast('Invalid backup file.', 'error'); onDone && onDone(false); return; }
      __state = deepMerge(buildDefaultState(), parsed.state);
      __state.stats.imports = (__state.stats.imports || 0) + 1;
      saveState();
      App.emit('state', loadState());
      toast('Backup imported successfully.', 'success');
      onDone && onDone(true);
    } catch (e) {
      toast('Could not parse backup file.', 'error');
      onDone && onDone(false);
    }
  };
  reader.readAsText(file);
}

/* Expose globally */
window.Store = Store;
window.loadState = loadState;
window.saveState = saveState;
window.updateState = updateState;
window.deepMerge = deepMerge;
window.buildDefaultState = buildDefaultState;
window.esc = esc;
window.fmtTime = fmtTime;
window.fmtClockForTimer = fmtClockForTimer;
window.todayKey = todayKey;
window.dateKeyFromOffset = dateKeyFromOffset;
window.getStudyDay = getStudyDay;
window.addStudySession = addStudySession;
window.recordAnswer = recordAnswer;
window.addErrorLog = addErrorLog;
window.addFeed = addFeed;
window.grantXp = grantXp;
window.checkBadges = checkBadges;
window.todayProgress = todayProgress;
window.learningStatus = learningStatus;
window.markTopicLearned = markTopicLearned;
window.topicName = topicName;
window.Timer = Timer;
window.toast = toast;
window.openModal = openModal;
window.closeModal = closeModal;
window.ymd = ymd;
window.fmtDuration = fmtDuration;
window.difficultyClass = difficultyClass;
window.difficultyLabel = difficultyLabel;
window.SECTION_META = SECTION_META;
window.sectionLabel = sectionLabel;
window.APP_VERSION = APP_VERSION;
window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.recalcStreak = recalcStreak;