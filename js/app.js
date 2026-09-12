/* =====================================================================
   GMAT 750+ Trainer - App bootstrap
   First-run onboarding, global keyboard shortcut, and startup touches.
   ===================================================================== */

'use strict';

(function () {

  /* ---------- First-run onboarding ---------- */
  function maybeShowOnboarding() {
    const done = localStorage.getItem('gmat750_onboarded');
    if (done) return;

    const st = loadState();
    const modal = openModal(`
      <h2 style="margin:0 0 .75rem;font-family:var(--font-heading)">Welcome to GMAT 750+ Trainer 🎯</h2>
      <p>Build your path to a top GMAT Focus score. Everything runs 100% in your browser.</p>
      <div class="field">
        <label for="obName">Your name</label>
        <input type="text" id="obName" value="${esc(st.user.name)}">
      </div>
      <div class="field">
        <label for="obTarget">Target score (205–805)</label>
        <input type="number" id="obTarget" min="205" max="805" step="10" value="705">
      </div>
      <div class="field">
        <label for="obDate">Target test date (optional)</label>
        <input type="date" id="obDate" value="">
      </div>
      <button class="btn btn-primary" id="obStart" style="width:100%">Let's go →</button>`);

    modal.querySelector('#obStart').addEventListener('click', function () {
      const name = modal.querySelector('#obName').value.trim() || 'GMAT Candidate';
      const target = Math.min(805, Math.max(205, parseInt(modal.querySelector('#obTarget').value, 10) || 705));
      const date = modal.querySelector('#obDate').value;
      updateState(s => {
        s.user.name = name;
        s.user.targetScore = target;
        s.user.targetDate = date || null;
      });
      localStorage.setItem('gmat750_onboarded', '1');
      closeModal();
      toast('Welcome, ' + name + '! Your journey to ' + target + ' starts now.', 'success');
      render();
    });
  }

  /* ---------- Global keyboard shortcut: '?' opens a quick-help modal ---------- */
  function helpModal() {
    openModal(`
      <h3 style="margin:0 0 .75rem">Quick Help</h3>
      <ul style="margin:0;padding-left:1.2rem;line-height:1.7">
        <li><strong>Diagnostic</strong> — a 16-question placement test that pins your recommended starting point.</li>
        <li><strong>Learn</strong> — ${(window.curriculum && curriculum.sections.reduce ? curriculum.sections.reduce((n, s) => n + s.topics.length, 0) : 22)} topics, zero→mastery, with TTP-style chapter tests (Easy → Medium → Hard).</li>
        <li><strong>Practice</strong> — ${(window.questionBank && questionBank.all ? questionBank.all.length : '300+')} questions in real GMAT Focus format, with spaced review (SM-2), adaptive sessions, error log + flagging.</li>
        <li><strong>Simulator</strong> — timed full exam (2h15m) or single sections, Focus Edition blueprint.</li>
        <li><strong>Analytics</strong> — projected score, section & topic accuracy.</li>
        <li><strong>Progress</strong> — XP, levels, badges, heatmap, backups.</li>
        <li>Your data lives in this browser (localStorage). Export backups from Progress.</li>
        <li><strong>Tip:</strong> answer in real exam timings; always review your error log.</li>
      </ul>
      <p class="text-muted fs-small mt-2" style="margin-bottom:0">GMAT 750+ Trainer v${(window.APP_VERSION || '1.0.0')} · data stays in this browser</p>`);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        e.preventDefault();
        helpModal();
      }
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    maybeShowOnboarding();
  });

  // If DOMContentLoaded already fired (defensive), run onboarding now.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    try { maybeShowOnboarding(); } catch (e) { /* ignore */ }
  }

})();