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

  el.innerHTML = `
    <div class="page-header">
      <h1>Learn the GMAT Focus Curriculum</h1>
      <p class="text-muted">A complete 0→100 syllabus across all three sections. Master topics section by section.</p>
    </div>

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
  const skillMap = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  return `
    <a class="card card-hover topic-card" href="#/learn/${t.id}" style="text-decoration:none">
      <div class="row" style="align-items:center">
        <span class="feed-icon">${stateIcon === '●' ? '✅' : stateIcon === '◐' ? '🔄' : '📘'}</span>
        <div class="topic-name">${esc(t.name)}</div>
      </div>
      <div class="topic-meta">${skillMap[t.level] || t.level}</div>
      <div class="topic-state">
        <span class="badge ${ls.status === 'mastered' ? 'badge-success' : ls.status === 'in-progress' ? 'badge-accent' : ''}">${stateLabel}</span>
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
  const skillMap = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  el.innerHTML = `
    <div class="lesson-container">
      <div class="row row-wrap" style="align-items:center">
        <a class="btn btn-sm btn-ghost" href="#/learn">← Curriculum</a>
        ${ls.status === 'mastered' ? '<span class="badge badge-success" style="margin-left:auto">Mastered ✅</span>' : ''}
      </div>

      <div class="page-header">
        <h1>${esc(topic.name)}</h1>
        <p class="text-muted">${skillMap[topic.level]} · ${curriculum.questionsForTopic(topic.id).length} practice questions available</p>
      </div>

      <div class="lesson-section">
        <h3>Overview</h3>
        ${topic.overview.map(p => `<p>${esc(p)}</p>`).join('')}
      </div>

      ${topic.formulas.length ? `
        <div class="lesson-section">
          <h3>Formulas &amp; Rules</h3>
          <table class="formula-table">
            <thead><tr><th>Term</th><th>Definition</th></tr></thead>
            <tbody>${topic.formulas.map(f => `<tr><td><strong>${esc(f.term)}</strong></td><td>${esc(f.def)}</td></tr>`).join('')}</tbody>
          </table>
        </div>` : ''}

      ${topic.strategies.length ? `
        <div class="lesson-section">
          <h3>Strategies</h3>
          ${topic.strategies.map(s => `<div class="lesson-box lesson-box-tip"><p style="margin:0">💡 ${esc(s)}</p></div>`).join('')}
        </div>` : ''}

      ${topic.traps.length ? `
        <div class="lesson-section">
          <h3>Common Traps</h3>
          ${topic.traps.map(s => `<div class="lesson-box lesson-box-danger"><p style="margin:0">⚠️ ${esc(s)}</p></div>`).join('')}
        </div>` : ''}

      <div class="lesson-section">
        <h3>Worked Examples</h3>
        ${topic.examples.map((e, i) => exampleBlock(e, i, topicId)).join('')}
      </div>

      <div class="lesson-section">
        <div class="row" style="align-items:center">
          <h3 style="margin:0">Quick Check <span class="text-muted fs-small">(5 questions)</span></h3>
          <span class="badge badge-accent" style="margin-left:auto" id="quickStatus">Not attempted</span>
        </div>
        <p class="text-muted">Complete the quick check to mark this topic as mastered.</p>
        <div id="quickCheck"></div>
      </div>

      <div class="lesson-section" id="practiceLink">
        <button class="btn btn-primary" onclick="location.hash='#/practice/topic/${topicId}'">Practice this topic →</button>
      </div>
    </div>`;

  el.querySelectorAll('.example-block button[id$="-toggle"]').forEach(btn => {
    btn.addEventListener('click', function () {
      const base = this.id.replace('-toggle', '');
      const ans = el.querySelector('#' + base + '-answer');
      const reason = el.querySelector('#' + base + '-reason');
      const show = ans.style.display === 'none';
      ans.style.display = show ? '' : 'none';
      reason.style.display = show ? '' : 'none';
      this.textContent = show ? 'Hide answer' : 'Show answer';
    });
  });

  initQuickCheck(el, topic);
}

function exampleBlock(e, idx, topicId) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return `
    <div class="example-block">
      <div class="example-question">Example ${idx + 1} — ${esc(e.question)}</div>
      <div>
        ${e.options.map((o, oi) => `
          <div class="option disabled" id="${topicId}-ex${idx}-opt${oi}">
            <span class="option-letter">${letters[oi]}</span>
            <span>${esc(o)}</span>
          </div>`).join('')}
      </div>
      <div class="example-answer" style="display:none" id="${topicId}-ex${idx}-answer">✔ Answer: ${esc(e.answer)}</div>
      <div class="example-reason" style="display:none" id="${topicId}-ex${idx}-reason">${esc(e.reasoning)}</div>
      <button class="btn btn-sm btn-outline mt-1" id="${topicId}-ex${idx}-toggle" style="margin-top:.6rem">Show answer</button>
    </div>`;
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
      }
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