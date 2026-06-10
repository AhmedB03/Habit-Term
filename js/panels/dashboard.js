/* HABITERM — panels/dashboard.js : the home screen — index, alerts, book, movers, heat, intel */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.dashboard = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics, C = HT.charts;
  let wireTok = 0;

  function render(root) {
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }

    const today = S.todayKey();
    const hx = M.habixSeries(30);
    const hxLast = hx.length ? hx[hx.length - 1].p : 100;
    const hxPrev = hx.length > 1 ? hx[hx.length - 2].p : hxLast;
    const d1 = hxPrev ? (hxLast - hxPrev) / hxPrev * 100 : 0;
    const i7 = Math.max(0, hx.length - 8);
    const d7 = (hx.length && hx[i7].p) ? (hxLast - hx[i7].p) / hx[i7].p * 100 : 0;
    const gpa = M.gpa();
    const dc = M.dayCompletion(today);
    const alerts = M.alerts();
    const mv = M.movers();

    root.innerHTML =
      '<div class="grid">' +

      '<div class="panel col-4"><div class="panel-h"><span>HABIX — COMPOSITE INDEX</span><span class="ph-aux">30D</span></div>' +
      '<div class="panel-b">' +
        '<div class="hero-num num">' + hxLast.toFixed(2) + '</div>' +
        '<div class="hero-sub num">' +
          '<span class="' + U.udClass(d1) + '">' + U.arrow(d1) + ' ' + U.signed(d1, 2, '%') + ' 1D</span>' +
          ' <span class="dim">·</span> ' +
          '<span class="' + U.udClass(d7) + '">' + U.signed(d7, 1, '%') + ' 7D</span>' +
        '</div>' +
        '<canvas class="chart" id="db-hx" style="margin-top:8px"></canvas>' +
        '<div class="kv" style="margin-top:10px">' +
          '<span class="k">PORTFOLIO GPA</span><span class="v num">' + (gpa == null ? 'NR' : gpa.toFixed(2)) + '</span>' +
          '<span class="k">SESSION FILLS</span><span class="v num">' + dc.filled + ' / ' + dc.due + '</span>' +
          '<span class="k">SECURITIES</span><span class="v num">' + hs.length + ' LISTED</span>' +
        '</div>' +
      '</div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>ALERTS</span><span class="ph-aux">' + alerts.length + ' ACTIVE</span></div>' +
      '<div class="panel-b" id="db-alerts"></div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>TODAY&#39;S BOOK</span>' +
      '<span class="ph-aux"><button class="btn btn-sm" data-cmd="TODAY">EXPAND</button></span></div>' +
      '<div class="panel-b" id="db-book"></div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>TOP MOVERS</span><span class="ph-aux">7D PRICE Δ</span></div>' +
      '<div class="panel-b" id="db-movers"></div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>ACTIVITY</span><span class="ph-aux">LAST 35 SESSIONS</span></div>' +
      '<div class="panel-b"><div class="heatwrap" id="db-heat"></div>' +
      '<div class="dim" style="font-size:10px;margin-top:6px">FILL INTENSITY — CLICK A CELL FOR THE DAY VIEW</div></div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>LATEST INTEL</span>' +
      '<span class="ph-aux"><button class="btn btn-sm" data-cmd="RES">OPEN RES</button></span></div>' +
      '<div class="panel-b" id="db-wire"><div class="feed-status blink">PULLING THE WIRE…</div></div></div>' +

      '</div>';

    C.line(root.querySelector('#db-hx'),
      hx.map(p => ({ v: p.p, k: U.shortDate(p.key) })),
      { height: 72, base: 100, xlabels: false, yfmt: x => x.toFixed(0) });

    /* alerts */
    const al = root.querySelector('#db-alerts');
    if (!alerts.length) {
      al.innerHTML = '<div class="dim" style="padding:6px 2px">NO ACTIVE ALERTS — CLEAN TAPE.</div>';
    } else {
      const cls = { red: 'al-red', yel: 'al-yel', grn: 'al-grn' };
      const lab = { red: 'ALRT', yel: 'WARN', grn: 'GOOD' };
      al.innerHTML = alerts.map(a =>
        '<div class="alert-row"><span class="al-flag ' + cls[a.sev] + '">' + lab[a.sev] + '</span>' +
        '<span>' + U.esc(a.text) + '</span></div>').join('');
    }

    /* quick book */
    const book = root.querySelector('#db-book');
    const due = hs.filter(h => M.isScheduled(h, today));
    if (!due.length) {
      book.innerHTML = '<div class="dim" style="padding:6px 2px">NOTHING IN SESSION TODAY — REST DAY.</div>';
    } else {
      due.slice(0, 8).forEach(h => book.appendChild(HT.panels.today.row(h, today, { compact: true })));
      if (due.length > 8) {
        const more = document.createElement('div');
        more.className = 'dim';
        more.style.cssText = 'font-size:10px;padding:4px 2px';
        more.textContent = '+' + (due.length - 8) + ' MORE — OPEN TODAY';
        book.appendChild(more);
      }
    }

    /* movers */
    const mvEl = root.querySelector('#db-movers');
    const top = mv.slice(0, 3);
    const bot = mv.slice(-3).reverse().filter(x => top.indexOf(x) < 0);
    function mvRow(x) {
      return '<tr class="rowlink" data-cmd="HAB ' + U.esc(x.h.ticker) + '">' +
        '<td><span class="tkr-dot" style="background:' + x.h.color + '"></span><span class="tkr">' + U.esc(x.h.ticker) + '</span></td>' +
        '<td class="dim">' + U.esc(x.h.name) + '</td>' +
        '<td class="r num">' + M.price(x.h).toFixed(1) + '</td>' +
        '<td class="r num ' + U.udClass(x.d7) + '">' + U.arrow(x.d7) + ' ' + U.signed(x.d7, 1, '%') + '</td></tr>';
    }
    mvEl.innerHTML = '<table class="tbl"><thead><tr><th>SEC</th><th>NAME</th><th class="r">LAST</th><th class="r">7D</th></tr></thead>' +
      '<tbody>' + top.map(mvRow).join('') +
      (bot.length ? '<tr><td colspan="4" class="dim" style="font-size:9px;letter-spacing:2px">LAGGARDS</td></tr>' + bot.map(mvRow).join('') : '') +
      '</tbody></table>';

    /* 35-day heat grid */
    const heat = root.querySelector('#db-heat');
    const acc = C.accent();
    for (let i = 34; i >= 0; i--) {
      const k = U.addDays(today, -i);
      const cell = document.createElement('div');
      cell.className = 'heat-cell';
      const cdc = M.dayCompletion(k);
      if (cdc.due > 0) {
        cell.style.background = (cdc.frac === 0 && k !== today)
          ? 'rgba(255,79,67,.10)'
          : C.hexA(acc, 0.05 + 0.38 * cdc.frac);
      }
      if (k === today) cell.style.borderColor = acc;
      cell.title = U.shortDate(k) + ' — ' + Math.round(cdc.frac * 100) + '% (' + cdc.filled + '/' + cdc.due + ')';
      cell.style.cursor = 'pointer';
      cell.onclick = () => HT.app.navigate('day', k);
      heat.appendChild(cell);
    }

    /* intel preview (single cached query — full feeds live in RES) */
    const myTok = ++wireTok;
    HT.feed.wire('habit', 5, false).then(r => {
      const el = root.querySelector('#db-wire');
      if (wireTok !== myTok || !el) return;
      if (!r.items.length) { el.innerHTML = '<div class="feed-status">WIRE QUIET. OPEN RES FOR FULL COVERAGE.</div>'; return; }
      el.innerHTML = r.items.map((it, i) =>
        '<div class="feed-item"><span class="fi-num">' + U.pad2(i + 1) + ')</span>' +
        '<div class="fi-body"><div class="fi-title"><a href="' + U.esc(it.url) + '" target="_blank" rel="noopener">' + U.esc(it.title) + '</a></div>' +
        '<div class="fi-meta"><span class="fi-src">HN</span> · ▲' + it.points + ' · ' + U.relTime(it.at) + '</div></div></div>'
      ).join('') + (r.cached ? '<div class="feed-status">CACHED ' + U.relTime(r.ts) + ' — OPEN RES TO REFRESH</div>' : '');
    }).catch(() => {
      const el = root.querySelector('#db-wire');
      if (wireTok === myTok && el) el.innerHTML = '<div class="feed-status err">WIRE OFFLINE — CHECK CONNECTION. TRACKER UNAFFECTED.</div>';
    });
  }

  return { render };
})();
