/* =====================================================================
   GMAT 750+ Trainer - Question Bank explorer
   Browse every question in the bank the way a serious trainer wants:
   blueprint coverage vs the real GMAT Focus section, live filters
   (section / topic / format / difficulty / your status / free text),
   per-question history + notes, solo or batched practice-launch from
   any selection (untimed or timed), CSV export and shareable links.
   ===================================================================== */

'use strict';

if (typeof questionBank === 'undefined') {
  throw new Error('bank.js must load after questions.js');
}

var BANK_SECTION_NAMES = { quant: 'Quantitative', verbal: 'Verbal', dataInsights: 'Data Insights', foundations: 'Foundations' };
var BANK_SECTION_ICONS = { quant: '🔢', verbal: '🗣️', dataInsights: '📊', foundations: '🧱' };
var BANK_BLUEPRINT = { quant: { n: 21, label: '21 questions per exam' }, verbal: { n: 23, label: '23 questions per exam' }, dataInsights: { n: 20, label: '20 questions per exam' }, foundations: { n: 0, label: 'Foundations track' } };

var BANK_TOPIC_LABELS = {
  arithmetic: 'Arithmetic', algebra: 'Algebra', wordproblems: 'Word Problems', numbers: 'Number Properties', stats: 'Statistics & Sets',
  rc: 'Reading Comp', cr: 'Critical Reasoning',
  ds: 'Data Sufficiency', ms: 'Multi-Source', ta: 'Table', gi: 'Graphics', tp: 'Two-Part',
  fops: 'Order of Ops', ffrac: 'Fractions & Decimals', falg: 'Algebra Basics', fgram: 'Grammar', fvocab: 'Reading & Vocab'
};

var BANK_FORMAT_KEYS = ['ps', 'rc', 'cr', 'ds', 'msr', 'ta', 'gi', 'tp', 'f'];
var BANK_FORMAT_NAMES = {
  ps: 'Problem Solving', rc: 'Reading Comp', cr: 'Critical Reasoning', ds: 'Data Sufficiency',
  msr: 'Multi-Source Reasoning', ta: 'Table Analysis', gi: 'Graphics Interp', tp: 'Two-Part Analysis', f: 'Foundations'
};
var BANK_FORMAT_SHORT = { ps: 'PS', rc: 'RC', cr: 'CR', ds: 'DS', msr: 'MSR', ta: 'TA', gi: 'GI', tp: 'TP', f: 'F' };
function bankFormatName(k) { return BANK_FORMAT_NAMES[k] || k; }
function bankTopicLabel(tag) { return BANK_TOPIC_LABELS[tag] || tag; }

var BANK = {
  filters: { section: 'all', topic: 'all', format: 'all', difficulty: 'all', status: 'all', search: '', sort: 'topic' },
  expanded: {},   // { qid: true } toggled detail rows
  selected: {}    // { qid: true } hand-picked subset
};

/* ---------------------------------------------------------------------
   Question classification helpers
   --------------------------------------------------------------------- */
var __bankSecIdx = null;
function bankSectionOf(q) {
  if (!__bankSecIdx) {
    var idx = {};
    questionBank.quant.forEach(function (x) { idx[x.id] = 'quant'; });
    questionBank.verbal.forEach(function (x) { idx[x.id] = 'verbal'; });
    questionBank.dataInsights.forEach(function (x) { idx[x.id] = 'dataInsights'; });
    questionBank.foundations.forEach(function (x) { idx[x.id] = 'foundations'; });
    __bankSecIdx = idx;
  }
  return __bankSecIdx[q.id] || 'quant';
}

function bankFormatOf(q) {
  var sec = bankSectionOf(q);
  if (sec === 'foundations') return 'f';
  if (q.format === 'twopart') return 'tp';
  if (q.format === 'table') return 'ta';
  if (q.format === 'msr') return 'msr';
  if (q.format === 'graphics') return 'gi';
  if (sec === 'quant') return 'ps';
  if (sec === 'verbal') return q.topic === 'rc' ? 'rc' : 'cr';
  return 'ds';
}

function bankTotalCount() { return questionBank.all.length; }

/* Per-question lived data: attempts, last result, flags, due, notes. */
function bankQState(qid) {
  var st = loadState();
  var rec = st.practice.review[qid];
  var attrs = rec && rec.attempts ? rec.attempts : [];
  var n = attrs.length;
  var c = 0;
  for (var i = 0; i < n; i++) { if (attrs[i].correct) c += 1; }
  var errEntry = null;
  for (var j = 0; j < st.practice.errorLog.length; j++) {
    if (st.practice.errorLog[j].questionId === qid) { errEntry = st.practice.errorLog[j]; break; }
  }
  return {
    rec: rec,
    attrs: attrs,
    n: n,
    correct: c,
    last: n ? attrs[n - 1].correct : null,
    inError: !!errEntry,
    errEntry: errEntry,
    flagged: st.practice.flagged.indexOf(qid) >= 0,
    due: rec ? rec.due <= Date.now() : false,
    note: (st.practice.notes && st.practice.notes[qid]) || ''
  };
}

