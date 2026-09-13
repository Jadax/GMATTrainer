/* =====================================================================
   GMAT 750+ Trainer - Advisor view
   A "top GMAT teacher" read of your real data: score projection,
   strengths & root-cause gaps, a priority prescriptions queue, a pacing
   audit per format, and weekly coaching cadence. Pure interpretation of
   existing state - writes nothing except the optional test-date field.
   ===================================================================== */

'use strict';

/* Topic tag → nominal seconds-per-question target (aligned with official
   section timing; matches paceTargetFor in core.js). */
var ADVISOR_TOPIC_PACE = {
  arithmetic: 128, algebra: 128, wordproblems: 128, numbers: 128, stats: 128,
  rc: 105, cr: 120, ds: 120, ms: 360, ta: 150, gi: 150, tp: 180
};

var ADVISOR_TOPIC_LABELS = {
  arithmetic: 'Arithmetic', algebra: 'Algebra', wordproblems: 'Word Problems',
  numbers: 'Number Properties', stats: 'Statistics & Sets', rc: 'Reading Comp',
  cr: 'Critical Reasoning', ds: 'Data Sufficiency', ms: 'Multi-Source',
  ta: 'Table Analysis', gi: 'Graphics Interp', tp: 'Two-Part Analysis'
};

/* Reference-accuracy bars top teachers hold students to (per difficulty). */
var ADVISOR_DIFF_TARGETS = { easy: 0.72, medium: 0.60, hard: 0.45 };

function advisorLabel(tag) {
  return ADVISOR_TOPIC_LABELS[tag] || tag;
}

/* ---------------------------------------------------------------------
   One-pass analysis of everything the app knows about the student
   --------------------------------------------------------------------- */
function advisorAnalysis() {
  var st = loadState();
  var stats = st.stats;

  var sections = ['quant', 'verbal', 'dataInsights'].map(function (k) {
    var s = stats.bySection[k] || { attempts: 0, correct: 0, seconds: 0 };
    var sec = curriculum.sections.find(function (x) { return x.key === k; });
    var topics = sec ? sec.topics : [];
    var adv = topics.filter(function (t) { return t.level === 'advanced'; });
    var acc = s.attempts ? s.correct / s.attempts : null;
    var diag = st.diagnostic
      ? (k === 'quant' ? st.diagnostic.quant : k === 'verbal' ? st.diagnostic.verbal : st.diagnostic.di)
      : null;
    function mastered(t) { return learningStatus(t.id).status === 'mastered'; }
    return {
      key: k, meta: SECTION_META[k],
      attempts: s.attempts, correct: s.correct, acc: acc,
      score: s.attempts ? gamification.sectionScoreFromAccuracy(acc) : null,
      paceAvg: s.attempts ? Math.round(s.seconds / s.attempts) : null,
      paceTarget: PACE_TARGETS[k],
      mastered: topics.filter(mastered).length,
      total: topics.length,
      advTotal: adv.length,
      advUnlocked: adv.filter(function (t) { return expertTopicUnlocked(t.id); }).length,
      advMastered: adv.filter(mastered).length,
      diagLevel: diag && diag.level ? diag.level : null
    };
  });

  var formats = Object.keys(stats.byTopic)
    .filter(function (t) { return stats.byTopic[t].attempts > 0; })
    .map(function (tag) {
      var t = stats.byTopic[tag];
      return {
        tag: tag, label: advisorLabel(tag),
        attempts: t.attempts, correct: t.correct,
        acc: t.correct / t.attempts,
        paceAvg: t.attempts ? Math.round((t.seconds || 0) / t.attempts) : null,
        paceTarget: ADVISOR_TOPIC_PACE[tag] || 128
      };
    })
    .sort(function (a, b) {
      return (a.acc - b.acc) || (b.attempts - a.attempts);
    });

  var diffs = ['easy', 'medium', 'hard'].map(function (d) {
    var s = stats.byDifficulty[d];
    return {
      d: d, label: d.charAt(0).toUpperCase() + d.slice(1),
      attempts: s.attempts, correct: s.correct,
      acc: s.attempts ? s.correct / s.attempts : null,
      target: ADVISOR_DIFF_TARGETS[d]
    };
  });

  var projected = gamification.projectedTotalScore(stats);
  var target = st.user.targetScore || 705;
  var gap = Math.max(0, target - projected);
  var daysLeft = st.user.targetDate
    ? Math.max(0, Math.ceil((new Date(st.user.targetDate) - new Date()) / 86400000))
    : null;
  var weeksLeft = daysLeft === null ? null : Math.max(1, Math.ceil(daysLeft / 7));

  var allTopics = curriculum.topics;
  function mastered(t) { return learningStatus(t.id).status === 'mastered'; }
  var expertTopics = allTopics.filter(function (t) { return t.level === 'advanced'; });

  return {
    st: st, stats: stats, sections: sections, formats: formats, diffs: diffs,
    projected: projected, target: target, gap: gap,
    daysLeft: daysLeft, weeksLeft: weeksLeft,
    phase: studyPhase(), today: todayProgress(),
    dueCount: questionDueCount(), everSeen: everSeenQuestionIds().length,
    errs: (st.practice.errorLog || []).slice(),
    lastSim: st.sims && st.sims.length ? st.sims[st.sims.length - 1] : null,
    lessonDone: allTopics.filter(mastered).length,
    lessonTotal: allTopics.length,
    expertUnlocked: expertTopics.filter(function (t) { return expertTopicUnlocked(t.id); }).length,
    expertMastered: expertTopics.filter(mastered).length
  };
}

