/* HABITERM — panels/manage.js : listing form (add/edit), settings, help */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

/* ---------- ADD / EDIT ---------- */
HT.panels.form = (function () {
  const U = HT.util, S = HT.store;

  function render(root, habitId) {
    const h = habitId ? S.getHabit(habitId) : null;
    const isEdit = !!h;
    const dayOrder = S.settings().weekStart === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
    const color = h ? h.color : S.COLORS[S.habits().length % S.COLORS.length];

    root.innerHTML =
      '<div class="panel"><div class="panel-h"><span>' + (isEdit ? 'AMEND LISTING — ' + U.esc(h.ticker) : 'LIST A NEW HABIT') + '</span>' +
      '<span class="ph-aux">' + (isEdit ? 'CHANGES APPLY TO THE WHOLE TAPE' : 'IPO PAPERWORK — 30 SECONDS') + '</span></div>' +
      '<div class="panel-b"><div class="form">' +

      '<div class="form-row"><label>HABIT NAME</label>' +
      '<input class="in" id="f-name" maxlength="40" placeholder="E.G. MEDITATION, 5K RUN, READ 20 PAGES" value="' + (h ? U.esc(h.name) : '') + '"></div>' +

      '<div class="form-row"><label>TICKER (2–6 CHARS, A–Z 0–9)</label>' +
      '<input class="in in-sm" id="f-ticker" maxlength="6" style="text-transform:uppercase" value="' + (h ? U.esc(h.ticker) : '') + '"></div>' +

      '<div class="form-row"><label>TYPE</label>' +
      '<span class="seg" id="f-type">' +
      '<button data-v="bool" class="' + (!h || h.type === 'bool' ? 'on' : '') + '">CHECK ✓</button>' +
      '<button data-v="qty" class="' + (h && h.type === 'qty' ? 'on' : '') + '">QUANTITY</button>' +
      '</span></div>' +

      '<div class="form-row ' + (h && h.type === 'qty' ? '' : 'hidden') + '" id="f-qtyrow"><label>DAILY TARGET &amp; UNIT</label>' +
      '<span class="inline">' +
      '<input class="in in-sm" id="f-target" type="number" min="1" max="999" value="' + (h && h.type === 'qty' ? h.target : 8) + '">' +
      '<input class="in in-sm" id="f-unit" maxlength="12" placeholder="GLASSES" value="' + (h ? U.esc(h.unit || '') : '') + '">' +
      '</span></div>' +

      '<div class="form-row"><label>SCHEDULE</label>' +
      '<span class="seg" id="f-sched">' +
      '<button data-v="daily" class="' + (!h || h.schedule.kind === 'daily' ? 'on' : '') + '">EVERY DAY</button>' +
      '<button data-v="weekdays" class="' + (h && h.schedule.kind === 'weekdays' ? 'on' : '') + '">SELECT DAYS</button>' +
      '</span>' +
      '<div class="daypick ' + (h && h.schedule.kind === 'weekdays' ? '' : 'hidden') + '" id="f-days" style="margin-top:8px">' +
      dayOrder.map(d => '<button data-d="' + d + '" class="' + (h && h.schedule.days.indexOf(d) >= 0 ? 'on' : '') + '">' + U.WD[d] + '</button>').join('') +
      '</div></div>' +

      '<div class="form-row"><label>TAPE COLOR</label><div class="swatches" id="f-colors">' +
      S.COLORS.map(c => '<span class="swatch ' + (c === color ? 'on' : '') + '" data-c="' + c + '" style="background:' + c + '"></span>').join('') +
      '</div></div>' +

      '<div class="form-row"><label>RESEARCH KEYWORDS (COMMA-SEPARATED — FEEDS THE RES TERMINAL)</label>' +
      '<input class="in" id="f-kw" placeholder="E.G. MEDITATION, MINDFULNESS" value="' + (h ? U.esc(h.keywords.join(', ')) : '') + '"></div>' +

      '<div class="inline" style="margin-top:18px">' +
      '<button class="btn btn-acc" id="f-save">' + (isEdit ? 'AMEND LISTING' : 'LIST SECURITY') + '</button>' +
      '<button class="btn" id="f-cancel">CANCEL</button>' +
      '</div>' +
      '<div class="form-err hidden" id="f-err"></div>' +

      '</div></div></div>';

    const $ = sel => root.querySelector(sel);

    /* auto-suggest ticker while name is typed (only if user hasn't customized it) */
    let tickerTouched = isEdit;
    $('#f-ticker').addEventListener('input', () => { tickerTouched = true; });
    $('#f-name').addEventListener('input', () => {
      if (!tickerTouched) $('#f-ticker').value = S.suggestTicker($('#f-name').value);
    });

    $('#f-type').querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        $('#f-type').querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        $('#f-qtyrow').classList.toggle('hidden', b.dataset.v !== 'qty');
      };
    });
    $('#f-sched').querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        $('#f-sched').querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        $('#f-days').classList.toggle('hidden', b.dataset.v !== 'weekdays');
      };
    });
    $('#f-days').querySelectorAll('button').forEach(b => {
      b.onclick = () => b.classList.toggle('on');
    });
    $('#f-colors').querySelectorAll('.swatch').forEach(sw => {
      sw.onclick = () => {
        $('#f-colors').querySelectorAll('.swatch').forEach(x => x.classList.remove('on'));
        sw.classList.add('on');
      };
    });

    function fail(msg) {
      const e = $('#f-err');
      e.textContent = '✗ ' + msg;
      e.classList.remove('hidden');
    }

    $('#f-save').onclick = () => {
      const name = $('#f-name').value.trim();
      const ticker = $('#f-ticker').value.trim().toUpperCase();
      const type = $('#f-type').querySelector('.on').dataset.v;
      const schedKind = $('#f-sched').querySelector('.on').dataset.v;
      const days = Array.from($('#f-days').querySelectorAll('.on')).map(b => +b.dataset.d);
      const swatch = $('#f-colors').querySelector('.on');
      const keywords = $('#f-kw').value.split(',').map(s => s.trim()).filter(Boolean);

      if (!name) return fail('NAME REQUIRED.');
      if (!/^[A-Z0-9]{2,6}$/.test(ticker)) return fail('TICKER MUST BE 2–6 CHARS, A–Z / 0–9.');
      const clash = S.habits().find(x => x.ticker === ticker && (!h || x.id !== h.id));
      if (clash) return fail('TICKER ' + ticker + ' ALREADY LISTED (' + clash.name + ').');
      if (schedKind === 'weekdays' && !days.length) return fail('PICK AT LEAST ONE DAY.');
      const target = Math.round(+$('#f-target').value || 0);
      if (type === 'qty' && (target < 1 || target > 999)) return fail('TARGET MUST BE 1–999.');

      const spec = {
        name: name, ticker: ticker, type: type,
        target: type === 'qty' ? target : 1,
        unit: type === 'qty' ? $('#f-unit').value.trim().toUpperCase() : '',
        schedule: schedKind === 'weekdays' ? { kind: 'weekdays', days: days } : { kind: 'daily', days: [] },
        color: swatch ? swatch.dataset.c : S.COLORS[0],
        keywords: keywords.length ? keywords : [name.toLowerCase()]
      };

      if (isEdit) {
        S.updateHabit(h.id, spec);
        HT.app.msg('LISTING AMENDED: ' + ticker, 'ok');
      } else {
        S.addHabit(spec);
        HT.app.msg('NOW TRADING: ' + ticker + ' — ' + name.toUpperCase(), 'ok');
      }
      HT.app.navigate('hab', ticker);
    };

    $('#f-cancel').onclick = () => HT.app.navigate(isEdit ? 'hab' : 'dash', isEdit ? h.ticker : null);
    $('#f-name').focus();
  }

  return { render };
})();