/* ---------------------------------------------------------------------
   Filtering
   --------------------------------------------------------------------- */
function bankTopicsForSection(section) {
  var out = [];
  questionBank.all.forEach(function (q) {
    if (section !== 'all' && bankSectionOf(q) !== section) return;
    if (out.indexOf(q.topic) < 0) out.push(q.topic);
  });
  return out.sort(function (a, b) { return (bankTopicLabel(a)).localeCompare(bankTopicLabel(b)); });
}

function bankValidStatus(status) {
  return ['all', 'new', 'attempted', 'correct', 'miss', 'due', 'flagged', 'error'].indexOf(status) >= 0 ? status : 'all';
}
function bankValidSection(sec) {
  return ['all', 'quant', 'verbal', 'dataInsights', 'foundations'].indexOf(sec) >= 0 ? sec : 'all';
}
function bankValidFormat(fmt) {
  return ['all'].concat(BANK_FORMAT_KEYS).indexOf(fmt) >= 0 ? fmt : 'all';
}
function bankValidDifficulty(d) { return ['all', 'easy', 'medium', 'hard'].indexOf(d) >= 0 ? d : 'all'; }
function bankValidSort(s) { return ['topic', 'id', 'difficulty', 'time', 'accuracy'].indexOf(s) >= 0 ? s : 'topic'; }

function bankFiltered() {
  var f = BANK.filters;
  var st = loadState();
  var dueSet = {};
  questionDueIds().forEach(function (id) { dueSet[id] = true; });
  var q = (f.search || '').trim().toLowerCase();
  var out = [];
  questionBank.all.forEach(function (item) {
    var sec = bankSectionOf(item);
    if (f.section !== 'all' && sec !== f.section) return;
    if (f.topic !== 'all' && item.topic !== f.topic) return;
    if (f.format !== 'all' && bankFormatOf(item) !== f.format) return;
    if (f.difficulty !== 'all' && item.difficulty !== f.difficulty) return;

    if (f.status !== 'all') {
      var qs = bankQState(item.id);
      var okFilter =
        f.status === 'new' ? (qs.n === 0 && !qs.inError) :
        f.status === 'attempted' ? qs.n > 0 :
        f.status === 'correct' ? qs.last === true :
        f.status === 'miss' ? qs.last === false :
        f.status === 'due' ? qs.due :
        f.status === 'flagged' ? qs.flagged :
        f.status === 'error' ? qs.inError : true;
      if (!okFilter) return;
    }

    if (q) {
      var hay = (item.id + ' ' + bankTopicLabel(item.topic) + ' ' + (item.subtopic || '') + ' ' + item.text + ' ' + (item.explanation || '')).toLowerCase();
      if (hay.indexOf(q) < 0) return;
    }
    out.push(item);
  });

  var s = f.sort || 'topic';
  out.sort(function (a, b) {
    if (s === 'id') return a.id.localeCompare(b.id);
    if (s === 'difficulty') {
      var r = { easy: 0, medium: 1, hard: 2 };
      return (r[a.difficulty] - r[b.difficulty]) || a.id.localeCompare(b.id);
    }
    if (s === 'time') return ((a.timeEstimate || 0) - (b.timeEstimate || 0)) || a.id.localeCompare(b.id);
    if (s === 'accuracy') {
      function acc(id) {
        var qq = bankQState(id);
        return qq.n ? qq.correct / qq.n : -1;
      }
      return (acc(b.id) - acc(a.id)) || a.id.localeCompare(b.id);
    }
    return bankTopicLabel(a.topic).localeCompare(bankTopicLabel(b.topic)) || a.id.localeCompare(b.id);
  });
  return out;
}

function bankStatusFor(qs) {
  if (qs.due) return { cls: 'due', text: '⏰ Due' };
  if (qs.inError) return { cls: 'err', text: '❌ Re-do' };
  if (qs.last === true) return { cls: 'ok', text: '✅' };
  if (qs.last === false) return { cls: 'miss', text: '❌' };
  return { cls: 'new', text: '🆕' };
}

/* ---------------------------------------------------------------------
   Row / detail rendering
   --------------------------------------------------------------------- */
