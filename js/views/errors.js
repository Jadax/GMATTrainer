/* =====================================================================
   GMAT 750+ Trainer - Error Log Review Hub
   The coaching surface for every answer you get wrong:
   summary + recovery numbers, pattern/leak analysis by mistake type,
   topic and format, weekly trend, deep filters, per-miss reason
   tagging, mark-reviewed / auto-healed states, one-tap re-drills,
   relearn/bank jumps, CSV export and bulk clear actions.

   Load after bank.js (reuses its classification + live-state helpers).
   ===================================================================== */

'use strict';

if (typeof questionBank === 'undefined') {
  throw new Error('errors.js must load after questions.js');
}

var ERR = {
  filters: { status: 'all', section: 'all', topic: 'all', format: 'all', difficulty: 'all', search: '', sort: 'newest', group: 'none' },
  expanded: {} // { qid: true } toggled detail rows
};

/* Mistake taxonomy — shared with the practice feedback UI. */
var ERR_REASONS = [
  { key: 'careless', icon: '😅', label: 'Careless slip' },
  { key: 'conceptual', icon: '📚', label: 'Didn\'t know it' },
  { key: 'timing', icon: '⏱', label: 'Time pressure' },
  { key: 'misread', icon: '🔍', label: 'Misread' }
];

var ERR_FELT = { 1: '😊', 2: '🙂', 3: '😐', 4: '😤', 5: '🥵' };
var ERR_CONF = { sure: '✓ Sure', unsure: '~ Unsure', guessed: '? Guessed' };

function errReasonLabel(key) {
  var r = ERR_REASONS.find(function (x) { return x.key === key; });
  return r ? r.label : (key || null);
}
function errReasonIcon(key) {
  var r = ERR_REASONS.find(function (x) { return x.key === key; });
  return r ? r.icon : '🧩';
}

/* ---------------------------------------------------------------------
   Enriched miss records
   status: 'live' (latest attempt wrong, not reviewed)
           'reviewed' (you studied it; still the latest result is wrong)
           'healed'  (you have since answered it correctly)
   --------------------------------------------------------------------- */
function errRecords() {
  var st = loadState();
  var out = [];
  st.practice.errorLog.forEach(function (e) {
    var q = questionBank.byId[e.questionId];
    if (!q) return;
    var qs = bankQState(q.id);
    var healed = qs.last === true;
    var reviewed = !!e.reviewed;
    out.push({
      e: e, q: q, id: q.id,
      status: healed ? 'healed' : (reviewed ? 'reviewed' : 'live'),
      healed: healed, reviewed: reviewed,
      qs: qs
    });
  });
  return out;
}

function errValidStatus(s) {
  return ['all', 'live', 'reviewed', 'healed'].indexOf(s) >= 0 ? s : 'all';
}
function errValidSort(s) {
  return ['newest', 'oldest', 'topic', 'time', 'confidence'].indexOf(s) >= 0 ? s : 'newest';
}
function errValidGroup(g) {
  return ['none', 'reason', 'topic'].indexOf(g) >= 0 ? g : 'none';
}

