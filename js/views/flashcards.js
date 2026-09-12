/* =====================================================================
   GMAT 750+ Trainer - Flashcards view
   Spaced-repetition cards. Default deck built from errors + key formulas;
   users can add custom cards.
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   Build the default deck from errors + core formulas
   --------------------------------------------------------------------- */
function buildDefaultDeck() {
  const st = loadState();
  const deck = [];

  // Formula cards (one per product)
  ['quant-pct', 'quant-alg', 'quant-statprob', 'quant-numprops', 'di-twopart'].forEach(pid => {
    const t = curriculum.topics.find(x => x.id === pid);
    if (t && t.formulas) t.formulas.forEach(f => {
      if (deck.length < 60) deck.push({ front: f.term, back: f.def, source: 'formula', topic: t.name });
    });
  });

  // Error cards (question text → why you missed it)
  st.practice.errorLog.slice(0, 40).forEach(e => {
    const q = questionBank.byId[e.questionId];
    if (!q) return;
    const why = q.explanation || 'No explanation stored';
    deck.push({ front: q.text.slice(0, 140), back: why.slice(0, 220), source: 'error', topic: topicTagName(q.topic) });
  });

  return deck;
}

function topicTagName(t) {
  const map = { arithmetic: 'Arithmetic', algebra: 'Algebra', wordproblems: 'Word Problems', numbers: 'Number Properties', stats: 'Statistics', rc: 'Reading Comp', cr: 'Critical Reasoning', ds: 'Data Sufficiency', ms: 'Multi-Source', ta: 'Table Analysis', gi: 'Graphics Interpretation', tp: 'Two-Part Analysis' };
  return map[t] || t;
}

/* ---------------------------------------------------------------------
   Render
   --------------------------------------------------------------------- */
function renderFlashcards(el) {
  const st = loadState();
  let deck = st.flashcards.length ? st.flashcards : buildDefaultDeck();
  const dueCount = flashcardDueCount();

  if (!deck.length) {
    el.innerHTML = `<div class="page-header"><h1>🃏 Flashcards</h1></div>
      <div class="empty-state"><p>No flashcards yet. Practice more or add cards below — flashcards build automatically from your error log.</p></div>`;
    addCardForm(el);
    return;
  }

  el.innerHTML = `
    <div class="page-header">
      <h1>🃏 Flashcards <span class="badge badge-secondary">${deck.length}</span></h1>
      <p class="text-muted">Spaced-repetition cards on an SM-2 schedule — rate each card Again / Good / Easy and the app spaces your reviews for long-term recall.</p>
    </div>
    <div class="row" style="gap:.75rem;margin-bottom:1rem">
      <button class="btn btn-primary" onclick="startFlashSession()">Start review session ${dueCount ? `<span class="badge badge-primary">${dueCount} due</span>` : ''}</button>
      <button class="btn btn-outline" onclick="showCardAdder()">Add a card</button>
      <button class="btn btn-ghost" onclick="resetFlashcards()">Recreate from errors</button>
    </div>
    <h2 class="section-title">Deck Preview</h2>
    <section class="grid grid-3">
      ${deck.slice(0, 24).map((c, i) => flashPreview(c, i)).join('')}
    </section>`;
}

function flashPreview(c, i) {
  return `
    <div class="card" style="cursor:pointer" onclick="location.hash='#/progress/flashcards'">
      <div class="fw-bold fs-small" style="margin-bottom:.4rem">${esc(c.front.slice(0, 90))}${c.front.length > 90 ? '…' : ''}</div>
      <div class="text-muted fs-small">${esc(c.back.slice(0, 90))}${c.back.length > 90 ? '…' : ''}</div>
      <div class="fs-small mt-1">${c.topic ? '<span class="badge badge-ghost">' + esc(c.topic) + '</span>' : ''}</div>
    </div>`;
}

/* ---------------------------------------------------------------------
   Review session (flip-card interface)
   --------------------------------------------------------------------- */
let flashState = null; // {order: [], idx, correct, total, deck}

/** Session order: due cards first (by due date), then never-reviewed new cards, then the rest. */
function sessionCardOrder(deck) {
  const now = Date.now();
  const isDue = c => (c.due === undefined || c.due === 0 || c.due === null) ? true : c.due <= now;
  const score = c => isDue(c) ? 0 : 1;
  return shuffleIdx(deck.length)
    .sort((a, b) => {
      const s = score(deck[a]) - score(deck[b]);
      if (s !== 0) return s;
      const da = (deck[a].due || 0);
      const db = (deck[b].due || 0);
      return da - db;
    });
}

function startFlashSession() {
  const st = loadState();
  let deck = st.flashcards.length ? st.flashcards : buildDefaultDeck();
  if (!deck.length) { toast('No flashcards to review.', 'error'); return; }
  // Persist the working deck so SM-2 scheduling sticks even on first use.
  if (!st.flashcards.length) {
    updateState(s => { s.flashcards = deck; });
  } else {
    deck = loadState().flashcards;
  }
  flashState = { order: sessionCardOrder(deck), idx: 0, correct: 0, total: Math.min(deck.length, 30), deck: deck };
  flashcardView();
}

