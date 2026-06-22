/* HABITERM — app.js : boot, routing, toasts, chrome */
window.HT = window.HT || {};

HT.app = (function () {
  const U = HT.util, S = HT.store;

  const PANELS = {
    dash: () => HT.panels.dashboard,
    today: () => HT.panels.today,
    cal: () => HT.panels.calendar,
    day: () => HT.panels.day,
    rpt: () => HT.panels.report,
    grade: () => HT.panels.grade,
    res: () => HT.panels.research,
    hab: () => HT.panels.habit,
    form: () => HT.panels.form,
    set: () => HT.panels.settings,
    help: () => HT.panels.help,
    premium: () => HT.panels.premium
  };

  let route_ = { p: 'dash', arg: null };
  let msgTimer = null;
  let lastDay = null;

  function route() { return route_; }

  function navigate(p, arg) {
    if (!PANELS[p]) p = 'dash';
    route_ = { p: p, arg: arg == null ? null : arg };
    try {
      history.replaceState(null, '', '#' + p + (route_.arg ? '/' + encodeURIComponent(route_.arg) : ''));
    } catch (e) { /* file:// quirks — routing still works in memory */ }
    render();
  }

  function render() {
    document.querySelectorAll('.navchip, .navtab').forEach(b => {
      const pn = b.dataset.panel;
      const active = pn === route_.p ||
        (pn === 'cal' && route_.p === 'day') ||
        (pn === 'hab' && route_.p === 'form');
      b.classList.toggle('active', active);
    });
    const main = document.getElementById('main');
    main.scrollTop = 0;
    PANELS[route_.p]().render(main, route_.arg);
  }

  /* ---------- toast ---------- */
  function msg(text, kind) {
    const el = document.getElementById('msgline');
    el.textContent = text;
    el.className = kind || 'info';
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { el.className = 'hidden'; }, 4500);
  }

  /* ---------- onboarding ---------- */
  function emptyState(root) {
    root.innerHTML =
      '<div class="panel"><div class="panel-b"><div class="empty">' +
      '<div style="font-size:44px;margin-bottom:12px">🌱</div>' +
      '<div class="e-big">Welcome to Habiterm</div>' +
      '<div class="e-sub">You haven\'t added any habits yet.<br>' +
      'Start with your first habit, or load the demo to explore with sample data.</div>' +
      '<button class="btn btn-acc" data-cmd="ADD">Add your first habit</button>' +
      '<button class="btn" data-cmd="DEMO">Load demo data</button>' +
      '<div class="dim" style="margin-top:20px;font-size:12.5px">Tip: the search bar up top also takes commands — try <kbd>help</kbd></div>' +
      '</div></div></div>';
  }

  /* ---------- day rollover (re-render when a new day starts while open) ---------- */
  function rolloverTick() {
    const tk = S.todayKey();
    if (lastDay && tk !== lastDay) {
      msg('A new day begins — ' + U.longDate(tk), 'info');
      render();
    }
    lastDay = tk;
  }

  function applySettings() {
    const st = S.settings();
    /* dark mode + accents are Premium; choices stay saved and re-apply on upgrade */
    const pro = HT.premium.active();
    document.body.dataset.acc = pro ? (st.accent || 'violet') : 'violet';
    document.body.dataset.theme = (pro && st.theme === 'dark') ? 'dark' : 'light';
  }

  /* ---------- confetti for a perfect day ---------- */
  function celebrate() {
    if (document.getElementById('confetti')) return;
    const c = document.createElement('canvas');
    c.id = 'confetti';
    c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999';
    document.body.appendChild(c);
    c.width = innerWidth; c.height = innerHeight;
    const ctx = c.getContext('2d');
    const cols = S.COLORS;
    const P = [];
    for (let i = 0; i < 130; i++) {
      P.push({
        x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.35,
        vx: (Math.random() - .5) * 2.6, vy: 2.2 + Math.random() * 3.4,
        s: 4 + Math.random() * 5, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
        col: cols[i % cols.length]
      });
    }
    const t0 = performance.now();
    (function tick(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, c.width, c.height);
      P.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 1.9);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
        ctx.restore();
      });
      if (t < 1.9) requestAnimationFrame(tick); else c.remove();
    })(t0);
  }

  function onImport(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = S.importJSON(String(reader.result));
      if (res.ok) {
        applySettings();
        msg('Backup restored — ' + S.habits().length + ' habits.', 'ok');
        navigate('dash');
      } else {
        msg('Import failed: ' + res.error, 'err');
      }
    };
    reader.readAsText(f);
  }

  /* ---------- boot ---------- */
  function boot() {
    S.load();
    applySettings();
    HT.command.init();
    lastDay = S.todayKey();

    const hash = location.hash.replace(/^#/, '');
    if (hash) {
      const ix = hash.indexOf('/');
      const p = ix < 0 ? hash : hash.slice(0, ix);
      const arg = ix < 0 ? null : decodeURIComponent(hash.slice(ix + 1));
      if (PANELS[p]) route_ = { p: p, arg: arg };
    } else if (window.innerWidth <= 760) {
      route_ = { p: 'today', arg: null };   /* phones open to the daily checklist, not the dense home */
    }

    document.addEventListener('click', e => {
      const t = e.target.closest('[data-cmd]');
      if (t) { e.preventDefault(); HT.command.exec(t.dataset.cmd); }
    });
    document.getElementById('importfile').addEventListener('change', onImport);
    window.addEventListener('resize', U.debounce(render, 250));

    setInterval(rolloverTick, 5000);
    render();

    /* PWA: register the service worker for offline + installability (http/https only) */
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline is a bonus, not required */ });
    }
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { boot, navigate, render, msg, emptyState, applySettings, route, celebrate };
})();
