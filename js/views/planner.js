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
    plan.push({ week: w + 1, days: days, focusedTopic: focusTopicForWeek(w) });
  }
  return plan;
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
            ${[3, 5, 8, 10, 15, 20].map(h => `<option value="${h}" ${(h === (st.planner && st.planner.hoursPerWeek) || 8) ? 'selected' : ''}>${h} h/week</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-primary" onclick="generatePlan()">Generate Plan →</button>
      <p class="text-muted fs-small mt-1">Tip: most students need 8–16 weeks at 8–15 h/week to go from baseline to 700+.</p>
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
          <span class="badge badge-accent">Focus: ${esc(w.focusedTopic.name)}</span>
        </div>
        <div class="grid grid-4" style="gap:.5rem">
          ${w.days.map(d => `
            <div class="card" style="padding:.6rem;text-align:center">
              <div class="fw-bold">${d.label}</div>
              <div style="font-size:1.3rem">${categoryIcon[d.category]}</div>
              <div class="fs-small text-muted">${categoryLabel[d.category]}</div>
              <div class="fs-small">${d.minutes} min</div>
            </div>`).join('')}
        </div>
        <p class="text-muted fs-small mt-1">Weekly plan tip: start with "${esc(w.focusedTopic.name)}" and rotate topics weekly. Insert a full simulator every 2–3 weeks.</p>
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
    lines.push('Week ' + w.week + ' (focus: ' + w.focusedTopic.name + ')');
    w.days.forEach(d => lines.push('  ' + d.label + ': ' + d.minutes + ' min — ' + d.category));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gmat750-plan.txt';
  a.click();
  URL.revokeObjectURL(url);
}

window.renderPlanner = renderPlanner;
window.generatePlan = generatePlan;
window.exportPlan = exportPlan;
window.buildPlan = buildPlan;