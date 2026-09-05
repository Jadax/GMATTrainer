/* =====================================================================
   GMAT 750+ Trainer - Progress view
   Level & XP, badges, study heatmap, and export/import backups.
   Flashcards and Study Planner are separate nav-adjacent views exposed
   here via subroutes paired with planner.js / flashcards.js.
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   Main progress page
   --------------------------------------------------------------------- */
function renderProgress(el) {
  const st = loadState();
  const xp = st.xp || 0;
  const lvl = gamification.levelForXp(xp);
  const prog = gamification.levelProgress(xp);
  const earned = Object.keys(st.badgesEarned);

  // Heatmap: last 12 weeks
  const heat = buildHeatmap(st);

  el.innerHTML = `
    <div class="page-header">
      <h1>Progress &amp; Rewards</h1>
      <p class="text-muted">Watch yourself climb from Novice toward the 750+ Club.</p>
    </div>

    <section class="card">
      <div class="row row-wrap" style="align-items:center;gap:1rem">
        <div class="level-badge" style="width:84px;height:84px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:2.2rem;background:${lvl.color}22;border:3px solid ${lvl.color}">${lvl.icon}</div>
        <div style="flex:1;min-width:220px">
          <div class="row row-wrap" style="align-items:baseline">
            <h2 style="margin:0" style="color:${lvl.color}">${lvl.name}</h2>
            <span class="badge badge-secondary">Level ${gamification.levels.indexOf(lvl) + 1} / ${gamification.levels.length}</span>
          </div>
          <div class="progress mt-1" style="height:10px"><div class="progress-bar" style="width:${prog.pct}%"></div></div>
          <p class="text-muted fs-small">${xp} XP ${prog.next ? '· ' + (prog.next.xp - xp) + ' XP to ' + prog.next.name : '· Max level reached! 🎉'}</p>
        </div>
        <div style="min-width:150px" class="stat-inline">
          <div class="stat-value">${st.stats.lessonsCompleted}/${curriculum.topics.length}</div>
          <div class="stat-label">Lessons mastered</div>
        </div>
      </div>
    </section>

    <h2 class="section-title">Badges ${earned.length ? `<span class="badge badge-success">${earned.length}/${gamification.badges.length}</span>` : ''}</h2>
    <section class="grid grid-4">
      ${gamification.badges.map(b => {
        const has = st.badgesEarned[b.id];
        return `
          <div class="card ${has ? '' : 'card-muted'}" style="${has ? '' : 'opacity:.55'}">
            <div class="feed-icon" style="${has ? '' : 'filter:grayscale(1)'}">${b.icon}</div>
            <div class="fw-bold">${b.name}</div>
            <div class="text-muted fs-small">${b.desc}</div>
            <div class="fs-small">${has ? '✅ Earned ' + new Date(st.badgesEarned[b.id]).toLocaleDateString() : '🔒 Locked'}</div>
          </div>`;
      }).join('')}
    </section>

    <h2 class="section-title">Study Heatmap <span class="text-muted fs-small">last 12 weeks</span></h2>
    <section class="card">
      ${heat.html}
      <div class="row row-wrap fs-small text-muted mt-1">
        <div>Activity: <span class="badge badge-easy">low</span> <span class="badge badge-medium">mid</span> <span class="badge badge-hard">high</span></div>
        <div>🔥 Current streak: <strong>${st.stats.bestStreak} day${st.stats.bestStreak === 1 ? '' : 's'}</strong></div>
      </div>
    </section>

    <h2 class="section-title">Tools</h2>
    <div class="mode-grid">
      <button class="mode-card" onclick="location.hash='#/progress/flashcards'">
        <span class="mode-icon">🃏</span>
        <span class="mode-title">Flashcards</span>
        <span class="mode-desc">Spaced-repetition cards from errors and formulas.</span>
      </button>
      <button class="mode-card" onclick="location.hash='#/progress/planner'">
        <span class="mode-icon">📅</span>
        <span class="mode-title">Study Planner</span>
        <span class="mode-desc">Build a week-by-week plan to your target date.</span>
      </button>
      <button class="mode-card" onclick="exportBackup()">
        <span class="mode-icon">📤</span>
        <span class="mode-title">Export Backup</span>
        <span class="mode-desc">Download your full progress as JSON.</span>
      </button>
      <button class="mode-card" onclick="importFlow()">
        <span class="mode-icon">📥</span>
        <span class="mode-title">Import Backup</span>
        <span class="mode-desc">Restore progress from a backup file.</span>
      </button>
    </div>`;
}

function importFlow() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function () {
    if (input.files && input.files[0]) importBackup(input.files[0], function (ok) {
      if (ok) render();
    });
  };
  input.click();
}

/* ---------------------------------------------------------------------
   Heatmap builder (pure DOM grid - 12 weeks × 7 days)
   --------------------------------------------------------------------- */
function buildHeatmap(st) {
  const colors = ['#E3E8F0', '#C5CAE9', '#9FA8DA', '#5C6BC0', '#3949AB', '#1A237E'];
  let html = '<div class="heatmap" style="display:grid;grid-template-columns:repeat(auto-fit,14px);gap:3px;overflow-x:auto">';
  for (let day = 83; day >= 0; day--) {
    const key = dateKeyFromOffset(day);
    const d = st.stats.studyDays[key];
    const q = d ? d.questions : 0;
    let c = colors[0];
    if (q > 0) c = q < 3 ? colors[1] : q < 8 ? colors[2] : q < 15 ? colors[3] : q < 25 ? colors[4] : colors[5];
    html += `<div title="${key}: ${q} questions" style="width:13px;height:13px;border-radius:3px;background:${c}"></div>`;
  }
  html += '</div>';
  return { html: html };
}

/* Register routes (progress + subtools) */
App.register('progress', {
  title: 'Progress',
  menuKey: 'progress',
  render: function (el, args) {
    if (args && args[0] === 'flashcards') {
      if (typeof renderFlashcards === 'function') renderFlashcards(el);
      else el.innerHTML = '<div class="empty-state"><p>Flashcards module not loaded.</p></div>';
    } else if (args && args[0] === 'planner') {
      if (typeof renderPlanner === 'function') renderPlanner(el);
      else el.innerHTML = '<div class="empty-state"><p>Planner module not loaded.</p></div>';
    } else {
      renderProgress(el);
    }
  }
});

window.importFlow = importFlow;