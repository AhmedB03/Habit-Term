/* HABITERM — panels/habit.js : securities list + full tear sheet per habit */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.habit = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics, C = HT.charts;

  function render(root, arg) {
    if (!arg) { renderList(root); return; }
    const h = S.getHabit(arg);
    if (!h) { HT.app.msg('UNKNOWN SECURITY: ' + String(arg).toUpperCase(), 'err'); renderList(root); return; }
    renderDetail(root, h);
  }

  /* ---------- securities list ---------- */
  function renderList(root) {
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }

    const rows = hs.map(h => {
      const g = M.gradeOf(h);
      return {
        h: h, price: M.price(h), d7: M.priceDelta(h, 7),
        st: M.streak(h), r30: M.rate(h, 30), g: g
      };
    });

    root.innerHTML =
      '<div class="panel"><div class="panel-h"><span>LISTED SECURITIES — ' + hs.length + '</span>' +
      '<span class="ph-aux"><button class="btn btn-sm btn-acc" data-cmd="ADD">+ LIST NEW</button></span></div>' +
      '<div class="panel-b">' +
      '<table class="tbl"><thead><tr>' +
      '<th>SEC</th><th>NAME</th><th class="r">LAST</th><th class="r">Δ7D</th><th class="r">STRK</th>' +
      '<th class="r">FILL 30D</th><th class="r">GRADE</th><th>SCHEDULE</th><th>TYPE</th>' +
      '</tr></thead><tbody>' +
      rows.map(r =>
        '<tr class="rowlink" data-cmd="HAB ' + U.esc(r.h.ticker) + '">' +
        '<td><span class="tkr-dot" style="background:' + r.h.color + '"></span><span class="tkr">' + U.esc(r.h.ticker) + '</span></td>' +
        '<td class="dim">' + U.esc(r.h.name) + '</td>' +
        '<td class="r num wht">' + r.price.toFixed(2) + '</td>' +
        '<td class="r num ' + U.udClass(r.d7) + '">' + U.arrow(r.d7) + ' ' + U.signed(r.d7, 1, '%') + '</td>' +
        '<td class="r num ' + (r.st > 0 ? 'acc' : 'dim') + '">' + r.st + 'D</td>' +
        '<td class="r num">' + U.fmtPct(r.r30) + '</td>' +
        '<td class="r"><span class="g-' + r.g.letter[0] + '" style="font-weight:700">' + r.g.letter + '</span></td>' +
        '<td class="dim">' + M.scheduleDesc(r.h) + '</td>' +
        '<td class="dim">' + (r.h.type === 'qty' ? r.h.target + ' ' + U.esc(r.h.unit || 'UNITS') : 'CHECK') + '</td>' +
        '</tr>'
      ).join('') +
      '</tbody></table>' +
      '<div class="dim" style="font-size:10px;margin-top:8px;letter-spacing:1px">TIP: TYPE A TICKER IN THE COMMAND LINE AND HIT ENTER TO JUMP STRAIGHT TO ITS TEAR SHEET.</div>' +
      '</div></div>';
  }

  /* ---------- tear sheet ---------- */
  function renderDetail(root, h) {
    const today = S.todayKey();
    const ps = M.priceSeries(h, 90);
    const price = ps[ps.length - 1].p;
    const d1 = M.priceDelta(h, 1), d7 = M.priceDelta(h, 7), d30 = M.priceDelta(h, 30);
    const g = M.gradeOf(h);
    const st = M.streak(h), best = M.bestStreak(h);
    const r7 = M.rate(h, 7), r30 = M.rate(h, 30), r90 = M.rate(h, 90), rAll = M.rateAll(h);
    const w = M.windowStats(h, 3650);
    let ath = 0;
    M.priceSeries(h).forEach(p => { if (p.p > ath) ath = p.p; });
    const doneToday = M.done(h, today);
    const schedToday = M.isScheduled(h, today);

    root.innerHTML =
      '<div class="grid">' +

      '<div class="panel col-12"><div class="panel-h">' +
      '<span><span class="tkr-dot" style="background:' + h.color + '"></span>' + U.esc(h.ticker) + ' — ' + U.esc(h.name.toUpperCase()) +
      ' <span class="dim" style="font-weight:400">· ' + M.scheduleDesc(h) +
      (h.type === 'qty' ? ' · TARGET ' + h.target + ' ' + U.esc(h.unit || 'UNITS') : '') +
      ' · LISTED ' + U.shortDate(h.createdAt) + '</span></span>' +
      '<span class="ph-aux">' +
        (schedToday ? '<button class="btn btn-sm ' + (doneToday ? '' : 'btn-acc') + '" data-cmd="' + (doneToday ? 'UNDO ' : 'DONE ') + U.esc(h.ticker) + '">' +
          (doneToday ? 'CANCEL TODAY' : '✓ FILL TODAY') + '</button>' : '<span class="tag tag-off">OFF TODAY</span>') +
        '<button class="btn btn-sm" data-cmd="RES ' + U.esc(h.ticker) + '">RESEARCH</button>' +
        '<button class="btn btn-sm" data-cmd="EDIT ' + U.esc(h.ticker) + '">EDIT</button>' +
        '<button class="btn btn-sm btn-dn" id="hb-delist">DELIST</button>' +
      '</span></div>' +
      '<div class="panel-b">' +
        '<div class="inline" style="gap:24px;align-items:baseline">' +
          '<span class="hero-num num">' + price.toFixed(2) + '</span>' +
          '<span class="num ' + U.udClass(d1) + '">' + U.arrow(d1) + ' ' + U.signed(d1, 2, '%') + ' 1D</span>' +
          '<span class="num ' + U.udClass(d7) + '">' + U.signed(d7, 1, '%') + ' 7D</span>' +
          '<span class="num ' + U.udClass(d30) + '">' + U.signed(d30, 1, '%') + ' 30D</span>' +
          '<span class="dim">MOMENTUM PRICE — FILLS COMPOUND UP, MISSES BLEED DOWN. BASE 100.</span>' +
        '</div>' +
        '<canvas class="chart" id="hb-chart" style="margin-top:10px"></canvas>' +
      '</div></div>' +

      '<div class="panel col-8"><div class="panel-h"><span>VITALS</span></div><div class="panel-b">' +
        '<div class="statgrid">' +
        '<div class="stat"><div class="s-k">STREAK</div><div class="s-v num acc">' + st + 'D</div><div class="s-x">BEST ' + best + 'D</div></div>' +
        '<div class="stat"><div class="s-k">FILL 7D</div><div class="s-v num">' + U.fmtPct(r7) + '</div></div>' +
        '<div class="stat"><div class="s-k">FILL 30D</div><div class="s-v num">' + U.fmtPct(r30) + '</div></div>' +
        '<div class="stat"><div class="s-k">FILL 90D</div><div class="s-v num">' + U.fmtPct(r90) + '</div></div>' +
        '<div class="stat"><div class="s-k">LIFETIME</div><div class="s-v num">' + U.fmtPct(rAll) + '</div><div class="s-x">' + w.filled + '/' + w.due + ' ORDERS</div></div>' +
        '<div class="stat"><div class="s-k">ATH PRICE</div><div class="s-v num">' + ath.toFixed(1) + '</div></div>' +
        '<div class="stat"><div class="s-k">VOLATILITY</div><div class="s-v num">' + M.volatility(h).toFixed(2) + '</div><div class="s-x">30D σ OF RETURNS</div></div>' +
        '</div>' +
        '<div class="section-title">LAST 90 SESSIONS</div>' +
        '<div class="dots" id="hb-strip" style="gap:3px"></div>' +
      '</div></div>' +

      '<div class="col-4">' +
        '<div class="panel"><div class="panel-h"><span>RATING</span></div><div class="panel-b">' +
        '<div class="inline" style="gap:16px"><span class="grade-letter g-' + g.letter[0] + '">' + g.letter + '</span>' +
        '<span class="dim" style="font-size:11px">' + (g.score == null ? 'NOT RATED' : g.score.toFixed(1) + ' / 100 · OUTLOOK ' + g.outlook) + '</span></div>' +
        '<div class="gc-advice" style="margin-top:8px">▍' + U.esc(g.advice) + '</div>' +
        '</div></div>' +
        '<div class="panel" style="margin-top:8px"><div class="panel-h"><span>RECENT TAPE</span><span class="ph-aux">CLICK TO AMEND</span></div>' +
        '<div class="panel-b" id="hb-log"></div></div>' +
      '</div>' +

      '</div>';

    C.line(root.querySelector('#hb-chart'),
      ps.map(p => ({ v: p.p, k: U.shortDate(p.key) })),
      { height: 190, base: 100, color: h.color, yfmt: x => x.toFixed(0) });

    /* 90-session strip */
    const strip = root.querySelector('#hb-strip');
    for (let i = 89; i >= 0; i--) {
      const k = U.addDays(today, -i);
      const cell = document.createElement('span');
      cell.className = 'dot';
      cell.style.width = '10px';
      cell.style.height = '10px';
      if (k < h.createdAt || !M.isScheduled(h, k)) {
        cell.style.background = '#17170f';
      } else if (M.done(h, k)) {
        cell.style.background = h.color;
      } else if (k === today) {
        cell.style.background = 'transparent';
        cell.style.border = '1px solid ' + h.color;
      } else {
        cell.style.background = '#3a1512';
      }
      cell.title = U.shortDate(k);
      strip.appendChild(cell);
    }

    /* recent tape: last 14 scheduled sessions, click to toggle (backfill) */
    const log = root.querySelector('#hb-log');
    const items = [];
    let k = today;
    for (let i = 0; i < 60 && items.length < 14; i++) {
      if (k < h.createdAt) break;
      if (M.isScheduled(h, k)) items.push(k);
      k = U.addDays(k, -1);
    }
    log.innerHTML = '<table class="tbl"><tbody>' + items.map(key => {
      const v = S.getValue(h.id, key);
      const isDone = v >= M.target(h);
      const stat = isDone ? '<span class="up">FILLED' + (h.type === 'qty' ? ' ' + v : '') + '</span>'
        : v > 0 ? '<span class="acc">PARTIAL ' + v + '/' + h.target + '</span>'
        : key === today ? '<span class="dim blink">OPEN</span>' : '<span class="dn">MISSED</span>';
      return '<tr class="rowlink" data-day="' + key + '"><td class="dim">' + U.shortDate(key) + '</td>' +
        '<td>' + U.WD[U.weekday(key)] + '</td><td class="r">' + stat + '</td></tr>';
    }).join('') + '</tbody></table>';
    log.querySelectorAll('[data-day]').forEach(tr => {
      tr.onclick = () => HT.app.navigate('day', tr.dataset.day);
    });

    root.querySelector('#hb-delist').onclick = () => {
      if (confirm('DELIST ' + h.ticker + ' (' + h.name + ')?\nALL OF ITS TAPE IS ERASED. THIS CANNOT BE UNDONE.')) {
        S.deleteHabit(h.id);
        HT.app.msg('DELISTED: ' + h.ticker, 'info');
        HT.app.navigate('hab');
      }
    };
  }

  return { render };
})();
