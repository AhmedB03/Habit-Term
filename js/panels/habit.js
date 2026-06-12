/* HABITERM — panels/habit.js : habit list + detail page per habit */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.habit = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics, C = HT.charts;

  function render(root, arg) {
    if (!arg) { renderList(root); return; }
    const h = S.getHabit(arg);
    if (!h) { HT.app.msg('No habit called "' + String(arg) + '".', 'err'); renderList(root); return; }
    renderDetail(root, h);
  }

  /* ---------- habit list ---------- */
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
      '<div class="panel"><div class="panel-h"><span>My habits</span>' +
      '<span class="ph-aux">' + hs.length + ' · <button class="btn btn-sm btn-acc" data-cmd="ADD">+ New habit</button></span></div>' +
      '<div class="panel-b">' +
      '<table class="tbl"><thead><tr>' +
      '<th>Habit</th><th class="r">Momentum</th><th class="r">7 days</th><th class="r">Streak</th>' +
      '<th class="r">This month</th><th class="r">Grade</th><th>Schedule</th><th>Goal</th>' +
      '</tr></thead><tbody>' +
      rows.map(r =>
        '<tr class="rowlink" data-cmd="HAB ' + U.esc(r.h.ticker) + '">' +
        '<td><span class="tkr-dot" style="background:' + r.h.color + '"></span><span class="tkr">' + U.esc(r.h.name) + '</span>' +
        '<span class="code-chip">' + U.esc(r.h.ticker) + '</span></td>' +
        '<td class="r num wht">' + r.price.toFixed(1) + '</td>' +
        '<td class="r num ' + U.udClass(r.d7) + '">' + U.arrow(r.d7) + ' ' + U.signed(r.d7, 1, '%') + '</td>' +
        '<td class="r num">' + (r.st > 0 ? '🔥 ' + r.st : '—') + '</td>' +
        '<td class="r num">' + U.fmtPct(r.r30) + '</td>' +
        '<td class="r"><span class="g-' + r.g.letter[0] + '" style="font-weight:700">' + r.g.letter + '</span></td>' +
        '<td class="dim">' + M.scheduleDesc(r.h) + '</td>' +
        '<td class="dim">' + (r.h.type === 'qty' ? r.h.target + ' ' + U.esc(r.h.unit || 'units') : '✓ check') + '</td>' +
        '</tr>'
      ).join('') +
      '</tbody></table>' +
      '<div class="dim" style="font-size:11.5px;margin-top:10px">Tip: type a habit\'s short code in the search bar to jump straight to it.</div>' +
      '</div></div>';
  }

  /* ---------- habit detail ---------- */
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
    const OUTLOOK = { POSITIVE: 'improving', NEGATIVE: 'slipping', STABLE: 'steady', NEW: 'new' };

    root.innerHTML =
      '<div class="grid">' +

      '<div class="panel col-12"><div class="panel-h">' +
      '<span><span class="tkr-dot" style="background:' + h.color + '"></span>' + U.esc(h.name) +
      '<span class="code-chip">' + U.esc(h.ticker) + '</span>' +
      ' <span class="dim" style="font-weight:400;font-size:12.5px">· ' + M.scheduleDesc(h) +
      (h.type === 'qty' ? ' · goal ' + h.target + ' ' + U.esc(h.unit || 'units') : '') +
      ' · since ' + U.shortDate(h.createdAt) + '</span></span>' +
      '<span class="ph-aux">' +
        (schedToday ? '<button class="btn btn-sm ' + (doneToday ? '' : 'btn-acc') + '" data-cmd="' + (doneToday ? 'UNDO ' : 'DONE ') + U.esc(h.ticker) + '">' +
          (doneToday ? 'Undo today' : '✓ Done today') + '</button>' : '<span class="tag tag-off">Off today</span>') +
        '<button class="btn btn-sm" data-cmd="RES ' + U.esc(h.ticker) + '">Discover</button>' +
        '<button class="btn btn-sm" data-cmd="EDIT ' + U.esc(h.ticker) + '">Edit</button>' +
        '<button class="btn btn-sm btn-dn" id="hb-delist">Delete</button>' +
      '</span></div>' +
      '<div class="panel-b">' +
        '<div class="inline" style="gap:20px;align-items:baseline">' +
          '<span class="hero-num num">' + price.toFixed(1) + '</span>' +
          '<span class="num ' + U.udClass(d1) + '">' + U.arrow(d1) + ' ' + U.signed(d1, 1, '%') + ' today</span>' +
          '<span class="num ' + U.udClass(d7) + '">' + U.signed(d7, 1, '%') + ' 7d</span>' +
          '<span class="num ' + U.udClass(d30) + '">' + U.signed(d30, 1, '%') + ' 30d</span>' +
          '<span class="dim" style="font-size:12px">Momentum score — doing it pushes the score up, missing pulls it down. Starts at 100.</span>' +
        '</div>' +
        '<canvas class="chart" id="hb-chart" style="margin-top:12px"></canvas>' +
      '</div></div>' +

      '<div class="panel col-8"><div class="panel-h"><span>Stats</span></div><div class="panel-b">' +
        '<div class="statgrid">' +
        '<div class="stat"><div class="s-k">Streak</div><div class="s-v num">' + (st > 0 ? '🔥 ' + st : '—') + '</div><div class="s-x">best ' + best + '</div></div>' +
        '<div class="stat"><div class="s-k">This week</div><div class="s-v num">' + U.fmtPct(r7) + '</div></div>' +
        '<div class="stat"><div class="s-k">This month</div><div class="s-v num">' + U.fmtPct(r30) + '</div></div>' +
        '<div class="stat"><div class="s-k">90 days</div><div class="s-v num">' + U.fmtPct(r90) + '</div></div>' +
        '<div class="stat"><div class="s-k">All time</div><div class="s-v num">' + U.fmtPct(rAll) + '</div><div class="s-x">' + w.filled + ' of ' + w.due + ' days</div></div>' +
        '<div class="stat"><div class="s-k">Peak score</div><div class="s-v num">' + ath.toFixed(1) + '</div></div>' +
        '</div>' +
        '<div class="section-title">Last 90 days</div>' +
        '<div class="dots" id="hb-strip" style="gap:3px"></div>' +
      '</div></div>' +

      '<div class="col-4">' +
        '<div class="panel"><div class="panel-h"><span>Grade</span></div><div class="panel-b">' +
        '<div class="inline" style="gap:16px"><span class="grade-letter g-' + g.letter[0] + '">' + g.letter + '</span>' +
        '<span class="dim" style="font-size:12.5px">' + (g.score == null ? 'Not graded yet' : g.score.toFixed(1) + ' / 100 · ' + (OUTLOOK[g.outlook] || g.outlook)) + '</span></div>' +
        '<div class="gc-advice" style="margin-top:10px">' + U.esc(g.advice) + '</div>' +
        '</div></div>' +
        '<div class="panel" style="margin-top:14px"><div class="panel-h"><span>History</span><span class="ph-aux">click a day to edit</span></div>' +
        '<div class="panel-b" id="hb-log"></div></div>' +
      '</div>' +

      '</div>';

    C.line(root.querySelector('#hb-chart'),
      ps.map(p => ({ v: p.p, k: U.shortDate(p.key) })),
      { height: 190, base: 100, color: h.color, yfmt: x => x.toFixed(0) });

    /* 90-day strip */
    const strip = root.querySelector('#hb-strip');
    for (let i = 89; i >= 0; i--) {
      const k = U.addDays(today, -i);
      const cell = document.createElement('span');
      cell.className = 'dot';
      cell.style.width = '10px';
      cell.style.height = '10px';
      if (k < h.createdAt || !M.isScheduled(h, k)) {
        cell.classList.add('sq-off');
      } else if (M.done(h, k)) {
        cell.style.background = h.color;
      } else if (k === today) {
        cell.style.background = 'transparent';
        cell.style.border = '1px solid ' + h.color;
      } else {
        cell.classList.add('sq-miss');
      }
      cell.title = U.shortDate(k);
      strip.appendChild(cell);
    }

    /* history: last 14 scheduled days, click to open & edit */
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
      const stat = isDone ? '<span class="up">Done' + (h.type === 'qty' ? ' · ' + v : '') + '</span>'
        : v > 0 ? '<span class="acc">' + v + ' of ' + h.target + '</span>'
        : key === today ? '<span class="dim">Open</span>' : '<span class="dn">Missed</span>';
      return '<tr class="rowlink" data-day="' + key + '"><td class="dim">' + U.shortDate(key) + '</td>' +
        '<td>' + U.WD[U.weekday(key)] + '</td><td class="r">' + stat + '</td></tr>';
    }).join('') + '</tbody></table>';
    log.querySelectorAll('[data-day]').forEach(tr => {
      tr.onclick = () => HT.app.navigate('day', tr.dataset.day);
    });

    root.querySelector('#hb-delist').onclick = () => {
      if (confirm('Delete "' + h.name + '"?\nAll of its history will be erased. This cannot be undone.')) {
        S.deleteHabit(h.id);
        HT.app.msg('Deleted ' + h.name + '.', 'info');
        HT.app.navigate('hab');
      }
    };
  }

  return { render };
})();