function errFiltered() {
  var f = ERR.filters;
  var q = (f.search || '').trim().toLowerCase();
  var out = errRecords().filter(function (r) {
    var sec = bankSectionOf(r.q);
    if (f.status !== 'all' && r.status !== f.status) return false;
    if (f.section !== 'all' && sec !== f.section) return false;
    if (f.topic !== 'all' && r.q.topic !== f.topic) return false;
    if (f.format !== 'all' && bankFormatOf(r.q) !== f.format) return false;
    if (f.difficulty !== 'all' && r.q.difficulty !== f.difficulty) return false;
    if (q) {
      var hay = (r.id + ' ' + bankTopicLabel(r.q.topic) + ' ' + (r.q.subtopic || '') + ' ' + r.q.text + ' ' + (r.q.explanation || '')).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });
  var byTime = f.sort === 'oldest';
  out.sort(function (a, b) {
    if (f.sort === 'topic') return bankTopicLabel(a.q.topic).localeCompare(bankTopicLabel(b.q.topic)) || (b.e.ts - a.e.ts);
    if (f.sort === 'time') return (b.e.secs || 0) - (a.e.secs || 0);
    if (f.sort === 'confidence') return a.e.confidence === null ? 1 : (b.e.confidence === null ? -1 : 0);
    return byTime ? (a.e.ts - b.e.ts) : (b.e.ts - a.e.ts);
  });
  return out;
}

/* Short status count helper used by the summary strip + dashboard teaser. */
function errCounts() {
  var recs = errRecords();
  var c = { total: recs.length, live: 0, reviewed: 0, healed: 0 };
  recs.forEach(function (r) { c[r.status] += 1; });
  c.recovery = c.total ? Math.round((c.reviewed + c.healed) * 100 / c.total) : 0;
  return c;
}

function weekStart(ts) {
  var d = new Date(ts);
  var day = (d.getDay() + 6) % 7; // Monday-based
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

/* Misses per week for the last `weeks` weeks (oldest first). */
function errWeekly(weeks) {
  var today = new Date();
  var thisMon = weekStart(today.getTime());
  var buckets = [];
  for (var i = weeks - 1; i >= 0; i--) {
    var start = thisMon - i * 7 * 86400000;
    buckets.push({ start: start, end: start + 7 * 86400000, count: 0, live: 0, label: '' });
  }
  var liveIds = {};
  errRecords().forEach(function (r) { if (r.status === 'live') liveIds[r.id] = true; });
  loadState().practice.errorLog.forEach(function (e) {
    var b = buckets.find(function (x) { return e.ts >= x.start && e.ts < x.end; });
    if (!b) return;
    b.count += 1;
    if (liveIds[e.questionId]) b.live += 1;
  });
  buckets.forEach(function (b) {
    var d = new Date(b.start);
    b.label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  return buckets;
}

/* ---------------------------------------------------------------------
   Pattern (leak) analysis
   --------------------------------------------------------------------- */
function errPatterns() {
  var liveIds = {};
  errRecords().forEach(function (r) { if (r.status === 'live') liveIds[r.id] = true; });
  var reasonMap = {}, topicMap = {}, formatMap = {};
  errRecords().forEach(function (r) {
    var reason = r.e.reason || r.e.errorTag || 'untagged';
    if (!reasonMap[reason]) reasonMap[reason] = { n: 0, live: 0 };
    reasonMap[reason].n += 1;
    if (liveIds[r.id]) reasonMap[reason].live += 1;

    if (!topicMap[r.q.topic]) topicMap[r.q.topic] = { n: 0, live: 0 };
    topicMap[r.q.topic].n += 1;
    if (liveIds[r.id]) topicMap[r.q.topic].live += 1;

    var fmt = bankFormatOf(r.q);
    if (!formatMap[fmt]) formatMap[fmt] = { n: 0, live: 0 };
    formatMap[fmt].n += 1;
    if (liveIds[r.id]) formatMap[fmt].live += 1;
  });
  var sortFreq = function (a, b) { return b.n - a.n; };
  var reasons = Object.keys(reasonMap).map(function (k) { return { key: k, n: reasonMap[k].n, live: reasonMap[k].live }; }).sort(sortFreq);
  var topics = Object.keys(topicMap).map(function (k) { return { key: k, n: topicMap[k].n, live: topicMap[k].live }; }).sort(sortFreq);
  var formats = Object.keys(formatMap).map(function (k) { return { key: k, n: formatMap[k].n, live: formatMap[k].live }; }).sort(sortFreq);
  return { reasons: reasons, topics: topics, formats: formats };
}

/* ---------------------------------------------------------------------
   Row + expand rendering
   --------------------------------------------------------------------- */
function errMetaLine(r) {
  var e = r.e, bits = [];
  if (e.felt && ERR_FELT[e.felt]) bits.push(ERR_FELT[e.felt]);
  if (e.confidence) bits.push(ERR_CONF[e.confidence] || e.confidence);
  if (e.hintUsed) bits.push('💡 hint');
  if (e.secs) bits.push(fmtShort(e.secs));
  return bits.join(' · ');
}

function errReasonChips(r) {
  return ERR_REASONS.map(function (rr) {
    var on = (r.e.reason || null) === rr.key;
    return '<button class="err-reason-chip' + (on ? ' active' : '') + '" title="Why did you miss this?" onclick="event.stopPropagation();errSetReason(\'' + r.id + '\',\'' + rr.key + '\')">' + rr.icon + ' ' + rr.label + '</button>';
  }).join('');
}

function errExpandBody(r) {
  var q = r.q, qs = r.qs, body = '';
  if (q.passageId) {
    var p = questionBank.rcPassages.find(function (x) { return x.id === q.passageId; });
    if (p) body += '<div class="clue-box" style="margin:0 0 .7rem"><div style="font-weight:700;margin-bottom:.4rem">📄 ' + esc(p.title || 'Passage') + '</div><div class="passage-text" style="white-space:pre-line">' + esc(p.text) + '</div></div>';
  }
  body += '<div style="white-space:pre-line;font-weight:600;margin-bottom:.6rem">' + esc(q.text) + '</div>';

  if (q.options && typeof q.correct === 'number' && q.correct < q.options.length && q.options[q.correct] !== undefined) {
    body += '<div class="bank-opt-wrap">' + q.options.map(function (o, i) {
      return '<div class="bank-opt' + (i === q.correct ? ' option-answer' : '') + '"><span class="option-letter">' + String.fromCharCode(65 + i) + '</span>' + esc(o) + '</div>';
    }).join('') + '</div>';
    body += '<div class="bank-ans">Answer: <b>' + String.fromCharCode(65 + q.correct) + '</b> · ' + esc(q.options[q.correct]) + '</div>';
  } else {
    body += '<div class="bank-ans">Correct answer: <b>' + esc(diCorrectDisplay(q)) + '</b></div>';
    if (!qs.last) body += '<div class="bank-note">Structured <b>' + esc(bankFormatName(bankFormatOf(q))) + '</b> item — retry it to walk the solution in-session.</div>';
  }
  if (q.explanation) body += '<div class="clue-box"><b>💡 Coach note:</b><br>' + esc(q.explanation) + '</div>';

  if (qs.n) {
    var hist = qs.attrs.slice(-5).reverse().map(function (a) {
      return '<div class="bank-hist-item"><span class="bank-dot ' + (a.correct ? 'ok' : 'miss') + '"></span> ' +
        (a.correct ? 'Correct' : 'Wrong') + ' · ' + fmtShort(a.secs || 0) +
        (a.hintUsed ? ' · 💡 hint' : '') + (a.felt && ERR_FELT[a.felt] ? ' · ' + ERR_FELT[a.felt] : '') +
        (a.confidence ? ' · ' + (ERR_CONF[a.confidence] || a.confidence) : '') + ' · ' + ymd(a.ts) + '</div>';
    }).join('');
    body += '<div class="bank-detail-block"><div class="meta-label">History</div>' + hist +
      '<div class="bank-hist-meta">reps <b>' + (qs.rec.reps || 0) + '</b> · streak <b>' + (qs.rec.streak || 0) + '</b> · wrong ' + (qs.rec.wrongCount || 0) +
      ' · interval <b>' + (qs.rec.intervalDays || 0) + 'd</b>' + (qs.rec.due ? ' · next review <b>' + new Date(qs.rec.due).toLocaleDateString() + '</b>' : '') + '</div></div>';
  }

  body += '<div class="bank-detail-block"><div class="meta-label">Why did you miss it?</div>' +
    '<div class="err-reason-row">' + errReasonChips(r) + '</div>' +
    '<div class="err-reason-row">' +
      '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();errMarkReviewed(\'' + r.id + '\')">' + (r.reviewed ? '↩ Unmark as reviewed' : '✓ I reviewed this miss') + '</button>' +
      '<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();errDrillOne(\'' + r.id + '\')">▶ Retry this question</button>' +
      '<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();errRelearn(\'' + r.id + '\')">📚 Relearn topic</button>' +
      '<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();errOpenBank(\'' + r.id + '\')">Open in Bank</button>' +
    '</div></div>';

  var note = (loadState().practice.notes && loadState().practice.notes[r.id]) || '';
  body += '<div class="bank-detail-block"><div class="meta-label">Your notes</div>' +
    '<textarea class="bank-note-input" id="errNote-' + r.id + '" rows="2" placeholder="The takeaway — trap, formula, strategy…">' + esc(note) + '</textarea>' +
    '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();errSaveNote(\'' + r.id + '\')">Save note</button></div>';

  return '<div class="bank-expand">' + body + '</div>';
}

function errRowHtml(r) {
  var q = r.q, e = r.e, qs = r.qs;
  var exp = !!ERR.expanded[r.id];
  var st = { text: r.status === 'healed' ? 'Healed' : r.status === 'reviewed' ? 'Reviewed' : 'Live miss', cls: r.status === 'healed' ? 'badge-success' : r.status === 'reviewed' ? 'badge-accent' : 'badge-danger' };
  var chosen = e.youChose === null || e.youChose === undefined ? '—' : (diIsStructured(q) ? diAnswerDisplay(q, e.youChose) : String.fromCharCode(65 + e.youChose));
  var correct = diIsStructured(q) ? diCorrectDisplay(q) : String.fromCharCode(65 + q.correct);
  var meta = errMetaLine(r);
  var reason = errReasonLabel(e.reason || e.errorTag);

  return '<div class="err-item">' +
    '<div class="err-row" onclick="errExpand(\'' + r.id + '\')">' +
      '<span class="err-col-status"><span class="badge ' + st.cls + '">' + st.text + '</span></span>' +
      '<span class="err-col-main err-main">' +
        '<span class="bank-carets">' + (exp ? '▾' : '▸') + '</span> ' +
        '<span class="bank-sub">' + esc(q.subtopic || bankTopicLabel(q.topic)) + '</span>' +
        (qs.flagged ? ' <span title="Flagged">🚩</span>' : '') +
        '<div class="bank-id">' + esc(q.id) + ' · ' + esc(bankTopicLabel(q.topic)) + (reason ? ' · ' + errReasonIcon(e.reason || e.errorTag) + ' ' + esc(reason) : '') + '</div>' +
        '<div class="err-snip">' + esc(q.text.slice(0, 120)) + (q.text.length > 120 ? '…' : '') + '</div>' +
        '<div class="text-muted" style="font-size:.78rem">You chose <b>' + esc(chosen) + '</b> · correct <b>' + esc(correct) + '</b>' + (meta ? ' · ' + esc(meta) : '') + '</div>' +
      '</span>' +
      '<span class="err-col-format"><span class="badge badge-ghost">' + esc(bankFormatName(bankFormatOf(q))) + '</span></span>' +
      '<span class="err-col-diff"><span class="badge ' + difficultyClass(q.difficulty) + '">' + difficultyLabel(q.difficulty) + '</span></span>' +
      '<span class="err-col-when text-muted">' + ymd(e.ts) + '</span>' +
      '<span class="err-col-acts">' +
        '<button class="btn btn-sm btn-primary" title="Retry this question" onclick="event.stopPropagation();errDrillOne(\'' + r.id + '\')">▶</button>' +
        '<button class="btn btn-sm btn-ghost" title="Clear from log" onclick="event.stopPropagation();errClearEntry(\'' + r.id + '\')">✕</button>' +
      '</span>' +
    '</div>' + (exp ? errExpandBody(r) : '') + '</div>';
}

/* ---------------------------------------------------------------------
   Trend + pattern blocks
   --------------------------------------------------------------------- */
function errTrendHtml() {
  var buckets = errWeekly(8);
  var max = Math.max.apply(null, buckets.map(function (b) { return b.count; }));
  var thisWeek = buckets[buckets.length - 1];
  return '<div class="card">' +
    '<div class="meta-label">Misses per week</div>' +
    '<div class="err-week-chart">' + buckets.map(function (b) {
      var h = max ? Math.max(4, Math.round(b.count * 100 / max)) : 0;
      var today = b === thisWeek;
      return '<div class="err-week-col" title="' + b.label + ': ' + b.count + ' miss(es)' + (b.live ? ' (' + b.live + ' still open)' : '') + '"><div class="err-week-bar' + (today ? ' today' : '') + '" style="height:' + h + '%"><span class="err-week-n">' + b.count + '</span></div><div class="err-week-l">' + b.label.split(' ')[0] + '</div></div>';
    }).join('') + '</div>' +
    '<div class="text-muted" style="font-size:.8rem;margin-top:.4rem">' + thisWeek.count + ' miss(es) this week' + (thisWeek.live ? ' — <b style="color:var(--color-danger)">' + thisWeek.live + ' still open</b>' : '') + '. Review + re-drill beats new volume every time.</div>' +
  '</div>';
}

function errPatternBlock(title, icon, items, kind) {
  return '<div class="card"><div class="meta-label">' + icon + ' ' + title + '</div>' +
    (items.length ? items.map(function (it) {
      var pctLive = it.n ? Math.round(it.live * 100 / it.n) : 0;
      var name = kind === 'reason' ? errReasonIcon(it.key) + ' ' + errReasonLabel(it.key) :
                 kind === 'topic' ? esc(bankTopicLabel(it.key)) :
                 esc(bankFormatName(it.key));
      var link = kind === 'topic' && curriculum.topicKeyForQTopic(it.key) ? ' <a href="#/learn/' + curriculum.topicKeyForQTopic(it.key) + '" class="text-muted">↗</a>' : '';
      return '<div class="err-pattern">' +
        '<div class="err-pattern-head"><span>' + name + link + '</span><span class="text-muted">' + it.n + (it.live ? ' · <span style="color:var(--color-danger)">' + it.live + ' live</span>' : '') + '</span></div>' +
        '<div class="progress" style="height:6px"><div class="progress-bar danger" style="width:' + pctLive + '%"></div></div>' +
      '</div>';
    }).join('') : '<p class="text-muted">Nothing yet.</p>') +
  '</div>';
}

/* ---------------------------------------------------------------------
   Grouped view (by reason or topic)
   --------------------------------------------------------------------- */
function errGroupView(group) {
  var list = errFiltered();
  if (!list.length) return '';
  var groups = {};
  list.forEach(function (r) {
    var key = group === 'reason' ? (r.e.reason || r.e.errorTag || 'untagged') : r.q.topic;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  var order = Object.keys(groups).sort(function (a, b) { return groups[b].length - groups[a].length; });
  return '<div class="err-groups">' + order.map(function (key) {
    var recs = groups[key];
    var live = recs.filter(function (r) { return r.status === 'live'; }).length;
    var head = group === 'reason' ? errReasonIcon(key) + ' ' + errReasonLabel(key) : esc(bankTopicLabel(key));
    var link = group === 'topic' && curriculum.topicKeyForQTopic(key) ? ' <a href="#/learn/' + curriculum.topicKeyForQTopic(key) + '" class="text-muted">📚 relearn ↗</a>' : '';
    return '<div class="card"><div class="err-group-head">' + head + ' ' + link +
      '<span class="badge ' + (live ? 'badge-danger' : 'badge-success') + '">' + recs.length + (live ? ' · ' + live + ' live' : ' clear') + '</span></div>' +
      recs.map(function (r) {
        var chosen = r.e.youChose === null || r.e.youChose === undefined ? '—' : String.fromCharCode(65 + r.e.youChose);
        return '<div class="err-group-row">' +
          '<span class="bank-dot ' + (r.status === 'healed' ? 'ok' : 'miss') + '"></span>' +
          '<span class="bank-sub">' + esc(r.q.subtopic || bankTopicLabel(r.q.topic)) + '</span> ' +
          '<span class="text-muted">' + esc(r.q.id) + '</span> · ' + esc(constrainStr(r.q.text, 96)) +
          '<span class="err-group-acts">' +
            '<button class="btn btn-sm btn-primary" title="Retry" onclick="errDrillOne(\'' + r.id + '\')">▶</button>' +
            '<button class="btn btn-sm btn-ghost" title="Clear from log" onclick="errClearEntry(\'' + r.id + '\')">✕</button>' +
          '</span></div>';
      }).join('') + '</div>';
  }).join('') + '</div>';
}

function constrainStr(s, n) { s = String(s); return s.length > n ? s.slice(0, n) + '…' : s; }

/* ---------------------------------------------------------------------
   Toolbar + shell
   --------------------------------------------------------------------- */
function errToolbarHtml(pool) {
  var selN = 0;
  var c = errCounts();
  return '<div class="bank-actions">' +
    '<span class="bank-count">' + pool.length + ' of ' + c.total + ' miss' + (c.total === 1 ? '' : 'es') + '</span>' +
    '<button class="btn btn-sm btn-primary" onclick="errDrillFiltered()" ' + (pool.length ? '' : 'disabled') + '>▶ Drill this set</button>' +
    '<button class="btn btn-sm btn-ghost" onclick="errExportCsv()" ' + (pool.length ? '' : 'disabled') + '>⬇ CSV</button>' +
    '<button class="btn btn-sm btn-ghost" onclick="errResetFilters()">⟲ Reset</button>' +
    (c.healed ? '<button class="btn btn-sm btn-ghost" onclick="errClearHealed()">🧹 Clear ' + c.healed + ' healed</button>' : '') +
    '<button class="btn btn-sm btn-ghost danger" onclick="errClearAll()">🗑 Clear log</button>' +
  '</div>';
}

function errShellHtml() {
  var f = ERR.filters;
  var c = errCounts();
  var recs = errRecords();
  var list = errFiltered();
  var patterns = errPatterns();
  var topics = [];
  recs.forEach(function (r) { if (topics.indexOf(r.q.topic) < 0) topics.push(r.q.topic); });
  topics.sort(function (a, b) { return bankTopicLabel(a).localeCompare(bankTopicLabel(b)); });
  var formats = [];
  recs.forEach(function (r) { var k = bankFormatOf(r.q); if (formats.indexOf(k) < 0) formats.push(k); });
  formats.sort();
  var group = errValidGroup(f.group);

  return '' +
    '<div class="page-header">' +
      '<h1>Error Log <span class="badge badge-danger">' + c.live + ' live</span></h1>' +
      '<p class="text-muted">Every miss, turned into a recovery workflow: spot your leak patterns, tag why each one happened, and re-drill until the log heals.</p>' +
    '</div>' +

    '<div class="err-stats row row-wrap" style="gap:.75rem;margin-bottom:1rem">' +
      '<div class="err-stat"><div class="err-stat-n">' + c.live + '</div><div class="text-muted">Live misses</div></div>' +
      '<div class="err-stat"><div class="err-stat-n">' + c.reviewed + '</div><div class="text-muted">Reviewed</div></div>' +
      '<div class="err-stat"><div class="err-stat-n text-success">' + c.healed + '</div><div class="text-muted">Healed</div></div>' +
      '<div class="err-stat"><div class="err-stat-n">' + c.recovery + '%</div><div class="text-muted">Recovery rate</div></div>' +
    '</div>' +

    '<div class="grid grid-2" style="margin-bottom:1rem">' + errTrendHtml() +
      errPatternBlock('Mistake patterns', '🧠', patterns.reasons, 'reason') +
      errPatternBlock('Leak topics', '📚', patterns.topics, 'topic') +
      errPatternBlock('Leak formats', '🧩', patterns.formats, 'format') +
    '</div>' +

    '<h2 class="section-title">Every miss</h2>' +
    '<div class="card bank-filters-card">' +
      '<div class="bank-filters">' +
        '<div class="bank-field"><label>Status</label><select onchange="errFilterChange()" id="efStatus">' +
          errOpt(f.status, 'all', 'All statuses') +
          errOpt(f.status, 'live', 'Live misses') +
          errOpt(f.status, 'reviewed', 'Reviewed') +
          errOpt(f.status, 'healed', 'Healed') +
        '</select></div>' +
        '<div class="bank-field"><label>Section</label><select onchange="errFilterChange()" id="efSection">' +
          errOpt(f.section, 'all', 'All sections') +
          errOpt(f.section, 'quant', 'Quantitative') +
          errOpt(f.section, 'verbal', 'Verbal') +
          errOpt(f.section, 'dataInsights', 'Data Insights') +
          errOpt(f.section, 'foundations', 'Foundations') +
        '</select></div>' +
        '<div class="bank-field"><label>Topic</label><select onchange="errFilterChange()" id="efTopic">' +
          errOpt(f.topic, 'all', 'All topics') +
          topics.map(function (t) { return errOpt(f.topic, t, bankTopicLabel(t)); }).join('') +
        '</select></div>' +
        '<div class="bank-field"><label>Format</label><select onchange="errFilterChange()" id="efFormat">' +
          errOpt(f.format, 'all', 'All formats') +
          formats.map(function (k) { return errOpt(f.format, k, bankFormatName(k)); }).join('') +
        '</select></div>' +
        '<div class="bank-field"><label>Difficulty</label><select onchange="errFilterChange()" id="efDiff">' +
          errOpt(f.difficulty, 'all', 'Any difficulty') +
          errOpt(f.difficulty, 'easy', 'Easy') +
          errOpt(f.difficulty, 'medium', 'Medium') +
          errOpt(f.difficulty, 'hard', 'Hard') +
        '</select></div>' +
        '<div class="bank-field"><label>Group by</label><select onchange="errFilterChange()" id="efGroup">' +
          errOpt(group, 'none', 'Flat list') +
          errOpt(group, 'reason', 'Mistake pattern') +
          errOpt(group, 'topic', 'Topic') +
        '</select></div>' +
        '<div class="bank-field"><label>Sort by</label><select onchange="errFilterChange()" id="efSort">' +
          errOpt(f.sort, 'newest', 'Newest miss') +
          errOpt(f.sort, 'oldest', 'Oldest miss') +
          errOpt(f.sort, 'topic', 'Topic') +
          errOpt(f.sort, 'time', 'Time taken') +
          errOpt(f.sort, 'confidence', 'Confidence') +
        '</select></div>' +
        '<div class="bank-field bank-search"><label>Search</label><input id="efSearch" type="text" placeholder="Search id, topic, text…" value="' + esc(f.search) + '" oninput="errSearchTyped(this.value)"></div>' +
      '</div>' +
    '</div>' +

    errToolbarHtml(list) +

    (recs.length === 0
      ? '<div class="empty-state"><span class="empty-icon">🎉</span><p>No misses on record. Go earn some — or better, keep your clean streak.</p><button class="btn btn-primary" onclick="location.hash=\'#/practice\'">Start practice →</button></div>'
      : list.length === 0
        ? '<div class="empty-state"><span class="empty-icon">🔍</span><p>Nothing matches those filters.</p><button class="btn btn-outline" onclick="errResetFilters()">Reset filters</button></div>'
        : group !== 'none' ? errGroupView(group)
          : '<div class="err-list" id="errList">' +
              '<div class="err-row-head">' +
                '<span class="err-col-status">Status</span><span class="err-col-main">Miss</span>' +
                '<span class="err-col-format">Format</span><span class="err-col-diff">Level</span>' +
                '<span class="err-col-when">When</span><span class="err-col-acts">Actions</span>' +
              '</div>' +
              list.map(errRowHtml).join('') +
            '</div>' +
            '<div class="text-muted" style="font-size:.8rem;margin-top:.4rem">Rows are clickable — expand any miss for the full text, solution, history and review controls. Click a reason chip to tag <i>why</i> it happened.</div>');
}

function errOpt(sel, val, label) {
  return '<option value="' + val + '"' + (sel === val ? ' selected' : '') + '>' + label + '</option>';
}

/* ---------------------------------------------------------------------
   Render + actions
   --------------------------------------------------------------------- */
function errRenderInner(el) {
  el.innerHTML = errShellHtml();
}

function errRerender() {
  var el = document.getElementById('app');
  if (!el) return;
  var y = window.scrollY;
  errRenderInner(el);
  window.scrollTo(0, y);
}

function renderErrors(el) {
  ERR.expanded = {};
  errRenderInner(el);
}

function errFilterChange() {
  ERR.filters.status = errValidStatus(document.getElementById('efStatus').value);
  ERR.filters.section = bankValidSection(document.getElementById('efSection').value);
  ERR.filters.topic = document.getElementById('efTopic').value;
  ERR.filters.format = document.getElementById('efFormat').value;
  ERR.filters.difficulty = bankValidDifficulty(document.getElementById('efDiff').value);
  ERR.filters.group = errValidGroup(document.getElementById('efGroup').value);
  ERR.filters.sort = errValidSort(document.getElementById('efSort').value);
  errRerender();
}

function errSearchTyped(value) {
  ERR.filters.search = value || '';
  errRerender();
}

function errResetFilters() {
  ERR.filters = { status: 'all', section: 'all', topic: 'all', format: 'all', difficulty: 'all', search: '', sort: 'newest', group: 'none' };
  ERR.expanded = {};
  errRerender();
}

function errExpand(id) {
  ERR.expanded[id] = !ERR.expanded[id];
  errRerender();
}

function errSetReason(id, reason) {
  var entry = loadState().practice.errorLog.find(function (x) { return x.questionId === id; });
  var current = entry && entry.reason;
  patchErrorEntry(id, { reason: current === reason ? null : reason });
  toast(current === reason ? 'Miss reason cleared.' : 'Miss reason recorded — it feeds your pattern view.', 'success');
  errRerender();
}

function errMarkReviewed(id) {
  var entry = loadState().practice.errorLog.find(function (x) { return x.questionId === id; });
  var was = entry && entry.reviewed;
  if (was) {
    patchErrorEntry(id, { reviewed: false, reviewedAt: null });
    toast('Marked as not yet reviewed.');
  } else {
    patchErrorEntry(id, { reviewed: true, reviewedAt: Date.now() });
    toast('Marked reviewed. Re-attempt soon to heal it for good.', 'success');
  }
  errRerender();
}

function errSaveNote(id) {
  var ta = document.getElementById('errNote-' + id);
  if (!ta) return;
  var text = ta.value;
  updateState(function (s) {
    if (text.trim()) s.practice.notes[id] = text;
    else delete s.practice.notes[id];
  });
  toast(text.trim() ? 'Note saved.' : 'Note removed.', 'success');
  errRerender();
}

function errClearEntry(id) {
  updateState(function (s) {
    s.practice.errorLog = s.practice.errorLog.filter(function (x) { return x.questionId !== id; });
    s.stats.errorLogCount = s.practice.errorLog.length;
  });
  toast('Miss cleared from the log.');
  errRerender();
}

function errDrillOne(id) {
  beginSession({ mode: 'bank', ids: [id], count: 1, perQSeconds: 0, shuffle: false });
}

function errDrillFiltered() {
  var pool = errFiltered().map(function (r) { return r.id; });
  if (!pool.length) { toast('Nothing to drill in this view.', 'error'); return; }
  if (pool.length > 50) {
    pool = pool.slice(0, 50);
    toast('Session capped at 50 — narrow the filters to a focused set.');
  }
  beginSession({ mode: 'bank', ids: pool, count: 0, perQSeconds: 0 });
}

function errRelearn(id) {
  var q = questionBank.byId[id];
  if (!q) return;
  var topicId = curriculum.topicKeyForQTopic(q.topic);
  if (topicId) location.hash = '#/learn/' + topicId;
  else toast('No lesson tagged for this topic yet.', 'error');
}

function errOpenBank(id) {
  location.hash = '#/bank?q=' + encodeURIComponent(id);
}

function errConfirmClear(title, body, onConfirm, confirmLabel) {
  var modal = openModal(
    '<div class="modal-title">' + title + '</div>' +
    '<p>' + body + '</p>' +
    '<div class="row" style="gap:.5rem"><button class="btn btn-primary" id="errConfirmOk">' + (confirmLabel || 'Clear') + '</button>' +
    '<button class="btn btn-ghost" id="errConfirmNo">Cancel</button></div>'
  );
  modal.querySelector('#errConfirmOk').addEventListener('click', function () { closeModal(); onConfirm(); });
  modal.querySelector('#errConfirmNo').addEventListener('click', closeModal);
}

function errClearHealed() {
  var recs = errRecords().filter(function (r) { return r.status === 'healed'; });
  if (!recs.length) return;
  errConfirmClear('Clear healed misses?', 'These ' + recs.length + ' question(s) have since been answered correctly — there is nothing to re-drill.', function () {
    var ids = {};
    recs.forEach(function (r) { ids[r.id] = true; });
    updateState(function (s) {
      s.practice.errorLog = s.practice.errorLog.filter(function (x) { return !ids[x.questionId]; });
      s.stats.errorLogCount = s.practice.errorLog.length;
    });
    toast('Cleared ' + recs.length + ' healed ' + (recs.length === 1 ? 'miss' : 'misses') + '.', 'success');
    errRerender();
  }, 'Clear healed');
}

function errClearAll() {
  var n = loadState().practice.errorLog.length;
  if (!n) return;
  errConfirmClear('Clear the whole error log?', 'All ' + n + ' recorded miss(es) will be removed. Healed ones are safe to clear; live ones you may want to re-drill first.', function () {
    updateState(function (s) {
      s.practice.errorLog = [];
      s.stats.errorLogCount = 0;
    });
    toast('Error log cleared.', 'success');
    errRerender();
  }, 'Clear everything');
}

/* ---------------------------------------------------------------------
   CSV export of the current filtered set
   --------------------------------------------------------------------- */
function errExportCsv() {
  var list = errFiltered();
  if (!list.length) { toast('Nothing to export — widen the filters.', 'error'); return; }
  var rows = [['id', 'section', 'topic', 'subtopic', 'difficulty', 'format', 'status', 'reason', 'youChose', 'correct', 'secs', 'confidence', 'felt', 'date', 'note']];
  list.forEach(function (r) {
    var chosen = r.e.youChose === null || r.e.youChose === undefined ? '' : (diIsStructured(r.q) ? diAnswerDisplay(r.q, r.e.youChose) : String.fromCharCode(65 + r.e.youChose));
    var correct = diIsStructured(r.q) ? diCorrectDisplay(r.q) : String.fromCharCode(65 + r.q.correct);
    rows.push([
      r.id, bankSectionOf(r.q), bankTopicLabel(r.q.topic), r.q.subtopic || '', r.q.difficulty, bankFormatName(bankFormatOf(r.q)),
      r.status, errReasonLabel(r.e.reason || r.e.errorTag) || '', chosen, correct,
      r.e.secs || '', ERR_CONF[r.e.confidence] || (r.e.confidence || ''), ERR_FELT[r.e.felt] || '',
      new Date(r.e.ts).toISOString().slice(0, 10),
      (loadState().practice.notes && loadState().practice.notes[r.id]) || ''
    ]);
  });
  var csv = rows[0].join(',') + '\n' + rows.slice(1).map(function (row) {
    return row.map(function (cell) { return csvEscape(cell); }).join(',');
  }).join('\n');
  downloadTextFile('gmat750-error-log-' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv;charset=utf-8', csv);
  toast('Error log exported (' + list.length + ' rows).', 'success');
}

/* ---------------------------------------------------------------------
   Registration
   --------------------------------------------------------------------- */
App.register('errors', {
  title: 'Error Log',
  render: renderErrors,
  menuKey: 'errors'
});

window.renderErrors = renderErrors;
window.errExpand = errExpand;
window.errSetReason = errSetReason;
window.errMarkReviewed = errMarkReviewed;
window.errSaveNote = errSaveNote;
window.errClearEntry = errClearEntry;
window.errClearHealed = errClearHealed;
window.errClearAll = errClearAll;
window.errDrillOne = errDrillOne;
window.errDrillFiltered = errDrillFiltered;
window.errRelearn = errRelearn;
window.errOpenBank = errOpenBank;
window.errResetFilters = errResetFilters;
window.errFilterChange = errFilterChange;
window.errSearchTyped = errSearchTyped;
window.errExportCsv = errExportCsv;