/* =====================================================================
   GMAT 750+ Trainer - Placement Diagnostic view (#/diagnostic)
   A guided starting-point assessment: 8 quant + 8 verbal questions
   (2 easy / 3 medium / 3 hard each), per-strand level bands, and a
   recommended first topic for the Learn roadmap.
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   Module state
   --------------------------------------------------------------------- */
let diag = null;   // active run { questions[], index, correct }
let diagSeq = 0;   // increments so a fresh run ignores a stale render
let diagEl = null; // the app shell element (set once per renderer call)

function stratify(pool, bands) {
  // default: 2 easy / 3 medium / 3 hard, shuffled within each band, then interleaved
  if (!bands) bands = [{ d: 'easy', n: 2 }, { d: 'medium', n: 3 }, { d: 'hard', n: 3 }];
  let out = [];
  bands.forEach(function (b) {
    const band = shuffle(pool.filter(q => q.difficulty === b.d));
    out.push.apply(out, band.slice(0, b.n));
  });
  out = shuffle(out);
  // attach reading passage if the question references one
  return out.map(function (q) {
    if (q.passageId && !q.passage) {
      const p = questionBank.rcPassages.find(function (r) { return r.id === q.passageId; });
      if (p) q = Object.assign({}, q, { passage: p.text, passageTitle: p.title });
    }
    return q;
  });
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function levelFor(correct, total) {
  const pct = correct / total;
  if (pct <= 0.45) return 'foundations';
  if (pct <= 0.68) return 'developing';
  return 'strong';
}

function levelLabel(level) {
  return { foundations: 'Foundations', developing: 'Developing', strong: 'Strong' }[level] || level;
}

function recommendFor(strand, level) {
  if (strand === 'quant') {
    if (level === 'foundations') return 'found-ops';
    if (level === 'developing') return 'found-frac';
    return 'quant-pct';
  }
  if (strand === 'di') {
    return 'di-ds';
  }
  if (level === 'foundations') return 'found-gram1';
  if (level === 'developing') return 'found-read';
  return 'verbal-rc-main';
}

function topicById(id) {
  return curriculum.topics.find(t => t.id === id);
}

/* ---------------------------------------------------------------------
   Intro / landing screen
   --------------------------------------------------------------------- */
function renderDiagnosticIntro(el) {
  diagEl = el;
  const st = loadState();
  const prev = st.diagnostic;
  el.innerHTML = `
    <div class="page-header">
      <h1>🧭 Placement Diagnostic</h1>
      <p class="text-muted">A 22-question check (8 Quant + 8 Verbal + 6 Data Insights) that tells you exactly where to start in the Learn roadmap.</p>
    </div>

    <section class="card">
      <div class="row row-wrap" style="align-items:center;gap:.5rem 1rem;margin-bottom:.5rem">
        <span style="font-size:1.6rem" aria-hidden="true">📌</span>
        <div>
          <h3 style="margin:0">How it works</h3>
          <p class="text-muted" style="margin:.25rem 0 0">Answer honestly — there is no passing score and wrong answers are information.</p>
        </div>
      </div>
      <div class="grid grid-3" style="margin-top:.75rem">
        <div class="card">
          <div class="topic-name">🔢 Quant strand</div>
          <p class="text-muted fs-small">8 questions · arithmetic, algebra, number properties, word problems, statistics</p>
        </div>
        <div class="card">
          <div class="topic-name">📖 Verbal strand</div>
          <p class="text-muted fs-small">8 questions · reading comprehension and critical reasoning</p>
        </div>
        <div class="card">
          <div class="topic-name">📊 Data Insights strand</div>
          <p class="text-muted fs-small">6 questions · data sufficiency, graphics, tables, MSR, two-part</p>
        </div>
      </div>
      <p class="text-muted fs-small" style="margin:.75rem 0 0">Each strand is scored 🌱 Foundations / 🛠️ Developing / 🚀 Strong, and you get one recommended starting topic — usually the weakest strand.</p>
      <div class="row" style="gap:1rem;align-items:center;margin-top:1.25rem;flex-wrap:wrap">
        <button class="btn btn-primary" id="diagStart">Start the diagnostic →</button>
        ${prev ? `<span class="text-muted fs-small">Last taken ${new Date(prev.ts).toLocaleDateString()} — Quant ${prev.quant.correct}/${prev.quant.total} · Verbal ${prev.verbal.correct}/${prev.verbal.total} ${prev.di ? '· DI ' + prev.di.correct + '/' + prev.di.total : ''}</span>` : ''}
      </div>
    </section>

    <section class="card" style="margin-top:1rem">
      <div class="row" style="align-items:center;gap:.5rem">
        <div class="prompt" style="margin:0"><b>What does my result mean?</b></div>
      </div>
      <div class="ct-ladder-grid" style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-top:.75rem">
        <div class="ct-card"><span class="ct-icon">🌱</span><span class="ct-label">Foundations</span><div class="ct-note fs-small text-muted">0–3 correct (0–45%): start from zero with the Foundations track.</div></div>
        <div class="ct-card"><span class="ct-icon">🛠️</span><span class="ct-label">Developing</span><div class="ct-note fs-small text-muted">4–5 correct (50–63%): brush up core skills before GMAT material.</div></div>
        <div class="ct-card"><span class="ct-icon">🚀</span><span class="ct-label">Strong</span><div class="ct-note fs-small text-muted">6–8 correct (75%+): ready for standard GMAT topics.</div></div>
      </div>
    </section>`;

  el.querySelector('#diagStart').addEventListener('click', function () {
    startDiagnostic(el);
  });
}

function startDiagnostic(el) {
  diagSeq++;
  const quantQ = stratify(questionBank.quant);
  const verbalQ = stratify(questionBank.verbal);
  const diQ = stratify(questionBank.dataInsights, [{ d: 'easy', n: 2 }, { d: 'medium', n: 2 }, { d: 'hard', n: 2 }]);
  diag = {
    questions: quantQ.map(function (q) { return { strand: 'quant', q: q }; })
      .concat(verbalQ.map(function (q) { return { strand: 'verbal', q: q }; }))
      .concat(diQ.map(function (q) { return { strand: 'di', q: q }; })),
    index: 0,
    correct: { quant: 0, verbal: 0, di: 0 }
  };
  renderDiagnosticQuestion(el);
}

function renderDiagnosticQuestion(el) {
  diagEl = el || diagEl;
  const run = diag;
  if (!run) { renderDiagnosticIntro(el || diagEl); return; }
  const item = run.questions[run.index];
  const q = item.q;
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const answered = item.chosen !== undefined;

  function questionBody() {
    let html = '';
    if (q.passage) {
      html += `<div class="rc-passage card"><div class="text-muted" style="margin-bottom:.5rem;font-size:.85rem">Passage: ${esc(q.passageTitle || '')}</div>${esc(q.passage).replace(/\n/g, '<br>')}</div>`;
    }
    html += `<div class="option disabled" style="white-space:pre-line">${esc(q.text)}</div>`;
    return html;
  }

  el.innerHTML = `
    <div class="page-header">
      <h1>🧭 Placement Diagnostic</h1>
      <p class="text-muted">Question ${run.index + 1} of ${run.questions.length}</p>
    </div>

    <div class="row row-wrap" style="align-items:center;gap:.5rem;margin-bottom:.75rem">
      <span class="badge ${item.strand === 'quant' ? 'badge-accent' : item.strand === 'di' ? 'badge-primary' : 'badge-secondary'}">${item.strand === 'quant' ? '🔢 Quant' : item.strand === 'di' ? '📊 Data Insights' : '📖 Verbal'}</span>
      <span class="badge ${q.difficulty === 'easy' ? 'badge-easy' : q.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'}">${q.difficulty}</span>
      <span class="text-muted fs-small" style="margin-left:auto">${esc(q.subtopic)}</span>
    </div>

    <section class="card">
      ${questionBody()}
      <div class="diag-options" style="margin-top:.75rem">
        ${q.options.map(function (o, oi) {
          let cls = 'option';
          if (answered) {
            cls += oi === q.correct ? ' correct' : (item.chosen === oi ? ' incorrect' : '');
            cls += oi === item.chosen ? ' selected' : '';
          }
          return `<div class="${cls}" data-i="${oi}" ${answered ? '' : 'role="button" tabindex="0" onclick="chooseDiagnosticByDom(this)" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();chooseDiagnosticByDom(this);}"'}>
            <span class="option-letter">${letters[oi]}</span>
            <span style="white-space:pre-line">${esc(o)}</span>
          </div>`;
        }).join('')}
      </div>
      ${answered ? `
        <div class="feedback ${item.chosen === q.correct ? 'feedback-ok' : 'feedback-bad'}" style="margin-top:1rem">
          <b>${item.chosen === q.correct ? '✔ Correct' : '✘ Not quite'}</b> — ${esc(q.explanation)}
          ${item.chosen === q.correct ? '' : `<div class="text-muted fs-small" style="margin-top:.35rem">${q.correct + 1}. ${esc(q.options[q.correct])}</div>`}
        </div>
        <button class="btn btn-primary" id="diagNext" onclick="nextDiagnosticByDom()" style="margin-top:.75rem">${run.index + 1 === run.questions.length ? 'See my results →' : 'Next question →'}</button>` : ''}
    </section>`;
}

window.chooseDiagnosticByDom = function (optEl) {
  chooseDiagnostic(optEl);
};

window.nextDiagnosticByDom = function () {
  nextDiagnostic();
};

function chooseDiagnostic(optEl) {
  const run = diag;
  if (!run) return;
  const item = run.questions[run.index];
  if (item.chosen !== undefined) return;
  const choice = parseInt(optEl.getAttribute('data-i'), 10);
  item.chosen = choice;
  if (choice === item.q.correct) run.correct[item.strand]++;
  renderDiagnosticQuestion(diagEl);
}

function nextDiagnostic() {
  const run = diag;
  if (!run) return;
  run.index++;
  if (run.index >= run.questions.length) {
    finishDiagnostic(diagEl);
  } else {
    renderDiagnosticQuestion(diagEl);
  }
}

function finishDiagnostic(el) {
  const run = diag;
  if (!run) return;
  const quant = { correct: run.correct.quant, total: 8, level: levelFor(run.correct.quant, 8) };
  const verbal = { correct: run.correct.verbal, total: 8, level: levelFor(run.correct.verbal, 8) };
  const di = { correct: run.correct.di, total: 6, level: levelFor(run.correct.di, 6) };

  const rank = { foundations: 0, developing: 1, strong: 2 };
  const strands = [
    { key: 'quant', level: quant.level },
    { key: 'verbal', level: verbal.level },
    { key: 'di', level: di.level }
  ];
  strands.sort(function (a, b) { return rank[a.level] - rank[b.level] || (a.key === 'quant' ? -1 : 1); });
  const weakest = strands[0];
  let started = recommendFor(weakest.key, weakest.level);
  if (!started) started = 'quant-pct';

  updateState(function (s) {
    s.diagnostic = { ts: Date.now(), quant: quant, verbal: verbal, di: di, started: started };
  });

  renderDiagnosticResult(el, quant, verbal, di, started);
  // prevent a stale in-progress run from re-rendering on revisit
  diag = null;
  diagSeq = 0;
}

function renderDiagnosticResult(el, quant, verbal, di, started) {
  const st = loadState();
  const topic = topicById(started);
  const strongest = quant.level === 'strong' && verbal.level === 'strong' && di.level === 'strong';
  const summary = strongest
    ? 'All three strands look strong — head straight into the standard curriculum and the Expert capstones.'
    : (quant.level === 'foundations' || verbal.level === 'foundations' || di.level === 'foundations')
      ? 'At least one strand points to Foundations. Build from the bottom up starting with the weakest strand below, so the advanced material can actually land.'
      : 'Your result suggests brushing up the weaker strand first, then moving on to standard GMAT topics and the Expert capstones.';

  function strandCard(label, icon, s, rec) {
    const badgeCls = s.level === 'foundations' ? 'badge-ghost' : s.level === 'developing' ? 'badge-accent' : 'badge-success';
    const barColor = s.level === 'foundations' ? 'var(--color-border)' : s.level === 'developing' ? 'var(--color-secondary)' : 'var(--color-success)';
    return `
      <div class="card">
        <div class="row" style="align-items:center;gap:.5rem">
          <span style="font-size:1.4rem">${icon}</span>
          <div class="topic-name">${label} strand</div>
          <span class="badge ${badgeCls}" style="margin-left:auto">${levelLabel(s.level)}</span>
        </div>
        <div class="row" style="align-items:baseline;gap:.25rem;margin:.75rem 0 .25rem">
          <span style="font-size:1.8rem;font-weight:800">${s.correct}/${s.total}</span>
          <span class="text-muted fs-small">correct</span>
        </div>
        <div class="progress" style="height:10px;margin-bottom:1rem"><div class="progress-bar" style="width:${Math.round(s.correct / s.total * 100)}%;background:${barColor}"></div></div>
        ${rec ? `<div class="text-muted fs-small">Recommended: <b>${esc(topicById(rec).name)}</b></div>` : ''}
      </div>`;
  }

  el.innerHTML = `
    <div class="page-header">
      <h1>🧭 Your Placement Result</h1>
      <p class="text-muted">${esc(summary)}</p>
    </div>

    <div class="grid grid-3" style="margin-bottom:1rem">
      ${strandCard('Quant', '🔢', quant, recommendFor('quant', quant.level))}
      ${strandCard('Verbal', '📖', verbal, recommendFor('verbal', verbal.level))}
      ${strandCard('Data Insights', '📊', di, recommendFor('di', di.level))}
    </div>

    <section class="card" style="border-left:4px solid var(--color-secondary)">
      <div class="row row-wrap" style="align-items:center;gap:.5rem 1rem">
        <span style="font-size:1.8rem" aria-hidden="true">🎯</span>
        <div style="flex:1;min-width:200px">
          <div class="lesson-nav-label">Recommended starting point</div>
          <div class="lesson-nav-title">${topic ? esc(topic.name) : 'Standard curriculum'}</div>
          <p class="text-muted fs-small" style="margin:.25rem 0 0">Open the lesson, complete its quick check, then climb its chapter tests.</p>
        </div>
        <div class="row" style="gap:.5rem;flex-wrap:wrap">
          ${topic ? `<a class="btn btn-primary" href="#/learn/${topic.id}">Start here →</a>` : ''}
          <a class="btn btn-primary" href="#/learn">View full roadmap</a>
        </div>
      </div>
    </section>`;
}

/* Register route */
App.register('diagnostic', {
  title: 'Placement Diagnostic',
  menuKey: 'diagnostic',
  render: function (el, args) {
    if (diag && diagSeq) renderDiagnosticQuestion(el);
    else renderDiagnosticIntro(el);
  }
});

window.renderDiagnosticIntro = renderDiagnosticIntro;
window.renderDiagnosticResult = renderDiagnosticResult;