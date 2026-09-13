/* =====================================================================
   GMAT 750+ Trainer - Router & global App shell
   Hash-based routing, theme toggle, header stats, navigation state.
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   App singleton - mini pub/sub + route registry
   --------------------------------------------------------------------- */
const App = {
  routes: {},              // sample: 'dashboard': {title, render, menuKey}
  listeners: {},
  currentRoute: null,

  register(route, def) {
    this.routes[route] = def;
  },

  emit(evt, payload) {
    if (!this.listeners[evt]) return;
    this.listeners[evt].forEach(fn => {
      try { fn(payload); } catch (e) { console.error('listener error', e); }
    });
  },

  on(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
};

/* ---------------------------------------------------------------------
   Route parsing
   --------------------------------------------------------------------- */
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  const raw = h.split('/').filter(Boolean);
  // Allow a '?query' payload on any route (e.g. #/bank?section=quant).
  // It rides along as a trailing arg so existing positional args are untouched.
  const route = (raw[0] || 'dashboard').split('?')[0];
  const args = raw.slice(1);
  if (raw[0] && raw[0].indexOf('?') >= 0) {
    args.push(raw[0].slice(raw[0].indexOf('?')));
  }
  return {
    route: route,
    args: args
  };
}

/* ---------------------------------------------------------------------
   Core render entry point
   --------------------------------------------------------------------- */
function render() {
  const appEl = document.getElementById('app');
  const { route, args } = parseHash();
  const def = App.routes[route] || App.routes['dashboard'];

  // Mark active nav link
  document.querySelectorAll('.nav-link').forEach(a => {
    const key = a.getAttribute('data-route');
    a.classList.toggle('active', key === def.menuKey || key === route);
  });

  // Scroll to top on new route
  window.scrollTo(0, 0);

  // Header stats + theme refresh
  refreshHeaderStats();

  if (def && typeof def.render === 'function') {
    appEl.innerHTML = '';
    try {
      def.render(appEl, args);
    } catch (e) {
      console.error('Render error', e);
      appEl.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Something went wrong rendering this page.</p><p class="text-muted">' + esc(e.message) + '</p></div>';
    }
  }
  App.currentRoute = route;
}

/* ---------------------------------------------------------------------
   Header stats: level, target score, streak
   --------------------------------------------------------------------- */
function refreshHeaderStats() {
  const st = loadState();
  const el = document.getElementById('headerStats');
  if (!el) return;
  const lvl = gamification.levelForXp(st.xp);
  const streak = st.stats.bestStreak || 0;
  el.innerHTML =
    '<span class="header-stat" title="Level">' + lvl.icon + ' ' + esc(lvl.name) +
    ' · Lv.' + (gamification.levels.indexOf(lvl) + 1) + '</span>' +
    '<span class="header-stat" title="Target score">🎯 ' + (st.user.targetScore || 705) + '</span>' +
    '<span class="header-stat" title="Best streak">🔥 ' + streak + (streak === 1 ? ' day' : ' days') + '</span>';
}

/* ---------------------------------------------------------------------
   Theme toggle (persisted)
   --------------------------------------------------------------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  const st = loadState();
  applyTheme(st.settings.theme || 'light');
  btn.addEventListener('click', function () {
    updateState(s => {
      s.settings.theme = s.settings.theme === 'dark' ? 'light' : 'dark';
      applyTheme(s.settings.theme);
    });
  });
}

/* ---------------------------------------------------------------------
   Hamburger menu (mobile)
   --------------------------------------------------------------------- */
function initHamburger() {
  const ham = document.getElementById('hamburger');
  const nav = document.getElementById('mainNav');
  ham.addEventListener('click', function () {
    const open = nav.classList.toggle('open');
    ham.classList.toggle('open', open);
    ham.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // Close when a link is clicked
  nav.addEventListener('click', function (e) {
    if (e.target.classList.contains('nav-link')) {
      nav.classList.remove('open');
      ham.classList.remove('open');
    }
  });
}

/* ---------------------------------------------------------------------
   Wire up everything on DOMContentLoaded
   --------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  initThemeToggle();
  initHamburger();

  // Listen for hash changes
  window.addEventListener('hashchange', render);

  // State-change linkage: refresh header/nav/badges
  App.on('state', function () {
    refreshHeaderStats();
    checkBadges();
  });

  // Initial render
  render();
});

window.App = App;
window.render = render;
window.parseHash = parseHash;