/* =====================================================================
   GMAT 750+ Trainer - Study Planner view
   Generates a week-by-week plan between today and the target test date,
   and a weekly schedule of daily goals (learning, practice, review).
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   Build the plan from target date + hours per week
   --------------------------------------------------------------------- */
function buildPlan(targetDate, hoursPerWeek) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(1, Math.round((target - today) / 86400000));
  const weeks = Math.max(1, Math.ceil(daysLeft / 7));
  const minutesPerWeek = hoursPerWeek * 60;

  const weekTemplate = [
    { label: 'Mon', category: 'practice', minutes: 0 },
    { label: 'Tue', category: 'learn', minutes: 0 },
    { label: 'Wed', category: 'practice', minutes: 0 },
    { label: 'Thu', category: 'review', minutes: 0 },
    { label: 'Fri', category: 'practice', minutes: 0 },
    { label: 'Sat', category: 'learn', minutes: 0 },
    { label: 'Sun', category: 'simulator', minutes: 0 }
  ];
  // distribute minutes across the 7 days (simulator day gets a bit more)
  const perDay = Math.floor(minutesPerWeek / 7);
  let remainder = minutesPerWeek - perDay * 7;
  const plan = [];
  for (let w = 0; w < weeks; w++) {
    const days = weekTemplate.map(d => {
      let mins = perDay;
      if (remainder > 0) { mins += 1; remainder -= 1; }
      return Object.assign({}, d, { minutes: mins });
    });
    plan.push({ week: w + 1, days: days, focusedTopic: focusTopicForWeek(w + 1),
      phase: phaseForWeek(w, weeks), milestone: milestoneForWeek(w, weeks) });
  }
  return plan;
}

/* Build (concepts) -> Sharpen (timed mixed sets) -> Test-ready (full mocks + review). */
const PLAN_PHASES = {
  build: { label: 'Build', tip: 'Learn chapters first, then untimed topic drills. Aim for accuracy before speed; log every miss with a reason.' },
  sharpen: { label: 'Sharpen', tip: 'Timed mixed sets at medium/hard difficulty. Re-drill your Error Log weekly and target the topics the Analytics page flags.' },
  ready: { label: 'Test-ready', tip: 'Full-length mocks under real conditions, each followed by a complete review of every miss and every slow correct answer.' }
};

function phaseForWeek(w, weeks) {
  const frac = (w + 1) / weeks;
  if (weeks >= 3 && frac <= 0.4) return 'build';
  if (frac <= 0.75 && w < weeks - 1) return 'sharpen';
  return 'ready';
}

function milestoneForWeek(w, weeks) {
  if (w === weeks - 1) return 'Taper: no new full-length mock in the last 3 days. Review your Error Log and formula sheet, and confirm test-day logistics.';
  if (w === 0) return 'Take GMAT Official Practice Exam 1 (free on mba.com) as your true baseline.';
  if (weeks >= 4 && w === Math.floor(weeks / 2)) return 'Take Official Practice Exam 2 (free) and compare each section with Exam 1.';
  if (phaseForWeek(w, weeks) === 'ready') return 'Take one full official practice exam (Exams 3–6 are sold on mba.com), then review every miss before the next one.';
  return '';
}

function focusTopicForWeek(week) {
  const topics = curriculum.topics;
  const idx = ((week - 1) % topics.length + topics.length) % topics.length;
  return topics[idx];
}

/* ---------------------------------------------------------------------
   Render
   --------------------------------------------------------------------- */
