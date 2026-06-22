/* HABITERM — panels/report.js : stats — completion, weekday analysis, habit pairs */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.report = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics, C = HT.charts;
  let period = 30;

  function render(root) {
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }
    if (!HT.premium.active()) {
      HT.premium.renderLock(root, {
        emoji: '📊',
        title: 'Stats is a Premium feature',
        sub: 'Completion trends, weekday analysis and the habit-pair matrix —<br>see exactly what\'s working and what isn\'t.'
      });
      return;
    }
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

    const segBtn = p => '<button class="' + (period === p ? 'on' : '') + '" data-p="' + p + '">' + p + ' days</button>';

    root.innerHTML =
      '<div class="grid">' +

      '<div class="panel col-12"><div class="panel-h"><span>Completion · last ' + n + ' days</span>' +
      '<span class="ph-aux"><span class="seg" id="rpt-seg">' + segBtn(7) + segBtn(30) + segBtn(90) + '</span></span></div>' +
      '<div class="panel-b">' +
        '<table class="tbl"><thead><tr>' +
        '<th>Habit</th><th class="r">Done</th><th class="r">Scheduled</th><th class="r">Rate</th>' +
        '<th class="r">vs prev ' + n + 'd</th><th class="r">Streak</th><th class="r">Best</th><th class="r">Health</th>' +
        '</tr></thead><tbody>' +
        rows.map(r =>
          '<tr class="rowlink" data-cmd="HAB ' + U.esc(r.h.ticker) + '">' +
          '<td><span class="tkr-dot" style="background:' + r.h.color + '"></span><span class="tkr">' + U.esc(r.h.name) + '</span></td>' +
          '<td class="r num">' + r.w.filled + '</td>' +
          '<td class="r num dim">' + r.w.due + '</td>' +
          '<td class="r num wht">' + U.fmtPct(r.w.rate) + '</td>' +
          '<td class="r num ' + (r.delta == null ? 'dim' : U.udClass(r.delta)) + '">' + (r.delta == null ? '—' : U.signed(r.delta, 0, ' pts')) + '</td>' +
          '<td class="r num">' + (r.st > 0 ? '🔥 ' + r.st : '—') + '</td>' +
          '<td class="r num dim">' + r.best + '</td>' +
          '<td class="r">' + U.tierBadge(r.g.tier, false) + '</td>' +
          '</tr>'
        ).join('') +
        '</tbody></table>' +
        '<div class="dim" style="font-size:12.5px;margin-top:10px">Overall: ' +
          totFilled + ' of ' + totDue + ' done — ' + U.fmtPct(pr, 1) + ' completion' +
        '</div>' +
      '</div></div>' +

      '<div class="panel col-6"><div class="panel-h"><span>Momentum</span><span class="ph-aux">last ' + n + ' days</span></div>' +
      '<div class="panel-b"><canvas class="chart" id="rpt-hx"></canvas></div></div>' +

      '<div class="panel col-6"><div class="panel-h"><span>By weekday</span><span class="ph-aux">last 60 days</span></div>' +
      '<div class="panel-b" id="rpt-wd"></div></div>' +

      '<div class="panel col-12"><div class="panel-h"><span>Habit pairs</span>' +
      '<span class="ph-aux">do your habits happen together?</span></div>' +
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
        (wd === worst ? 'var(--dn)' : wd === best ? 'var(--up)' : acc) + '"></span></span>' +
        '<span class="bar-val num">' + U.fmtPct(v) + '</span></div>';
    }
    if (best != null && worst != null && best !== worst) {
      wdHtml += '<div class="dim" style="font-size:12px;margin-top:10px">Toughest day: ' +
        U.WD[worst] + ' (' + U.fmtPct(wr[worst]) + ') — strongest: ' + U.WD[best] + ' (' + U.fmtPct(wr[best]) + ')</div>';
    }
    root.querySelector('#rpt-wd').innerHTML = wdHtml;

    /* habit-pair matrix */
    const corrEl = root.querySelector('#rpt-corr');
    if (hs.length < 2) {
      corrEl.innerHTML = '<div class="dim">Add at least two habits to see how they pair up.</div>';
    } else {
      const mtx = M.correlations();
      let ch = '<table class="tbl"><thead><tr><th></th>' +
        hs.map(h => '<th class="r">' + U.esc(h.ticker) + '</th>').join('') + '</tr></thead><tbody>';
      hs.forEach((ha, a) => {
        ch += '<tr><td class="tkr">' + U.esc(ha.name) + '</td>';
        hs.forEach((hb, b) => {
          const v = mtx[a][b];
          if (a === b) ch += '<td class="r dim">—</td>';
          else if (v == null) ch += '<td class="r dim" title="Not enough shared days yet">n/a</td>';
          else {
            const cls = v > 0.25 ? 'up' : v < -0.25 ? 'dn' : 'dim';
            ch += '<td class="r num ' + cls + '">' + U.signed(v, 2) + '</td>';
          }
        });
        ch += '</tr>';
      });
      ch += '</tbody></table>' +
        '<div class="dim" style="font-size:11.5px;margin-top:8px">+1 = usually done together · −1 = one tends to crowd out the other · build routines around positive pairs</div>';
      corrEl.innerHTML = ch;
    }
  }

  return { render };
})();
