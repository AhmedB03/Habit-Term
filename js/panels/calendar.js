/* HABITERM — panels/calendar.js : month grid + day inspector (backfill past days) */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.calendar = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics, C = HT.charts;
  let off = 0;   /* month offset from current */

  function render(root) {
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }

    const today = S.todayKey();
    const base = U.parseKey(today);
    base.setDate(1);
    base.setMonth(base.getMonth() + off);
    const y = base.getFullYear(), m = base.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const ws = S.settings().weekStart === 0 ? 0 : 1;
    const lead = (new Date(y, m, 1).getDay() - ws + 7) % 7;
    const acc = C.accent();

    const headers = [];
    for (let i = 0; i < 7; i++) headers.push('<th>' + U.WD[(ws + i) % 7] + '</th>');

    let html =
      '<div class="panel"><div class="panel-h"><span>CALENDAR — ' + U.MONTHS_FULL[m] + ' ' + y + '</span>' +
      '<span class="ph-aux">' +
        '<button class="btn btn-sm" id="cal-prev">◀ PREV</button>' +
        '<button class="btn btn-sm" id="cal-today">CURRENT</button>' +
        '<button class="btn btn-sm" id="cal-next">NEXT ▶</button>' +
      '</span></div>' +
      '<div class="panel-b"><table class="cal-table"><thead><tr>' + headers.join('') + '</tr></thead><tbody>';

    let day = 1 - lead;
    while (day <= daysInMonth) {
      html += '<tr>';
      for (let c = 0; c < 7; c++, day++) {
        if (day < 1 || day > daysInMonth) { html += '<td class="cal-cell blank"></td>'; continue; }
        const key = y + '-' + U.pad2(m + 1) + '-' + U.pad2(day);
        const future = key > today;
        const dc = M.dayCompletion(key);
        let style = '';
        if (!future && dc.due > 0) {
          style = 'background:' + (dc.frac === 0 && key !== today
            ? 'rgba(255,79,67,.08)'
            : C.hexA(acc, 0.03 + 0.26 * dc.frac));
        }
        let dots = '';
        hs.forEach(h => {
          if (!M.isScheduled(h, key)) return;
          const isDone = M.done(h, key);
          const col = future ? '#22211a' : h.color;
          dots += '<span class="dot' + (!isDone && !future ? ' miss' : '') + '" style="background:' + col + '" title="' +
            U.esc(h.ticker) + (future ? '' : (isDone ? ' — FILLED' : ' — MISSED')) + '"></span>';
        });
        const pct = (!future && dc.due > 0)
          ? '<div class="cal-pct num ' + (dc.frac >= 1 ? 'up' : dc.frac > 0 ? 'acc' : 'dn') + '">' + Math.round(dc.frac * 100) + '%</div>'
          : '';
        const cls = 'cal-cell' + (future ? ' future' : '') + (key === today ? ' today' : '');
        html += '<td class="' + cls + '"' + (future ? '' : ' data-key="' + key + '"') + ' style="' + style + '">' +
          '<div class="cal-day">' + day + '</div>' + pct + '<div class="dots">' + dots + '</div></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>' +
      '<div class="dim" style="font-size:10px;margin-top:6px">CLICK ANY PAST DAY TO INSPECT &amp; BACKFILL · DOTS = SCHEDULED HABITS (DIM = MISSED)</div>' +
      '</div></div>';

    root.innerHTML = html;
    root.querySelector('#cal-prev').onclick = () => { off--; render(root); };
    root.querySelector('#cal-next').onclick = () => { off++; render(root); };
    root.querySelector('#cal-today').onclick = () => { off = 0; render(root); };
    root.querySelectorAll('.cal-cell[data-key]').forEach(td => {
      td.onclick = () => HT.app.navigate('day', td.dataset.key);
    });
  }

  return { render, reset: function () { off = 0; } };
})();

/* ---------- day inspector: view + backfill a single session ---------- */
HT.panels.day = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics;

  function render(root, key) {
    const today = S.todayKey();
    if (!key || key > today) { HT.app.navigate('cal'); return; }
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }

    const due = hs.filter(h => M.isScheduled(h, key));
    const dc = M.dayCompletion(key);

    root.innerHTML =
      '<div class="panel"><div class="panel-h">' +
      '<span>DAY INSPECTOR — ' + U.longDate(key) + (key === today ? ' (TODAY)' : '') + '</span>' +
      '<span class="ph-aux">' + dc.filled + '/' + dc.due + ' FILLED · <button class="btn btn-sm" data-cmd="CAL">◀ BACK TO CAL</button></span>' +
      '</div><div class="panel-b" id="day-rows"></div></div>';

    const wrap = root.querySelector('#day-rows');
    if (key !== today) {
      const note = document.createElement('div');
      note.className = 'dim';
      note.style.cssText = 'font-size:10px;letter-spacing:1px;margin-bottom:8px';
      note.textContent = 'AMENDING THE HISTORICAL TAPE — CHANGES RECOMPUTE STREAKS, PRICES AND GRADES.';
      wrap.appendChild(note);
    }
    if (due.length) {
      due.forEach(h => wrap.appendChild(HT.panels.today.row(h, key)));
    } else {
      wrap.innerHTML += '<div class="empty"><div class="e-big">NO POSITIONS THIS DAY</div>' +
        '<div class="e-sub">NOTHING WAS SCHEDULED ON THIS DATE.</div></div>';
    }
  }

  return { render };
})();
