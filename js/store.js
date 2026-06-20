/* HABITERM — store.js : state, persistence, demo portfolio */
window.HT = window.HT || {};

HT.store = (function () {
  const U = HT.util;
  const LS_KEY = 'habiterm_v1';
  const COLORS = ['#6c5ce7', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#06b6d4', '#f97316'];

  function defaultState() {
    return {
      version: 1,
      firstRunAt: Date.now(),   /* anchors the Premium trial */
      settings: { dayStartHour: 0, weekStart: 1, accent: 'violet', theme: 'light' },
      habits: [],
      log: {}   /* log[dateKey][habitId] = number logged that day */
    };
  }

  let state = defaultState();
  let muted = false;   /* suppress saves during bulk writes (demo load) */

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.version === 1 && Array.isArray(s.habits) && s.log && typeof s.log === 'object') {
          state = s;
        }
      }
    } catch (e) { console.warn('HABITERM: failed to load state', e); }
    state.settings = Object.assign(defaultState().settings, state.settings || {});
    if (!state.firstRunAt) { state.firstRunAt = Date.now(); save(); }
  }

  function firstRunAt() { return state.firstRunAt || Date.now(); }

  function save() {
    if (muted) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('HABITERM: failed to save state', e); }
  }

  function settings() { return state.settings; }
  function updateSettings(patch) { Object.assign(state.settings, patch); save(); }

  /* "today" respects the configurable day-start hour (night owls rejoice) */
  function todayKey() {
    return U.keyFromDate(new Date(Date.now() - (state.settings.dayStartHour || 0) * 3600000));
  }

  function habits() { return state.habits; }

  function getHabit(ref) {
    if (!ref) return null;
    const r = String(ref).toUpperCase();
    return state.habits.find(h => h.id === ref || h.ticker === r) || null;
  }

  function suggestTicker(name) {
    const words = (name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
    let t;
    if (words.length >= 2) t = words[0].slice(0, 2) + words[1].slice(0, 2);
    else t = (words[0] || 'HAB').slice(0, 4);
    if (t.length < 3) t = (t + 'XXX').slice(0, 3);
    let cand = t, i = 2;
    while (state.habits.some(h => h.ticker === cand)) cand = t.slice(0, 3) + (i++);
    return cand;
  }

  function addHabit(spec) {
    const h = {
      id: U.uid(),
      name: spec.name,
      ticker: (spec.ticker || suggestTicker(spec.name)).toUpperCase(),
      type: spec.type === 'qty' ? 'qty' : 'bool',
      target: spec.type === 'qty' ? Math.max(1, Math.round(+spec.target || 1)) : 1,
      unit: spec.unit || '',
      schedule: (spec.schedule && spec.schedule.kind === 'weekdays')
        ? { kind: 'weekdays', days: (spec.schedule.days || []).slice().sort() }
        : { kind: 'daily', days: [] },
      keywords: (spec.keywords && spec.keywords.length) ? spec.keywords : [String(spec.name || '').toLowerCase()],
      facets: (spec.facets && spec.facets.length) ? spec.facets : null,
      color: spec.color || COLORS[state.habits.length % COLORS.length],
      createdAt: spec.createdAt || todayKey()
    };
    state.habits.push(h);
    save();
    return h;
  }

  function updateHabit(id, patch) {
    const h = state.habits.find(x => x.id === id);
    if (!h) return null;
    Object.assign(h, patch);
    save();
    return h;
  }

  function deleteHabit(id) {
    state.habits = state.habits.filter(h => h.id !== id);
    for (const k in state.log) {
      delete state.log[k][id];
      if (!Object.keys(state.log[k]).length) delete state.log[k];
    }
    save();
  }

  function getValue(habitId, dateKey) {
    const d = state.log[dateKey];
    return (d && typeof d[habitId] === 'number') ? d[habitId] : 0;
  }

  function logSet(habitId, dateKey, value) {
    if (!state.log[dateKey]) state.log[dateKey] = {};
    if (value <= 0) {
      delete state.log[dateKey][habitId];
      if (!Object.keys(state.log[dateKey]).length) delete state.log[dateKey];
    } else {
      state.log[dateKey][habitId] = value;
    }
    save();
  }

  function logAdd(habitId, dateKey, delta) {
    logSet(habitId, dateKey, Math.max(0, getValue(habitId, dateKey) + delta));
  }

  function exportJSON() { return JSON.stringify(state, null, 2); }

  function importJSON(text) {
    try {
      const s = JSON.parse(text);
      if (!s || s.version !== 1 || !Array.isArray(s.habits) || !s.log || typeof s.log !== 'object') {
        return { ok: false, error: 'unrecognized file format' };
      }
      state = s;
      state.settings = Object.assign(defaultState().settings, s.settings || {});
      if (!state.firstRunAt) state.firstRunAt = Date.now();
      save();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'invalid JSON' };
    }
  }

  function wipe() { state = defaultState(); save(); }

  /* ---------- demo portfolio: 6 securities, ~120 sessions of tape ---------- */
  function loadDemo() {
    state = defaultState();
    muted = true;
    try {
      const today = todayKey();
      const start = U.addDays(today, -119);
      /* p(t): probability of completing, t = 0..1 across history (lets us shape trends) */
      const defs = [
        { ticker: 'MEDT', name: 'Meditation', type: 'bool', sched: { kind: 'daily', days: [] }, color: COLORS[0],
          kw: ['meditation', 'mindfulness'], p: t => 0.52 + 0.42 * t },
        { ticker: 'RUN5', name: '5K Run', type: 'bool', sched: { kind: 'weekdays', days: [1, 3, 5] }, color: COLORS[1],
          kw: ['running', 'aerobic exercise'], p: t => (t > 0.45 && t < 0.6) ? 0.45 : 0.88 },
        { ticker: 'READ', name: 'Read 20 Pages', type: 'qty', target: 20, unit: 'pages', sched: { kind: 'daily', days: [] }, color: COLORS[2],
          kw: ['reading habits', 'bibliotherapy'], p: t => 0.92 - 0.45 * t },
        { ticker: 'H2O', name: 'Hydration', type: 'qty', target: 8, unit: 'glasses', sched: { kind: 'daily', days: [] }, color: COLORS[6],
          kw: ['hydration', 'water intake'], p: t => 0.55 + 0.25 * t },
        { ticker: 'CODE', name: 'Ship Side Project', type: 'bool', sched: { kind: 'weekdays', days: [1, 2, 3, 4, 5] }, color: COLORS[4],
          kw: ['deep work', 'programmer productivity'], p: t => 0.7 + 0.18 * Math.sin(t * 9) },
        { ticker: 'SLP', name: 'Lights Out 23:00', type: 'bool', sched: { kind: 'daily', days: [] }, color: COLORS[3],
          kw: ['sleep hygiene', 'circadian rhythm'], p: () => 0.64 }
      ];
      let seed = 42;
      const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

      defs.forEach(d => {
        const h = addHabit({
          name: d.name, ticker: d.ticker, type: d.type, target: d.target, unit: d.unit,
          schedule: d.sched, keywords: d.kw, color: d.color, createdAt: start
        });
        for (let i = 0; i <= 119; i++) {
          const k = U.addDays(start, i);
          const wd = U.weekday(k);
          if (d.sched.kind === 'weekdays' && d.sched.days.indexOf(wd) < 0) continue;
          if (k === today) {
            /* leave most of today open so there is something to do */
            if (d.ticker === 'MEDT') logSet(h.id, k, 1);
            if (d.ticker === 'H2O') logSet(h.id, k, 5);
            continue;
          }
          const t = i / 119;
          const pr = Math.max(0.05, Math.min(0.97, d.p(t)));
          if (rnd() < pr) {
            logSet(h.id, k, d.type === 'qty' ? (d.target || 1) + Math.floor(rnd() * 3) : 1);
          } else if (d.type === 'qty' && rnd() < 0.5) {
            logSet(h.id, k, Math.max(1, Math.floor((d.target || 1) * (0.2 + rnd() * 0.55))));
          }
        }
      });
    } finally {
      muted = false;
      save();
    }
  }

  return {
    COLORS, load, save, settings, updateSettings, todayKey, firstRunAt,
    habits, getHabit, suggestTicker, addHabit, updateHabit, deleteHabit,
    getValue, logSet, logAdd,
    exportJSON, importJSON, wipe, loadDemo
  };
})();