var BANK_LETTERS = 'ABCDEFGH';
function bankPreview(q) {
  if (q.passageId && !q.passage) {
    var p = null;
    for (var i = 0; i < questionBank.rcPassages.length; i++) {
      if (questionBank.rcPassages[i].id === q.passageId) { p = questionBank.rcPassages[i]; break; }
    }
    if (p) return { passage: p.text, passageTitle: p.title, text: q.text };
  }
  return { passage: q.passage || '', passageTitle: q.passageTitle || '', text: q.text };
}

function bankDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function bankMineCell(qs, q) {
  if (!qs.n) return '<span class="text-muted">—</span>';
  var pct = Math.round(qs.correct * 100 / qs.n);
  var cls = qs.correct === qs.n ? '' : ' low';
  return '<span class="bank-pct">' + pct + '%</span>' +
    '<span class="bank-mini"><span class="bank-mini-fill' + cls + '" style="width:' + pct + '%"></span></span>' +
    '<span class="text-muted">' + qs.n + '× ' + (qs.last ? '<span class="bank-dot ok"></span>' : '<span class="bank-dot miss"></span>') + '</span>';
}

function bankRowHtml(q) {
  var qs = bankQState(q.id);
  var st = bankStatusFor(qs);
  var fmt = bankFormatOf(q);
  var exp = !!BANK.expanded[q.id];
  var sel = !!BANK.selected[q.id];
  var options = Array.isArray(q.options) && q.options.length ? q.options : null;
  var letters = BANK_LETTERS;

  var expandBody = '';
  if (exp) {
    var prev = bankPreview(q);
    var body = '';
    if (prev.passage) {
      body += '<div class="clue-box" style="margin:0 0 .7rem"><div style="font-weight:700;margin-bottom:.4rem">📄 ' + esc(prev.passageTitle || 'Passage') + '</div><div class="passage-text" style="white-space:pre-line">' + esc(prev.passage) + '</div></div>';
    }
    body += '<div style="white-space:pre-line;font-weight:600;margin-bottom:.6rem">' + esc(prev.text) + '</div>';

    if (options && typeof q.correct === 'number' && q.correct < options.length && options[q.correct] !== undefined) {
      body += options.map(function (o, i) {
        var ok = i === q.correct ? ' option-answer' : '';
        return '<div class="bank-opt' + ok + '"><span class="option-letter">' + letters[i] + '</span>' + esc(o) + '</div>';
      }).join('');
      body += '<div class="bank-ans">Answer: <b>' + letters[q.correct] + '</b> · ' + esc(options[q.correct]) + '</div>';
    } else {
      body += '<div class="bank-note">Structured <b>' + esc(bankFormatName(fmt)) + '</b> item — press <b>▶</b> on the row to solve it and review the explanation in-session.</div>';
    }
    if (q.explanation) body += '<div class="clue-box"><b>💡 Coach note:</b><br>' + esc(q.explanation) + '</div>';

    if (qs.n) {
      var hist = qs.attrs.slice(-6).reverse().map(function (a) {
        return '<div class="bank-hist-item"><span class="bank-dot ' + (a.correct ? 'ok' : 'miss') + '"></span> ' +
          (a.correct ? 'Correct' : 'Wrong') + ' · ' + fmtShort(a.secs || 0) + ' · ' +
          (a.hintUsed ? '💡 hint ' : '') +
          (a.felt ? '· felt ' + esc(a.felt) : '') +
          (a.errorTag ? '· ' + esc(a.errorTag) : '') +
          (a.confidence ? '· conf ' + esc(a.confidence) : '') +
          ' · ' + bankDate(a.ts) + '</div>';
      }).join('');
      var rr = qs.rec;
      var dueTxt = rr.due ? new Date(rr.due).toLocaleDateString() : '';
      body += '<div class="bank-detail-block"><div class="meta-label">History</div>' + hist +
        '<div class="bank-hist-meta">reps <b>' + (rr.reps || 0) + '</b> · streak <b>' + (rr.streak || 0) + '</b> · wrong ' + (rr.wrongCount || 0) +
        ' · interval <b>' + (rr.intervalDays || 0) + 'd</b> · EF ' + (rr.ef !== undefined ? rr.ef.toFixed(2) : '—') +
        (rr.due ? ' · next due <b>' + dueTxt + '</b>' : '') + '</div></div>';
    } else {
      body += '<div class="bank-detail-block"><div class="meta-label">History</div><div class="text-muted">Never attempted — this one is fresh.</div></div>';
    }

    if (qs.inError && qs.errEntry) {
      var e = qs.errEntry;
      body += '<div class="bank-detail-block"><div class="meta-label">Error log</div>' +
        '<div class="bank-hist-item">❌ Missed on ' + (e.ts ? bankDate(e.ts) : 'recent practice') +
        (typeof e.youChose === 'number' && options && options[e.youChose] ? ' · you chose <b>' + letters[e.youChose] + '</b> (' + esc(options[e.youChose]) + ')' : '') +
        (e.secs ? ' · ' + fmtShort(e.secs) : '') +
        (e.errorTag ? ' · ' + esc(e.errorTag) : '') +
        (e.felt ? ' · felt ' + esc(e.felt) : '') +
        (e.confidence ? ' · conf ' + esc(e.confidence) : '') +
        '</div></div>';
    }

    body += '<div class="bank-detail-block"><div class="meta-label">Your notes</div>' +
      '<textarea class="bank-note-input" id="bankNote-' + q.id + '" placeholder="Why did you miss it? What is the takeaway for next time?">' + esc(qs.note) + '</textarea>' +
      '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();bankSaveNote(\'' + q.id + '\')">Save note</button></div>';

    expandBody = '<div class="bank-expand">' + body + '</div>';
  }

  return '<div class="bank-item">' +
    '<div class="bank-row" onclick="bankExpand(\'' + q.id + '\')">' +
      '<span class="bank-col-sel"><input type="checkbox" class="bank-check" ' + (sel ? 'checked' : '') + ' onclick="event.stopPropagation();bankToggleSel(\'' + q.id + '\')"></span>' +
      '<span class="bank-col-pill"><span class="bank-pill ' + st.cls + '">' + st.text + '</span></span>' +
      '<span class="bank-col-main bank-main">' +
        '<span class="bank-carets">' + (exp ? '▾' : '▸') + '</span> ' +
        '<span class="bank-sub">' + esc(q.subtopic || bankTopicLabel(q.topic)) + '</span>' +
        (qs.flagged ? ' <span title="Flagged">🚩</span>' : '') +
        '<div class="bank-id">' + esc(q.id) + ' · ' + esc(bankTopicLabel(q.topic)) + '</div>' +
        (qs.inError ? '<div class="bank-id">in error log</div>' : '') +
      '</span>' +
      '<span class="bank-col-d"><span class="badge ' + difficultyClass(q.difficulty) + '">' + difficultyLabel(q.difficulty) + '</span></span>' +
      '<span class="bank-col-f"><span class="badge badge-ghost">' + BANK_FORMAT_SHORT[fmt] + '</span></span>' +
      '<span class="bank-col-t bank-time">⏱ ' + fmtShort(q.timeEstimate || 0) + '</span>' +
      '<span class="bank-col-mine bank-mine">' + bankMineCell(qs, q) + '</span>' +
      '<span class="bank-col-acts">' +
        '<button class="btn btn-sm btn-ghost ' + (qs.flagged ? 'flagged-active' : '') + '" title="Flag / unflag" onclick="event.stopPropagation();bankToggleFlag(\'' + q.id + '\')">🚩</button>' +
        '<button class="btn btn-sm btn-primary" title="Drill this question" onclick="event.stopPropagation();bankSolo(\'' + q.id + '\')">▶</button>' +
      '</span>' +
    '</div>' + expandBody + '</div>';
}

