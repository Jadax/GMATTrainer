/* =====================================================================
   GMAT 750+ Trainer - Learn view
   Curriculum map (#/learn), and topic lesson (#/learn/:topicId).
   Quick-check quizzes at the end of each lesson feed XP + mastery.
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   Learn landing: section tabs + topic cards with progress
   --------------------------------------------------------------------- */
function renderLearnHome(el) {
  const st = loadState();
  const sections = curriculum.sections;
  const allTopics = curriculum.topics;

  function topicProgressStats() {
    const mastered = allTopics.filter(t => learningStatus(t.id).status === 'mastered').length;
    const started = allTopics.filter(t => learningStatus(t.id).status !== 'not-started').length;
    return { mastered: mastered, started: started, total: allTopics.length };
  }
  const prog = topicProgressStats();

  const order = [];
  sections.forEach(s => s.topics.forEach(t => order.push(t.id)));
  let nextUp = order.find(id => learningStatus(id).status !== 'mastered') || null;
  // a completed placement diagnostic pins the recommended starting topic
  const diag = st.diagnostic;
  const diagStart = diag && diag.started && diag.started !== 'quant-pct' && learningStatus(diag.started).status !== 'mastered'
    ? diag.started : null;
  const startId = diagStart || nextUp;

  el.innerHTML = `
    <div class="page-header">
      <h1>Learn the GMAT Focus Curriculum</h1>
      <p class="text-muted">A complete 0→100 syllabus across all three sections. Master topics section by section.</p>
    </div>

    ${!diag ? `
    <section class="card diag-cta" style="margin-bottom:1rem;border-left:4px solid var(--color-secondary)">
      <div class="row row-wrap" style="align-items:center;gap:.5rem 1rem">
        <span style="font-size:1.8rem" aria-hidden="true">🧭</span>
        <div style="flex:1;min-width:200px">
          <h3 style="margin:0">Not sure where to start?</h3>
          <p class="text-muted" style="margin:.25rem 0 0">Take the 16-minute placement diagnostic and get a personalized starting point.</p>
        </div>
        <a class="btn btn-primary" href="#/diagnostic">Take the placement diagnostic →</a>
      </div>
    </section>` : ''}

    <section class="card" style="margin-bottom:1rem">
      <div class="row" style="align-items:center;gap:.5rem;flex-wrap:wrap">
        <div>
          <h3 style="margin:0">🗺️ Suggested Course Path</h3>
          <p class="text-muted" style="margin:.25rem 0 0">Work each chapter's lesson, then climb its chapter tests (Easy → Medium → Hard).</p>
        </div>
        ${startId ? `<a class="btn btn-sm btn-outline" style="margin-left:auto" href="#/learn/${startId}">${diagStart ? 'Your recommended start: ' : 'Continue: '}${esc((allTopics.find(t => t.id === startId) || {}).name || '')} →</a>` : ''}
      </div>
      <div class="course-road" style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.75rem;align-items:stretch">
        ${order.map((id, i) => {
          const t = allTopics.find(x => x.id === id);
          const st_ = learningStatus(id);
          const done = st_.status === 'mastered' ? 'done' : st_.status === 'in-progress' ? 'doing' : '';
          const isNext = startId === id;
          return `<a class="road-step ${done} ${isNext ? 'next' : ''}" href="#/learn/${id}" title="${esc((t || {}).name || '')}">
            <span class="road-num">${i + 1}</span>
            <span class="road-name">${esc((t || {}).name || '')}</span>
            <span class="road-icon">${done === 'done' ? '✅' : isNext ? '▶️' : done === 'doing' ? '◐' : '○'}</span>
          </a>`;
        }).join('')}
      </div>
      <div class="text-muted fs-small" style="margin-top:.5rem">Tip: a chapter is fully cleared once you pass its <b>Hard</b> chapter test — that is your TTP-style mastery checkpoint.</div>
    </section>

    <section class="card">
      <div class="row row-wrap" style="align-items:center;gap:.5rem 1rem">
        <div class="stat-inline"><span class="stat-value">${prog.mastered}/${prog.total}</span><span class="stat-label">Topics mastered</span></div>
        <div class="stat-inline"><span class="stat-value">${Math.round(prog.mastered / prog.total * 100)}%</span><span class="stat-label">Course completion</span></div>
        <div class="progress" style="flex:1;min-width:180px"><div class="progress-bar" style="width:${Math.round(prog.mastered / prog.total * 100)}%"></div></div>
        ${prog.mastered === prog.total ? '<span class="badge badge-success">Course complete! 🎉</span>' : ''}
      </div>
    </section>

    <div class="section-tabs" id="learnTabs" role="tablist">
      ${sections.map((s, i) => `
        <button class="section-tab-btn ${i === 0 ? 'active' : ''}" data-section="${s.key}" role="tab">${s.icon} ${s.short}</button>`).join('')}
    </div>

    ${sections.map((s, si) => {
      const hidden = si !== 0 ? ' style="display:none"' : '';
      const sMastered = s.topics.filter(t => learningStatus(t.id).status === 'mastered').length;
      return `
      <div class="learn-section" data-section-panel="${s.key}"${hidden}>
        <div class="row row-wrap" style="align-items:center;margin-bottom:1rem">
          <div>
            <h2 style="margin:0">${s.icon} ${s.name}</h2>
            <p class="text-muted">${s.blurb}</p>
          </div>
          <span class="badge badge-secondary" style="margin-left:auto">${sMastered}/${s.topics.length} mastered</span>
        </div>
        <div class="grid grid-3">
          ${s.topics.map(t => learnTopicCard(t)).join('')}
        </div>
      </div>`;
    }).join('')}`;

  // Tab switching
  el.querySelectorAll('.section-tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      el.querySelectorAll('.section-tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const key = this.getAttribute('data-section');
      el.querySelectorAll('.learn-section').forEach(s => {
        s.style.display = s.getAttribute('data-section-panel') === key ? '' : 'none';
      });
    });
  });
}

