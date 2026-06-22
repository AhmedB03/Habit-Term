/* HABITERM — panels/dashboard.js : the home screen — momentum, alerts, today, trends, activity, articles */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.dashboard = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics, C = HT.charts;
  let wireTok = 0;

  /* small completion donut for panel headers */
  function ring(dc) {
    const pct = dc.due ? Math.round(dc.filled / dc.due * 100) : 0;
    return '<svg width="20" height="20" viewBox="0 0 36 36" style="transform:rotate(-90deg)" aria-hidden="true">' +
      '<circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--bd)" stroke-width="5"/>' +
      '<circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--up)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + pct + ',100"/>' +
      '</svg>';
  }

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
    const health = M.healthScore();
    const htier = M.healthTier();
    const dc = M.dayCompletion(today);
    const alerts = M.alerts();
    const mv = M.movers();

    root.innerHTML =
      '<div class="grid">' +

      '<div class="panel col-4"><div class="panel-h"><span>Momentum</span><span class="ph-aux">last 30 days</span></div>' +
      '<div class="panel-b">' +
        '<div class="hero-num num">' + hxLast.toFixed(1) + '</div>' +
        '<div class="hero-sub num">' +
          '<span class="' + U.udClass(d1) + '">' + U.arrow(d1) + ' ' + U.signed(d1, 1, '%') + ' today</span>' +
          ' <span class="dim">·</span> ' +
          '<span class="' + U.udClass(d7) + '">' + U.signed(d7, 1, '%') + ' this week</span>' +
        '</div>' +
        '<canvas class="chart" id="db-hx" style="margin-top:10px"></canvas>' +
        '<div class="kv" style="margin-top:12px">' +
          '<span class="k">Habit health</span><span class="v num">' + (health == null ? '—' : htier.emoji + ' ' + Math.round(health) + ' · ' + htier.label) + '</span>' +
          '<span class="k">Done today</span><span class="v num">' + dc.filled + ' of ' + dc.due + '</span>' +
          '<span class="k">Active habits</span><span class="v num">' + hs.length + '</span>' +
        '</div>' +
      '</div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>Heads up</span><span class="ph-aux">' + alerts.length + '</span></div>' +
      '<div class="panel-b" id="db-alerts"></div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>Today</span>' +
      '<span class="ph-aux">' + ring(dc) + '<span class="num">' + dc.filled + ' of ' + dc.due + '</span>' +
      '<button class="btn btn-sm" data-cmd="TODAY">Open</button></span></div>' +
      '<div class="panel-b" id="db-book"></div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>Trending</span><span class="ph-aux"><button class="btn btn-sm" data-cmd="HAB">All habits</button></span></div>' +
      '<div class="panel-b" id="db-movers"></div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>Activity</span><span class="ph-aux">last 35 days</span></div>' +
      '<div class="panel-b"><div class="heatwrap" id="db-heat"></div>' +
      '<div class="dim" style="font-size:11.5px;margin-top:8px">Darker = more done · click a square to open that day</div></div></div>' +

      '<div class="panel col-4"><div class="panel-h"><span>Worth a read</span>' +
      '<span class="ph-aux"><button class="btn btn-sm" data-cmd="RES">Discover more</button></span></div>' +
      '<div class="panel-b" id="db-wire"><div class="feed-status blink">Loading articles…</div></div></div>' +

      '</div>';

    C.line(root.querySelector('#db-hx'),
      hx.map(p => ({ v: p.p, k: U.shortDate(p.key) })),
      { height: 72, base: 100, xlabels: false, yfmt: x => x.toFixed(0) });

    /* alerts */
    const al = root.querySelector('#db-alerts');
    if (!alerts.length) {
      al.innerHTML = '<div class="dim" style="padding:6px 2px">All quiet — nothing needs your attention. ✨</div>';
    } else {
      const cls = { red: 'al-red', yel: 'al-yel', grn: 'al-grn' };
      const lab = { red: 'Alert', yel: 'Watch', grn: 'Nice' };
      al.innerHTML = alerts.map(a =>
        '<div class="alert-row"><span class="al-flag ' + cls[a.sev] + '">' + lab[a.sev] + '</span>' +
        '<span>' + U.esc(a.text) + '</span></div>').join('');
    }

    /* today's quick list */
    const book = root.querySelector('#db-book');
    const due = hs.filter(h => M.isScheduled(h, today));
    if (!due.length) {
      book.innerHTML = '<div class="dim" style="padding:6px 2px">Nothing scheduled today — rest day. 🌴</div>';
    } else {
      due.slice(0, 8).forEach(h => book.appendChild(HT.panels.today.row(h, today, { compact: true })));
      if (due.length > 8) {
        const more = document.createElement('div');
        more.className = 'dim';
        more.style.cssText = 'font-size:11.5px;padding:6px 2px';
        more.textContent = '+' + (due.length - 8) + ' more — open Today to see them all';
        book.appendChild(more);
      }
    }

    /* trending */
    const mvEl = root.querySelector('#db-movers');
    const top = mv.slice(0, 3);
    const bot = mv.slice(-3).reverse().filter(x => top.indexOf(x) < 0);
    function mvRow(x) {
      return '<tr class="rowlink" data-cmd="HAB ' + U.esc(x.h.ticker) + '">' +
        '<td><span class="tkr-dot" style="background:' + x.h.color + '"></span><span class="tkr">' + U.esc(x.h.name) + '</span></td>' +
        '<td class="r num">' + M.price(x.h).toFixed(1) + '</td>' +
        '<td class="r num ' + U.udClass(x.d7) + '">' + U.arrow(x.d7) + ' ' + U.signed(x.d7, 1, '%') + '</td></tr>';
    }
    mvEl.innerHTML = '<table class="tbl"><thead><tr><th>Habit</th><th class="r">Score</th><th class="r">7 days</th></tr></thead>' +
      '<tbody>' + top.map(mvRow).join('') +
      (bot.length ? '<tr><td colspan="3" class="dim" style="font-size:11px;font-weight:600">Needs attention</td></tr>' + bot.map(mvRow).join('') : '') +
      '</tbody></table>';

    /* 35-day activity grid */
    const heat = root.querySelector('#db-heat');
    const acc = C.accent();
    for (let i = 34; i >= 0; i--) {
      const k = U.addDays(today, -i);
      const cell = document.createElement('div');
      cell.className = 'heat-cell';
      const cdc = M.dayCompletion(k);
      if (cdc.due > 0) {
        cell.style.background = (cdc.frac === 0 && k !== today)
          ? 'rgba(226,60,82,.10)'
          : C.hexA(acc, 0.08 + 0.55 * cdc.frac);
      }
      if (k === today) cell.style.borderColor = acc;
      cell.title = U.shortDate(k) + ' — ' + Math.round(cdc.frac * 100) + '% (' + cdc.filled + ' of ' + cdc.due + ')';
      cell.style.cursor = 'pointer';
      cell.onclick = () => HT.app.navigate('day', k);
      heat.appendChild(cell);
    }

    /* article preview (single cached query — full feeds live in Discover) */
    const myTok = ++wireTok;
    HT.feed.wire('habit', 5, false).then(r => {
      const el = root.querySelector('#db-wire');
      if (wireTok !== myTok || !el) return;
      if (!r.items.length) { el.innerHTML = '<div class="feed-status">Nothing new right now — check Discover for more.</div>'; return; }
      el.innerHTML = r.items.map((it, i) =>
        '<div class="feed-item"><span class="fi-num">' + (i + 1) + '</span>' +
        '<div class="fi-body"><div class="fi-title"><a href="' + U.esc(it.url) + '" target="_blank" rel="noopener">' + U.esc(it.title) + '</a></div>' +
        '<div class="fi-meta"><span class="fi-src">HN</span> · ▲' + it.points + ' · ' + U.relTime(it.at) + '</div></div></div>'
      ).join('') + (r.cached ? '<div class="feed-status">Updated ' + U.relTime(r.ts) + ' — open Discover to refresh</div>' : '');
    }).catch(() => {
      const el = root.querySelector('#db-wire');
      if (wireTok === myTok && el) el.innerHTML = '<div class="feed-status err">Couldn\'t load articles — your tracker still works fine offline.</div>';
    });
  }

  return { render };
})();
