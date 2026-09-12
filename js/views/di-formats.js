/* =====================================================================
   GMAT 750+ Trainer - Data Insights format widgets
   Renders the real GMAT Focus DI stem types that aren't plain
   multiple choice: Two-Part Analysis, Table Analysis (sortable rows
   with per-row Yes/No), Graphics Interpretation (inline SVG chart), and
   Multi-Source Reasoning (tabbed source panes). Plain MC stays on the
   caller's normal option buttons.

   Data model (question `format` field):
     'mc'        default — caller renders 5 options
     'twopart'   q.twopart = {left:{prompt,options,correct}, right:{...}}
     'table'     q.table   = {headers, rows[], statement, correct:{rowIdx:bool}}
     'graphics'  q.graphics= {type:'bar'|'line', title, unit, categories, series:[{name,values}]}, plus q.options/q.correct
     'msr'       q.msr     = {tabs:[{title,text}]}, plus q.options/q.correct
   ===================================================================== */

'use strict';

const DI_TABLE_STATE = {}; // questionId -> {sortedIdx: [], rowChoice: {}} (reset per render)

/* ---------------------------------------------------------------------
   Scaffold: HTML inserted above the question text
   --------------------------------------------------------------------- */
function diScaffold(q) {
  if (q.format === 'graphics') return `<div class="di-graphics" style="margin-bottom:1rem">${diGraphicsSvg(q.graphics)}</div>`;
  if (q.format === 'msr') {
    const tabs = (q.msr && q.msr.tabs) || [];
    DI_MSR_STATE[q.id] = DI_MSR_STATE[q.id] || 0;
    return `<div class="di-msr" style="margin-bottom:1rem">
      <div class="di-msr-tabs row" style="gap:.4rem;flex-wrap:wrap">${tabs.map((t, i) => `<button class="btn btn-sm ${(DI_MSR_STATE[q.id] || 0) === i ? 'btn-primary' : 'btn-outline'}" type="button" data-msr-tab="${i}">${esc(t.title)}</button>`).join('')}</div>
      <div class="clue-box" style="margin-top:.55rem;white-space:pre-line">${esc(tabs[(DI_MSR_STATE[q.id] || 0)] ? tabs[(DI_MSR_STATE[q.id] || 0)].text : '')}</div>
    </div>`;
  }
  return '';
}

const DI_MSR_STATE = {};