/* ---------------------------------------------------------------------
   "The Coach's Read" - a personalized teaching paragraph from the data
   --------------------------------------------------------------------- */
function advisorRead(A) {
  var lines = [];
  var stats = A.stats;
  var fmt = A.formats;

  if (stats.totalAnswered === 0 && !A.st.diagnostic) {
    lines.push('Every great GMAT journey starts the same way: with data. Right now I have none, so the single most valuable 22 minutes you can spend is the placement diagnostic - it pinpoints which strand to rebuild first in Quant, Verbal and Data Insights.');
    lines.push('One principle to hold from day one: accuracy before speed. A deliberate 70% solver becomes a 700 scorer; a rushed 45% solver becomes a frustrated retake.');
    return lines;
  }

  lines.push({
    foundation: 'We\'re in the Foundation phase: rebuild the concepts before worrying about the clock. There is no shortcut past understanding - speed is a by-product of recognition.',
    core: 'You\'re in the Core phase, the build. Here, accuracy across every topic is the goal, and every miss we review together is a point banked for test day.',
    speed: 'You\'ve earned the right to race: this is Speed phase, where we hold accuracy while pressing the clock. The score now comes from pacing discipline and stamina.'
  }[A.phase.key]);

  var strong = fmt.slice().reverse().filter(function (f) { return f.attempts >= 4; }).slice(0, 2);
  var weak = fmt.filter(function (f) { return f.attempts >= 3; }).slice(0, 2);

  if (strong.length) {
    lines.push('Your strongest formats are ' + strong.map(function (f) {
      return f.label + ' (' + Math.round(f.acc * 100) + '%)';
    }).join(' and ') + '. Good - keep them alive with weekly review, but don\'t rehearse what you already own. The score isn\'t hiding there.');
  }

  if (weak.length) {
    lines.push('Your priority gaps are ' + weak.map(function (f) {
      return f.label + ' (' + Math.round(f.acc * 100) + '%)';
    }).join(' and ') + '. Below roughly 65% accuracy in any format you are leaking recoverable points - this is where your next 10-20 points live.');
  } else if (stats.totalAnswered > 0) {
    var thin = fmt.filter(function (f) { return f.attempts < 3; });
    lines.push(thin.length
      ? 'I don\'t have enough data on ' + thin.slice(0, 2).map(function (f) { return f.label; }).join(' and ') + ' yet - a few more questions there will tell me if they\'re real weaknesses or just noise.'
      : 'Your read across formats is unusually consistent - the signature of a student on the verge of a level jump. Keep your error-log discipline and it will convert.');
  }

  var slow = fmt.filter(function (f) { return f.paceAvg !== null && f.paceAvg > f.paceTarget * 1.3; }).slice(0, 1);
  if (slow.length) {
    var s = slow[0];
    lines.push('Pacing flag: ' + s.label + ' is taking ~' + fmtShort(s.paceAvg) + ' against a ~' + fmtShort(s.paceTarget) + ' target. The fix isn\'t faster math - it\'s recognizing the question archetype earlier and cutting one wasted step.');
  } else if (A.sections.some(function (x) { return x.attempts > 0; })) {
    lines.push('Your pace is healthy across formats. Keep it - there\'s no self-inflicted time pressure here, and that buys the patience accuracy needs.');
  }

  if (A.errs.length > 0) {
    lines.push('Your error log holds ' + A.errs.length + ' question' + (A.errs.length === 1 ? '' : 's') + '. The habit that separates 650 scorers from 750 scorers is simple: revisit every miss once, understand why you chose wrong, and retake it. It\'s one click and the single fastest accuracy lever I have.');
  }
  if (A.dueCount > 0) {
    lines.push('You have ' + A.dueCount + ' spaced-review question' + (A.dueCount === 1 ? '' : 's') + ' due. That queue is the highest-ROI 10 minutes of your day - recall before forgetting is how a solid 70% becomes a permanent 80%.');
  }

  if (A.lastSim && A.lastSim.totalScore) {
    lines.push('Your last simulator scored ' + A.lastSim.totalScore + '. Treat that number as data, not judgement - it is telling us which section to attack next, and it\'s already better than guessing.');
  }

  if (A.daysLeft !== null) {
    if (A.gap <= 20) lines.push('You are within striking distance of ' + A.target + ' with ' + A.daysLeft + ' days left. This is the window for full-length reps and ruthlessly cleared error logs.');
    else if (A.gap <= 60) lines.push(A.gap + ' points to ' + A.target + ' with ' + A.daysLeft + ' days out - realistic and grindable. Focused topic work beats scattered practice right now.');
    else lines.push(A.daysLeft + ' days to go and a ' + A.gap + '-point gap. Doable, but the plan must be ruthless: foundations first, spaced review daily, and a simulator every 2-3 weeks to build test-day habits.');
  }

  return lines;
}

