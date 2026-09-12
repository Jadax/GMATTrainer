/* =====================================================================
   GMAT 750+ Trainer - Dashboard view
   Welcome, quick stats, strengths/weaknesses, recommended next step,
   daily goal tracker, recent activity, motivational quote.
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   Helper: compute per-topic accuracy from state.stats.byTopic
   --------------------------------------------------------------------- */
function computeTopicStats() {
  const st = loadState();
  const arr = [];
  Object.keys(st.stats.byTopic).forEach(tag => {
    const t = st.stats.byTopic[tag];
    if (t.attempts > 0) {
      arr.push({ tag: tag, attempts: t.attempts, correct: t.correct, pct: t.correct / t.attempts });
    }
  });
  arr.sort((a, b) => (a.pct - b.pct)); // ascending accuracy
  return arr;
}

function topicTagLabel(tag) {
  const map = {
    arithmetic: 'Arithmetic', algebra: 'Algebra', wordproblems: 'Word Problems',
    numbers: 'Number Properties', stats: 'Statistics',
    rc: 'Reading Comp', cr: 'Critical Reasoning',
    ds: 'Data Sufficiency', ms: 'Multi-Source', ta: 'Table Analysis',
    gi: 'Graphics Interp', tp: 'Two-Part Analysis'
  };
  return map[tag] || tag;
}

/* ---------------------------------------------------------------------
   Recommended next step based on weakest area
   --------------------------------------------------------------------- */
function recommendedAction() {
  const st = loadState();
  const topicStats = computeTopicStats();

  // 1) An unmastered lesson in the weakest topic
  const weakTopic = topicStats.length ? topicStats[0] : null;
  if (weakTopic) {
    const curriculumTopic = curriculum.topicKeyForQTopic(weakTopic.tag);
    if (curriculumTopic) {
      const status = learningStatus(curriculumTopic).status;
      if (status !== 'mastered') {
        return {
          icon: '📘',
          title: 'Learn ' + curriculum.topics.find(t => t.id === curriculumTopic).name,
          text: 'Your accuracy in ' + topicTagLabel(weakTopic.tag) + ' is only ' + Math.round(weakTopic.pct * 100) + '%. Master this topic first.',
          href: '#/learn/' + curriculumTopic
        };
      }
    }
  }
  // 2) Error log has items
  if (st.practice.errorLog.length > 0) {
    return {
      icon: '🔍',
      title: 'Review Error Log',
      text: 'You have ' + st.practice.errorLog.length + ' question(s) to re-attempt. Cementing is the fastest way to improve.',
      href: '#/practice/error'
    };
  }
  // 3) A topic mastery reminder is due
  const due = Object.keys(st.learning).find(id => {
    const t = st.learning[id];
    return t.due && t.due < Date.now();
  });
  if (due) {
    return {
      icon: '⏰',
      title: 'Spaced review due',
      text: 'Reinforce "' + topicName(due) + '" now (3/7/14-day review cycle).',
      href: '#/learn/' + due
    };
  }
  // 4) No data yet: start practicing
  return {
    icon: '🎯',
    title: 'Take a Diagnostic',
    text: 'New here? Start with a short diagnostic practice set to map your baseline.',
    href: '#/practice'
  };
}

/* ---------------------------------------------------------------------
   Render the dashboard
   --------------------------------------------------------------------- */
