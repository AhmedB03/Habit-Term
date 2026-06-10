/* HABITERM — panels/today.js : today's book + shared habit row builder */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.today = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics;

  /* shared interactive habit row — used by TODAY, the day inspector and the dashboard book */
  function row(h, key, opts) {
    opts = opts || {};
    const editable = key <= S.todayKey();
    const val = S.getValue(h.id, key);
    const tgt = M.target(h);
    const isDone = val >= tgt;
    const f = M.frac(h, key);
    const refresh = opts.onChange || function () { HT.app.render(); };

    const div = document.createElement('div');
    div.className = 'hrow' + (isDone ? ' done-row' : '');

    const box = document.createElement('button');
    box.className = 'checkbox' + (isDone ? ' on' : '');
    box.textContent = isDone ? '✓' : '';
    box.title = isDone ? 'Cancel fill' : 'Fill order';
    box.disabled = !editable;
    box.onclick = () => { S.logSet(h.id, key, isDone ? 0 : tgt); refresh(); };
    div.appendChild(box);

    const main = document.createElement('div');
    main.className = 'h-main';
    const nm = document.createElement('div');
    nm.className = 'h-name';
    nm.innerHTML = '<span class="tkr-dot" style="background:' + h.color + '"></span>' +
      '<span class="tkr">' + U.esc(h.ticker) + '</span>  ' + U.esc(h.name);
    nm.style.cursor = 'pointer';
    nm.title = 'Open security view';
    nm.onclick = () => HT.app.navigate('hab', h.ticker);
    const mt = document.createElement('div');
    mt.className = 'h-meta';
    mt.textContent = h.type === 'qty'
      ? (val + ' / ' + tgt + ' ' + (h.unit || 'UNITS'))
      : M.scheduleDesc(h);
    main.appendChild(nm);
    main.appendChild(mt);
    div.appendChild(main);

    if (h.type === 'qty' && !opts.compact) {
      const ctl = document.createElement('div');
      ctl.className = 'h-ctl';
      const track = document.createElement('div');
      track.className = 'qty-track';
      const fill = document.createElement('div');
      fill.className = 'qty-fill' + (f >= 1 ? ' full' : '');
      fill.style.width = Math.round(f * 100) + '%';
      track.appendChild(fill);
      ctl.appendChild(track);
      [['−1', -1], ['+1', 1], ['+5', 5]].forEach(p => {
        const b = document.createElement('button');
        b.className = 'btn btn-sm';
        b.textContent = p[0];
        b.disabled = !editable;
        b.onclick = () => { S.logAdd(h.id, key, p[1]); refresh(); };
        ctl.appendChild(b);
      });
      div.appendChild(ctl);
    }

    const st = document.createElement('div');
    st.className = 'h-streak num';
    const sv = M.streak(h, key);
    st.textContent = sv > 0 ? sv + 'D' : '·';
    st.title = 'Streak as of this day';
    div.appendChild(st);

    const tag = document.createElement('span');
    if (isDone) { tag.className = 'tag tag-fill'; tag.textContent = 'FILLED'; }
    else if (val > 0) { tag.className = 'tag tag-part'; tag.textContent = 'PARTIAL'; }
    else { tag.className = 'tag tag-open'; tag.textContent = 'OPEN'; }
    div.appendChild(tag);

    return div;
  }

  function render(root) {
    const today = S.todayKey();
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }

    const due = hs.filter(h => M.isScheduled(h, today));
    const off = hs.filter(h => !M.isScheduled(h, today));
    const dc = M.dayCompletion(today);

    root.innerHTML =
      '<div class="grid">' +
      '<div class="panel col-8">' +
        '<div class="panel-h"><span>TODAY&#39;S BOOK — ' + U.longDate(today) + '</span>' +
        '<span class="ph-aux">' + dc.filled + '/' + dc.due + ' FILLED</span></div>' +
        '<div class="panel-b" id="td-rows"></div>' +
      '</div>' +
      '<div class="col-4">' +
        '<div class="panel"><div class="panel-h"><span>SESSION STATS</span></div><div class="panel-b" id="td-stats"></div></div>' +
        '<div class="panel" style="margin-top:8px"><div class="panel-h"><span>STREAK BOARD</span></div><div class="panel-b" id="td-streaks"></div></div>' +
      '</div>' +
      '</div>';

    const wrap = root.querySelector('#td-rows');
    if (dc.due > 0 && dc.filled === dc.due) {
      const b = document.createElement('div');
      b.className = 'alert-row';
      b.innerHTML = '<span class="al-flag al-grn">PERFECT</span><span class="up">ALL POSITIONS FILLED — FLAWLESS SESSION. SEE YOU AT TOMORROW&#39;S OPEN.</span>';
      wrap.appendChild(b);
    }
    if (due.length) {
      due.forEach(h => wrap.appendChild(row(h, today)));
    } else {
      wrap.innerHTML += '<div class="empty"><div class="e-big">NO POSITIONS IN SESSION</div>' +
        '<div class="e-sub">NOTHING SCHEDULED TODAY — REST DAY. THE TAPE NEVER JUDGES A PLANNED HOLIDAY.</div></div>';
    }
    if (off.length) {
      const t = document.createElement('div');
      t.className = 'section-title';
      t.textContent = 'NOT IN SESSION TODAY';
      wrap.appendChild(t);
      off.forEach(h => {
        const r = document.createElement('div');
        r.className = 'hrow';
        r.innerHTML = '<span class="tag tag-off">OFF</span>' +
          '<div class="h-main"><div class="h-name dim"><span class="tkr-dot" style="background:' + h.color + '"></span>' +
          U.esc(h.ticker) + ' — ' + U.esc(h.name) + '</div>' +
          '<div class="h-meta">' + M.scheduleDesc(h) + '</div></div>';
        wrap.appendChild(r);
      });
    }

    /* session stats */
    const p7 = M.portfolioStats(7), p30 = M.portfolioStats(30);
    root.querySelector('#td-stats').innerHTML =
      '<div class="statgrid">' +
      '<div class="stat"><div class="s-k">OPEN ORDERS</div><div class="s-v num">' + (dc.due - dc.filled) + '</div><div class="s-x">DUE TODAY</div></div>' +
      '<div class="stat"><div class="s-k">FILL RATE 7D</div><div class="s-v num">' + U.fmtPct(p7.rate) + '</div><div class="s-x">' + p7.filled + '/' + p7.due + ' ORDERS</div></div>' +
      '<div class="stat"><div class="s-k">FILL RATE 30D</div><div class="s-v num">' + U.fmtPct(p30.rate) + '</div><div class="s-x">' + p30.filled + '/' + p30.due + ' ORDERS</div></div>' +
      '<div class="stat"><div class="s-k">PERFECT DAYS</div><div class="s-v num">' + M.perfectDays(30) + '</div><div class="s-x">LAST 30 SESSIONS</div></div>' +
      '</div>';

    /* streak board */
    const sb = root.querySelector('#td-streaks');
    const rows = hs.map(h => ({ h: h, s: M.streak(h), b: M.bestStreak(h) }))
      .sort((a, b) => b.s - a.s);
    sb.innerHTML = '<table class="tbl"><thead><tr><th>SEC</th><th class="r">STREAK</th><th class="r">BEST</th></tr></thead><tbody>' +
      rows.map(r =>
        '<tr class="rowlink" data-cmd="HAB ' + U.esc(r.h.ticker) + '">' +
        '<td><span class="tkr-dot" style="background:' + r.h.color + '"></span><span class="tkr">' + U.esc(r.h.ticker) + '</span></td>' +
        '<td class="r num ' + (r.s > 0 ? 'acc' : 'dim') + '">' + r.s + 'D</td>' +
        '<td class="r num dim">' + r.b + 'D</td></tr>'
      ).join('') + '</tbody></table>';
  }

  return { render, row };
})();