function renderPlanner(el) {
  const st = loadState();

  el.innerHTML = `
    <div class="page-header">
      <h1>📅 Study Planner</h1>
      <p class="text-muted">Build a realistic week-by-week path to your target test date.</p>
    </div>

    <section class="card">
      <div class="field-row">
        <div class="field">
          <label for="plTarget">Target test date</label>
          <input type="date" id="plTarget" value="${st.user.targetDate || ''}">
        </div>
        <div class="field">
          <label for="plGoal">Target score (205–805)</label>
          <input type="number" id="plGoal" min="205" max="805" step="10" value="${st.user.targetScore || 705}">
        </div>
        <div class="field">
          <label for="plHours">Study hours per week</label>
          <select id="plHours">
            ${[3, 5, 8, 10, 15, 20].map(h => `<option value="${h}" ${(h === ((st.planner && st.planner.hoursPerWeek) || 8)) ? 'selected' : ''}>${h} h/week</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-primary" onclick="generatePlan()">Generate Plan →</button>
      <p class="text-muted fs-small mt-1">Tip: most students need 8–16 weeks at 8–15 h/week to go from baseline to 700+.</p>
    </section>

    <section class="card">
      <h2 class="card-title">🎓 Pair this app with official material</h2>
      <p class="fs-small">This app teaches the methods and drills them, but only questions written by GMAC show you exactly how the real test is written and scored. For a 705+ target, make these part of your plan:</p>
      <ul class="fs-small">
        <li><strong>GMAT Official Practice Exams 1 &amp; 2</strong> (free on mba.com): use them as your baseline and midpoint checks. They are the only practice scores that use the real adaptive algorithm.</li>
        <li><strong>Official Practice Exams 3–6</strong> (paid): one a week in the final phase.</li>
        <li><strong>GMAT Official Guide</strong> (current Focus Edition) and its online question bank: real retired questions for timed sets once you have finished a topic here.</li>
      </ul>
      <p class="text-muted fs-small">Don't redo the same official exam soon after taking it, because remembering the answers inflates your score. Log every official question you miss in the Error Log.</p>
    </section>

    <div id="planOutput"></div>`;
}

function generatePlan() {
  const target = document.getElementById('plTarget').value;
  const goal = parseInt(document.getElementById('plGoal').value, 10);
  const hours = parseInt(document.getElementById('plHours').value, 10);
  if (!target) { toast('Pick a target test date first.', 'error'); return; }
  if (goal < 205 || goal > 805) { toast('Target score must be 205–805.', 'error'); return; }

  const plan = buildPlan(target, hours);
  updateState(s => {
    s.planner = { targetDate: target, goal: goal, hoursPerWeek: hours, generatedAt: Date.now(), weeks: plan };
    s.user.targetDate = target;
    s.user.targetScore = goal;
  });

  const daysLeft = Math.max(1, Math.round((new Date(target) - new Date()) / 86400000));
  const weeks = plan.length;
  const categoryIcon = { practice: '🎯', learn: '📘', review: '🔍', simulator: '🏁' };
  const categoryLabel = { practice: 'Practice', learn: 'Learn', review: 'Review errors', simulator: 'Simulator' };

  const out = document.getElementById('planOutput');
  out.innerHTML = `
    <h2 class="section-title">Your ${weeks}-week plan → ${new Date(target).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</h2>
    <section class="card">
      <div class="row row-wrap fs-small text-muted">
        <span>🎯 Target: <strong>${goal}</strong></span>
        <span>⏱ ${hours} h/week</span>
        <span>📆 ${daysLeft} days to go</span>
        <span>${weeks} weeks</span>
      </div>
    </section>
    ${plan.map(w => `
      <section class="card" style="margin-bottom:.75rem">
        <div class="card-header">
          <h2 class="card-title">Week ${w.week}</h2>
          <span class="badge">${esc(PLAN_PHASES[w.phase].label)}</span>
          <span class="badge badge-accent">Focus: ${esc(w.focusedTopic.name)}</span>
        </div>
        ${w.milestone ? `<p class="fs-small"><strong>🏁 Milestone:</strong> ${esc(w.milestone)}</p>` : ''}
        <div class="grid grid-4" style="gap:.5rem">
          ${w.days.map(d => `
            <div class="card" style="padding:.6rem;text-align:center">
              <div class="fw-bold">${d.label}</div>
              <div style="font-size:1.3rem">${categoryIcon[d.category]}</div>
              <div class="fs-small text-muted">${categoryLabel[d.category]}</div>
              <div class="fs-small">${d.minutes} min</div>
            </div>`).join('')}
        </div>
        <p class="text-muted fs-small mt-1">${esc(PLAN_PHASES[w.phase].tip)}</p>
      </section>`).join('')}
    <div class="row">
      <button class="btn btn-outline" onclick="exportPlan()">📤 Export plan (text)</button>
    </div>`;
}

function exportPlan() {
  const st = loadState();
  if (!st.planner) { toast('Generate a plan first.', 'error'); return; }
  const lines = ['GMAT 750+ Trainer — Study Plan',
    'Target: ' + st.planner.goal + ' on ' + new Date(st.planner.targetDate).toLocaleDateString(),
    'Hours/week: ' + st.planner.hoursPerWeek, ''];
  st.planner.weeks.forEach(w => {
    lines.push('Week ' + w.week + (w.phase ? ' [' + PLAN_PHASES[w.phase].label + ']' : '') + ' (focus: ' + w.focusedTopic.name + ')');
    if (w.milestone) lines.push('  Milestone: ' + w.milestone);
    w.days.forEach(d => lines.push('  ' + d.label + ': ' + d.minutes + ' min — ' + d.category));
  });
  downloadTextFile('gmat750-plan.txt', 'text/plain', lines.join('\n'));
}

App.register('planner', {
  title: 'Study Planner',
  render: renderPlanner,
  menuKey: 'advisor'
});

window.renderPlanner = renderPlanner;
window.generatePlan = generatePlan;
window.exportPlan = exportPlan;
window.buildPlan = buildPlan;