/* ---------------------------------------------------------------------
   Priority prescriptions queue (ordered from "today" down to "next")
   --------------------------------------------------------------------- */
function advisorActions(A) {
  var acts = [];
  function push(stage, icon, title, why, href) {
    acts.push({ stage: stage, icon: icon, title: title, why: why, href: href });
  }
  var stats = A.stats;

  if (stats.totalAnswered === 0 && !A.st.diagnostic) {
    push('today', '🧭', 'Take the placement diagnostic',
      'It maps Quant, Verbal and Data Insights in 22 questions. I can\'t coach blind, and you shouldn\'t practice blind.',
      '#/diagnostic');
    return acts;
  }

  var pin = A.st.diagnostic && A.st.diagnostic.started;
  if (pin && learningStatus(pin).status !== 'mastered') {
    var pt = curriculum.topics.find(function (x) { return x.id === pin; });
    push('today', '📌', 'Start where the diagnostic placed you: ' + (pt ? pt.name : pin),
      'This is your true baseline strand. Master it first - everything else chains off it, and skipping it is how students plateau.',
      '#/learn/' + pin);
  }

  var weakBest = A.formats.find(function (f) { return f.attempts >= 3; });
  if (weakBest) {
    var wTid = curriculum.topicKeyForQTopic(weakBest.tag);
    if (wTid && learningStatus(wTid).status !== 'mastered') {
      push('today', '📘', 'Master ' + weakBest.label,
        weakBest.label + ' sits at ' + Math.round(weakBest.acc * 100) + '% accuracy. Until it clears ~65%, your section score is capped. Study the chapter, then pass its Medium and Hard tests.',
        '#/learn/' + wTid);
    }
  }

  if (A.errs.length >= 3) {
    push('today', '🔍', 'Re-attempt your ' + A.errs.length + '-question error log',
      'Every miss is a message. One focused pass through the log typically recovers 5-10 accuracy points before anything else you could do.',
      '#/practice/error');
  }

  if (A.dueCount > 0) {
    push('today', '⏰', 'Clear ' + A.dueCount + ' due spaced-review question' + (A.dueCount === 1 ? '' : 's'),
      'Due questions are the ones about to slip from your memory. Recall them on time and they become permanent.',
      '#/practice/due');
  }

  var ctFails = [];
  curriculum.topics.forEach(function (t) {
    if (learningStatus(t.id).status === 'mastered') return;
    var p = chapterTestProgress(t.id);
    ['hard', 'medium', 'easy'].forEach(function (d) {
      if (p[d].totalAttempts > 0 && !p[d].passed) {
        ctFails.push({ t: t, d: d, best: p[d].best });
      }
    });
  });
  if (ctFails.length) {
    function rank(o) { return o.d === 'hard' ? 2 : o.d === 'medium' ? 1 : 0; }
    ctFails.sort(function (a, b) { return (rank(b) - rank(a)) || (b.best - a.best); });
    var topCt = ctFails[0];
    push('soon', '🏁', 'Re-pass the ' + topCt.d + ' chapter test for ' + topCt.t.name,
      'You attempted this checkpoint but didn\'t clear 80% (best ' + topCt.best + '/' + CHAPTER_TEST_LEN + '). "Attempted" and "passed" are different animals - passing is what readiness looks like.',
      '#/learn/' + topCt.t.id);
  }

  var slow = A.formats.find(function (f) { return f.paceAvg !== null && f.paceAvg > f.paceTarget * 1.4; });
  if (slow) {
    push('next', '⏱️', 'Train speed in ' + slow.label,
      slow.label + ' averages ~' + fmtShort(slow.paceAvg) + ' vs a ~' + fmtShort(slow.paceTarget) + ' target - you\'re conceding time here. A mixed set with a per-question timer will pressure the recognition.',
      '#/practice');
  }

  if (!A.lastSim && stats.totalAnswered >= 60) {
    push('next', '🏁', 'Run your first timed section',
      'You\'ve built enough question volume - the next unknown is stamina. One timed 45-minute section is the cheapest way to feel test-day physics.',
      '#/simulator');
  } else if (A.phase.key === 'speed' && A.stats.simsCompleted < 2) {
    push('next', '🎢', 'Add a second simulator',
      'Speed phase is won with full-length reps. Two sims is where pacing habits stop being theory and become reflexes.',
      '#/simulator');
  }

  if (A.expertUnlocked > 0 && A.expertMastered < A.expertUnlocked) {
    var cap = curriculum.topics.find(function (x) {
      return x.level === 'advanced' && expertTopicUnlocked(x.id) && learningStatus(x.id).status !== 'mastered';
    });
    if (cap) {
      push('this week', '👑', 'Take on the capstone: ' + cap.name,
        'You\'ve unlocked an Expert capstone - the hardest material the curriculum offers. It\'s your claim to the 700+ range, so attack it while it\'s unlocked and warm.',
        '#/learn/' + cap.id);
    }
  }

  return acts;
}