function renderDashboard(el) {
  const st = loadState();
  const topics = computeTopicStats();
  const strengths = topics.slice(-3).reverse();
  const weaknesses = topics.slice(0, 3);
  const tp = todayProgress();
  const next = recommendedAction();

  const quote = gamification.quotes[Math.floor(Math.random() * gamification.quotes.length)];
  const q = parseInt(st.stats.totalCorrect / Math.max(1, st.stats.totalAnswered) * 100) || 0;
  const monthAgo = Date.now() - 30 * 86400000;
  const monthQuestions = st.stats.history.filter(h => h.ts > monthAgo).length;
  const dueCount = questionDueCount();
  const phase = studyPhase();

  const feed = st.stats.history.slice(0, 5);
  const setFeed = st.practice.history.slice(0, 4);
  const modeLabel = m => ({ practice: 'Mixed', diagnostic: 'Diagnostic', topic: 'Topic', section: 'Section', error: 'Error fix', flagged: 'Flagged', due: 'Spaced review', weak: 'Weak areas' }[m] || 'Practice');

  el.innerHTML = `
    <section class="card">
      <div class="row row-wrap">
        <div>
          <h1>Welcome back, ${esc(st.user.name)} 👋</h1>
          <p class="text-muted">Track your GMAT Focus journey — one question at a time.</p>
        </div>
        <div class="row" style="margin-left:auto">
          <span class="badge badge-ghost" title="${esc(phase.desc)}">${phase.icon} ${phase.title}</span>
          <button class="btn btn-outline" onclick="location.hash='#/practice'">Start Practice</button>
          <button class="btn btn-primary" onclick="location.hash='#/simulator'">Full Simulator</button>
        </div>
      </div>
    </section>

    <section class="grid grid-4">
      <div class="card card-hover">
        <div class="stat-value">${st.stats.totalAnswered}</div>
        <div class="stat-label">Questions Answered</div>
      </div>
      <div class="card card-hover">
        <div class="stat-value">${q}%</div>
        <div class="stat-label">Overall Accuracy</div>
      </div>
      <div class="card card-hover">
        <div class="stat-value">${fmtDuration(st.stats.totalSeconds)}</div>
        <div class="stat-label">Time Studied</div>
      </div>
      <div class="card card-hover">
        <div class="stat-value">${st.stats.simsCompleted}</div>
        <div class="stat-label">Simulators Done</div>
      </div>
    </section>

    <section class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Daily Goal</h2>
          <span class="badge ${tp.goalHit ? 'badge-success' : 'badge-accent'}">${tp.goalHit ? 'Goal reached! 🎉' : 'In progress'}</span>
        </div>
        <div class="progress mb-1"><div class="progress-bar" style="width:${tp.pct}%"></div></div>
        <p class="text-muted">${tp.questions} of ${tp.goal} questions today · ${fmtDuration(tp.seconds)} studied</p>
        <div class="row mt-2">
          <button class="btn btn-sm btn-outline" onclick="location.hash='#/practice'">Do some now</button>
          <button class="btn btn-sm btn-ghost" onclick="editDailyGoal()">Edit goal</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h2 class="card-title">Recommended Next Step</h2></div>
        <div class="row">
          <span class="feed-icon">${next.icon}</span>
          <div>
            <div class="fw-bold">${next.title}</div>
            <div class="fs-small text-muted">${next.text}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary mt-2" onclick="location.hash='${next.href}'">Go →</button>
      </div>
    </section>

    <section class="card" style="margin-bottom:1rem;border-left:4px solid var(--color-danger)">
      <div class="row row-wrap" style="align-items:center;gap:.5rem 1rem">
        <div>
          <div class="card-title">🔴 Expert Endgame</div>
          <p class="text-muted" style="margin:0">Clear each section's chapters (pass the Hard tests) to unlock its Expert capstone — a mixed-format strategy cap. The capstones join everything you relearned.</p>
        </div>
        <div class="row" style="gap:.5rem;flex-wrap:wrap;margin-left:auto">
          ${curriculum.sections.filter(s => s.topics.some(t => t.level === 'advanced')).map(s => {
            const adv = s.topics.filter(t => t.level === 'advanced');
            const unlocked = adv.filter(t => expertTopicUnlocked(t.id)).length;
            const mastered = adv.filter(t => learningStatus(t.id).status === 'mastered').length;
            return `<a class="btn btn-sm ${mastered === adv.length ? 'btn-outline' : 'btn-ghost'} stage-chip stage-chip-advanced" href="#/learn" title="${esc(s.name)}">${s.icon} ${s.short}: ${mastered}/${adv.length} capstone${adv.length > 1 ? 's' : ''} ${mastered === adv.length ? '✅' : unlocked === adv.length ? '🔓' : '🔒'}</a>`;
          }).join('')}
        </div>
      </div>
    </section>

    <section class="grid grid-2">
      <div class="card">
        <div class="card-header"><h2 class="card-title">💪 Top Strengths</h2></div>
        ${strengths.length ? strengths.map(t => `
          <div class="feed-item">
            <span class="feed-icon">✅</span>
            <span>${topicTagLabel(t.tag)} <span class="text-muted">(${t.attempts} Qs)</span></span>
            <span class="text-success fw-bold">${Math.round(t.pct * 100)}%</span>
          </div>`).join('') : '<p class="text-muted">No data yet — answer some questions first.</p>'}
      </div>
      <div class="card">
        <div class="card-header"><h2 class="card-title">⚠️ Areas to Improve</h2></div>
        ${weaknesses.length ? weaknesses.map(t => `
          <div class="feed-item">
            <span class="feed-icon">📈</span>
            <span>${topicTagLabel(t.tag)} <span class="text-muted">(${t.attempts} Qs)</span></span>
            <span class="text-danger fw-bold">${Math.round(t.pct * 100)}%</span>
          </div>`).join('') : '<p class="text-muted">No data yet.</p>'}
        ${weaknesses.length ? `<button class="btn btn-sm btn-outline mt-2" onclick="startWeak()">🎯 Drill weakest topics →</button>` : ''}
      </div>
    </section>

    <section class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">🔁 Spaced Review Due</h2>
          <span class="badge badge-primary">${dueCount}</span>
        </div>
        ${dueCount ? `<p class="text-muted">Questions from your SM-2 spaced-repetition schedule coming due — intervals grow with each recall. Reviewing on time is what makes recall stick.</p>
          <button class="btn btn-sm btn-primary mt-2" onclick="startDue()">Review ${dueCount} due →</button>`
        : '<p class="text-muted">Nothing due right now. Keep answering questions and your spaced-review queue builds itself.</p>'}
      </div>
      <div class="card">
        <div class="card-header"><h2 class="card-title">🏋️ Practice Rhythm</h2></div>
        ${setFeed.length ? setFeed.map(h => `
          <div class="feed-item">
            <span class="feed-icon">${h.correct >= h.count / 2 ? '✅' : '📝'}</span>
            <span>${modeLabel(h.mode)} · ${h.correct}/${h.count}</span>
            <span class="feed-time">${new Date(h.ts).toLocaleString(undefined, {month:'short', day:'numeric'})}</span>
          </div>`).join('') : '<p class="text-muted">Finished sets will appear here with accuracy and pace.</p>'}
      </div>
    </section>

    <section class="grid grid-2">
      <div class="card">
        <div class="card-header"><h2 class="card-title">Recent Activity</h2></div>
        ${feed.length ? feed.map(h => `
          <div class="feed-item">
            <span class="feed-icon">${h.icon}</span>
            <span>${esc(h.text)}</span>
            <span class="feed-time">${new Date(h.ts).toLocaleString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
          </div>`).join('') : '<p class="text-muted">Nothing yet. Your activity will appear here.</p>'}
      </div>
      <div class="card text-center">
        <div class="card-header" style="justify-content:center"><h2 class="card-title">Inspiration for Today</h2></div>
        <p class="fs-large" style="font-family:var(--font-heading)">"${esc(quote.text)}"</p>
        <p class="text-muted">— ${esc(quote.author)}</p>
      </div>
    </section>`;
}

/* ---------------------------------------------------------------------
   Edit daily goal (modal)
   --------------------------------------------------------------------- */
function editDailyGoal() {
  const st = loadState();
  const modal = openModal(`
    <div class="field">
      <label for="goalInput">Questions per day</label>
      <input type="number" id="goalInput" min="1" max="200" value="${st.user.dailyGoal}">
      <div class="field-hint">A realistic GMAT prep goal is 15–30 questions/day plus lesson work.</div>
    </div>
    <div class="row">
      <button class="btn btn-primary" id="saveGoal">Save</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
  modal.querySelector('#saveGoal').addEventListener('click', function () {
    const val = parseInt(modal.querySelector('#goalInput').value, 10);
    if (isNaN(val) || val < 1) { toast('Enter a positive number.', 'error'); return; }
    updateState(s => { s.user.dailyGoal = val; });
    closeModal();
    toast('Daily goal updated.', 'success');
    render();
  });
}

/* Settings/profile modal for dashboard (name + target score) */
function editProfile() {
  const st = loadState();
  const modal = openModal(`
    <div class="field">
      <label for="nameInput">Your name</label>
      <input type="text" id="nameInput" value="${esc(st.user.name)}">
    </div>
    <div class="field">
      <label for="targetInput">Target score (205–805)</label>
      <input type="number" id="targetInput" min="205" max="805" step="10" value="${st.user.targetScore}">
    </div>
    <div class="field">
      <label for="dateInput">Target test date (optional)</label>
      <input type="date" id="dateInput" value="${st.user.targetDate || ''}">
    </div>
    <div class="field" style="flex-direction:row;align-items:center;gap:.5rem;margin-top:.4rem">
      <input type="checkbox" id="soundInput" ${st.settings && st.settings.sound === false ? '' : 'checked'}>
      <label for="soundInput" style="margin:0">Sound effects (correct / time-up / button clicks)</label>
    </div>
    <div class="row">
      <button class="btn btn-primary" id="saveProfile">Save</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
  modal.querySelector('#saveProfile').addEventListener('click', function () {
    const name = modal.querySelector('#nameInput').value.trim() || 'GMAT Candidate';
    const target = parseInt(modal.querySelector('#targetInput').value, 10) || 705;
    const date = modal.querySelector('#dateInput').value;
    const sound = modal.querySelector('#soundInput').checked;
    if (target < 205 || target > 805) { toast('Target must be 205–805.', 'error'); return; }
    updateState(s => {
      s.user.name = name; s.user.targetScore = target; s.user.targetDate = date || null;
      s.settings.sound = sound;
    });
    closeModal();
    toast('Profile saved.', 'success');
    render();
  });
}

/* Register route */
App.register('dashboard', {
  title: 'Dashboard',
  menuKey: 'dashboard',
  render: renderDashboard
});

window.editDailyGoal = editDailyGoal;
window.editProfile = editProfile;