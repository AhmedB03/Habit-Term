/* HABITERM — panels/manage.js : habit form (add/edit), settings, help */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

/* ---------- ADD / EDIT ---------- */
HT.panels.form = (function () {
  const U = HT.util, S = HT.store;

  function render(root, habitId) {
    const h = habitId ? S.getHabit(habitId) : null;
    const isEdit = !!h;
    if (!isEdit && !HT.premium.canAddHabit()) {
      HT.premium.renderLock(root, {
        emoji: '🌳',
        title: 'You\'ve hit the free limit of ' + HT.premium.FREE_HABIT_LIMIT + ' habits',
        sub: 'Nice — you\'re building a real routine!<br>Premium unlocks unlimited habits (and a lot more).'
      });
      return;
    }
    const dayOrder = S.settings().weekStart === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
    const color = h ? h.color : S.COLORS[S.habits().length % S.COLORS.length];

    root.innerHTML =
      '<div class="panel"><div class="panel-h"><span>' + (isEdit ? 'Edit · ' + U.esc(h.name) : 'New habit') + '</span>' +
      '<span class="ph-aux">' + (isEdit ? 'changes apply to all history' : 'takes about 30 seconds') + '</span></div>' +
      '<div class="panel-b"><div class="form">' +

      '<div class="form-row"><label>Name</label>' +
      '<input class="in" id="f-name" maxlength="40" placeholder="e.g. Meditation, 5K run, Read 20 pages" value="' + (h ? U.esc(h.name) : '') + '"></div>' +

      '<div class="form-row"><label>Short code <span class="dim" style="font-weight:400">— 2–6 letters, for quick commands like DONE MEDT</span></label>' +
      '<input class="in in-sm" id="f-ticker" maxlength="6" style="text-transform:uppercase" value="' + (h ? U.esc(h.ticker) : '') + '"></div>' +

      '<div class="form-row"><label>Type</label>' +
      '<span class="seg" id="f-type">' +
      '<button data-v="bool" class="' + (!h || h.type === 'bool' ? 'on' : '') + '">✓ Check off</button>' +
      '<button data-v="qty" class="' + (h && h.type === 'qty' ? 'on' : '') + '">Count an amount</button>' +
      '</span></div>' +

      '<div class="form-row ' + (h && h.type === 'qty' ? '' : 'hidden') + '" id="f-qtyrow"><label>Daily goal &amp; unit</label>' +
      '<span class="inline">' +
      '<input class="in in-sm" id="f-target" type="number" min="1" max="999" value="' + (h && h.type === 'qty' ? h.target : 8) + '">' +
      '<input class="in in-sm" id="f-unit" maxlength="12" placeholder="glasses" value="' + (h ? U.esc(h.unit || '') : '') + '">' +
      '</span></div>' +

      '<div class="form-row"><label>Schedule</label>' +
      '<span class="seg" id="f-sched">' +
      '<button data-v="daily" class="' + (!h || h.schedule.kind === 'daily' ? 'on' : '') + '">Every day</button>' +
      '<button data-v="weekdays" class="' + (h && h.schedule.kind === 'weekdays' ? 'on' : '') + '">Specific days</button>' +
      '</span>' +
      '<div class="daypick ' + (h && h.schedule.kind === 'weekdays' ? '' : 'hidden') + '" id="f-days" style="margin-top:10px">' +
      dayOrder.map(d => '<button data-d="' + d + '" class="' + (h && h.schedule.days.indexOf(d) >= 0 ? 'on' : '') + '">' + U.WD[d] + '</button>').join('') +
      '</div></div>' +

      '<div class="form-row"><label>Color</label><div class="swatches" id="f-colors">' +
      S.COLORS.map(c => '<span class="swatch ' + (c === color ? 'on' : '') + '" data-c="' + c + '" style="background:' + c + '"></span>').join('') +
      '</div></div>' +

      '<div class="form-row"><label>Topic keywords <span class="dim" style="font-weight:400">— comma-separated, powers apps, gear &amp; discussion in Discover</span></label>' +
      '<input class="in" id="f-kw" placeholder="e.g. meditation, mindfulness" value="' + (h ? U.esc(h.keywords.join(', ')) : '') + '"></div>' +

      '<div class="form-row"><label>Skills this builds <span class="dim" style="font-weight:400">— powers “Research by skill” in Discover</span></label>' +
      '<div class="chips" id="f-skills"></div>' +
      '<div class="inline" style="margin-top:8px">' +
      '<input class="in in-sm" id="f-skill-add" placeholder="Add a skill…" style="width:200px">' +
      '<button type="button" class="btn btn-sm" id="f-skill-addbtn">Add</button>' +
      '<button type="button" class="btn btn-sm" id="f-skill-suggest">↻ Suggest from habit</button>' +
      '</div></div>' +

      '<div class="inline" style="margin-top:20px">' +
      '<button class="btn btn-acc" id="f-save">' + (isEdit ? 'Save changes' : 'Add habit') + '</button>' +
      '<button class="btn" id="f-cancel">Cancel</button>' +
      '</div>' +
      '<div class="form-err hidden" id="f-err"></div>' +

      '</div></div></div>';

    const $ = sel => root.querySelector(sel);

    /* auto-suggest the short code while the name is typed (until customized) */
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

    /* skills editor — auto-suggested from the map, fully user-editable */
    let facets = (isEdit && h.facets && h.facets.length)
      ? h.facets.slice()
      : HT.topics.suggest({ name: h ? h.name : '', keywords: h ? h.keywords : [] });
    facets = facets.map(x => ({ label: x.label, why: x.why || '', q: x.q || '' }));

    function renderSkills() {
      const box = $('#f-skills');
      if (!facets.length) {
        box.innerHTML = '<span class="dim" style="font-size:12px">No skills yet — add one, or use Suggest.</span>';
        return;
      }
      box.innerHTML = facets.map((fc, i) =>
        '<span class="skill-chip" title="' + U.esc(fc.why || '') + '">' + U.esc(fc.label) +
        '<button type="button" class="skill-x" data-i="' + i + '" aria-label="Remove">×</button></span>'
      ).join('');
      box.querySelectorAll('.skill-x').forEach(b => {
        b.onclick = () => { facets.splice(+b.dataset.i, 1); renderSkills(); };
      });
    }
    renderSkills();

    function addSkill() {
      const inp = $('#f-skill-add');
      const v = inp.value.trim();
      if (v && !facets.some(x => x.label.toLowerCase() === v.toLowerCase())) facets.push({ label: v, why: '', q: '' });
      inp.value = '';
      renderSkills();
      inp.focus();
    }
    $('#f-skill-addbtn').onclick = addSkill;
    $('#f-skill-add').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } });
    $('#f-skill-suggest').onclick = () => {
      const nm = $('#f-name').value.trim();
      const kw = $('#f-kw').value.split(',').map(s => s.trim()).filter(Boolean);
      const sugg = HT.topics.suggest({ name: nm, keywords: kw });
      let added = 0;
      sugg.forEach(s => {
        if (!facets.some(x => x.label.toLowerCase() === s.label.toLowerCase())) {
          facets.push({ label: s.label, why: s.why || '', q: s.q || '' }); added++;
        }
      });
      renderSkills();
      if (!added) HT.app.msg(sugg.length ? 'Those skills are already added.' : 'No suggestions yet — add a name or keywords first.', 'info');
    };

    function fail(msg) {
      const e = $('#f-err');
      e.textContent = msg;
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

      if (!name) return fail('Give your habit a name.');
      if (!/^[A-Z0-9]{2,6}$/.test(ticker)) return fail('The short code needs 2–6 letters or digits.');
      const clash = S.habits().find(x => x.ticker === ticker && (!h || x.id !== h.id));
      if (clash) return fail('The code ' + ticker + ' is already used by "' + clash.name + '".');
      if (schedKind === 'weekdays' && !days.length) return fail('Pick at least one day.');
      const target = Math.round(+$('#f-target').value || 0);
      if (type === 'qty' && (target < 1 || target > 999)) return fail('The daily goal must be between 1 and 999.');

      const spec = {
        name: name, ticker: ticker, type: type,
        target: type === 'qty' ? target : 1,
        unit: type === 'qty' ? $('#f-unit').value.trim() : '',
        schedule: schedKind === 'weekdays' ? { kind: 'weekdays', days: days } : { kind: 'daily', days: [] },
        color: swatch ? swatch.dataset.c : S.COLORS[0],
        keywords: keywords.length ? keywords : [name.toLowerCase()],
        facets: facets.length ? facets.map(x => x.q ? { label: x.label, why: x.why || '', q: x.q } : { label: x.label }) : null
      };

      if (isEdit) {
        S.updateHabit(h.id, spec);
        HT.app.msg('Saved changes to ' + name + '.', 'ok');
      } else {
        S.addHabit(spec);
        HT.app.msg('Habit added: ' + name + ' — let\'s go! 🎉', 'ok');
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
    const pro = HT.premium.active();

    function seg(id, pairs, cur, lockAllBut) {
      return '<span class="seg" id="' + id + '">' + pairs.map(p => {
        const locked = !pro && lockAllBut != null && String(p[0]) !== String(lockAllBut);
        return '<button data-v="' + p[0] + '"' + (locked ? ' data-locked="1"' : '') +
          ' class="' + (String(cur) === String(p[0]) ? 'on' : '') + (locked ? ' locked' : '') + '">' +
          p[1] + (locked ? ' 🔒' : '') + '</button>';
      }).join('') + '</span>';
    }

    const hours = [];
    for (let i = 0; i <= 6; i++) hours.push([i, i + ':00']);

    root.innerHTML =
      '<div class="grid">' +
      '<div class="panel col-6"><div class="panel-h"><span>Settings</span></div><div class="panel-b">' +

      '<div class="form-row"><label>Theme</label>' +
      seg('s-theme', [['light', '☀️ Light'], ['dark', '🌙 Dark']], pro ? (st.theme || 'light') : 'light', 'light') + '</div>' +

      '<div class="form-row"><label>Accent color</label>' +
      seg('s-acc', [['violet', 'Violet'], ['amber', 'Orange'], ['green', 'Green'], ['cyan', 'Blue'], ['magenta', 'Pink']], pro ? st.accent : 'violet', 'violet') + '</div>' +

      '<div class="form-row"><label>Day starts at <span class="dim" style="font-weight:400">— night owls: pick 3:00 so 1 a.m. still counts as today</span></label>' +
      seg('s-dsh', hours, st.dayStartHour) + '</div>' +

      '<div class="form-row"><label>Week starts on</label>' +
      seg('s-ws', [[1, 'Monday'], [0, 'Sunday']], st.weekStart) + '</div>' +

      '<div class="form-row"><label>Premium</label>' +
      '<div class="inline"><span class="dim" style="font-size:13px">' + HT.premium.statusText() + '</span>' +
      '<button class="btn btn-sm" data-cmd="PREMIUM">👑 ' + (HT.premium.isPaid() ? 'Manage' : 'Upgrade') + '</button></div></div>' +

      '</div></div>' +

      '<div class="panel col-6"><div class="panel-h"><span>Your data</span></div><div class="panel-b">' +
      '<div class="form-row"><label>Stored locally in your browser — nothing leaves this device except Discover searches.</label>' +
      '<div class="inline" style="margin-top:8px">' +
      '<button class="btn" data-cmd="EXPORT">⬇ Export backup</button>' +
      '<button class="btn" data-cmd="IMPORT">⬆ Import backup</button>' +
      '<button class="btn" data-cmd="DEMO">Load demo</button>' +
      '<button class="btn btn-dn" data-cmd="WIPE">Erase all data</button>' +
      '</div></div>' +
      '<div class="form-row" style="margin-top:20px"><label>About</label>' +
      '<div class="dim" style="font-size:12.5px;line-height:1.7">Habiterm — a friendly habit tracker.<br>' +
      'No account, no dependencies, works offline.<br>Discover feeds: PubMed, Hacker News (Algolia), Wikipedia.</div></div>' +
      '</div></div>' +
      '</div>';

    function wire(id, apply, lockedLabel) {
      root.querySelector('#' + id).querySelectorAll('button').forEach(b => {
        b.onclick = () => {
          if (b.dataset.locked) { HT.premium.gate(lockedLabel); return; }
          apply(b.dataset.v); HT.app.applySettings(); render(root);
        };
      });
    }
    wire('s-theme', v => S.updateSettings({ theme: v }), 'Dark mode');
    wire('s-acc', v => S.updateSettings({ accent: v }), 'Accent colors');
    wire('s-dsh', v => S.updateSettings({ dayStartHour: +v }));
    wire('s-ws', v => S.updateSettings({ weekStart: +v }));
  }

  return { render };
})();