/* ---------------------------------------------------------------------
   Weekly cadence advice - "what I'd tell you in a coaching session"
   --------------------------------------------------------------------- */
function advisorCadence(A) {
  var tips = [];
  tips.push({ icon: '🔁', tip: 'Daily block: 5-10 error-log + spaced-review questions before anything else.', why: 'Recall before forgetting. Review cements; novelty only entertains.' });
  if (A.phase.key !== 'speed') {
    tips.push({ icon: '🐢', tip: 'No clock on a topic until you\'re at 70% self-paced.', why: 'Speed is a by-product of recognition, and recognition is a by-product of volume done right.' });
  }
  if (A.daysLeft !== null && A.gap > 0) {
    var weekly = Math.min(60, Math.max(10, Math.round(A.gap * 2.5 / A.weeksLeft)));
    tips.push({ icon: '🔢', tip: 'Target ' + weekly + ' questions/week at 65%+ accuracy.', why: 'That cadence closes a ' + A.gap + '-point gap over ~' + A.weeksLeft + ' weeks without burnout. Volume only helps if accuracy holds.' });
  }
  tips.push({ icon: '🧱', tip: 'One new topic at a time; review it before starting the next.', why: 'Top scorers deepen one skill rather than sampling everything thinly.' });
  tips.push({ icon: '🪜', tip: 'Respect the ladder: Quick Check → Easy → Medium → Hard, in order, every chapter.', why: 'The Hard chapter test is the real checkpoint - the ladder exists so you don\'t skip the foundation.' });
  if (A.errs.length > 0) tips.push({ icon: '🗂️', tip: 'Error-log Thursday: one day a week for a clean sweep of the whole log.', why: 'A weekly sweep keeps the log from becoming a graveyard - and its shrinkage is measurable.' });
  if (A.daysLeft !== null && A.weeksLeft >= 2) tips.push({ icon: '🎯', tip: 'Simulator cadence: every 2-3 weeks until the final two weeks, then weekly.', why: 'Sims are stamina training, not judgement - space them so they pressure-test rather than drain.' });
  tips.push({ icon: '😴', tip: 'Sleep is a study move. Insights consolidate overnight.', why: 'Fatigue is the #1 cause of the "I knew it, I missed it" error on test day.' });
  return tips;
}