function learnTopicCard(t) {
  const ls = learningStatus(t.id);
  const stateIcon = { 'not-started': '○', 'in-progress': '◐', 'mastered': '●' }[ls.status] || '○';
  const stateLabel = { 'not-started': 'Not started', 'in-progress': 'In progress', 'mastered': 'Mastered' }[ls.status] || ls.status;
  const skillMap = { foundation: 'Foundations', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  // Mastery-decay marker: how many of this topic's questions are due for spaced review.
  const dueIds = new Set(questionDueIds());
  const dueCount = curriculum.questionsForTopic(t.id).filter(q => dueIds.has(q.id)).length;
  return `
    <a class="card card-hover topic-card ${dueCount ? 'topic-due' : ''}" href="#/learn/${t.id}" style="text-decoration:none">
      <div class="row" style="align-items:center">
        <span class="feed-icon">${stateIcon === '●' ? '✅' : stateIcon === '◐' ? '🔄' : '📘'}</span>
        <div class="topic-name">${esc(t.name)}</div>
      </div>
      <div class="topic-meta">${skillMap[t.level] || t.level}</div>
      <div class="topic-state">
        <span class="badge ${ls.status === 'mastered' ? 'badge-success' : ls.status === 'in-progress' ? 'badge-accent' : ''}">${stateLabel}</span>
        ${dueCount ? `<span class="badge badge-primary" title="Questions due for spaced review">⏰ ${dueCount} due</span>` : ''}
        <span class="text-muted">${curriculum.questionsForTopic(t.id).length} practice Qs</span>
      </div>
      <div class="progress topic-progress" style="height:6px"><div class="progress-bar ${ls.status === 'mastered' ? 'success' : ''}" style="width:${ls.status === 'mastered' ? 100 : ls.status === 'in-progress' ? 50 : 0}%"></div></div>
    </a>`;
}

/* ---------------------------------------------------------------------
   Topic lesson page
   --------------------------------------------------------------------- */
function renderTopicLesson(el, args) {
  const topicId = args[0];
  const topic = curriculum.topics.find(t => t.id === topicId);
  if (!topic) {
    el.innerHTML = '<div class="empty-state"><p>Topic not found.</p><a class="btn btn-primary" href="#/learn">Back to curriculum</a></div>';
    return;
  }
  const ls = learningStatus(topicId);
  const ctp = chapterTestProgress(topicId);
  const skillMap = { foundation: 'Foundations', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  const diffClass = { foundation: 'badge-ghost', beginner: 'badge-easy', intermediate: 'badge-medium', advanced: 'badge-hard' };
  const levelLabel = skillMap[topic.level] || topic.level;
  const sec = curriculum.sections.find(s => s.topics.some(t => t.id === topicId));
  const secName = sec ? sec.name : '';
  const qCount = curriculum.questionsForTopic(topic.id).length;

  const toc = [];
  toc.push(['lesson-overview', '🧠 Overview']);
  if (topic.formulas.length) toc.push(['lesson-formulas', '🧮 Formulas']);
  if (topic.strategies.length) toc.push(['lesson-strategies', '💡 Strategies']);
  if (topic.traps.length) toc.push(['lesson-traps', '⚠️ Traps']);
  toc.push(['lesson-examples', '✍️ Examples']);
  toc.push(['lesson-check', '🎯 Quick Check']);
  toc.push(['lesson-tests', '🏁 Chapter Tests']);

  el.innerHTML = `
    <div class="lesson-progress-fixed" id="lessonProgressBar" aria-hidden="true"></div>
    <div class="lesson-container">
      <div class="row row-wrap" style="align-items:center">
        <a class="btn btn-sm btn-ghost" href="#/learn">← Curriculum</a>
        ${ls.status === 'mastered' ? '<span class="badge badge-success" style="margin-left:auto">Mastered ✅</span>' : ''}
      </div>

      <div class="lesson-header">
        <h1>${esc(topic.name)}</h1>
        <div class="lesson-meta">
          <span class="badge ${diffClass[topic.level]}">${levelLabel}</span>
          ${secName ? `<span class="text-muted">${esc(secName)}</span>` : ''}
          <span class="text-muted">·</span>
          <span class="text-muted">${qCount} practice questions available</span>
        </div>
      </div>

      <nav class="lesson-toc" aria-label="Lesson outline">
        <div class="lesson-toc-title">In this lesson</div>
        <div class="lesson-toc-list">
          ${toc.map(function (item) { return `<button type="button" class="lesson-toc-link" data-target="${item[0]}">${item[1]}</button>`; }).join('')}
        </div>
      </nav>

      <div class="lesson-section lesson-overview" id="lesson-overview">
        <h3>🧠 <span>Overview &amp; Key Concepts</span></h3>
        ${topic.overview.map(function (p, i) { return i === 0 ? '<p class="lesson-lead">' + esc(p) + '</p>' : lessonPara(p); }).join('')}
      </div>

      ${topic.formulas.length ? `
        <div class="lesson-section" id="lesson-formulas">
          <h3>🧮 <span>Formulas &amp; Core Rules</span></h3>
          <div class="formula-grid">
            ${topic.formulas.map(function (f) { return `<div class="formula-card"><div class="formula-term">${esc(f.term)}</div><div class="formula-def">${esc(f.def)}</div></div>`; }).join('')}
          </div>
        </div>` : ''}

      ${topic.strategies.length ? `
        <div class="lesson-section" id="lesson-strategies">
          <h3>💡 <span>Strategies That Score</span></h3>
          ${topic.strategies.map(function (s, i) { return `<div class="lesson-step"><span class="lesson-step-num">${i + 1}</span><div class="lesson-step-body">${esc(s)}</div></div>`; }).join('')}
        </div>` : ''}

      ${topic.traps.length ? `
        <div class="lesson-section" id="lesson-traps">
          <h3>⚠️ <span>Common Traps</span></h3>
          ${topic.traps.map(function (s, i) { return `<div class="lesson-step lesson-trap"><span class="lesson-step-num">${i + 1}</span><div class="lesson-step-body">${esc(s)}</div></div>`; }).join('')}
        </div>` : ''}

      <div class="lesson-section" id="lesson-examples">
        <h3>✍️ <span>Worked Examples</span> <span class="text-muted">(${topic.examples.length})</span></h3>
        ${topic.examples.map(function (e, i) { return exampleBlock(e, i, topicId); }).join('')}
      </div>

      <div class="lesson-section" id="lesson-check">
        <div class="row" style="align-items:center;gap:.5rem;flex-wrap:wrap">
          <h3 style="margin:0">🎯 <span>Quick Check</span> <span class="text-muted fs-small">(5 questions)</span></h3>
          <div class="row" style="align-items:center;gap:.5rem;margin-left:auto">
            <span class="quickcheck-progress" id="qcProgress">0/${topic.check.length} answered</span>
            <span class="badge badge-accent" id="quickStatus">Not attempted</span>
          </div>
        </div>
        <p class="text-muted">Complete the quick check to mark this topic as mastered.</p>
        <div id="quickCheck"></div>
      </div>

      <div class="lesson-section" id="lesson-tests">
        ${chapterTestsBlock(topic, ctp)}
      </div>

      <div class="lesson-practice-cta">
        <div>
          <div class="lesson-nav-label">Feeling sharp?</div>
          <div class="lesson-nav-title">Apply it now with a real practice set.</div>
        </div>
        <button class="btn btn-primary" onclick="location.hash='#/practice/topic/${topicId}'">Practice this topic →</button>
      </div>

      <div id="lessonNav"></div>
    </div>`;

  el.querySelectorAll('.lesson-toc-link').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = document.getElementById(this.getAttribute('data-target'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  bindExampleToggles(el);
  renderLessonNav(el, topicId);
  initQuickCheck(el, topic);
  initLessonScroll(el);
}

function chapterTestsBlock(topic, ctp) {
  const diffs = [
    { d: 'easy', label: 'Easy', icon: '🟢', why: 'Locked until you complete the Quick Check above.' },
    { d: 'medium', label: 'Medium', icon: '🟡', why: 'Locked until you pass the Easy chapter test.' },
    { d: 'hard', label: 'Hard', icon: '🔴', why: 'Locked until you pass the Medium chapter test.' }
  ];
  const pool = curriculum.questionsForTopic(topic.id);
  return `
    <div class="row" style="align-items:center;gap:.5rem;flex-wrap:wrap">
      <h3 style="margin:0">🏁 <span>Chapter Tests</span></h3>
      <span class="badge badge-ghost fs-small">${CHAPTER_TEST_LEN} questions · pass at ${Math.round(CHAPTER_TEST_PASS * 100)}%</span>
    </div>
    <p class="text-muted">Ascend the difficulty ladder to prove chapter mastery. Each test draws fresh questions from this chapter's real bank.</p>
    <div class="ct-ladder-grid" style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
      ${diffs.map(function (c) {
        const slot = ctp[c.d];
        const qAvail = pool.filter(q => q.difficulty === c.d).length;
        const attempts = slot.totalAttempts;
        let status, btn, note;
        if (!slot.unlocked) {
          status = '<span class="badge badge-ghost">🔒 Locked</span>';
          btn = '<button class="btn btn-sm btn-ghost" type="button" disabled>Locked</button>';
          note = c.why;
        } else if (slot.passed) {
          status = '<span class="badge badge-success">Passed ✓</span>';
          btn = '<button class="btn btn-sm btn-outline" type="button" onclick="startChapterTest(\'' + topic.id + '\',\'' + c.d + '\')">Retake</button>';
          note = 'Best ' + slot.best + '/' + CHAPTER_TEST_LEN + (attempts > 1 ? ' · ' + attempts + ' attempts' : '');
        } else {
          status = attempts ? '<span class="badge badge-accent">Best ' + slot.best + '/' + CHAPTER_TEST_LEN + '</span>' : '<span class="badge badge-ghost">Not attempted</span>';
          btn = '<button class="btn btn-sm btn-primary" type="button" onclick="startChapterTest(\'' + topic.id + '\',\'' + c.d + '\')">Start ' + c.label + ' test →</button>';
          note = qAvail >= 4 ? qAvail + ' ' + c.label.toLowerCase() + ' questions in the bank' : 'Chapter bank calibrated for this level';
        }
        return '<div class="card ct-card">' +
          '<div class="row" style="align-items:center;gap:.5rem">' +
            '<span class="ct-icon">' + c.icon + '</span><span class="ct-label">' + c.label + '</span>' + status +
          '</div>' +
          '<div class="ct-note fs-small text-muted">' + note + '</div>' +
          btn +
        '</div>';
      }).join('')}
    </div>`;
}

function lessonPara(p) {
  const trimmed = p.trim();
  const m = trimmed.match(/^Test[\s-]?day[\s]*insight[:.]?\s*/i);
  if (m) {
    return '<div class="lesson-insight"><span aria-hidden="true">💡</span><div><p><b>Test-day insight.</b> ' + esc(trimmed.slice(m[0].length)) + '</p></div></div>';
  }
  return '<p>' + esc(p) + '</p>';
}

function exampleBlock(e, idx, topicId) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return `
    <div class="example-block">
      <div class="example-head">
        <span class="example-pill">Example ${idx + 1}</span>
        <span class="text-muted fs-small">${idx === 0 ? 'Cover the options and try it before revealing.' : ''}</span>
      </div>
      <div class="example-question">${esc(e.question)}</div>
      <div>
        ${e.options.map(function (o, oi) { return `
          <div class="option disabled" id="${topicId}-ex${idx}-opt${oi}">
            <span class="option-letter">${letters[oi]}</span>
            <span>${esc(o)}</span>
          </div>`; }).join('')}
      </div>
      <div class="example-controls">
        <button class="btn btn-sm btn-outline" id="${topicId}-ex${idx}-toggle" data-answer="${e.answer}">Reveal answer</button>
      </div>
      <div class="example-answer" style="display:none" id="${topicId}-ex${idx}-answer">✔ Correct answer: ${esc(e.answer)}</div>
      <div class="example-reason" style="display:none" id="${topicId}-ex${idx}-reason">${esc(e.reasoning)}</div>
    </div>`;
}

function bindExampleToggles(el) {
  el.querySelectorAll('.example-block button[id$="-toggle"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const base = this.id.replace('-toggle', '');
      const ans = el.querySelector('#' + base + '-answer');
      const reason = el.querySelector('#' + base + '-reason');
      if (!ans) return;
      const show = ans.style.display === 'none';
      ans.style.display = show ? '' : 'none';
      reason.style.display = show ? '' : 'none';
      this.textContent = show ? 'Hide answer' : 'Reveal answer';
      if (show && this.dataset.answer) {
        const opt = el.querySelector('#' + base + '-opt' + (this.dataset.answer.charCodeAt(0) - 65));
        if (opt) opt.classList.add('correct-answer');
      }
    });
  });
}

