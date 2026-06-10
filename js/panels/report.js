/* HABITERM — panels/report.js : performance report, weekday analysis, correlations */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.report = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics, C = HT.charts;
  let period = 30;

  function render(root) {
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }
    const today = S.todayKey();
    const n = period;

    /* per-habit rows */
    let totDue = 0, totFilled = 0;
    const rows = hs.map(h => {
      const w = M.windowStats(h, n);
      const prev = M.windowStats(h, n, U.addDays(today, -n));
      const delta = (w.rate != null && prev.rate != null) ? (w.rate - prev.rate) * 100 : null;
      totDue += w.due; totFilled += w.filled;
      return { h: h, w: w, delta: delta, st: M.streak(h), best: M.bestStreak(h), g: M.gradeOf(h) };
    }).sort((a, b) => (b.w.rate || 0) - (a.w.rate || 0));
    const pr = totDue ? totFilled / totDue : null;

    const segBtn = p => '<button class="' + (period === p ? 'on' : '') + '" data-p="' + p + '">' + p + 'D</button>';

    root.innerHTML =
      '<div class="grid">' +

      '<div class="panel col-12"><div class="panel-h"><span>PERFORMANCE REPORT — LAST ' + n + ' SESSIONS</span>' +
      '<span class="ph-aux"><span class="seg" id="rpt-seg">' + segBtn(7) + segBtn(30) + segBtn(90) + '</span></span></div>' +
      '<div class="panel-b">' +
        '<table class="tbl"><thead><tr>' +
        '<th>SEC</th><th>NAME</th><th class="r">DUE</th><th class="r">FILLED</th><th class="r">FILL %</th>' +
        '<th class="r">Δ PREV ' + n + 'D</th><th class="r">STRK</th><th class="r">BEST</th><th class="r">GRADE</th>' +
        '</tr></thead><tbody>' +
        rows.map(r =>
          '<tr class="rowlink" data-cmd="HAB ' + U.esc(r.h.ticker) + '">' +
          '<td><span class="tkr-dot" style="background:' + r.h.color + '"></span><span class="tkr">' + U.esc(r.h.ticker) + '</span></td>' +
          '<td class="dim">' + U.esc(r.h.name) + '</td>' +
          '<td class="r num">' + r.w.due + '</td>' +
          '<td class="r num">' + r.w.filled + '</td>' +
          '<td class="r num wht">' + U.fmtPct(r.w.rate) + '</td>' +
          '<td class="r num ' + (r.delta == null ? 'dim' : U.udClass(r.delta)) + '">' + (r.delta == null ? '—' : U.signed(r.delta, 0, 'PP')) + '</td>' +
          '<td class="r num">' + r.st + 'D</td>' +
          '<td class="r num dim">' + r.best + 'D</td>' +
          '<td class="r"><span class="g-' + r.g.letter[0] + '" style="font-weight:700">' + r.g.letter + '</span></td>' +
          '</tr>'
        ).join('') +
        '</tbody></table>' +
        '<div class="dim" style="font-size:11px;margin-top:8px;letter-spacing:1px">ORDERS FILLED: ' +
          totFilled + ' / ' + totDue + ' — PORTFOLIO FILL RATE ' + U.fmtPct(pr, 1) +
        '</div>' +
      '</div></div>' +

      '<div class="panel col-6"><div class="panel-h"><span>HABIX INDEX — ' + n + 'D</span></div>' +
      '<div class="panel-b"><canvas class="chart" id="rpt-hx"></canvas></div></div>' +

      '<div class="panel col-6"><div class="panel-h"><span>FILL RATE BY WEEKDAY</span><span class="ph-aux">LAST 60 SESSIONS</span></div>' +
      '<div class="panel-b" id="rpt-wd"></div></div>' +

      '<div class="panel col-12"><div class="panel-h"><span>CORRELATION DESK</span>' +
      '<span class="ph-aux">DO YOUR HABITS MOVE TOGETHER? (PHI, 60D)</span></div>' +
      '<div class="panel-b" id="rpt-corr"></div></div>' +

      '</div>';

    root.querySelectorAll('#rpt-seg button').forEach(b => {
      b.onclick = () => { period = +b.dataset.p; render(root); };
    });

    const hx = M.habixSeries(n);
    C.line(root.querySelector('#rpt-hx'),
      hx.map(p => ({ v: p.p, k: U.shortDate(p.key) })),
      { height: 180, base: 100, yfmt: x => x.toFixed(0) });

    /* weekday bars */
    const wr = M.weekdayRates(60);
    const ws = S.settings().weekStart === 0 ? 0 : 1;
    const acc = C.accent();
    let best = null, worst = null;
    wr.forEach((v, i) => {
      if (v == null) return;
      if (best == null || v > wr[best]) best = i;
      if (worst == null || v < wr[worst]) worst = i;
    });
    let wdHtml = '';
    for (let i = 0; i < 7; i++) {
      const wd = (ws + i) % 7;
      const v = wr[wd];
      wdHtml += '<div class="bar-row"><span class="bar-lab">' + U.WD[wd] + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + (v == null ? 0 : Math.round(v * 100)) + '%;background:' +
        (wd === worst ? '#ff4f43' : wd === best ? '#3ddc8e' : acc) + '"></span></span>' +
        '<span class="bar-val num">' + U.fmtPct(v) + '</span></div>';
    }
    if (best != null && worst != null && best !== worst) {
      wdHtml += '<div class="dim" style="font-size:11px;margin-top:8px;letter-spacing:1px">WEAKEST SESSION: ' +
        U.WD[worst] + ' ' + U.fmtPct(wr[worst]) + ' — STRONGEST: ' + U.WD[best] + ' ' + U.fmtPct(wr[best]) + '</div>';
    }
    root.querySelector('#rpt-wd').innerHTML = wdHtml;

    /* correlation matrix */
    const corrEl = root.querySelector('#rpt-corr');
    if (hs.length < 2) {
      corrEl.innerHTML = '<div class="dim">LIST AT LEAST TWO SECURITIES TO RUN CORRELATIONS.</div>';
    } else {
      const mtx = M.correlations();
      let ch = '<table class="tbl"><thead><tr><th></th>' +
        hs.map(h => '<th class="r">' + U.esc(h.ticker) + '</th>').join('') + '</tr></thead><tbody>';
      hs.forEach((ha, a) => {
        ch += '<tr><td class="tkr">' + U.esc(ha.ticker) + '</td>';
        hs.forEach((hb, b) => {
          const v = mtx[a][b];
          if (a === b) ch += '<td class="r dim">—</td>';
          else if (v == null) ch += '<td class="r dim" title="NOT ENOUGH SHARED SESSIONS">N/A</td>';
          else {
            const cls = v > 0.25 ? 'up' : v < -0.25 ? 'dn' : 'dim';
            ch += '<td class="r num ' + cls + '">' + U.signed(v, 2) + '</td>';
          }
        });
        ch += '</tr>';
      });
      ch += '</tbody></table>' +
        '<div class="dim" style="font-size:10px;margin-top:6px">+1 = FILLED TOGETHER · −1 = ONE CROWDS OUT THE OTHER · BUILD ROUTINES AROUND POSITIVE PAIRS</div>';
      corrEl.innerHTML = ch;
    }
  }

  return { render };
})();