/* ---------- SETTINGS ---------- */
HT.panels.settings = (function () {
  const U = HT.util, S = HT.store;

  function render(root) {
    const st = S.settings();

    function seg(id, pairs, cur) {
      return '<span class="seg" id="' + id + '">' + pairs.map(p =>
        '<button data-v="' + p[0] + '" class="' + (String(cur) === String(p[0]) ? 'on' : '') + '">' + p[1] + '</button>'
      ).join('') + '</span>';
    }

    const hours = [];
    for (let i = 0; i <= 6; i++) hours.push([i, U.pad2(i) + ':00']);

    root.innerHTML =
      '<div class="grid">' +
      '<div class="panel col-6"><div class="panel-h"><span>TERMINAL SETTINGS</span></div><div class="panel-b">' +

      '<div class="form-row"><label>ACCENT PHOSPHOR</label>' +
      seg('s-acc', [['amber', 'AMBER'], ['green', 'GREEN'], ['cyan', 'CYAN'], ['magenta', 'MAGENTA']], st.accent) + '</div>' +

      '<div class="form-row"><label>SESSION ROLLOVER (DAY STARTS AT — NIGHT OWLS SET 03:00)</label>' +
      seg('s-dsh', hours, st.dayStartHour) + '</div>' +

      '<div class="form-row"><label>WEEK STARTS ON</label>' +
      seg('s-ws', [[1, 'MONDAY'], [0, 'SUNDAY']], st.weekStart) + '</div>' +

      '<div class="form-row"><label>CRT SCANLINES</label>' +
      seg('s-scan', [[true, 'ON'], [false, 'OFF']], st.scanlines) + '</div>' +

      '</div></div>' +

      '<div class="panel col-6"><div class="panel-h"><span>DATA DESK</span></div><div class="panel-b">' +
      '<div class="form-row"><label>PORTFOLIO DATA — STORED LOCALLY IN YOUR BROWSER (LOCALSTORAGE). NOTHING LEAVES THIS MACHINE EXCEPT RESEARCH QUERIES.</label>' +
      '<div class="inline" style="margin-top:6px">' +
      '<button class="btn" data-cmd="EXPORT">⬇ EXPORT JSON</button>' +
      '<button class="btn" data-cmd="IMPORT">⬆ IMPORT JSON</button>' +
      '<button class="btn" data-cmd="DEMO">LOAD DEMO</button>' +
      '<button class="btn btn-dn" data-cmd="WIPE">WIPE ALL DATA</button>' +
      '</div></div>' +
      '<div class="form-row" style="margin-top:18px"><label>ABOUT</label>' +
      '<div class="dim" style="font-size:11px;line-height:1.7">HABITERM v1.0 — HABIT INTELLIGENCE TERMINAL.<br>' +
      'ZERO DEPENDENCIES · WORKS OFFLINE (FEEDS DEGRADE GRACEFULLY) ·<br>RESEARCH DESKS: PUBMED E-UTILITIES, HACKER NEWS (ALGOLIA), WIKIPEDIA REST.</div></div>' +
      '</div></div>' +
      '</div>';

    function wire(id, apply) {
      root.querySelector('#' + id).querySelectorAll('button').forEach(b => {
        b.onclick = () => { apply(b.dataset.v); HT.app.applySettings(); render(root); };
      });
    }
    wire('s-acc', v => S.updateSettings({ accent: v }));
    wire('s-dsh', v => S.updateSettings({ dayStartHour: +v }));
    wire('s-ws', v => S.updateSettings({ weekStart: +v }));
    wire('s-scan', v => S.updateSettings({ scanlines: v === 'true' }));
  }

  return { render };
})();