/* ---------------------------------------------------------------------
   Coverage blueprint card
   --------------------------------------------------------------------- */
function bankCoverageHtml() {
  var secs = ['quant', 'verbal', 'dataInsights', 'foundations'];
  return '<div class="bank-coverage">' + secs.map(function (sec) {
    var items = questionBank.all.filter(function (q) { return bankSectionOf(q) === sec; });
    var attempted = 0, correct = 0;
    items.forEach(function (q) { var qs = bankQState(q.id); if (qs.n) { attempted += 1; if (qs.last === true) correct += 1; } });
    var bp = BANK_BLUEPRINT[sec];
    var pct = items.length ? Math.round(attempted * 100 / items.length) : 0;
    var topics = bankTopicsForSection(sec);
    return '<div class="card bank-sec">' +
      '<div class="bank-sec-head">' +
        '<span class="bank-sec-name">' + BANK_SECTION_ICONS[sec] + ' ' + BANK_SECTION_NAMES[sec] + '</span>' +
        '<span class="bank-sec-blueprint">' + (bp ? bp.label : '') + ' · blueprint' + (bp && bp.n ? ' ' + bp.n : '') + '</span>' +
      '</div>' +
      '<div class="progress" style="height:10px"><div class="progress-bar ' + (attempted === items.length ? 'success' : pct >= 50 ? 'accent' : '') + '" style="width:' + pct + '%"></div></div>' +
      '<div class="bank-sec-sub">' + attempted + '/' + items.length + ' attempted · <span style="color:var(--color-muted)">' + (items.length - attempted) + ' untouched</span></div>' +
      '<div class="bank-topics">' + topics.map(function (t) {
        var inSec = items.filter(function (q) { return q.topic === t; });
        var used = 0;
        inSec.forEach(function (q) { if (bankQState(q.id).n) used += 1; });
        return '<button class="bank-topic-chip" onclick="bankJump(\'' + sec + '\',\'' + t + '\')"><span>' + esc(bankTopicLabel(t)) + '</span><span class="bank-topic-un">' + (inSec.length - used) + '</span><span class="text-muted">/ ' + inSec.length + '</span></button>';
      }).join('') + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

/* ---------------------------------------------------------------------
   Results + toolbar
   --------------------------------------------------------------------- */
function bankPool() {
  var pool = bankFiltered();
  var sel = Object.keys(BANK.selected || {});
  if (sel.length) pool = pool.filter(function (q) { return sel.indexOf(q.id) >= 0; });
  return pool;
}

function bankResultsHtml() {
  var list = bankFiltered();
  var rows = list.map(bankRowHtml).join('');
  return '<div class="bank-list" id="bankList">' +
    '<div class="bank-row-head">' +
      '<span class="bank-col-sel"></span>' +
      '<span class="bank-col-pill">Status</span>' +
      '<span class="bank-col-main">Question</span>' +
      '<span class="bank-col-d">Difficulty</span>' +
      '<span class="bank-col-f">Format</span>' +
      '<span class="bank-col-t">Time</span>' +
      '<span class="bank-col-mine">Your track record</span>' +
      '<span class="bank-col-acts">Actions</span>' +
    '</div>' +
    rows +
  '</div>' +
  (list.length ? '<div class="text-muted" style="font-size:.8rem;margin-top:.4rem">Rows are clickable — expand any question for full text, answer, history and your notes. Tick checkboxes to hand-pick a subset, or launch the whole list.</div>' : '');
}

function bankToolbarHtml() {
  var pool = bankPool();
  var selectedN = Object.keys(BANK.selected || {}).length;
  var perQ = pool.length ? Math.round(pool.reduce(function (s, q) { return s + paceTargetFor(q); }, 0) / pool.length) : 0;
  return '<div class="bank-actions" id="bankToolbar">' +
    '<span class="bank-count">' + pool.length + (selectedN ? ' selected' : '') + ' question' + (pool.length === 1 ? '' : 's') + '</span>' +
    (selectedN ? '<button class="btn btn-sm btn-ghost" onclick="bankClearSel()">✕ clear ' + selectedN + ' selected</button>' : '') +
    '<button class="btn btn-sm btn-primary" onclick="bankPractice(false)" ' + (pool.length ? '' : 'disabled') + '>▶ Practice set</button>' +
    '<button class="btn btn-sm btn-accent" onclick="bankPractice(true)" ' + (pool.length ? '' : 'disabled') + ' title="' + perQ + 's per question, official-pace average">⏱ Timed set</button>' +
    '<button class="btn btn-sm btn-ghost" onclick="bankExportCsv()" ' + (pool.length ? '' : 'disabled') + '>⬇ CSV</button>' +
    '<button class="btn btn-sm btn-ghost" onclick="bankShareLink()">🔗 Share this view</button>' +
    '<button class="btn btn-sm btn-ghost" onclick="bankResetFilters()">⟲ Reset</button>' +
  '</div>';
}

/* ---------------------------------------------------------------------
   Full shell
   --------------------------------------------------------------------- */
function bankFilterRowOption(sel, val, label) {
  return '<option value="' + val + '"' + (sel === val ? ' selected' : '') + '>' + label + '</option>';
}

function bankShellHtml() {
  var f = BANK.filters;
  var st = loadState();
  var total = bankTotalCount();
  var unused = 0, due = 0, flagged = 0, errs = 0, correct = 0, missed = 0;
  var dueSet = {};
  questionDueIds().forEach(function (id) { dueSet[id] = true; });
  questionBank.all.forEach(function (q) {
    var qs = bankQState(q.id);
    if (!qs.n) unused += 1;
    if (qs.due) due += 1;
    if (qs.flagged) flagged += 1;
    if (qs.inError) errs += 1;
    if (qs.last === true) correct += 1;
    if (qs.last === false) missed += 1;
  });

  var sectionVal = f.section;
  var topicVal = f.topic;
  var formatVal = f.format;
  var diffVal = f.difficulty;
  var statusVal = f.status;
  var sortVal = f.sort;

  var formats = ['all'].concat((function () {
    if (sectionVal === 'quant') return ['ps'];
    if (sectionVal === 'verbal') return ['rc', 'cr'];
    if (sectionVal === 'dataInsights') return ['ds', 'msr', 'ta', 'gi', 'tp'];
    if (sectionVal === 'foundations') return ['f'];
    return BANK_FORMAT_KEYS;
  })());

  var topics = ['all'].concat(bankTopicsForSection(sectionVal));

  var strip = [
    { key: 'all', label: 'All ' + total, cls: '' },
    { key: 'new', label: unused + ' untouched', cls: '' },
    { key: 'attempted', label: (total - unused) + ' attempted', cls: '' },
    { key: 'due', label: due + ' due', cls: 'due' },
    { key: 'flagged', label: flagged + ' flagged', cls: 'flag' },
    { key: 'error', label: errs + ' in error log', cls: 'err' }
  ];

  return '' +
    '<div class="page-header">' +
      '<h1>Question Bank</h1>' +
      '<p class="text-muted">Every question the trainer owns — pitched against the real GMAT Focus blueprint — so you can see exactly what is left, what leaks, and drill from the list itself.</p>' +
    '</div>' +

    '<div class="bank-strip">' + strip.map(function (c) {
      return '<button class="bank-chip' + (statusVal === c.key && f.section === 'all' ? ' active' : '') + '" onclick="bankPreset(\'' + c.key + '\')">' + c.label + '</button>';
    }).join('') + '</div>' +

    '<h2 class="section-title">Blueprint coverage</h2>' + bankCoverageHtml() +

    '<h2 class="section-title">Browse the bank</h2>' +
    '<div class="card bank-filters-card">' +
      '<div class="bank-filters">' +
        '<div class="bank-field"><label>Section</label><select onchange="bankFilterChange()" id="bfSection">' +
          bankFilterRowOption(sectionVal, 'all', 'All sections') +
          bankFilterRowOption(sectionVal, 'quant', 'Quantitative') +
          bankFilterRowOption(sectionVal, 'verbal', 'Verbal') +
          bankFilterRowOption(sectionVal, 'dataInsights', 'Data Insights') +
          bankFilterRowOption(sectionVal, 'foundations', 'Foundations') +
        '</select></div>' +
        '<div class="bank-field"><label>Topic</label><select onchange="bankFilterChange()" id="bfTopic">' +
          bankFilterRowOption(topicVal, 'all', 'All topics') +
          topics.map(function (t) { return t === 'all' ? '' : bankFilterRowOption(topicVal, t, bankTopicLabel(t)); }).join('') +
        '</select></div>' +
        '<div class="bank-field"><label>Format</label><select onchange="bankFilterChange()" id="bfFormat">' +
          bankFilterRowOption(formatVal, 'all', 'All formats') +
          formats.map(function (k) { return k === 'all' ? '' : bankFilterRowOption(formatVal, k, BANK_FORMAT_NAMES[k]); }).join('') +
        '</select></div>' +
        '<div class="bank-field"><label>Difficulty</label><select onchange="bankFilterChange()" id="bfDiff">' +
          bankFilterRowOption(diffVal, 'all', 'Any difficulty') +
          bankFilterRowOption(diffVal, 'easy', 'Easy') +
          bankFilterRowOption(diffVal, 'medium', 'Medium') +
          bankFilterRowOption(diffVal, 'hard', 'Hard') +
        '</select></div>' +
        '<div class="bank-field"><label>Your status</label><select onchange="bankFilterChange()" id="bfStatus">' +
          bankFilterRowOption(statusVal, 'all', 'Any status') +
          bankFilterRowOption(statusVal, 'new', 'Untouched') +
          bankFilterRowOption(statusVal, 'attempted', 'Attempted') +
          bankFilterRowOption(statusVal, 'correct', 'Last correct') +
          bankFilterRowOption(statusVal, 'miss', 'Last wrong') +
          bankFilterRowOption(statusVal, 'due', 'Due for review') +
          bankFilterRowOption(statusVal, 'flagged', 'Flagged') +
          bankFilterRowOption(statusVal, 'error', 'In error log') +
        '</select></div>' +
        '<div class="bank-field"><label>Sort by</label><select onchange="bankFilterChange()" id="bfSort">' +
          bankFilterRowOption(sortVal, 'topic', 'Topic') +
          bankFilterRowOption(sortVal, 'id', 'Bank id') +
          bankFilterRowOption(sortVal, 'difficulty', 'Difficulty') +
          bankFilterRowOption(sortVal, 'time', 'Time estimate') +
          bankFilterRowOption(sortVal, 'accuracy', 'My accuracy') +
        '</select></div>' +
        '<div class="bank-field bank-search"><label>Search</label><input id="bfSearch" type="text" placeholder="Search id, topic, subtopic, text…" value="' + esc(f.search) + '" oninput="bankSearchTyped(this.value)"></div>' +
      '</div>' +
    '</div>' +

    bankToolbarHtml() +

    '<div id="bankResultsWrap">' + bankResultsHtml() + '</div>';
}

/* ---------------------------------------------------------------------
   Render + actions
   --------------------------------------------------------------------- */
function bankRenderInner(el) {
  el.innerHTML = bankShellHtml();
}

function bankRerender() {
  var el = document.getElementById('app');
  if (!el) return;
  var y = window.scrollY;
  bankRenderInner(el);
  window.scrollTo(0, y);
}

function renderBank(el, args) {
  if (args && args[0] && args[0].indexOf('?') === 0) {
    bankLoadFromHash(args[0].slice(1));
  }
  BANK.expanded = {};
  bankRenderInner(el);
}

function bankFilterChange() {
  var el = document.getElementById('app');
  BANK.filters.section = bankValidSection(document.getElementById('bfSection').value);
  BANK.filters.topic = document.getElementById('bfTopic').value;
  BANK.filters.format = bankValidFormat(document.getElementById('bfFormat').value);
  BANK.filters.difficulty = bankValidDifficulty(document.getElementById('bfDiff').value);
  BANK.filters.status = bankValidStatus(document.getElementById('bfStatus').value);
  BANK.filters.sort = bankValidSort(document.getElementById('bfSort').value);
  bankRerender();
}

function bankSearchTyped(value) {
  BANK.filters.search = value || '';
  var wrap = document.getElementById('bankResultsWrap');
  if (wrap) wrap.innerHTML = bankResultsHtml();
  var bar = document.getElementById('bankToolbar');
  if (bar) bar.innerHTML = bankToolbarHtml();
}

function bankExpandedToggle(id) {
  BANK.expanded[id] = !BANK.expanded[id];
  bankRerender();
}

function bankExpand(id) {
  bankExpandedToggle(id);
}

function bankToggleSel(id) {
  if (BANK.selected[id]) delete BANK.selected[id];
  else BANK.selected[id] = true;
  var bar = document.getElementById('bankToolbar');
  if (bar) bar.innerHTML = bankToolbarHtml();
}

function bankClearSel() {
  BANK.selected = {};
  var bar = document.getElementById('bankToolbar');
  if (bar) bar.innerHTML = bankToolbarHtml();
}

function bankToggleFlag(id) {
  var had = false;
  updateState(function (s) {
    var i = s.practice.flagged.indexOf(id);
    if (i >= 0) { s.practice.flagged.splice(i, 1); } else { s.practice.flagged.push(id); had = true; }
  });
  toast(had ? 'Question flagged for review.' : 'Flag removed.', 'success');
  bankRerender();
}

function bankSaveNote(id) {
  var ta = document.getElementById('bankNote-' + id);
  if (!ta) return;
  var text = ta.value;
  updateState(function (s) {
    if (text.trim()) s.practice.notes[id] = text;
    else delete s.practice.notes[id];
  });
  toast(text.trim() ? 'Note saved.' : 'Note removed.', 'success');
  bankRerender();
}

function bankSolo(id) {
  beginSession({ mode: 'bank', ids: [id], count: 1, perQSeconds: 0, shuffle: false });
}

function bankPractice(timed) {
  var pool = bankPool();
  if (!pool.length) { toast(timed ? 'Nothing to time — set filters or tick some questions.' : 'Nothing to practice — set filters or tick some questions.', 'error'); return; }
  var ids = pool.map(function (q) { return q.id; });
  if (pool.length > 50) {
    ids = ids.slice(0, 50);
    toast('Session capped at 50 — narrow the selection or tick the exact questions.');
  }
  var perQSeconds = timed ? Math.round(ids.reduce(function (s, id) { return s + paceTargetFor(questionBank.byId[id]); }, 0) / ids.length) : 0;
  beginSession({ mode: 'bank', ids: ids, count: 0, perQSeconds: perQSeconds });
}

function bankPreset(key) {
  BANK.filters.status = bankValidStatus(key);
  BANK.filters.section = 'all';
  BANK.filters.topic = 'all';
  BANK.filters.format = 'all';
  BANK.filters.difficulty = 'all';
  BANK.filters.search = '';
  bankRerender();
}

function bankJump(section, topic) {
  BANK.filters.section = bankValidSection(section);
  BANK.filters.topic = topic;
  BANK.filters.format = 'all';
  BANK.filters.difficulty = 'all';
  BANK.filters.status = 'all';
  BANK.filters.search = '';
  bankRerender();
}

function bankResetFilters() {
  BANK.filters = { section: 'all', topic: 'all', format: 'all', difficulty: 'all', status: 'all', search: '', sort: 'topic' };
  BANK.selected = {};
  BANK.expanded = {};
  bankRerender();
}

/* ---------------------------------------------------------------------
   Deep links
   --------------------------------------------------------------------- */
function bankShareUrl() {
  var f = BANK.filters;
  var p = [];
  if (f.section !== 'all') p.push('section=' + f.section);
  if (f.topic !== 'all') p.push('topic=' + f.topic);
  if (f.format !== 'all') p.push('format=' + f.format);
  if (f.difficulty !== 'all') p.push('difficulty=' + f.difficulty);
  if (f.status !== 'all') p.push('status=' + f.status);
  if (f.search) p.push('q=' + encodeURIComponent(f.search));
  if (f.sort !== 'topic') p.push('sort=' + f.sort);
  return '#/bank' + (p.length ? '?' + p.join('&') : '');
}

function bankShareLink() {
  var url = location.origin + location.pathname + bankShareUrl();
  function done() { toast('Bank link copied — share or bookmark it.', 'success'); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { }
  document.body.removeChild(ta);
  toast('Bank link copied.', 'success');
}

function bankLoadFromHash(qs) {
  var params = {};
  qs.split('&').forEach(function (pair) {
    if (!pair) return;
    var kv = pair.split('=');
    params[kv[0]] = decodeURIComponent(kv[1] || '');
  });
  var f = BANK.filters;
  f.section = params.section ? bankValidSection(params.section) : 'all';
  f.topic = params.topic || 'all';
  f.format = params.format ? bankValidFormat(params.format) : 'all';
  f.difficulty = params.difficulty ? bankValidDifficulty(params.difficulty) : 'all';
  f.status = params.status ? bankValidStatus(params.status) : 'all';
  f.search = params.q || '';
  f.sort = params.sort ? bankValidSort(params.sort) : 'topic';
  BANK.selected = {};
}

/* ---------------------------------------------------------------------
   CSV export of the current selection/list
   --------------------------------------------------------------------- */
function bankExportCsv() {
  var pool = bankPool();
  if (!pool.length) { toast('Nothing to export — widen the filters or tick some questions.', 'error'); return; }
  var dueSet = {};
  questionDueIds().forEach(function (id) { dueSet[id] = true; });
  var rows = [['id', 'section', 'topic', 'subtopic', 'difficulty', 'format', 'timeEstimate_s', 'attempts', 'correct', 'accuracy', 'lastResult', 'due', 'flagged', 'note']];
  pool.forEach(function (q) {
    var qs = bankQState(q.id);
    var row = [
      q.id, bankSectionOf(q), q.topic, q.subtopic, q.difficulty, bankFormatOf(q),
      q.timeEstimate || '', qs.n, qs.correct, qs.n ? Math.round(qs.correct * 100 / qs.n) : '',
      qs.last === null ? 'unattempted' : (qs.last ? 'correct' : 'miss'),
      dueSet[q.id] ? 'due' : '', qs.flagged ? 'yes' : '', qs.note
    ];
    rows.push(row.map(function (cell) { return typeof cell === 'string' ? '"' + cell.replace(/"/g, '""') + '"' : cell; }).join(','));
  });
  var csv = rows[0].join(',') + '\n' + rows.slice(1).join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gmat750-bank-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  toast('Bank export saved (' + pool.length + ' rows).', 'success');
}

/* ---------------------------------------------------------------------
   Registration
   --------------------------------------------------------------------- */
App.register('bank', {
  title: 'Question Bank',
  render: renderBank,
  menuKey: 'bank'
});

window.renderBank = renderBank;
window.bankExpand = bankExpand;
window.bankToggleSel = bankToggleSel;
window.bankClearSel = bankClearSel;
window.bankToggleFlag = bankToggleFlag;
window.bankSaveNote = bankSaveNote;
window.bankSolo = bankSolo;
window.bankPractice = bankPractice;
window.bankPreset = bankPreset;
window.bankJump = bankJump;
window.bankResetFilters = bankResetFilters;
window.bankFilterChange = bankFilterChange;
window.bankSearchTyped = bankSearchTyped;
window.bankShareLink = bankShareLink;
window.bankExportCsv = bankExportCsv;