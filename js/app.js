/* HABITERM — app.js : boot, routing, ticker tape, status bar, chrome */
window.HT = window.HT || {};

HT.app = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics;

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
    help: () => HT.panels.help
  };

  let route_ = { p: 'dash', arg: null };
  let tickerSig = '';
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
    document.querySelectorAll('.navchip').forEach(b => {
      const pn = b.dataset.panel;
      const active = pn === route_.p ||
        (pn === 'cal' && route_.p === 'day') ||
        (pn === 'hab' && route_.p === 'form');
      b.classList.toggle('active', active);
    });
    const main = document.getElementById('main');
    main.scrollTop = 0;
    PANELS[route_.p]().render(main, route_.arg);
    buildTicker();
    statusLeft();
  }

  /* ---------- message line ---------- */
  function msg(text, kind) {
    const el = document.getElementById('msgline');
    el.textContent = '» ' + text;
    el.className = kind || 'info';
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { el.className = 'hidden'; }, 4500);
  }

  /* ---------- onboarding ---------- */
  function emptyState(root) {
    root.innerHTML =
      '<div class="panel"><div class="panel-h"><span>NO SECURITIES LISTED</span></div>' +
      '<div class="panel-b"><div class="empty">' +
      '<div class="e-big">▮▮ WELCOME TO HABITERM</div>' +
      '<div class="e-sub">YOUR PERSONAL HABIT EXCHANGE IS EMPTY.<br>' +
      'LIST YOUR FIRST HABIT, OR LOAD THE DEMO PORTFOLIO TO SEE THE TERMINAL AT FULL TILT.</div>' +
      '<button class="btn btn-acc" data-cmd="DEMO">LOAD DEMO PORTFOLIO</button>' +
      '<button class="btn" data-cmd="ADD">LIST FIRST HABIT</button>' +
      '<div class="dim" style="margin-top:18px;font-size:11px">OR TYPE <kbd>ADD</kbd> IN THE COMMAND LINE AND HIT ENTER — <kbd>HELP</kbd> FOR EVERYTHING ELSE</div>' +
      '</div></div></div>';
  }

  /* ---------- ticker tape ---------- */
  function buildTicker() {
    const track = document.getElementById('ticker-track');
    const hs = S.habits();
    const parts = [];
    if (hs.length) {
      const hx = M.habixSeries(8);
      if (hx.length) {
        const last = hx[hx.length - 1].p;
        const prev = hx.length > 1 ? hx[hx.length - 2].p : last;
        const d1 = prev ? (last - prev) / prev * 100 : 0;
        parts.push({ cmd: 'RPT', html: '<span class="tk-sym">HABIX</span> <span class="num">' + last.toFixed(2) + '</span> <span class="' + U.udClass(d1) + ' num">' + U.arrow(d1) + U.signed(d1, 2, '%') + '</span>' });
      }
      hs.forEach(h => {
        const p = M.price(h), d = M.priceDelta(h, 1), st = M.streak(h);
        parts.push({
          cmd: 'HAB ' + h.ticker,
          html: '<span class="tk-sym">' + U.esc(h.ticker) + '</span> <span class="num">' + p.toFixed(2) + '</span> ' +
            '<span class="' + U.udClass(d) + ' num">' + U.arrow(d) + U.signed(d, 1, '%') + '</span>' +
            (st >= 3 ? ' <span class="acc num">' + st + 'D</span>' : '')
        });
      });
      const gpa = M.gpa();
      if (gpa != null) parts.push({ cmd: 'GRADE', html: '<span class="tk-sym">GPA</span> <span class="num">' + gpa.toFixed(2) + '</span>' });
    } else {
      parts.push({ cmd: 'ADD', html: '<span class="dim">NO SECURITIES LISTED — TYPE ADD &lt;GO&gt; TO BEGIN TRADING</span>' });
    }

    const sig = JSON.stringify(parts);
    if (sig === tickerSig) return;   /* don't restart the scroll for nothing */
    tickerSig = sig;
    const one = parts.map(p =>
      '<span class="tk-item" data-cmd="' + U.esc(p.cmd) + '" style="cursor:pointer">' + p.html + '</span><span class="tk-sep">◆</span>'
    ).join('');
    track.innerHTML = one + one;
    track.style.animationDuration = Math.max(30, Math.min(150, parts.length * 8)) + 's';
  }

  /* ---------- status bar ---------- */
  function statusLeft() {
    const hs = S.habits();
    const dc = hs.length ? M.dayCompletion(S.todayKey()) : { filled: 0, due: 0 };
    document.getElementById('sb-left').innerHTML =
      '<span><span class="live-dot">●</span> LIVE · LOCAL</span>' +
      '<span class="num">' + hs.length + ' SEC</span>' +
      '<span class="num">FILLS ' + dc.filled + '/' + dc.due + '</span>';
  }

  function sessionCloseMs() {
    const h = S.settings().dayStartHour || 0;
    const now = new Date();
    const t = new Date(now);
    t.setHours(h, 0, 0, 0);
    if (t <= now) t.setDate(t.getDate() + 1);
    return t - now;
  }

  function clockTick() {
    const now = new Date();
    const ms = sessionCloseMs();
    const ch = Math.floor(ms / 3600000), cm = Math.floor((ms % 3600000) / 60000), cs = Math.floor((ms % 60000) / 1000);
    document.getElementById('sb-right').innerHTML =
      '<span class="dim num">SESSION CLOSE −' + U.pad2(ch) + ':' + U.pad2(cm) + ':' + U.pad2(cs) + '</span>' +
      '<span class="acc num">' + U.pad2(now.getHours()) + ':' + U.pad2(now.getMinutes()) + ':' + U.pad2(now.getSeconds()) + '</span>' +
      '<span class="num">' + U.longDate(U.keyFromDate(now)) + '</span>';

    /* day rollover while the terminal is open */
    const tk = S.todayKey();
    if (lastDay && tk !== lastDay) {
      msg('NEW SESSION OPEN — ' + U.longDate(tk), 'info');
      render();
    }
    lastDay = tk;
  }

  function applySettings() {
    const st = S.settings();
    document.body.dataset.acc = st.accent || 'amber';
    document.body.classList.toggle('scanlines', st.scanlines !== false);
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
        msg('PORTFOLIO RESTORED — ' + S.habits().length + ' SECURITIES.', 'ok');
        navigate('dash');
      } else {
        msg('IMPORT REJECTED: ' + res.error, 'err');
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
    }

    document.addEventListener('click', e => {
      const t = e.target.closest('[data-cmd]');
      if (t) { e.preventDefault(); HT.command.exec(t.dataset.cmd); }
    });
    document.getElementById('importfile').addEventListener('change', onImport);
    window.addEventListener('resize', U.debounce(render, 250));

    document.getElementById('sb-mid').textContent =
      'F1 DASH · F2 TODAY · F3 CAL · F4 RPT · F6 GRADE · F7 RES · F8 HAB · "/" COMMAND LINE · HABITERM v1.0';

    setInterval(clockTick, 1000);
    clockTick();
    render();
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { boot, navigate, render, msg, emptyState, applySettings, route };
})();