function diGraphicsSvg(g) {
  const W = 420, H = 240;
  const padL = 46, padB = 34, padT = 14, padR = 12;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const cats = g.categories || [];
  const series = g.series || [{ name: '', values: [] }];
  const maxVal = Math.max.apply(null, series.map(s => Math.max.apply(null, s.values || [0]))) || 1;
  const step = maxVal <= 4 ? 1 : maxVal <= 10 ? 2 : maxVal <= 25 ? 5 : maxVal <= 100 ? 20 : maxVal <= 500 ? 100 : maxVal <= 2000 ? 500 : 1000;
  const top = Math.ceil(maxVal / step) * step;
  const yticks = [];
  for (let v = 0; v <= top; v += step) yticks.push(v);
  const yAt = v => padT + innerH - (v / top) * innerH;

  if (g.type === 'line') {
    const pts = series.map(s => {
      const xs = (s.values || []).map((v, i) => padL + (cats.length > 1 ? i * (innerW / (cats.length - 1)) : 0));
      const ys = (s.values || []).map(v => yAt(v));
      return { name: s.name, line: xs.map((x, i) => x + ',' + ys[i]).join(' ') };
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px" role="img" aria-label="${esc(g.title || 'Chart')}">
      ${yticks.map(v => `<text x="${padL - 6}" y="${yAt(v) + 4}" font-size="11" fill="#888" text-anchor="end">${v}</text><line x1="${padL}" y1="${yAt(v)}" x2="${W - padR}" y2="${yAt(v)}" stroke="#ddd" stroke-width="1" stroke-dasharray="2 4"/>`).join('')}
      ${pts.map((p, si) => `<polyline points="${p.line}" fill="none" stroke="${diChartColor(si)}" stroke-width="2.5"/><circle cx="${padL}" cy="${yAt((series[si].values || [])[0])}" r="0"/>`).join('')}
      ${cats.map((c, i) => `<text x="${padL + i * innerW / (Math.max(1, cats.length - 1))}" y="${H - 16}" font-size="11" fill="#888" text-anchor="middle">${esc(String(c))}</text>`).join('')}
      <text x="${padL}" y="${14}" font-size="12" font-weight="700" fill="#444">${esc(g.title || '')}</text>
    </svg>`;
  }

  // bar chart
  const groupW = cats.length ? innerW / cats.length : 0;
  const barW = Math.min(28, (groupW * 0.62) / series.length);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px" role="img" aria-label="${esc(g.title || 'Chart')}">
    ${yticks.map(v => `<text x="${padL - 6}" y="${yAt(v) + 4}" font-size="11" fill="#888" text-anchor="end">${v}</text><line x1="${padL}" y1="${yAt(v)}" x2="${W - padR}" y2="${yAt(v)}" stroke="#ddd" stroke-width="1" stroke-dasharray="2 4"/>`).join('')}
    ${cats.map((c, ci) => series.map((s, si) => {
      const x = padL + ci * groupW + groupW / 2 - (series.length * barW) / 2 + si * barW;
      const val = (s.values || [])[ci] || 0;
      const y = yAt(val);
      return `<rect x="${x}" y="${y}" width="${barW - 2}" height="${Math.max(1, padT + innerH - y)}" fill="${diChartColor(si)}"/><text x="${x + barW / 2 - 1}" y="${y - 4}" font-size="10" fill="#666" text-anchor="middle">${val}</text>`;
    }).join('')).join('')}
    ${cats.map((c, ci) => `<text x="${padL + ci * groupW + groupW / 2}" y="${H - 16}" font-size="11" fill="#888" text-anchor="middle">${esc(String(c))}</text>`).join('')}
    <text x="${padL}" y="${14}" font-size="12" font-weight="700" fill="#444">${esc(g.title || '')}</text>
  </svg>`;
}

function diChartColor(si) {
  return ['#4f7cff', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'][si % 5];
}

/* ---------------------------------------------------------------------
   Answer-area HTML for structured (non-MC) formats. The caller replaces
   its #options box with this, then calls bindAnswerArea().
   --------------------------------------------------------------------- */
function diAnswerAreaHtml(q) {
  if (q.format === 'twopart') {
    const L = q.twopart.left, R = q.twopart.right;
    return `<div class="di-answer" style="margin:1rem 0">
      <div class="di-col" style="margin-bottom:1rem">
        <div class="di-col-label">${esc(L.prompt || 'Column 1')}</div>
        <select class="di-select" data-col="left">
          <option value="">Select…</option>
          ${L.options.map((o, i) => `<option value="${i}">${esc(o)}</option>`).join('')}
        </select>
      </div>
      <div class="di-col" style="margin-bottom:1rem">
        <div class="di-col-label">${esc(R.prompt || 'Column 2')}</div>
        <select class="di-select" data-col="right">
          <option value="">Select…</option>
          ${R.options.map((o, i) => `<option value="${i}">${esc(o)}</option>`).join('')}
        </select>
      </div>
      <div class="row" style="align-items:center;gap:.75rem">
        <button class="btn btn-primary" data-di-commit type="button" disabled>Submit</button>
        <span class="text-muted fs-small">Select one option in each column. The columns are independent.</span>
      </div>
    </div>`;
  }

  if (q.format === 'table') {
    const st = DI_TABLE_STATE[q.id] || { sortedIdx: (q.table.rows || []).map((r, i) => i), rowChoice: {} };
    DI_TABLE_STATE[q.id] = st;
    return `<div class="di-answer" style="margin:1rem 0">
      <div class="di-table-wrap" style="overflow-x:auto">
        <table class="di-table">
          <thead><tr>
            ${q.table.headers.map((h, hi) => `<th>${esc(h)} <button class="btn btn-sm btn-ghost" type="button" data-table-sort="${hi}" title="Sort by this column">⇅</button></th>`).join('')}
            <th>Choose</th>
          </tr></thead>
          <tbody>
            ${st.sortedIdx.map(ri => `
              <tr data-row="${ri}">
                ${q.table.rows[ri].map(c => `<td>${esc(String(c))}</td>`).join('')}
                <td>
                  <label class="di-yesno"><input type="radio" name="dirow-${q.id}-${ri}" value="true" data-yesno="${ri}" ${st.rowChoice[ri] === true ? 'checked' : ''}> Yes</label>
                  <label class="di-yesno"><input type="radio" name="dirow-${q.id}-${ri}" value="false" data-yesno="${ri}" ${st.rowChoice[ri] === false ? 'checked' : ''}> No</label>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="row" style="align-items:center;gap:.75rem;margin-top:.75rem">
        <button class="btn btn-primary" data-di-commit type="button" disabled>Submit</button>
        <span class="text-muted fs-small">Select Yes or No for each row of the table.</span>
      </div>
    </div>`;
  }
  return '';
}

/* ---------------------------------------------------------------------
   Binding
   --------------------------------------------------------------------- */
function diBindAnswerArea(el, q, onCommit) {
  if (q.format === 'twopart') {
    const sel = el.querySelectorAll('.di-select');
    const commitBtn = el.querySelector('[data-di-commit]');
    const values = { left: null, right: null };
    const refresh = () => { commitBtn.disabled = values.left === null || values.right === null; };
    sel.forEach(s => {
      s.addEventListener('change', function () {
        const v = this.value === '' ? null : +this.value;
        values[this.getAttribute('data-col')] = v;
        refresh();
        if (values.left !== null && values.right !== null) playSound('select');
      });
    });
    commitBtn.addEventListener('click', function () {
      if (values.left !== null && values.right !== null) onCommit({ left: values.left, right: values.right });
    });
  }

  if (q.format === 'table') {
    const st = DI_TABLE_STATE[q.id];
    const radios = el.querySelectorAll('[data-yesno]');
    const commitBtn = el.querySelector('[data-di-commit]');
    radios.forEach(r => {
      r.addEventListener('change', function () {
        st.rowChoice[+this.getAttribute('data-yesno')] = this.value === 'true';
        const all = (q.table.rows || []).every((row, ri) => st.rowChoice[ri] !== undefined);
        commitBtn.disabled = !all;
        if (all) playSound('select');
      });
    });
    commitBtn.addEventListener('click', function () {
      const all = (q.table.rows || []).every((row, ri) => st.rowChoice[ri] !== undefined);
      if (all) onCommit(Object.assign({}, st.rowChoice));
    });
    el.querySelectorAll('[data-table-sort]').forEach(btn => {
      btn.addEventListener('click', function () {
        const col = +this.getAttribute('data-table-sort');
        const dir = (st.sortCol === col ? !st.sortDir : true);
        const idx = (q.table.rows || []).map((r, i) => i);
        idx.sort((a, b) => {
          const A = String(q.table.rows[a][col]), B = String(q.table.rows[b][col]);
          const na = parseFloat(A), nb = parseFloat(B);
          const cmp = (!isNaN(na) && !isNaN(nb)) ? na - nb : A.localeCompare(B);
          return dir ? cmp : -cmp;
        });
        st.sortedIdx = idx; st.sortCol = col; st.sortDir = dir;
        // re-render just the widget to keep scroll position sane
        const box = el.querySelector('.di-answer');
        if (box) { box.outerHTML = diAnswerAreaHtml(q); diBindAnswerArea(el, q, onCommit); }
      });
    });
  }

  // MSR tab switching (works in both MC-mode and standalone)
  el.querySelectorAll('[data-msr-tab]').forEach(tab => {
    tab.addEventListener('click', function () {
      DI_MSR_STATE[q.id] = +this.getAttribute('data-msr-tab');
      const pane = el.querySelector('.di-msr .clue-box');
      if (pane && q.msr) pane.textContent = q.msr.tabs[DI_MSR_STATE[q.id]].text;
      el.querySelectorAll('[data-msr-tab]').forEach(b => b.classList.toggle('btn-primary', b === this));
      el.querySelectorAll('[data-msr-tab]').forEach(b => b.classList.toggle('btn-outline', b !== this));
      playSound('select');
    });
  });
}

/** Bind MSR tab buttons on the element CONTAINING the .di-msr widget.
    (The scaffold is rendered above the options box, so answer-area binding
    alone cannot reach the pane.) */
function diBindMsr(el, q) {
  if (!el || !q || q.format !== 'msr' || !q.msr) return;
  el.querySelectorAll('[data-msr-tab]').forEach(tab => {
    tab.addEventListener('click', function () {
      DI_MSR_STATE[q.id] = +this.getAttribute('data-msr-tab');
      const pane = el.querySelector('.di-msr .clue-box');
      if (pane) pane.textContent = q.msr.tabs[DI_MSR_STATE[q.id]].text;
      el.querySelectorAll('[data-msr-tab]').forEach(b => b.classList.toggle('btn-primary', b === this));
      el.querySelectorAll('[data-msr-tab]').forEach(b => b.classList.toggle('btn-outline', b !== this));
      playSound('select');
    });
  });
}

window.diScaffold = diScaffold;
window.diAnswerAreaHtml = diAnswerAreaHtml;
window.diBindAnswerArea = diBindAnswerArea;
window.diBindMsr = diBindMsr;
window.diIsStructured = diIsStructured;