function shuffleIdx(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function flashcardView() {
  const el = document.getElementById('app');
  if (flashState.idx >= flashState.total) {
    updateState(st2 => { st2.stats.cardsReviewed += flashState.total; });
    el.innerHTML = `
      <div class="lesson-container text-center">
        <div class="stat-display" style="font-size:3rem">🎉</div>
        <h1>Session Complete</h1>
        <div class="stat-value">${flashState.correct}/${flashState.total} recalled instantly</div>
        <div class="row" style="justify-content:center;margin-top:1rem;gap:.75rem">
          <button class="btn btn-primary" onclick="startFlashSession()">Review again</button>
          <button class="btn btn-outline" onclick="location.hash='#/progress/flashcards'">Back to deck</button>
        </div>
      </div>`;
    flashState = null;
    return;
  }
  const c = flashState.deck[flashState.order[flashState.idx]];
  el.innerHTML = `
    <div class="lesson-container">
      <div class="question-topbar">
        <span class="badge badge-secondary">Card ${flashState.idx + 1} / ${flashState.total}</span>
        <span class="badge badge-ghost">${flashState.correct} correct so far</span>
      </div>
      <div class="card flash-card" style="padding:2rem;min-height:220px;text-align:center;cursor:pointer" onclick="flipFlash()">
        <div class="text-muted fs-small mb-1" style="margin-bottom:.5rem">${esc(c.topic || 'Flashcard')}</div>
        <div id="flashFace" style="font-size:1.15rem;line-height:1.5">${esc(c.front)}</div>
        <div class="text-muted fs-small mt-2" style="margin-top:1rem" id="flashHint">Tap to flip</div>
      </div>
      <div id="flashActions" class="row" style="justify-content:center;margin-top:1rem;display:none">
        <button class="btn btn-outline" onclick="flashGrade(0)">🔄 Again</button>
        <button class="btn btn-primary" onclick="flashGrade(1)">✓ Good</button>
        <button class="btn btn-ghost" onclick="flashGrade(2)">⏩ Easy</button>
      </div>
    </div>`;
}

function flipFlash() {
  const el = document.getElementById('app');
  const c = flashState.deck[flashState.order[flashState.idx]];
  const face = el.querySelector('#flashFace');
  const hint = el.querySelector('#flashHint');
  if (face.textContent === c.front) {
    face.textContent = c.back || 'No back content.';
    hint.textContent = '·';
  } else {
    face.textContent = c.front;
    hint.textContent = 'Tap to flip';
  }
  el.querySelector('#flashActions').style.display = 'flex';
}

/** grade: 0 = again, 1 = good, 2 = easy (SM-2). Persists the schedule to state. */
function flashGrade(grade) {
  const el = document.getElementById('app');
  if (!flashState) return;
  const card = flashState.deck[flashState.order[flashState.idx]];
  const xp = flashcardSchedule(card, grade); // mutates card, returns xp value
  if (xp > 0) flashState.correct += 1;
  const cardSnapshot = JSON.parse(JSON.stringify(card));
  updateState(st => {
    st.stats.cardsReviewed += 1;
    if (!st.flashcards.length) st.flashcards = flashState.deck;
    const target = st.flashcards.find(c => c && c.front === cardSnapshot.front && c.back === cardSnapshot.back);
    if (target) {
      ['ef', 'reps', 'streak', 'lapses', 'interval', 'reviews', 'due'].forEach(k => { if (cardSnapshot[k] !== undefined) target[k] = cardSnapshot[k]; });
    }
    st._flashInRun = (st._flashInRun || 0) + 1;
  });
  flashState.idx += 1;
  if (flashState.idx >= flashState.total) {
    updateState(st => { st.xp += flashState.correct * gamification.xpRules.flashcardReview; });
    checkBadges();
  }
  flashcardView();
}

/* ---------------------------------------------------------------------
   Add / reset cards
   --------------------------------------------------------------------- */
function showCardAdder() {
  const modal = openModal(`
    <div class="field">
      <label for="fcFront">Front (prompt)</label>
      <textarea id="fcFront" rows="2"></textarea>
    </div>
    <div class="field">
      <label for="fcBack">Back (answer)</label>
      <textarea id="fcBack" rows="2"></textarea>
    </div>
    <div class="field">
      <label for="fcTopic">Topic (optional)</label>
      <input type="text" id="fcTopic" placeholder="e.g., Percentages">
    </div>
    <div class="row">
      <button class="btn btn-primary" id="fcSave">Add card</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
  modal.querySelector('#fcSave').addEventListener('click', function () {
    const front = modal.querySelector('#fcFront').value.trim();
    const back = modal.querySelector('#fcBack').value.trim();
    if (!front || !back) { toast('Both sides are required.', 'error'); return; }
    updateState(st => {
      st.flashcards.push({ front: front, back: back, topic: modal.querySelector('#fcTopic').value.trim() || 'Custom' });
    });
    closeModal();
    toast('Card added.', 'success');
    render();
  });
}

function addCardForm(el) {
  const form = document.createElement('div');
  form.className = 'card';
  form.innerHTML = `
    <div class="card-header"><h2 class="card-title">Add a card</h2></div>
    <button class="btn btn-outline" onclick="showCardAdder()">Add a card</button>`;
  el.appendChild(form);
}

function resetFlashcards() {
  updateState(st => { st.flashcards = []; });
  toast('Deck rebuilt from your error log and formulas.', 'success');
  render();
}

window.renderFlashcards = renderFlashcards;
window.startFlashSession = startFlashSession;
window.flipFlash = flipFlash;
window.flashGrade = flashGrade;
window.showCardAdder = showCardAdder;
window.resetFlashcards = resetFlashcards;