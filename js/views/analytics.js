/* =====================================================================
   GMAT 750+ Trainer - Analytics view
   Projected score, section performance, accuracy trend, topic breakdown,
   difficulty mix, and study-time history. Pure HTML/CSS charts - no
   external chart libraries required.
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   Small pure-DOM bar chart builder
   --------------------------------------------------------------------- */
function barChart(rows, opts) {
  // rows: [{label, value, color}]
  opts = opts || {};
  const max = Math.max(1, ...rows.map(r => r.value));
  return `
    <div class="chart" style="display:flex;align-items:flex-end;gap:6px;height:${opts.height || 140}px;padding-top:20px">
      ${rows.map(r => {
        const h = Math.max(2, Math.round(r.value / max * 100));
        return `<div class="chart-col" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end">
          <div style="font-size:.72rem;color:var(--color-muted)">${opts.showValue ? r.value : ''}</div>
          <div style="width:70%;background:${r.color || 'var(--color-primary)'};height:${h}%;border-radius:3px 3px 0 0;min-height:2px"></div>
          <div style="font-size:.7rem;color:var(--color-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${r.label}</div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ---------------------------------------------------------------------
   View
   --------------------------------------------------------------------- */
function renderAnalytics(el) {
  const st = loadState();
  const stats = st.stats;

  const proj = gamification.projectedTotalScore(stats);
  const attempts = stats.totalAnswered;
  const acc = attempts ? Math.round(stats.totalCorrect / attempts * 100) : 0;

  // Last 30 days question counts
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const key = dateKeyFromOffset(i);
    const d = stats.studyDays[key];
    days.push({ label: new Date(Date.now() - i * 86400000).getDate(), value: d ? d.questions : 0 });
  }
  const barData = days.slice(0, 14); // two weeks fits better

  // Accuracy trend: last ~10 practice sets
  const trend = [];
  const recent = stats.history.filter(h => h.text && h.text.indexOf('practice set') !== -1).slice(0, 10).reverse().map(h => {
    const m = h.text.match(/\((\d+)%\)/);
    return m ? +m[1] : 50;
  });
  trend.push({ value: acc });

  // Section accuracy
  const secColors = { quant: '#0D47A1', verbal: '#6A1B9A', dataInsights: '#FF6F00' };
  const secRows = ['quant', 'verbal', 'dataInsights'].map(k => {
    const s = stats.bySection[k];
    const a = s.attempts ? Math.round(s.correct / s.attempts * 100) : 0;
    return { label: SECTION_META[k].short, value: a, color: secColors[k] };
  });

  // Topic breakdown
  const topicRows = Object.keys(stats.byTopic)
    .filter(t => stats.byTopic[t].attempts > 0)
    .map(t => {
      const s = stats.byTopic[t];
      return { label: tipLabel(t), value: Math.round(s.correct / s.attempts * 100), color: 'var(--color-secondary)' };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Difficulty
  const diffRows = ['easy', 'medium', 'hard'].map(d => {
    const s = stats.byDifficulty[d];
    const a = s.attempts ? Math.round(s.correct / s.attempts * 100) : 0;
    return { label: d[0].toUpperCase() + d.slice(1), value: a, color: d === 'easy' ? '#2E7D32' : d === 'medium' ? '#FF6F00' : '#C62828' };
  });

  const trendLine = trendBarLine(trend, acc);

  el.innerHTML = `
    <div class="page-header">
      <h1>Analytics</h1>
      <p class="text-muted">Your performance at a glance — projected score, accuracy, and where to focus.</p>
    </div>

    <section class="grid grid-4">
      <div class="card card-hover">
        <div class="stat-value" style="color:var(--color-primary)">${proj}</div>
        <div class="stat-label">Projected GMAT Focus</div>
        <div class="text-muted fs-small">205–805 scale</div>
      </div>
      <div class="card card-hover">
        <div class="stat-value">${attempts}</div>
        <div class="stat-label">Questions answered</div>
      </div>
      <div class="card card-hover">
        <div class="stat-value">${acc}%</div>
        <div class="stat-label">Overall accuracy</div>
      </div>
      <div class="card card-hover">
        <div class="stat-value">${fmtDuration(stats.totalSeconds)}</div>
        <div class="stat-label">Time studied</div>
      </div>
    </section>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header"><h2 class="card-title">Section Accuracy</h2></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem">
          ${secRows.map(r => `
            <div class="text-center">
              <div class="stat-value">${r.value}%</div>
              <div class="stat-label">${r.label}</div>
              <div class="progress mt-1" style="height:6px"><div class="progress-bar success" style="width:${r.value}%"></div></div>
            </div>`).join('')}
        </div>
        <p class="text-muted fs-small mt-1">Section scores: Q ${stats.bySection.quant.attempts ? gamification.sectionScoreFromAccuracy(stats.bySection.quant.correct / stats.bySection.quant.attempts) : '—'} · V ${stats.bySection.verbal.attempts ? gamification.sectionScoreFromAccuracy(stats.bySection.verbal.correct / stats.bySection.verbal.attempts) : '—'} · DI ${stats.bySection.dataInsights.attempts ? gamification.sectionScoreFromAccuracy(stats.bySection.dataInsights.correct / stats.bySection.dataInsights.attempts) : '—'}</p>
      </div>
      <div class="card">
        <div class="card-header"><h2 class="card-title">Accuracy Trend <span class="text-muted fs-small">last 10 sets</span></h2></div>
        ${trendLine}
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header"><h2 class="card-title">Daily Volume <span class="text-muted fs-small">last 14 days</span></h2></div>
        ${barChart(barData, { height: 130, showValue: false })}
      </div>
      <div class="card">
        <div class="card-header"><h2 class="card-title">Accuracy by Difficulty</h2></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem">
          ${diffRows.map(r => `
            <div class="text-center">
              <div class="stat-value" style="color:${r.color}">${r.value}%</div>
              <div class="stat-label">${r.label}</div>
            </div>`).join('')}
        </div>
        <p class="text-muted fs-small mt-1">Aim for ≥70% on easy, ≥60% on medium, ≥45% on hard as you ramp up.</p>
      </div>
    </div>

    <section class="card">
      <div class="card-header"><h2 class="card-title">Topic Mastery</h2></div>
      ${topicRows.length ? barChart(topicRows, { height: 160, showValue: true }) : '<p class="text-muted">Answer questions to populate topic mastery.</p>'}
      ${weakTopicHint(topicRows)}
    </section>

    <section class="card">
      <div class="card-header"><h2 class="card-title">Study Insights</h2></div>
      <div class="grid grid-2">
        <div>
          <div class="feed-item"><span>🔥 Best streak</span><span class="fw-bold">${stats.bestStreak} day${stats.bestStreak === 1 ? '' : 's'}</span></div>
          <div class="feed-item"><span>🎯 Daily goals hit</span><span class="fw-bold">${stats.dailyGoalHits}</span></div>
          <div class="feed-item"><span>✨ Perfect sets (5+)</span><span class="fw-bold">${stats.perfectSets}</span></div>
        </div>
        <div>
          <div class="feed-item"><span>🗡️ Hard questions right</span><span class="fw-bold">${stats.hardCorrect}</span></div>
          <div class="feed-item"><span>🔍 Errors in log</span><span class="fw-bold">${stats.errorLogCount}</span></div>
          <div class="feed-item"><span>🏁 Simulators done</span><span class="fw-bold">${stats.simsCompleted}</span></div>
        </div>
      </div>
    </section>`;
}

function tipLabel(t) {
  const map = {
    arithmetic: 'Arithmetic', algebra: 'Algebra', wordproblems: 'Word Problems',
    numbers: 'Number Properties', stats: 'Statistics', rc: 'Reading Comp',
    cr: 'Critical Reasoning', ds: 'Data Sufficiency', ms: 'Multi-Source',
    ta: 'Table Analysis', gi: 'Graphics Interp', tp: 'Two-Part Analysis'
  };
  return map[t] || t;
}

function trendBarLine(values, cur) {
  const avg = values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
  return `
    <div class="row row-wrap" style="gap:.75rem;align-items:center">
      <div class="text-center">
        <div class="stat-value">${cur}%</div>
        <div class="stat-label">Latest</div>
      </div>
      <div class="progress" style="flex:1;min-width:140px"><div class="progress-bar" style="width:${Math.min(100, cur)}%"></div></div>
      <div class="badge badge-secondary">Avg ${avg}%</div>
    </div>
    <p class="text-muted fs-small mt-1">${trendNote(cur, avg)}</p>`;
}

function trendNote(cur, avg) {
  if (!avg) return 'Complete more sets to establish a trend line.';
  if (cur >= avg + 10) return '📈 Your recent accuracy is well above your average — keep the momentum!';
  if (cur < avg - 10) return '📉 Recent sets dipped below your average. Review the error log and refresh your weakest topic.';
  return 'Your accuracy is stable around your average. Drill weaknesses to push it higher.';
}

function weakTopicHint(rows) {
  const weak = rows[rows.length - 1];
  if (!weak) return '';
  const topicId = curriculum.topicKeyForQTopic(rows[rows.length - 1].label);
  const href = topicId ? '#/learn/' + topicId : '#/practice';
  return `<div class="clue-box mt-1" style="margin-top:1rem">
    <strong>Top priority:</strong> your lowest topic is <strong>${weak.label}</strong> at ${weak.value}%.
    <a href="${href}" style="color:var(--color-secondary)">Study it →</a>
  </div>`;
}

App.register('analytics', {
  title: 'Analytics',
  menuKey: 'analytics',
  render: renderAnalytics
});