function renderLessonNav(el, topicId) {
  const order = [];
  curriculum.sections.forEach(function (s) { s.topics.forEach(function (t) { order.push(t.id); }); });
  const i = order.indexOf(topicId);
  const topicName = function (id) {
    const t = curriculum.topics.find(function (x) { return x.id === id; });
    return t ? t.name : '';
  };
  const prev = i > 0 ? order[i - 1] : null;
  const next = i < order.length - 1 ? order[i + 1] : null;
  const cardPrev = prev
    ? '<a class="lesson-nav-card" href="#/learn/' + prev + '"><div class="lesson-nav-label">← Previous lesson</div><div class="lesson-nav-title">' + esc(topicName(prev)) + '</div></a>'
    : '<div class="lesson-nav-card disabled"><div class="lesson-nav-label">← Previous lesson</div><div class="lesson-nav-title">Start of the course</div></div>';
  const cardNext = next
    ? '<a class="lesson-nav-card" href="#/learn/' + next + '"><div class="lesson-nav-label" style="text-align:right">Next lesson →</div><div class="lesson-nav-title">' + esc(topicName(next)) + '</div></a>'
    : '<div class="lesson-nav-card disabled"><div class="lesson-nav-label" style="text-align:right">Next lesson →</div><div class="lesson-nav-title">Course complete 🎉</div></div>';
  const nav = el.querySelector('#lessonNav');
  if (nav) nav.innerHTML = '<div class="lesson-nav">' + cardPrev + cardNext + '</div>';
}

