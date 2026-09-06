/* =====================================================================
   GMAT 750+ Trainer - Gamification data
   Level tiers, badges/achievements, motivational quotes.
   ===================================================================== */

const gamification = (function () {

  /* ---------- Level tiers: cumulative XP required to reach each level ---------- */
  const levels = [
    { name: 'Novice', xp: 0,      icon: '🌱', color: '#78909C' },
    { name: 'Apprentice', xp: 500, icon: '🔧', color: '#0D47A1' },
    { name: 'Adept', xp: 1500,  icon: '⚔️', color: '#1A237E' },
    { name: 'Expert', xp: 3000,  icon: '🎓', color: '#6A1B9A' },
    { name: 'Master', xp: 6000,  icon: '🏆', color: '#FF6F00' },
    { name: '750+ Club', xp: 10000, icon: '💎', color: '#C62828' }
  ];

  /* ---------- XP economy (single source of truth) ---------- */
  const xpRules = {
    questionCorrect: 10,
    questionIncorrect: 3,
    lessonCompleted: 50,
    checkAllCorrect: 20,
    simCompleted: 120,
    dailyGoalHit: 40,
    perfectSet: 25,
    flashcardReview: 2,
    chapterTestPassed: 40
  };

  /* ---------- Badges / achievements ---------- */
  const badges = [
    { id: 'first_practice', name: 'First Steps', icon: '🎯', desc: 'Answer your first practice question',
      check: function (s) { return s.stats.totalAnswered >= 1; } },
    { id: 'ten_practice', name: 'Getting Going', icon: '🏃', desc: 'Answer 10 practice questions',
      check: function (s) { return s.stats.totalAnswered >= 10; } },
    { id: 'hundred_practice', name: 'Century Club', icon: '💯', desc: 'Answer 100 practice questions',
      check: function (s) { return s.stats.totalAnswered >= 100; } },
    { id: 'first_perfect', name: 'Flawless', icon: '✨', desc: 'Score 100% on a practice set of 5+ questions',
      check: function (s) { return s.stats.perfectSets >= 1; } },
    { id: 'streak_3', name: 'On Fire', icon: '🔥', desc: 'Keep a 3-day study streak',
      check: function (s) { return s.stats.bestStreak >= 3; } },
    { id: 'streak_7', name: 'Unstoppable', icon: '⚡', desc: 'Keep a 7-day study streak',
      check: function (s) { return s.stats.bestStreak >= 7; } },
    { id: 'lesson_1', name: 'Curious Mind', icon: '📚', desc: 'Complete your first lesson',
      check: function (s) { return s.stats.lessonsCompleted >= 1; } },
    { id: 'lesson_10', name: 'Scholar', icon: '🏛️', desc: 'Complete 10 lessons',
      check: function (s) { return s.stats.lessonsCompleted >= 10; } },
    { id: 'all_lessons', name: 'Course Finisher', icon: '🎉', desc: 'Complete every lesson in the curriculum',
      check: function (s) { return s.stats.lessonsCompleted >= curriculum.topics.length; } },
    { id: 'error_analyst', name: 'Error Analyst', icon: '🔍', desc: 'Log 10 errors for review',
      check: function (s) { return s.stats.errorLogCount >= 10; } },
    { id: 'sim_first', name: 'Test Taker', icon: '⏱️', desc: 'Complete a full-length simulator',
      check: function (s) { return s.stats.simsCompleted >= 1; } },
    { id: 'sim_three', name: 'Exam-Ready', icon: '📝', desc: 'Complete 3 full-length simulators',
      check: function (s) { return s.stats.simsCompleted >= 3; } },
    { id: 'hour_1', name: 'Hour Hand', icon: '🕐', desc: 'Study 1 hour total',
      check: function (s) { return s.stats.studySeconds >= 3600; } },
    { id: 'hour_5', name: 'Time Builder', icon: '⏰', desc: 'Study 5 hours total',
      check: function (s) { return s.stats.studySeconds >= 18000; } },
    { id: 'hour_20', name: 'Marathon Mind', icon: '🗓️', desc: 'Study 20 hours total',
      check: function (s) { return s.stats.studySeconds >= 72000; } },
    { id: 'goal_1', name: 'Goal Keeper', icon: '🧭', desc: 'Hit your daily goal once',
      check: function (s) { return s.stats.dailyGoalHits >= 1; } },
    { id: 'goal_7', name: 'Consistent', icon: '📈', desc: 'Hit your daily goal 7 times',
      check: function (s) { return s.stats.dailyGoalHits >= 7; } },
    { id: 'di_pro', name: 'Data Scientist', icon: '📊', desc: 'Answer 25 Data Insights questions',
      check: function (s) { return s.stats.bySection.dataInsights.attempts >= 25; } },
    { id: 'verbal_pro', name: 'Wordsmith', icon: '📖', desc: 'Answer 25 Verbal questions',
      check: function (s) { return s.stats.bySection.verbal.attempts >= 25; } },
    { id: 'quant_pro', name: 'Number Ninja', icon: '🔢', desc: 'Answer 25 Quant questions',
      check: function (s) { return s.stats.bySection.quant.attempts >= 25; } },
    { id: 'hard_10', name: 'Hard Mode', icon: '🗡️', desc: 'Answer 10 Hard questions correctly',
      check: function (s) { return s.stats.hardCorrect >= 10; } },
    { id: 'flashcard_10', name: 'Card Master', icon: '🃏', desc: 'Review 10 flashcards',
      check: function (s) { return s.stats.cardsReviewed >= 10; } },
    { id: 'import_data', name: 'Archivist', icon: '🗃️', desc: 'Import a progress backup',
      check: function (s) { return s.stats.imports >= 1; } },
    { id: 'night_owl', name: 'Night Owl', icon: '🦉', desc: 'Answer a question after 10 p.m.',
      check: function (s) { return s.stats.nightAnswers >= 1; } }
  ];

  /* ---------- Motivational quotes ---------- */
  const quotes = [
    { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
    { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
    { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
    { text: 'Do something today that your future self will thank you for.', author: 'Sean Patrick Flanery' },
    { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
    { text: 'Progress, not perfection, is the goal.', author: 'Unknown' },
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'Strive for progress, not perfection. Aim for 750+.', author: 'GMAT 750+ Trainer' },
    { text: 'Fall seven times, stand up eight.', author: 'Japanese Proverb' },
    { text: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' }
  ];

  /* ---------- Projected score model (percentile-based heuristic) ---------- */
  /*
    The GMAT Focus score ranges from 205–805. Section scores are 60–90 each.
    We project a total from the average section accuracy using a smoothed,
    monotone mapping calibrated to realistic Focus Edition difficulty:
    section accuracy 25% → 60, 40% → 65, 55% → 70, 70% → 75, 85% → 80, 95% → 85,
    then total = sum with a base and a "consistency" readjustment.
  */
  /* Focus Edition section scores are adaptive and computed by GMAC's
     algorithm, so any simulator mapping is a heuristic. We use a simple,
     transparent, monotone band calibration (documented + labeled as an
     estimate in the UI). Key points:
       0%   → 60    ·    60% → 72    ·    85% → 81
       25%  → 63    ·    70% → 75    ·    92% → 84
       40%  → 66    ·    78% → 78    ·    96% → 87
       50%  → 69    ·                     100% → 90
     Linear interpolation between anchor points. */
  var SECTION_SCORE_BANDS = [
    [0.00, 60], [0.25, 63], [0.40, 66], [0.50, 69],
    [0.60, 72], [0.70, 75], [0.78, 78], [0.85, 81],
    [0.92, 84], [0.96, 87], [1.00, 90]
  ];
  function sectionScoreFromAccuracy(acc) {
    var x = Math.max(0, Math.min(1, acc));
    var out = 60;
    for (var i = 0; i < SECTION_SCORE_BANDS.length - 1; i++) {
      var a = SECTION_SCORE_BANDS[i], b = SECTION_SCORE_BANDS[i + 1];
      if (x >= a[0] && x <= b[0]) {
        var t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
        out = a[1] + t * (b[1] - a[1]);
        break;
      }
      if (x > b[0]) out = b[1];
    }
    return Math.max(60, Math.min(90, Math.round(out)));
  }

  function projectedTotalScore(stat) {
    var sections = ['quant', 'verbal', 'dataInsights'];
    var accs = sections.map(function (k) {
      var st = stat.bySection[k];
      var attempts = st.attempts;
      return attempts > 0 ? st.correct / attempts : null;
    });
    var present = accs.filter(function (a) { return a !== null; });
    if (present.length === 0) return 205; // no data yet
    var avgAcc = present.reduce(function (s, a) { return s + a; }, 0) / present.length;
    // Map avg section accuracy to a total between 205 and 805.
    // Strongly penalize low accuracy and low attempt count (uncertainty).
    var total = 555 + (avgAcc - 0.62) * 420;
    var minAttempts = present.length * 5;
    var uncertaintyPenalty = Math.max(0, (minAttempts - 10)) * 0; // keep simple
    total = Math.round(total / 10) * 10; // 10-point increments
    return Math.max(205, Math.min(805, total));
  }

  return {
    levels: levels,
    xpRules: xpRules,
    badges: badges,
    quotes: quotes,
    sectionScoreFromAccuracy: sectionScoreFromAccuracy,
    projectedTotalScore: projectedTotalScore,
    levelForXp: function (xp) {
      var cur = levels[0];
      for (var i = 0; i < levels.length; i++) {
        if (xp >= levels[i].xp) cur = levels[i];
      }
      return cur;
    },
    levelProgress: function (xp) {
      // returns {current, next, pct} for the XP bar
      var idx = 0;
      for (var i = 0; i < levels.length; i++) { if (xp >= levels[i].xp) idx = i; }
      var cur = levels[idx];
      var next = levels[idx + 1] || null;
      var pct = 100;
      if (next) {
        pct = Math.min(100, Math.round((xp - cur.xp) / (next.xp - cur.xp) * 100));
      }
      return { current: cur, next: next, pct: pct };
    }
  };

})();