/* ---------- HELP ---------- */
HT.panels.help = (function () {
  function row(cmd, desc) {
    return '<tr><td class="acc" style="font-weight:700;white-space:nowrap">' + cmd + '</td><td class="dim">' + desc + '</td></tr>';
  }

  function render(root) {
    root.innerHTML =
      '<div class="grid">' +
      '<div class="panel col-6"><div class="panel-h"><span>COMMAND REFERENCE</span><span class="ph-aux">TYPE, THEN &lt;GO&gt; (ENTER)</span></div>' +
      '<div class="panel-b"><table class="tbl"><tbody>' +
      row('DASH', 'Dashboard — index, alerts, movers, intel') +
      row('TODAY', "Today's book — fill your orders") +
      row('CAL', 'Month calendar — click a day to backfill') +
      row('RPT', 'Performance report — rates, weekdays, correlations') +
      row('GRADE', 'Report card — letter grades, GPA, advice') +
      row('RES [TICKER]', 'Research terminal — studies, products, primer') +
      row('HAB [TICKER]', 'Securities list, or one tear sheet') +
      row('&lt;TICKER&gt;', 'Just type a ticker — jumps to its tear sheet') +
      row('DONE TICKER [QTY]', 'Fill an order from the command line') +
      row('UNDO TICKER', "Cancel today's fill") +
      row('ADD / EDIT TICKER', 'List a new habit / amend one') +
      row('SET', 'Settings — accent, day rollover, data desk') +
      row('EXPORT / IMPORT', 'Back up or restore your portfolio (JSON)') +
      row('DEMO', 'Load the demo portfolio (replaces data!)') +
      row('REFRESH', 'Force-refresh research feeds') +
      row('WIPE', 'Erase everything') +
      '</tbody></table></div></div>' +

      '<div class="panel col-6"><div class="panel-h"><span>KEYBOARD</span></div>' +
      '<div class="panel-b"><table class="tbl"><tbody>' +
      row('<kbd>F1</kbd>–<kbd>F4</kbd>', 'DASH · TODAY · CAL · RPT') +
      row('<kbd>F6</kbd>–<kbd>F10</kbd>', 'GRADE · RES · HAB · SET · HELP') +
      row('<kbd>/</kbd> or <kbd>CTRL+K</kbd>', 'Jump to the command line') +
      row('<kbd>TAB</kbd>', 'Autocomplete the highlighted suggestion') +
      row('<kbd>↑</kbd> <kbd>↓</kbd>', 'Command history / move through suggestions') +
      row('<kbd>ESC</kbd>', 'Close suggestions, leave the command line') +
      '</tbody></table>' +

      '<div class="section-title">HOW THE NUMBERS WORK</div>' +
      '<div class="dim" style="font-size:11px;line-height:1.8">' +
      '▍ <b class="wht">PRICE</b> — every habit trades from base 100. A filled session compounds +1.8%, a miss −2.2%, partial fills in between. ' +
      'HABIX is the average across all listings.<br>' +
      '▍ <b class="wht">GRADE</b> — 45% 30-day fill rate, 20% momentum (7d vs 30d), 15% streak power, 10% consistency, 10% lifetime.<br>' +
      '▍ <b class="wht">STREAK</b> — counts scheduled days only; an unfilled "today" never breaks it until the session closes.<br>' +
      '▍ <b class="wht">CORRELATION</b> — phi coefficient over shared scheduled sessions in the last 60 days.</div>' +
      '</div></div>' +
      '</div>';
  }

  return { render };
})();