function initLessonScroll(el) {
  if (window.__lessonScrollHandler) {
    window.removeEventListener('scroll', window.__lessonScrollHandler, true);
    window.__lessonScrollHandler = null;
  }
  const handler = function () {
    if (!document.body.contains(el)) {
      window.removeEventListener('scroll', handler, true);
      if (window.__lessonScrollHandler === handler) window.__lessonScrollHandler = null;
      return;
    }
    const doc = document.documentElement;
    const winH = window.innerHeight || doc.clientHeight;
    const max = Math.max(0, doc.scrollHeight - winH);
    const bar = document.getElementById('lessonProgressBar');
    if (bar) bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0).toFixed(1) + '%';
    const ids = ['lesson-overview', 'lesson-formulas', 'lesson-strategies', 'lesson-traps', 'lesson-examples', 'lesson-check', 'lesson-tests'];
    let cur = ids[0];
    ids.forEach(function (id) {
      const node = document.getElementById(id);
      if (node && node.getBoundingClientRect().top <= 116) cur = id;
    });
    document.querySelectorAll('.lesson-toc-link').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-target') === cur);
    });
  };
  window.__lessonScrollHandler = handler;
  window.addEventListener('scroll', handler, { passive: true, capture: true });
  handler();
}

function initQuickCheck(el, topic) {
  const container = el.querySelector('#quickCheck');
  const statusEl = el.querySelector('#quickStatus');
  const letters = ['A', 'B', 'C', 'D', 'E'];

  topic.check.forEach((q, qi) => {
    container.insertAdjacentHTML('beforeend', `
      <div class="example-block" data-qc="${qi}">
        <div class="example-question">Q${qi + 1}. ${esc(q.q)}</div>
        <div>
          ${q.o.map((o, oi) => `
            <button class="option" data-qc="${qi}" data-choice="${oi}" type="button">
              <span class="option-letter">${letters[oi]}</span>
              <span>${esc(o)}</span>
            </button>`).join('')}
        </div>
        <div class="example-reason" id="qc-${qi}-result" style="display:none"></div>
      </div>`);
  });

  let answered = 0;
  const answers = {};
  container.querySelectorAll('.option[data-qc]').forEach(btn => {
    btn.addEventListener('click', function () {
      const qi = +this.getAttribute('data-qc');
      const ci = +this.getAttribute('data-choice');
      const q = topic.check[qi];
      const block = container.querySelector(`[data-qc="${qi}"]`);

      // disable all buttons in this block
      block.querySelectorAll('.option').forEach(o => {
        o.disabled = true;
        o.classList.add('disabled');
        o.classList.remove('hoverable');
        const li = letters.indexOf(letters[o.getAttribute('data-choice')]);
        if (o.getAttribute('data-choice') == q.a) o.classList.add('correct');
      });
      if (ci === q.a) {
        this.classList.remove('correct');
        this.classList.add('correct');
      } else {
        this.classList.add('incorrect');
      }

      const result = block.querySelector('#qc-' + qi + '-result');
      result.style.display = '';
      result.textContent = ci === q.a ? '✅ Correct!' : '❌ Incorrect — correct answer: ' + letters[q.a];
      result.className = 'example-reason ' + (ci === q.a ? 'text-success' : 'text-danger');

      if (answers[qi] === undefined) {
        answers[qi] = ci === q.a;
        answered += 1;
        updateState(st => {
          const r = st.learning[topic.id] || (st.learning[topic.id] = { status: 'not-started' });
          r.qc = r.qc || { answers: 0, correct: 0 };
          r.qc.answers += 1;
          if (ci === q.a) r.qc.correct += 1;
        });
      }
      const prog = el.querySelector('#qcProgress');
      if (prog) prog.textContent = answered + '/' + topic.check.length + ' answered';
      if (answered === topic.check.length) {
        const score = Object.values(answers).filter(Boolean).length;
        statusEl.textContent = score + '/5 correct';
        if (score >= 4) {
          statusEl.className = 'badge badge-success';
          markTopicLearned(topic.id);
          toast('Topic mastered! +' + gamification.xpRules.lessonCompleted + ' XP', 'success');
          // refresh any visible change
          quizXPAccrued(score, topic);
        } else {
          statusEl.className = 'badge badge-error';
          toast('Keep going — review the traps and retry the quick check.', 'error');
        }
      }
    });
  });
}

function quizXPAccrued(score, topic) {
  if (score >= 4) {
    grantXp(gamification.xpRules.checkAllCorrect);
    addFeed('✅', 'Quick check passed: ' + topic.name);
  }
}

/* Register routes */
App.register('learn', {
  title: 'Learn',
  menuKey: 'learn',
  render: function (el, args) {
    if (args && args.length) renderTopicLesson(el, args);
    else renderLearnHome(el);
  }
});

window.renderLearnHome = renderLearnHome;
window.renderTopicLesson = renderTopicLesson;