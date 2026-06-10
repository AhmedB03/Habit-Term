/* HABITERM — command.js : the command line — parser, palette, keyboard */
window.HT = window.HT || {};

HT.command = (function () {
  const U = HT.util, S = HT.store;
  let hist = [], hi = -1;
  let palItems = [], palIdx = -1;

  const CMDS = [
    { c: 'DASH', d: 'Dashboard — index, alerts, movers, intel', run: () => HT.app.navigate('dash') },
    { c: 'TODAY', d: "Today's book — fill your orders", run: () => HT.app.navigate('today') },
    { c: 'CAL', d: 'Month calendar — inspect & backfill days', run: () => HT.app.navigate('cal') },
    { c: 'RPT', d: 'Performance report', run: () => HT.app.navigate('rpt') },
    { c: 'GRADE', d: 'Report card — grades, GPA, advice', run: () => HT.app.navigate('grade') },
    { c: 'RES', d: 'Research terminal — RES <TICKER> for one desk', run: a => HT.app.navigate('res', a[0] || null) },
    { c: 'HAB', d: 'Securities list — HAB <TICKER> for a tear sheet', run: a => HT.app.navigate('hab', a[0] || null) },
    { c: 'ADD', d: 'List a new habit', run: () => HT.app.navigate('form') },
    { c: 'EDIT', d: 'Amend a listing — EDIT <TICKER>', run: a => {
        const h = S.getHabit(a[0]);
        if (h) HT.app.navigate('form', h.id);
        else HT.app.msg('UNKNOWN SECURITY: ' + (a[0] || '?'), 'err');
      } },
    { c: 'DONE', d: 'Fill an order — DONE <TICKER> [QTY]', run: doneCmd },
    { c: 'UNDO', d: "Cancel today's fill — UNDO <TICKER>", run: undoCmd },
    { c: 'SET', d: 'Settings & data desk', run: () => HT.app.navigate('set') },
    { c: 'HELP', d: 'Command reference & model notes', run: () => HT.app.navigate('help') },
    { c: 'EXPORT', d: 'Download portfolio backup (JSON)', run: () => {
        U.download('habiterm-' + S.todayKey() + '.json', S.exportJSON());
        HT.app.msg('PORTFOLIO EXPORTED.', 'ok');
      } },
    { c: 'IMPORT', d: 'Restore portfolio from JSON file', run: () => document.getElementById('importfile').click() },
    { c: 'DEMO', d: 'Load demo portfolio (replaces current data)', run: () => {
        if (S.habits().length && !confirm('LOAD DEMO PORTFOLIO?\nTHIS REPLACES YOUR CURRENT DATA.')) return;
        S.loadDemo();
        HT.app.applySettings();
        HT.app.msg('DEMO PORTFOLIO LOADED — 6 SECURITIES, 120 SESSIONS OF TAPE.', 'ok');
        HT.app.navigate('dash');
      } },
    { c: 'REFRESH', d: 'Force-refresh research feeds', run: () => {
        HT.panels.research.forceNext();
        if (HT.app.route().p === 'res') HT.app.render(); else HT.app.navigate('res');
        HT.app.msg('FEEDS REFRESHING…', 'info');
      } },
    { c: 'WIPE', d: 'Erase all HABITERM data', run: () => {
        if (!confirm('ERASE ALL HABITERM DATA?\nTHIS CANNOT BE UNDONE. (EXPORT FIRST?)')) return;
        S.wipe();
        HT.app.applySettings();
        HT.app.msg('TAPE WIPED. FRESH START.', 'info');
        HT.app.navigate('dash');
      } }
  ];
  const ALIAS = { HOME: 'DASH', NEWS: 'RES', LIST: 'HAB', SECURITIES: 'HAB', '?': 'HELP', SETTINGS: 'SET' };
  const TICKER_CMDS = ['DONE', 'UNDO', 'HAB', 'RES', 'EDIT'];

  function doneCmd(a) {
    const h = S.getHabit(a[0]);
    if (!h) { HT.app.msg('UNKNOWN SECURITY: ' + (a[0] || '?'), 'err'); return; }
    const today = S.todayKey();
    const tgt = HT.metrics.target(h);
    if (h.type === 'qty' && a[1] && !isNaN(+a[1])) {
      S.logAdd(h.id, today, +a[1]);
      const v = S.getValue(h.id, today);
      HT.app.msg('ORDER: ' + h.ticker + ' +' + (+a[1]) + ' → ' + v + '/' + tgt + (v >= tgt ? ' — FILLED ✓' : ''), v >= tgt ? 'ok' : 'info');
    } else {
      S.logSet(h.id, today, Math.max(tgt, S.getValue(h.id, today)));
      HT.app.msg('ORDER FILLED: ' + h.ticker + ' ✓' + (HT.metrics.streak(h) > 1 ? ' — STREAK ' + HT.metrics.streak(h) + 'D' : ''), 'ok');
    }
    HT.app.render();
  }

  function undoCmd(a) {
    const h = S.getHabit(a[0]);
    if (!h) { HT.app.msg('UNKNOWN SECURITY: ' + (a[0] || '?'), 'err'); return; }
    S.logSet(h.id, S.todayKey(), 0);
    HT.app.msg('ORDER CANCELLED: ' + h.ticker, 'info');
    HT.app.render();
  }

  function exec(text) {
    const raw = String(text || '').trim();
    if (!raw) return;
    const tokens = raw.toUpperCase().split(/\s+/);
    let c = tokens[0];
    if (ALIAS[c]) c = ALIAS[c];
    const cmd = CMDS.find(x => x.c === c);
    const input = document.getElementById('cmd');
    if (input) { input.value = ''; }
    hidePal();
    if (hist[hist.length - 1] !== raw) hist.push(raw);
    hi = hist.length;

    if (cmd) { cmd.run(tokens.slice(1)); return; }
    /* bloomberg move: a bare ticker jumps to the tear sheet */
    const h = S.getHabit(c);
    if (h) { HT.app.navigate('hab', h.ticker); return; }
    HT.app.msg('UNKNOWN COMMAND: ' + c + ' — TYPE HELP <GO>', 'err');
  }

  /* ---------- palette ---------- */
  function suggestions(value) {
    const v = value.trimStart().toUpperCase();
    if (!v) {
      return CMDS.slice(0, 8).map(x => ({ ins: x.c, cmd: x.c, desc: x.d }));
    }
    const tokens = v.split(/\s+/);
    const out = [];
    if (tokens.length === 1) {
      const t = tokens[0];
      CMDS.forEach(x => { if (x.c.indexOf(t) === 0) out.push({ ins: x.c, cmd: x.c, desc: x.d }); });
      S.habits().forEach(h => {
        if (h.ticker.indexOf(t) === 0 || h.name.toUpperCase().indexOf(t) === 0) {
          out.push({ ins: h.ticker, cmd: h.ticker, desc: h.name + ' — open tear sheet' });
        }
      });
    } else if (TICKER_CMDS.indexOf(tokens[0]) >= 0) {
      const t = tokens[1] || '';
      S.habits().forEach(h => {
        if (!t || h.ticker.indexOf(t) === 0 || h.name.toUpperCase().indexOf(t) === 0) {
          out.push({ ins: tokens[0] + ' ' + h.ticker, cmd: tokens[0] + ' ' + h.ticker, desc: h.name });
        }
      });
    }
    return out.slice(0, 10);
  }

  function showPal() {
    const pal = document.getElementById('palette');
    const input = document.getElementById('cmd');
    palItems = suggestions(input.value);
    if (!palItems.length) { hidePal(); return; }
    if (palIdx >= palItems.length) palIdx = palItems.length - 1;
    pal.innerHTML = palItems.map((it, i) =>
      '<div class="pal-item' + (i === palIdx ? ' sel' : '') + '" data-i="' + i + '">' +
      '<span class="pi-cmd">' + U.esc(it.cmd) + '</span><span class="pi-desc">' + U.esc(it.desc) + '</span></div>'
    ).join('');
    pal.classList.remove('hidden');
    pal.querySelectorAll('.pal-item').forEach(el => {
      el.onmousedown = e => {        /* mousedown beats input blur */
        e.preventDefault();
        exec(palItems[+el.dataset.i].ins);
      };
    });
  }

  function hidePal() {
    palIdx = -1;
    palItems = [];
    const pal = document.getElementById('palette');
    if (pal) { pal.classList.add('hidden'); pal.innerHTML = ''; }
  }

  /* ---------- wiring ---------- */
  const FK = { F1: 'DASH', F2: 'TODAY', F3: 'CAL', F4: 'RPT', F6: 'GRADE', F7: 'RES', F8: 'HAB', F9: 'SET', F10: 'HELP' };

  function init() {
    const input = document.getElementById('cmd');
    const go = document.getElementById('cmd-go');

    document.addEventListener('keydown', e => {
      if (FK[e.key]) { e.preventDefault(); exec(FK[e.key]); return; }
      const ae = document.activeElement;
      const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT');
      if ((e.key === '/' && !typing) || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });

    input.addEventListener('input', () => { palIdx = -1; showPal(); });
    input.addEventListener('focus', () => showPal());
    input.addEventListener('blur', () => setTimeout(hidePal, 150));

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (palIdx >= 0 && palItems[palIdx]) exec(palItems[palIdx].ins);
        else exec(input.value);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const pick = palItems[palIdx >= 0 ? palIdx : 0];
        if (pick) { input.value = pick.ins + ' '; palIdx = -1; showPal(); }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (palItems.length) { palIdx = (palIdx + 1) % palItems.length; showPal(); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (palItems.length && palIdx >= 0) { palIdx = (palIdx - 1 + palItems.length) % palItems.length; showPal(); }
        else if (hist.length) { hi = Math.max(0, hi - 1); input.value = hist[hi] || ''; hidePal(); }
      } else if (e.key === 'Escape') {
        if (!document.getElementById('palette').classList.contains('hidden')) hidePal();
        else input.blur();
      }
    });

    go.style.cursor = 'pointer';
    go.onclick = () => exec(input.value);
  }

  return { exec, init };
})();