/* ---------------------------------------------------------------------
   Small markup helpers
   --------------------------------------------------------------------- */
function advisorAccBar(acc, attempts) {
  var pct = Math.round(acc * 100);
  var color = pct >= 70 ? 'var(--color-success)' : pct >= 55 ? 'var(--color-accent)' : 'var(--color-danger)';
  var thin = attempts >= 3 ? '' : ' <span class="badge badge-ghost" title="Too few attempts to judge yet">thin</span>';
  return '<div class="advisor-acc"><div class="progress" style="flex:1;min-width:80px;height:7px">' +
    '<div class="progress-bar" style="width:' + pct + '%;background:' + color + '"></div></div>' +
    '<span class="advisor-acc-num">' + pct + '%</span>' + thin + '</div>';
}

function advisorStageBadge(stage) {
  var cls = stage === 'today' ? 'badge-primary' : stage === 'soon' ? 'badge-accent' : 'badge-ghost';
  return '<span class="badge ' + cls + '">' + esc(stage) + '</span>';
}

/* ---------------------------------------------------------------------
   Export the coaching report as a text file
   --------------------------------------------------------------------- */
function exportAdvisorReport() {
  var A = advisorAnalysis();
  var L = [];
  L.push('GMAT 750+ Trainer - Advisor Report');
  L.push('Generated: ' + new Date().toLocaleString());
  L.push('Projected score: ' + A.projected + ' (target ' + A.target + ', gap ' + A.gap + ')');
  L.push('Phase: ' + A.phase.title + (A.daysLeft !== null ? ' · ' + A.daysLeft + ' days to test' : ''));
  L.push('');
  L.push('COACH\'S READ');
  advisorRead(A).forEach(function (p) { L.push(' - ' + p); });
  L.push('');
  L.push('PRIORITY ACTIONS');
  advisorActions(A).forEach(function (a, i) {
    L.push((i + 1) + '. [' + a.stage.toUpperCase() + '] ' + a.icon + ' ' + a.title);
    L.push('   Why: ' + a.why);
  });
  L.push('');
  L.push('SECTION READ');
  A.sections.forEach(function (s) {
    L.push(' ' + s.meta.short + ': score ~' + (s.score === null ? 'n/a' : s.score) +
      ', acc ' + (s.acc === null ? 'no data' : Math.round(s.acc * 100) + '%') +
      ', pace ' + (s.paceAvg === null ? 'n/a' : fmtShort(s.paceAvg) + ' (target ' + fmtShort(s.paceTarget) + ')') +
      ', topics ' + s.mastered + '/' + s.total);
  });
  L.push('');
  L.push('FORMAT BREAKDOWN');
  A.formats.forEach(function (f) {
    L.push(' ' + f.label + ': ' + Math.round(f.acc * 100) + '% on ' + f.attempts +
      ' attempts ' + (f.attempts >= 3 ? '(reliable)' : '(thin data)') +
      ' · pace ' + (f.paceAvg === null ? 'n/a' : fmtShort(f.paceAvg)));
  });
  L.push('');
  L.push('WEEKLY CADENCE');
  advisorCadence(A).forEach(function (t) { L.push(' - ' + t.tip); });
  L.push('');
  L.push('Score projections are heuristic estimates; GMAC\'s adaptive algorithm means no off-app number is exact.');
  var blob = new Blob([L.join('\n')], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'gmat750-advisor-report-' + todayKey() + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function setAdvisorTargetDate(val) {
  updateState(function (s) {
    s.user.targetDate = val || null;
  });
  toast('Target date saved. Your plan now has a deadline.', 'success');
  render();
}

/* ---------------------------------------------------------------------
   Main render
   --------------------------------------------------------------------- */
function renderAdvisor(appEl) {
  var A = advisorAnalysis();
  var read = advisorRead(A);
  var actions = advisorActions(A);
  var cadence = advisorCadence(A);

  var gapTxt = A.gap <= 0
    ? '<span style="color:var(--color-success)">At or above target — protect it.</span>'
    : '<span class="' + (A.gap <= 20 ? 'text-success' : A.gap <= 60 ? 'text-accent' : 'text-danger') + '">' + A.gap + ' points below ' + A.target + '</span>';

  var projectionCard = '' +
    '<div class="card">' +
      '<div class="card-title">🎯 Projected GMAT Focus Score</div>' +
      '<div class="advisor-score">' + A.projected + '</div>' +
      '<div class="text-muted fs-small">out of 805 · heuristic estimate</div>' +
      '<div class="advisor-gap">' + gapTxt + '</div>' +
      '<div class="progress mt-1" style="height:10px"><div class="progress-bar" style="width:' + Math.round((A.projected - 205) / 600 * 100) + '%"></div></div>' +
      '<div class="advisor-scale-labels"><span>205</span><span>target ' + A.target + '</span><span>805</span></div>' +
      '<div class="mt-2 advisor-links"><a href="#/analytics" class="btn btn-sm btn-ghost">Detail</a>' +
      '<a href="#/progress" class="btn btn-sm btn-ghost">Progress</a></div>' +
    '</div>';

  var phaseCard = '' +
    '<div class="card">' +
      '<div class="card-title">' + A.phase.icon + ' ' + esc(A.phase.title) + '</div>' +
      '<p class="text-muted" style="margin:.2rem 0 .6rem">' + esc(A.phase.desc) + '</p>' +
      '<div class="progress" style="height:8px"><div class="progress-bar accent" style="width:' + A.phase.pct + '%"></div></div>' +
      '<div class="phase-next mt-1">' + esc(A.phase.next) + '</div>' +
    '</div>';

  var clockCard = '' +
    '<div class="card">' +
      '<div class="card-title">⏳ Your Race</div>' +
      '<div class="advisor-big">' + (A.daysLeft === null ? 'No date yet' : A.daysLeft + ' days') + '</div>' +
      (A.daysLeft === null
        ? '<p class="text-muted fs-small" style="margin:.3rem 0 .6rem">Set a test date and the plan gains a deadline.</p>'
        : '<div class="text-muted fs-small" style="margin:.3rem 0 .6rem">~' + A.weeksLeft + ' weeks · ' + A.lessonDone + '/' + A.lessonTotal + ' topics done · ' + A.expertUnlocked + ' capstone' + (A.expertUnlocked === 1 ? '' : 's') + ' unlocked</div>') +
      '<div class="advisor-date-row" style="display:flex;gap:.5rem;align-items:center">' +
        '<input type="date" class="advisor-date-input" id="advisorDate" value="' + esc(A.st.user.targetDate || '') + '">' +
        '<button class="btn btn-sm btn-primary" id="advisorDateSave">Set date</button>' +
      '</div>' +
    '</div>';

  var directiveHtml = actions.length
    ? '<div class="card advisor-directive">' +
        '<div class="card-title">🧑‍🏫 Today\'s Directive</div>' +
        '<div class="advisor-directive-main">' + actions[0].icon + ' ' + esc(actions[0].title) + '</div>' +
        '<p class="text-muted" style="margin:.2rem 0 .6rem">' + esc(actions[0].why) + '</p>' +
        '<a href="' + esc(actions[0].href) + '" class="btn btn-primary">Go →</a>' +
      '</div>'
    : '<div class="card advisor-directive"><div class="card-title">🧑‍🏫 Today\'s Directive</div><p>' +
      'Nothing urgent on the board — hold the cadence below, keep clearing the error log, and check back after your next full-length.</p></div>';

  var priorityHtml = actions.length
    ? '<div class="card"><div class="card-title">📋 The Priorities Queue</div>' +
      actions.map(function (a) {
        return '<div class="advisor-action">' +
          '<div class="advisor-action-head">' + advisorStageBadge(a.stage) + ' &nbsp;' + a.icon + ' ' + esc(a.title) + '</div>' +
          '<div class="text-muted fs-small">' + esc(a.why) + '</div>' +
          '<a href="' + esc(a.href) + '" class="fs-small" style="font-weight:700">Jump →</a>' +
        '</div>';
      }).join('') +
      '</div>'
    : '';

  var sectionCards = A.sections.map(function (s) {
    var accLine = s.acc === null
      ? '<div class="text-muted fs-small">No practice data yet in this section.</div>'
      : advisorAccBar(s.acc, s.attempts) + '<div class="text-muted fs-small mt-1" style="text-align:right">' + s.attempts + ' questions</div>';
    var paceLine = s.paceAvg === null
      ? ''
      : '<div class="pace-line">Pace ' + fmtShort(s.paceAvg) + ' vs ' + fmtShort(s.paceTarget) + ' target</div>';
    var diagLine = s.diagLevel !== null
      ? '<div class="fs-small" style="margin-top:.3rem">🧭 Diagnostic: <strong>' + esc(levelLabel(s.diagLevel)) + '</strong></div>'
      : '';
    var stageTxt = s.advTotal > 0
      ? s.mastered + '/' + s.total + ' topics · capstone ' + (s.advUnlocked ? s.advUnlocked + ' unlocked/…' : 'locked') + (s.advMastered ? ' · ' + s.advMastered + ' mastered' : '')
      : s.mastered + '/' + s.total + ' topics';
    return '<div class="card">' +
      '<div class="card-title">' + s.meta.icon + ' ' + esc(s.meta.short) + '</div>' +
      '<div class="advisor-big">' + (s.score === null ? '—' : '~' + s.score) + '</div>' +
      '<div class="text-muted fs-small" style="margin-bottom:.5rem">estimated section score' + (s.score === null ? ' (needs data)' : '') + '</div>' +
      accLine + paceLine + diagLine +
      '<div class="phase-next mt-1">' + esc(stageTxt) + '</div>' +
    '</div>';
  }).join('');

  var formatRows = A.formats.length
    ? '<div class="advisor-frow advisor-fhead"><span>Format</span><span>Accuracy</span><span style="text-align:right">Attempts</span><span style="text-align:right">Pace</span></div>' +
      A.formats.map(function (f) {
        return '<div class="advisor-frow">' +
          '<span><strong>' + esc(f.label) + '</strong>' + (f.paceAvg !== null && f.paceAvg > f.paceTarget * 1.4 ? ' 🤨' : '') + '</span>' +
          advisorAccBar(f.acc, f.attempts) +
          '<span style="text-align:right" class="text-muted">' + f.attempts + '</span>' +
          '<span style="text-align:right">' + (f.paceAvg === null ? '—' : '<span class="' + (paceClass(f.paceAvg, f.paceTarget) === 'slow' ? 'text-danger' : paceClass(f.paceAvg, f.paceTarget) === 'fast' ? 'text-success' : 'text-muted') + '" title="target ' + fmtShort(f.paceTarget) + '">' + fmtShort(f.paceAvg) + '</span>') + '</span>' +
        '</div>';
      }).join('')
    : '<div class="empty-state"><span class="empty-icon">📊</span><p>No practice data yet — answer questions to populate your format-by-format diagnostic.</p></div>';

  var diffCards = A.diffs.map(function (d) {
    var delta = d.acc === null ? null : Math.round((d.acc - d.target) * 100);
    var verdict = delta === null
      ? 'Waiting for data'
      : delta >= 0 ? '+' + delta + ' vs bar' : delta + ' vs bar';
    var cls = delta === null ? 'text-muted' : delta >= 0 ? 'text-success' : 'text-danger';
    return '<div class="card">' +
      '<div class="card-title">' + (d.d === 'easy' ? '🟢' : d.d === 'medium' ? '🟡' : '🔴') + ' ' + d.label + '</div>' +
      '<div class="advisor-big">' + (d.acc === null ? '—' : Math.round(d.acc * 100) + '%') + '</div>' +
      '<div class="' + cls + '" style="font-weight:700">' + verdict + ' (bar ' + Math.round(d.target * 100) + '%)</div>' +
      '<div class="fs-small text-muted mt-1">' + d.attempts + ' attempts</div>' +
    '</div>';
  }).join('');

  var cadenceHtml = '<div class="card"><div class="card-title">📆 Weekly Cadence — What I\'d Tell You At Our Session</div>' +
    cadence.map(function (t) {
      return '<div class="feed-item">' +
        '<div style="font-weight:700">' + t.icon + ' ' + esc(t.tip) + '</div>' +
        '<div class="text-muted fs-small">' + esc(t.why) + '</div>' +
      '</div>';
    }).join('') +
    '</div>';

  var todayLine = A.today.questions ? A.today.questions + ' today · ' + A.today.pct + '% toward your ' + A.today.goal + '-question goal' : 'No questions yet today';

  appEl.innerHTML =
    '<div class="advisor-wrap">' +
      '<header class="page-header">' +
        '<div class="advisor-kicker">Top-teacher read · generated from your data</div>' +
        '<h1 style="margin-top:.2rem">🧑‍🏫 Your Advisor</h1>' +
        '<p class="text-muted" style="margin:0 auto;max-width:640px">A senior GMAT coach\'s read of where you are, what\'s holding your score back, and the exact order of operations to fix it. ' +
          esc(A.st.user.name) + ' · ' + esc(A.phase.title) + ' · ' + todayLine + '.</p>' +
      '</header>' +
      '<section class="grid-3">' + projectionCard + phaseCard + clockCard + '</section>' +
      '<section class="card advisor-read"><div class="card-title">🧑‍🏫 The Coach\'s Read</div>' +
        '<div style="max-width:720px">' + read.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
        (A.everSeen > 0
          ? '<div class="advisor-note" style="margin-top:.5rem">Seen ' + A.everSeen + ' unique questions · ' + A.stats.totalAnswered + ' total answers · ' + A.errs.length + ' in the error log · ' + A.dueCount + ' due for review</div>'
          : '') +
      '</section>' +
      directiveHtml +
      priorityHtml +
      '<section class="grid-3">' + sectionCards + '</section>' +
      '<section class="card"><div class="card-title">🧪 Format-by-Format Diagnostic</div>' +
        '<div class="table-scroll">' + formatRows + '</div>' +
        '<div class="advisor-note mt-1">Pace is per-format average vs the official section timing. 🤨 = a format running &gt;40% over its time budget.</div>' +
      '</section>' +
      '<section class="grid-3">' + diffCards + '</section>' +
      cadenceHtml +
      '<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap">' +
        '<div><button class="btn btn-primary" id="advisorExport">📄 Export coaching report</button>' +
        '<button class="btn btn-sm btn-ghost" id="advisorAdvice" style="margin-left:.5rem">💡 Advisor tips</button></div>' +
        '<div class="advisor-note">Score projections are heuristics. GMAC\'s adaptive algorithm means no off-app number is exact — use these as a compass, not a comma.</div>' +
      '</div>' +
    '</div>';

  var dateEl = appEl.querySelector('#advisorDate');
  var saveEl = appEl.querySelector('#advisorDateSave');
  if (saveEl && dateEl) {
    saveEl.addEventListener('click', function () {
      setAdvisorTargetDate(dateEl.value);
    });
  }
  var expEl = appEl.querySelector('#advisorExport');
  if (expEl) expEl.addEventListener('click', exportAdvisorReport);
  var advEl = appEl.querySelector('#advisorAdvice');
  if (advEl) {
    advEl.addEventListener('click', function () {
      openModal('<h3 style="margin:0 0 .75rem">💡 Why this view exists</h3>' +
        '<p style="margin:0 0 .6rem">A top GMAT teacher reads three things in your data: <strong>accuracy by format</strong> (where points leak), <strong>pace by format</strong> (where time leaks), and <strong>review discipline</strong> (whether learning sticks). This view compiles those three reads into an ordered plan.</p>' +
        '<p style="margin:0 0 .6rem">Most students mis-diagnose themselves as "bad at math" when the real story is "no data on Two-Part Analysis yet" or "skipped the Hard checkpoint." The Priorities Queue is built to catch exactly those.</p>' +
        '<p style="margin:0">The projection is a transparent heuristic — treat it as a compass. The plan below it is the part you should trust.</p>' +
        '<p class="text-muted fs-small" style="margin-bottom:0">GMAT 750+ Trainer v' + APP_VERSION + '</p>');
    });
  }
}

App.register('advisor', {
  title: 'Your Advisor',
  render: renderAdvisor,
  menuKey: 'advisor'
});

window.renderAdvisor = renderAdvisor;
window.exportAdvisorReport = exportAdvisorReport;
window.advisorAnalysis = advisorAnalysis;