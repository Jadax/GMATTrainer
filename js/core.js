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
      spacedRepetition: true,  // surfaces due questions for review at growing intervals
      sound: true             // simple WebAudio feedback (correct / time-up / select)
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
      errorLog: [],       // [{questionId, ts, youChose, section, correct, secs, felt, errorTag, confidence}]
      flagged: [],        // [questionId] user bookmarks
      adaptiveLevel: {},  // { topicTag: difficultyIndex }
      review: {}          // per-question spaced-repetition records:
                          //  { qid: { intervalDays, stepsIndex, reps, streak, wrongCount,
                          //           due, lastCorrect, attempts: [{ts, correct, secs, hintUsed,
                          //           felt, errorTag, confidence, note}] } }
    },
    learning: {},        // { topicId: {status: not-started|in-progress|mastered, lastLessonAt, due} }
    diagnostic: null,    // placement diagnostic result {ts, quant:{correct,total,level}, verbal:{...}, started}
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
        __state = migrateState(deepMerge(buildDefaultState(), parsed));
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

function fmtShort(totalSeconds) {
  totalSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? m + ':' + String(s).padStart(2, '0') : s + 's';
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

/* ---------------------------------------------------------------------
   Answer recording
   --------------------------------------------------------------------- */

/** Aggregate one answer into stats (topics/difficulty/section/XP/streak/feed). */
function _aggregateAnswer(st, question, correct, secs, sectionKey) {
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
}

const SR_STEPS = [1, 3, 7, 14, 30]; // legacy growing review intervals (days) — kept for display/migration
const SR_EF_MIN = 1.3;
const SR_EF_MAX = 2.5;

/** Spaced-repetition scheduling for a single question (SM-2-style ease factor).
 *  First success in 1 day, second in 6, then interval × ease. Failures reset
 *  the streak and shrink the ease factor so the item returns sooner.
 */
function _scheduleQuestion(st, qid, correct) {
  if (!st.settings || st.settings.spacedRepetition === false) return;
  if (!st.practice.review[qid]) {
    st.practice.review[qid] = {
      intervalDays: 0, stepsIndex: 0, reps: 0, streak: 0, wrongCount: 0,
      ef: SR_EF_MAX, lastCorrect: null, due: Date.now(), attempts: []
    };
  }
  const rec = st.practice.review[qid];
  rec.ef = Math.min(SR_EF_MAX, Math.max(SR_EF_MIN, rec.ef === undefined ? SR_EF_MAX : rec.ef));
  if (correct) {
    rec.reps = (rec.reps || 0) + 1;
    rec.streak = (rec.streak || 0) + 1;
    rec.lastCorrect = true;
    if (rec.reps === 1) rec.intervalDays = 1;
    else if (rec.reps === 2) rec.intervalDays = 6;
    else rec.intervalDays = Math.max(2, Math.round((rec.intervalDays || 6) * rec.ef));
    rec.ef = Math.min(SR_EF_MAX, rec.ef + 0.1);
  } else {
    rec.ef = Math.max(SR_EF_MIN, rec.ef - 0.2);
    rec.reps = 0;
    rec.streak = 0;
    rec.wrongCount = (rec.wrongCount || 0) + 1;
    rec.lastCorrect = false;
    rec.intervalDays = 1; // relearn next day
  }
  rec.due = Date.now() + rec.intervalDays * 86400000;
}

function recordAnswer(question, correct, secs, sectionKey) {
  updateState(st => {
    _aggregateAnswer(st, question, correct, secs, sectionKey);
  });
  App.emit('state', loadState());
}

/**
 * Simulator-grade recording: stats + spaced-repetition + deduped error log.
 * Mirrors saveAnswerDetailed without the rich post-answer meta tagging.
 */
function recordAnswerScheduled(question, correct, secs, sectionKey, selected) {
  updateState(st => {
    _aggregateAnswer(st, question, correct, secs, sectionKey);
    _scheduleQuestion(st, question.id, correct);
    if (!correct) {
      st.practice.errorLog = st.practice.errorLog.filter(e => e.questionId !== question.id);
      st.practice.errorLog.push({
        questionId: question.id,
        youChose: selected,
        ts: Date.now(),
        section: sectionKey,
        correct: false,
        secs: secs
      });
      st.stats.errorLogCount = st.practice.errorLog.length;
    }
    const rec = st.practice.review[question.id] || (st.practice.review[question.id] = {
      intervalDays: 0, stepsIndex: 0, reps: 0, streak: 0, wrongCount: 0,
      ef: SR_EF_MAX, lastCorrect: null, due: Date.now(), attempts: []
    });
    rec.attempts.push({ ts: Date.now(), correct: correct, secs: secs, hintUsed: false });
  });
  checkBadges();
  App.emit('state', loadState());
}

/* ---------------------------------------------------------------------
   Data-Insights structured answers (Focus formats)
   q.format: 'mc' (default), 'numeric', 'twopart', 'table', 'graphics', 'msr'
   isDiCorrect(q, chosen) decides correctness for any format.
   --------------------------------------------------------------------- */
function isDiCorrect(q, chosen) {
  if (chosen === null || chosen === undefined) return false;
  if (q.format === 'numeric') {
    return String(chosen).trim().toUpperCase() === String(q.answer).trim().toUpperCase();
  }
  if (q.format === 'twopart') {
    return !!chosen && chosen.left !== undefined && chosen.right !== undefined &&
      chosen.left === q.twopart.left.correct && chosen.right === q.twopart.right.correct;
  }
  if (q.format === 'table') {
    if (!chosen || !q.table || !q.table.correct) return false;
    return Object.keys(q.table.correct).every(idx =>
      (chosen[idx] === undefined ? false : chosen[idx]) === q.table.correct[idx]);
  }
  // mc / graphics / msr: single index
  return chosen === q.correct;
}

/** Human-friendly display of a stored structured answer (for review screens). */
function diAnswerDisplay(q, chosen) {
  if (chosen === null || chosen === undefined) return '—';
  if (q.format === 'numeric') return String(chosen);
  if (q.format === 'twopart') {
    const lt = q.twopart.left.options[chosen.left];
    const rt = q.twopart.right.options[chosen.right];
    return 'C1: ' + (lt !== undefined ? lt : '?') + ' · C2: ' + (rt !== undefined ? rt : '?');
  }
  if (q.format === 'table') {
    return 'Yes/No selections set';
  }
  return String.fromCharCode(65 + chosen);
}

/** Display of the correct answer for any format (review screens). */
function diCorrectDisplay(q) {
  if (q.format === 'numeric') return String(q.answer);
  if (q.format === 'twopart') {
    return 'C1: ' + q.twopart.left.options[q.twopart.left.correct] + ' · C2: ' + q.twopart.right.options[q.twopart.right.correct];
  }
  if (q.format === 'table') return 'per-row Yes/No selections';
  return String.fromCharCode(65 + q.correct);
}

/** True for non-multiple-choice Focus DI formats. */
function diIsStructured(q) {
  return !!q.format && q.format !== 'mc';
}

/* ---------------------------------------------------------------------
   Flashcard SM-2 scheduling (cards: {front, back, ..., ef, reps, streak,
   lapses, interval, reviews, due})
   --------------------------------------------------------------------- */
const FC_EF_MIN = 1.3;
const FC_EF_MAX = 2.5;

function flashcardSchedule(card, grade) {
  // grade: 0 = again, 1 = good, 2 = easy
  if (grade === 0) {
    card.lapses = (card.lapses || 0) + 1;
    card.reps = 0;
    card.streak = 0;
    card.interval = 1;
    card.ef = Math.max(FC_EF_MIN, (card.ef === undefined ? 2.5 : card.ef) - 0.2);
  } else if (grade === 1) {
    card.reps = (card.reps || 0) + 1;
    card.ef = Math.min(FC_EF_MAX, (card.ef === undefined ? 2.5 : card.ef) + 0.03);
    if (card.reps === 1) card.interval = 1;
    else if (card.reps === 2) card.interval = 6;
    else card.interval = Math.max(2, Math.round((card.interval || 1) * card.ef));
    card.streak = (card.streak || 0) + 1;
  } else {
    card.reps = (card.reps || 0) + 1;
    card.ef = Math.min(FC_EF_MAX, (card.ef === undefined ? 2.5 : card.ef) + 0.15);
    if (card.reps === 1) card.interval = 3;
    else if (card.reps === 2) card.interval = 10;
    else card.interval = Math.max(3, Math.round(card.interval * card.ef * 1.3));
    card.streak = (card.streak || 0) + 1;
  }
  card.reviews = (card.reviews || 0) + 1;
  card.due = Date.now() + (card.interval || 1) * 86400000;
  return grade === 0 ? 0 : (grade === 1 ? 1 : 2);
}

function flashcardDueCount() {
  const st = loadState();
  const now = Date.now();
  return st.flashcards.filter(c => {
    if (c.reviews === undefined && c.ef === undefined) return true; // new card
    return (c.due || 0) <= now;
  }).length;
}

/* ---------------------------------------------------------------------
   Migration pass for state written by older versions
   --------------------------------------------------------------------- */
function migrateState(st) {
  if (st.practice && st.practice.review) {
    Object.keys(st.practice.review).forEach(id => {
      const r = st.practice.review[id];
      if (r && r.ef === undefined) r.ef = SR_EF_MAX;
    });
  }
  if (Array.isArray(st.flashcards)) {
    st.flashcards.forEach(c => {
      if (c && c.ef === undefined) { c.ef = FC_EF_MAX; c.reps = 0; c.streak = 0; c.lapses = 0; c.interval = 0; c.reviews = 0; c.due = 0; }
    });
  }
  return st;
}

/* ---------------------------------------------------------------------
   Adaptive difficulty (TTP-style ramping)
   adaptiveDifficultyFor(): easy/medium/hard from recent by-topic accuracy.
   --------------------------------------------------------------------- */
const ADAPTIVE_BANDS = [
  { min: 0.0, idx: 0 },  // low accuracy → easy
  { min: 0.62, idx: 1 }, // holding → medium
  { min: 0.82, idx: 2 }  // strong → hard
];

function adaptiveDifficultyFor(topicTag) {
  const st = loadState();
  const d = st.stats.byTopic[topicTag];
  const stored = st.practice.adaptiveLevel && st.practice.adaptiveLevel[topicTag];
  if (stored !== undefined) return stored;
  if (!d || d.attempts < 3) return 'easy';
  const acc = d.correct / d.attempts;
  let idx = 0;
  ADAPTIVE_BANDS.forEach(b => { if (acc >= b.min) idx = b.idx; });
  return ['easy', 'medium', 'hard'][idx];
}

/** Update the stored adaptive level after one answer. */
function updateAdaptiveFromAnswer(st, question, correct) {
  if (!st.practice.adaptiveLevel) st.practice.adaptiveLevel = {};
  const cur = st.practice.adaptiveLevel[question.topic];
  const diffIdx = ['easy', 'medium', 'hard'].indexOf(question.difficulty);
  let delta = correct ? 1 : -1;
  if (cur === undefined) {
    st.practice.adaptiveLevel[question.topic] = Math.max(0, Math.min(2, diffIdx + delta));
  } else {
    st.practice.adaptiveLevel[question.topic] = Math.max(0, Math.min(2, cur + delta));
  }
}

/** Ids of every question you have ever answered in practice (for cumulative review). */
function everSeenQuestionIds() {
  const st = loadState();
  return Object.keys(st.practice.review || {}).filter(id => {
    const r = st.practice.review[id] && st.practice.review[id].attempts;
    return r && r.length > 0;
  });
}

/**
 * Full per-answer recording used by practice sessions.
 * meta: { selected, timedOut, secs, hintUsed, felt, errorTag, confidence, note }
 */
function saveAnswerDetailed(question, sectionKey, meta) {
  const correct = !meta.timedOut && isDiCorrect(question, meta.selected);
  updateState(st => {
    _aggregateAnswer(st, question, correct, meta.secs, sectionKey);
    _scheduleQuestion(st, question.id, correct);

    // rich error-log entry (deduped per question)
    if (!correct) {
      st.practice.errorLog = st.practice.errorLog.filter(e => e.questionId !== question.id);
      st.practice.errorLog.push({
        questionId: question.id,
        youChose: meta.selected,
        ts: Date.now(),
        section: sectionKey,
        correct: false,
        secs: meta.secs,
        hintUsed: !!meta.hintUsed,
        felt: meta.felt || null,
        errorTag: meta.errorTag || null,
        confidence: meta.confidence || null
      });
      st.stats.errorLogCount = st.practice.errorLog.length;
    }

    // append to the review record's attempt history
    const rec = st.practice.review[question.id] || (st.practice.review[question.id] = {
      intervalDays: 0, stepsIndex: 0, reps: 0, streak: 0, wrongCount: 0,
      ef: SR_EF_MAX, lastCorrect: null, due: Date.now(), attempts: []
    });
    rec.attempts.push({
      ts: Date.now(), correct: correct, secs: meta.secs,
      hintUsed: !!meta.hintUsed, felt: meta.felt || null,
      errorTag: meta.errorTag || null, confidence: meta.confidence || null,
      note: meta.note || ''
    });
  });
  checkBadges();
  App.emit('state', loadState());
}

/** Patch review meta (felt / errorTag / confidence / note) after the fact. */
function updateReviewMeta(qid, patch) {
  updateState(st => {
    const rec = st.practice.review[qid];
    if (rec && rec.attempts.length) {
      const last = rec.attempts[rec.attempts.length - 1];
      Object.keys(patch).forEach(k => { if (patch[k] !== undefined) last[k] = patch[k]; });
      // keep errorLog in sync for tagging
      const e = st.practice.errorLog.find(x => x.questionId === qid);
      if (e) {
        if (patch.felt !== undefined) e.felt = patch.felt;
        if (patch.errorTag !== undefined) e.errorTag = patch.errorTag;
        if (patch.confidence !== undefined) e.confidence = patch.confidence;
      }
    }
  });
}

/** Number of questions currently due for spaced review. */
function questionDueCount() {
  const st = loadState();
  if (!st.practice.review) return 0;
  const now = Date.now();
  return Object.keys(st.practice.review).filter(id => {
    const r = st.practice.review[id];
    return r && r.due <= now && r.attempts.length > 0;
  }).length;
}

/** Due question ids, soonest first. */
function questionDueIds() {
  const st = loadState();
  const now = Date.now();
  return Object.keys(st.practice.review)
    .map(id => ({ id: id, due: st.practice.review[id] ? st.practice.review[id].due : Infinity, attempts: st.practice.review[id] ? st.practice.review[id].attempts.length : 0 }))
    .filter(r => r.attempts > 0 && r.due <= now)
    .sort((a, b) => a.due - b.due)
    .map(r => r.id);
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

/* TTP-style difficulty ladder: Quick Check → Easy → Medium → Hard chapter tests.
   Pass mark = at least 80% of questions correct. Medium unlocks on Easy pass,
   Hard unlocks on Medium pass, and passing Hard finishes the chapter. */
const CHAPTER_TEST_LEN = 6;
const CHAPTER_TEST_PASS = 0.8;

function chapterTestProgress(topicId) {
  const rec = loadState().learning[topicId] || {};
  const tests = rec.tests || {};
  const topic = curriculum.topics.find(x => x.id === topicId);
  const qcDone = !!(topic && topic.check.length > 0 && rec.qc && (rec.qc.answers || 0) >= topic.check.length);
  const snap = d => ({
    best: (tests[d] && tests[d].best) || 0,
    totalAttempts: (tests[d] && tests[d].attempts) || 0,
    passed: !!(tests[d] && tests[d].passed)
  });
  const easy = snap('easy');
  const medium = snap('medium');
  const hard = snap('hard');
  return {
    easy: Object.assign({ unlocked: qcDone || easy.passed || medium.passed || hard.passed }, easy),
    medium: Object.assign({ unlocked: easy.passed }, medium),
    hard: Object.assign({ unlocked: medium.passed }, hard),
    qcDone: qcDone
  };
}

function recordChapterTest(topicId, difficulty, correct, total) {
  const required = Math.ceil(CHAPTER_TEST_PASS * (total || CHAPTER_TEST_LEN));
  let outcome = { difficulty: difficulty, passed: false, best: correct, required: required };
  updateState(st => {
    const r = st.learning[topicId] || (st.learning[topicId] = { status: 'not-started' });
    r.tests = r.tests || {};
    const prev = r.tests[difficulty] || { best: 0, attempts: 0, passed: false };
    const passed = correct >= required;
    r.tests[difficulty] = {
      best: Math.max(prev.best, correct),
      attempts: prev.attempts + 1,
      passed: prev.passed || passed,
      ts: Date.now()
    };
    outcome.passed = r.tests[difficulty].passed;
    outcome.best = r.tests[difficulty].best;
    if (passed) {
      grantXp(gamification.xpRules.chapterTestPassed, st);
      st.stats.history.unshift({ icon: '🏁', text: 'Chapter test passed (' + difficulty + '): ' + topicName(topicId), ts: Date.now() });
      if (st.stats.history.length > 12) st.stats.history.length = 12;
    }
  });
  return outcome;
}

function scheduleRepetition(topicId) {
  updateState(st => {
    const t = st.learning[topicId] || (st.learning[topicId] = {});
    const reviews = (t.reviews || 0) + 1;
    t.reviews = reviews;
    // growing review cycle: 3 → 7 → 14 → 30 days
    const steps = [3, 7, 14, 30];
    const days = steps[Math.min(reviews - 1, steps.length - 1)];
    t.due = Date.now() + days * 86400000;
  });
}

/* ---------------------------------------------------------------------
   Study phase model (Foundation → Core → Speed)
   Mirrors the phase system used by serious drill trainers.
   --------------------------------------------------------------------- */
function studyPhase() {
  const st = loadState();
  const totalQ = st.stats.totalAnswered || 0;
  const acc = totalQ ? st.stats.totalCorrect / totalQ : 0;
  if (totalQ < 50 || acc < 0.5) {
    return {
      key: 'foundation',
      title: 'Foundation Phase',
      icon: '🌱',
      desc: 'Accuracy first. Learn the concepts before worrying about speed.',
      pct: totalQ < 50 ? Math.round(totalQ / 50 * 100) : Math.round(acc * 100),
      next: 'Answer 50+ questions at ≥50% accuracy to advance.'
    };
  }
  if (totalQ < 200 || acc < 0.7) {
    return {
      key: 'core',
      title: 'Core Phase',
      icon: '🚀',
      desc: 'Build reliable accuracy across topics. Review every miss — that is where gains live.',
      pct: totalQ < 200 ? Math.round(totalQ / 200 * 100) : Math.round(acc * 100),
      next: 'Reach 200+ questions at ≥70% accuracy to unlock Speed.'
    };
  }
  return {
    key: 'speed',
    title: 'Speed Phase',
    icon: '⚡',
    desc: 'Lock in accuracy against the clock. Focus on pacing and stamina with full-section sets.',
    pct: 100,
    next: 'Maintain ≥70% accuracy while cutting time per question.'
  };
}

/* ---------------------------------------------------------------------
   Pacing targets (aligned with official per-section timing + practice docs)
   --------------------------------------------------------------------- */
function paceTargetFor(q) {
  if (q.timeEstimate) return q.timeEstimate;      // per-question recommended seconds
  const t = q.topic;
  if (t === 'ms') return 360;                     // ~6 min multi-source
  if (t === 'tp') return 180;                     // ~3 min two-part
  if (t === 'ta' || t === 'gi') return 150;
  if (t === 'ds') return 120;
  if (t === 'rc') return 105;
  if (t === 'cr') return 120;
  return 128;                                     // quant problem solving
}

const PACE_TARGETS = {
  quant: 128,          // 21 Q / 45 min
  verbal: 117,         // 23 Q / 45 min
  dataInsights: 135    // 20 Q / 45 min
};

function paceClass(secs, target) {
  if (!target) return 'pace-ok';
  const r = secs / target;
  if (r < 0.5) return secs < 10 ? 'pace-ok' : 'pace-fast';     // too fast → maybe guessed
  if (r <= 1.2) return 'pace-ok';
  return 'pace-slow';
}

/* ---------------------------------------------------------------------
   Lightweight WebAudio sounds (no asset files needed)
   --------------------------------------------------------------------- */
let __audioCtx = null;
function __ac() {
  if (!__audioCtx) { try { __audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
  return __audioCtx;
}
function playSound(kind) {
  const st = loadState();
  if (!(st.settings && st.settings.sound)) return;
  const ctx = __ac();
  if (!ctx) return;
  const note = (freq, start, dur, type, vol) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, ctx.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + start);
    o.stop(ctx.currentTime + start + dur + 0.05);
  };
  try {
    if (kind === 'correct') { note(880, 0, 0.12, 'triangle'); note(1320, 0.1, 0.16, 'triangle'); }
    else if (kind === 'incorrect') { note(220, 0, 0.22, 'square', 0.07); note(180, 0.02, 0.24, 'square', 0.06); }
    else if (kind === 'timeup') { note(440, 0, 0.35, 'sawtooth', 0.05); note(330, 0.2, 0.35, 'sawtooth', 0.05); }
    else if (kind === 'select') { note(660, 0, 0.06, 'triangle', 0.06); }
    else if (kind === 'type') { note(520, 0, 0.05, 'sine', 0.05); }
    else if (kind === 'done') { note(740, 0, 0.1, 'triangle'); note(588, 0.09, 0.14, 'triangle'); }
  } catch (e) { /* audio never blocks the app */ }
}

/* Record a completed practice set into practice.history (set-level). */
function recordSetHistory(entry) {
  updateState(st => {
    st.practice.history.unshift(Object.assign({ ts: Date.now() }, entry));
    if (st.practice.history.length > 200) st.practice.history.length = 200;
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
const APP_VERSION = '1.8.0';

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
window.saveAnswerDetailed = saveAnswerDetailed;
window.updateReviewMeta = updateReviewMeta;
window.questionDueCount = questionDueCount;
window.questionDueIds = questionDueIds;
window.studyPhase = studyPhase;
window.paceTargetFor = paceTargetFor;
window.paceClass = paceClass;
window.PACE_TARGETS = PACE_TARGETS;
window.playSound = playSound;
window.recordSetHistory = recordSetHistory;
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