/* ---------- HELP ---------- */
HT.panels.help = (function () {
  function row(cmd, desc) {
    return '<tr><td class="acc" style="font-weight:600;white-space:nowrap">' + cmd + '</td><td class="dim">' + desc + '</td></tr>';
  }

  function render(root) {
    root.innerHTML =
      '<div class="grid">' +
      '<div class="panel col-6"><div class="panel-h"><span>Commands</span><span class="ph-aux">type in the search bar, press Enter</span></div>' +
      '<div class="panel-b"><table class="tbl"><tbody>' +
      row('DASH', 'Home — overview of everything') +
      row('TODAY', "Today's habits — check them off") +
      row('CAL', 'Calendar — view & edit any day') +
      row('RPT', 'Stats — completion, weekdays, habit pairs') +
      row('GRADE', 'Report card — grades & advice') +
      row('RES [code]', 'Discover — research & ideas') +
      row('HAB [code]', 'Your habits, or one habit\'s details') +
      row('&lt;code&gt;', 'Just type a habit\'s code to jump to it') +
      row('DONE code [amount]', 'Mark a habit done from the keyboard') +
      row('UNDO code', "Un-check a habit for today") +
      row('ADD / EDIT code', 'Add a new habit / edit one') +
      row('PREMIUM', 'Plans &amp; license — unlock everything') +
      row('SET', 'Settings — theme, day rollover, data') +
      row('EXPORT / IMPORT', 'Back up or restore your data (JSON)') +
      row('DEMO', 'Load the demo data (replaces yours!)') +
      row('REFRESH', 'Refresh the Discover feeds') +
      row('WIPE', 'Erase everything') +
      '</tbody></table></div></div>' +

      '<div class="panel col-6"><div class="panel-h"><span>Keyboard</span></div>' +
      '<div class="panel-b"><table class="tbl"><tbody>' +
      row('<kbd>F1</kbd>–<kbd>F4</kbd>', 'Home · Today · Calendar · Stats') +
      row('<kbd>F6</kbd>–<kbd>F10</kbd>', 'Grades · Discover · Habits · Settings · Help') +
      row('<kbd>/</kbd> or <kbd>Ctrl+K</kbd>', 'Jump to the search bar') +
      row('<kbd>Tab</kbd>', 'Autocomplete the highlighted suggestion') +
      row('<kbd>↑</kbd> <kbd>↓</kbd>', 'Command history / move through suggestions') +
      row('<kbd>Esc</kbd>', 'Close suggestions, leave the search bar') +
      '</tbody></table>' +

      '<div class="section-title">How the numbers work</div>' +
      '<div class="dim" style="font-size:12.5px;line-height:1.8">' +
      '<b class="wht">Momentum</b> — every habit starts at 100. Doing it nudges the score up about 1.8%, missing pulls it down 2.2%, partial progress lands in between.<br>' +
      '<b class="wht">Grade</b> — 45% 30-day completion, 20% momentum (this week vs this month), 15% streak, 10% consistency, 10% all-time.<br>' +
      '<b class="wht">Streak</b> — counts scheduled days only; an unfinished "today" never breaks it until the day ends.<br>' +
      '<b class="wht">Habit pairs</b> — how often two habits are done together over the last 60 days.</div>' +
      '</div></div>' +
      '</div>';
  }

  return { render };
})();
