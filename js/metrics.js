/* HABITERM — metrics.js : streaks, fill rates, momentum prices, grades, correlations, alerts */
window.HT = window.HT || {};

HT.metrics = (function () {
  const U = HT.util;
  const S = HT.store;
  const MAXDAYS = 1500;   /* hard cap on history walks */

  function isScheduled(h, key) {
    if (key < h.createdAt) return false;
    if (h.schedule.kind === 'daily') return true;
    return h.schedule.days.indexOf(U.weekday(key)) >= 0;
  }

  function target(h) { return h.type === 'qty' ? (h.target || 1) : 1; }
  function frac(h, key) { return U.clamp(S.getValue(h.id, key) / target(h), 0, 1); }
  function done(h, key) { return S.getValue(h.id, key) >= target(h); }

  function scheduleDesc(h) {
    if (h.schedule.kind === 'daily') return 'Every day';
    return h.schedule.days.map(d => U.WD[d]).join(' · ') || 'Never';
  }

  /* current streak as of a date; an unfilled "today" doesn't break the run */
  function streak(h, asOf) {
    let k = asOf || S.todayKey();
    let s = 0;
    if (isScheduled(h, k) && !done(h, k)) k = U.addDays(k, -1);
    for (let i = 0; i < MAXDAYS; i++) {
      if (k < h.createdAt) break;
      if (isScheduled(h, k)) {
        if (done(h, k)) s++;
        else break;
      }
      k = U.addDays(k, -1);
    }
    return s;
  }

  function bestStreak(h) {
    const today = S.todayKey();
    let k = h.createdAt, cur = 0, best = 0;
    for (let i = 0; i < MAXDAYS && k <= today; i++) {
      if (isScheduled(h, k)) {
        if (done(h, k)) { cur++; if (cur > best) best = cur; }
        else if (k !== today) cur = 0;   /* today still pending */
      }
      k = U.addDays(k, 1);
    }
    return best;
  }

  function scheduledCount(h) {
    const today = S.todayKey();
    let c = 0, k = h.createdAt;
    for (let i = 0; i < MAXDAYS && k <= today; i++) {
      if (isScheduled(h, k)) c++;
      k = U.addDays(k, 1);
    }
    return c;
  }

  /* due / filled / rate over the n days ending at asOf (default today).
     An empty "today" is excluded so mornings don't drag the stats. */
  function windowStats(h, nDays, asOf) {
    const today = S.todayKey();
    const end = asOf || today;
    let due = 0, filled = 0, fsum = 0;
    for (let i = 0; i < nDays; i++) {
      const k = U.addDays(end, -i);
      if (k < h.createdAt) break;
      if (k === today && S.getValue(h.id, k) === 0) continue;
      if (isScheduled(h, k)) {
        due++;
        fsum += frac(h, k);
        if (done(h, k)) filled++;
      }
    }
    return { due, filled, rate: due ? fsum / due : null };
  }

  function rate(h, nDays, asOf) { return windowStats(h, nDays, asOf).rate; }

  function rateAll(h) {
    const n = U.daysBetween(h.createdAt, S.todayKey()) + 1;
    return rate(h, Math.min(n, MAXDAYS));
  }

  /* ---------- momentum "price": starts at 100, compounds with fills ---------- */
  function priceSeries(h, n) {
    const today = S.todayKey();
    let p = 100;
    const out = [];
    let k = h.createdAt;
    const cap = Math.min(U.daysBetween(h.createdAt, today) + 1, MAXDAYS);
    for (let i = 0; i < cap; i++) {
      if (isScheduled(h, k) && !(k === today && S.getValue(h.id, k) === 0)) {
        const f = frac(h, k);
        p = U.clamp(p * (1 + (-0.022 + f * 0.040)), 25, 400);
      }
      out.push({ key: k, p: p });
      k = U.addDays(k, 1);
    }
    if (!out.length) out.push({ key: today, p: 100 });
    return n ? out.slice(-n) : out;
  }

  function price(h) { const s = priceSeries(h); return s[s.length - 1].p; }

  function priceDelta(h, days) {
    const s = priceSeries(h);
    if (s.length < 2) return 0;
    const last = s[s.length - 1].p;
    const prev = s[Math.max(0, s.length - 1 - (days || 1))].p;
    return prev === 0 ? 0 : (last - prev) / prev * 100;
  }

  function volatility(h) {
    const ps = priceSeries(h, 30);
    const rets = [];
    for (let i = 1; i < ps.length; i++) rets.push((ps[i].p - ps[i - 1].p) / ps[i - 1].p);
    return U.stdev(rets) * 100;
  }

  /* composite index = average price across all listed habits, per day */
  function habixSeries(n) {
    const hs = S.habits();
    if (!hs.length) return [];
    const today = S.todayKey();
    const maps = hs.map(h => {
      const m = {};
      priceSeries(h).forEach(pt => { m[pt.key] = pt.p; });
      return m;
    });
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const k = U.addDays(today, -i);
      let sum = 0, c = 0;
      maps.forEach(m => { if (m[k] != null) { sum += m[k]; c++; } });
      if (c) out.push({ key: k, p: sum / c });
    }
    return out;
  }

  /* ---------- grading ---------- */
  const LETTERS = [[97, 'A+'], [93, 'A'], [90, 'A-'], [87, 'B+'], [83, 'B'], [80, 'B-'],
                   [77, 'C+'], [73, 'C'], [70, 'C-'], [67, 'D+'], [63, 'D'], [60, 'D-'], [0, 'F']];
  const POINTS = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
                   'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0 };

  function letterFor(score) {
    for (let i = 0; i < LETTERS.length; i++) if (score >= LETTERS[i][0]) return LETTERS[i][1];
    return 'F';
  }

  function weeklyRates(h, weeks) {
    const today = S.todayKey();
    const out = [];
    for (let w = 0; w < (weeks || 8); w++) {
      const r = rate(h, 7, U.addDays(today, -7 * w));
      if (r != null) out.push(r);
    }
    return out;
  }

  function gradeOf(h) {
    if (scheduledCount(h) < 5) {
      return { letter: 'NR', score: null, parts: null, outlook: 'NEW',
               advice: 'Brand new — your grade unlocks after 5 scheduled days.' };
    }
    const r30 = rate(h, 30); const r30v = r30 == null ? 0 : r30;
    const r7 = rate(h, 7); const r7v = r7 == null ? r30v : r7;
    const all = rateAll(h); const allv = all == null ? 0 : all;
    const st = streak(h);

    /* sqrt curve: 85% fill is genuinely excellent and should grade like it */
    const C30 = Math.sqrt(r30v) * 100;                        /* 30d fill rate */
    const TRD = U.clamp(75 + (r7v - r30v) * 200, 0, 100);     /* momentum: 7d vs 30d, stable = 75 */
    const STK = Math.min(st / 14, 1) * 100;                   /* streak power, 14d = full marks */
    const wr = weeklyRates(h, 8);
    const CON = wr.length >= 3 ? U.clamp(100 - U.stdev(wr) * 220, 0, 100) : 70;  /* consistency */
    const LIFE = Math.sqrt(allv) * 100;                       /* lifetime */
    const score = 0.45 * C30 + 0.20 * TRD + 0.15 * STK + 0.10 * CON + 0.10 * LIFE;
    const letter = letterFor(score);
    const drift = r7v - r30v;
    const outlook = drift > 0.07 ? 'POSITIVE' : drift < -0.07 ? 'NEGATIVE' : 'STABLE';

    let advice;
    if (score >= 90 && st >= 10) advice = 'Rock solid — protect that streak!';
    else if (TRD < 35) advice = 'Losing steam — make the goal smaller and easy to win, then build back up.';
    else if (C30 < 50) advice = 'Done less than half the time this month — try fewer scheduled days and nail those first.';
    else if (STK < 30 && C30 >= 70) advice = 'Strong month but fragile streaks — aim for 7 days in a row.';
    else if (outlook === 'POSITIVE') advice = 'Trending up — keep doing what you\'re doing.';
    else advice = 'Steady. Consistency compounds.';

    return { letter, score, parts: { C30, TRD, STK, CON, LIFE }, outlook, advice };
  }

  function gpa() {
    const gs = S.habits().map(gradeOf).filter(g => g.letter !== 'NR');
    if (!gs.length) return null;
    return gs.reduce((a, g) => a + POINTS[g.letter], 0) / gs.length;
  }

  /* ---------- portfolio-level ---------- */
  function movers() {
    return S.habits().map(h => ({ h, d7: priceDelta(h, 7) })).sort((a, b) => b.d7 - a.d7);
  }

  function dayCompletion(key) {
    let due = 0, filled = 0, fsum = 0;
    S.habits().forEach(h => {
      if (!isScheduled(h, key)) return;
      due++;
      fsum += frac(h, key);
      if (done(h, key)) filled++;
    });
    return { due, filled, frac: due ? fsum / due : 0 };
  }

  function perfectDays(nDays) {
    const today = S.todayKey();
    let c = 0;
    for (let i = 1; i <= nDays; i++) {
      const dc = dayCompletion(U.addDays(today, -i));
      if (dc.due > 0 && dc.filled === dc.due) c++;
    }
    return c;
  }

  function portfolioStats(nDays) {
    let due = 0, filled = 0, fsum = 0;
    S.habits().forEach(h => {
      const w = windowStats(h, nDays);
      due += w.due;
      filled += w.filled;
      fsum += w.due * (w.rate || 0);
    });
    return { due, filled, rate: due ? fsum / due : null };
  }

  function weekdayRates(nDays) {
    const today = S.todayKey();
    const due = [0, 0, 0, 0, 0, 0, 0], got = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 1; i <= (nDays || 60); i++) {
      const k = U.addDays(today, -i);
      const wd = U.weekday(k);
      S.habits().forEach(h => {
        if (isScheduled(h, k)) { due[wd]++; got[wd] += frac(h, k); }
      });
    }
    return due.map((d, i) => d ? got[i] / d : null);
  }

  /* phi coefficient between habit pairs over the last 60 closed sessions */
  function correlations() {
    const hs = S.habits();
    const today = S.todayKey();
    const days = [];
    for (let i = 1; i <= 60; i++) days.push(U.addDays(today, -i));
    const m = hs.map(() => hs.map(() => null));
    for (let a = 0; a < hs.length; a++) {
      m[a][a] = 1;
      for (let b = a + 1; b < hs.length; b++) {
        let n11 = 0, n10 = 0, n01 = 0, n00 = 0;
        days.forEach(k => {
          if (!isScheduled(hs[a], k) || !isScheduled(hs[b], k)) return;
          const da = done(hs[a], k), db = done(hs[b], k);
          if (da && db) n11++;
          else if (da) n10++;
          else if (db) n01++;
          else n00++;
        });
        const tot = n11 + n10 + n01 + n00;
        if (tot >= 14) {
          const den = Math.sqrt((n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00));
          m[a][b] = m[b][a] = den === 0 ? 0 : (n11 * n00 - n10 * n01) / den;
        }
      }
    }
    return m;
  }

  /* ---------- alert engine ---------- */
  function alerts() {
    const out = [];
    const today = S.todayKey();
    const yda = U.addDays(today, -1);

    S.habits().forEach(h => {
      if (isScheduled(h, yda) && !done(h, yda)) {
        const prior = streak(h, U.addDays(yda, -1));
        if (prior >= 5) out.push({ sev: 'red', text: 'Streak broken — ' + h.name + '\'s ' + prior + '-day run ended yesterday.' });
      }
      const r7 = rate(h, 7), r30 = rate(h, 30);
      if (r7 != null && r30 != null && r7 < r30 - 0.2) {
        out.push({ sev: 'red', text: h.name + ' is slipping — ' + Math.round(r7 * 100) + '% this week vs ' + Math.round(r30 * 100) + '% this month.' });
      }
      if (isScheduled(h, today) && !done(h, today)) {
        const st = streak(h);
        if (st >= 3) out.push({ sev: 'yel', text: 'Don\'t break the chain! ' + h.name + ' has a ' + st + '-day streak — do it today.' });
      }
      const ps = priceSeries(h);
      if (ps.length > 10) {
        const last = ps[ps.length - 1].p;
        let max = 0;
        ps.forEach(x => { if (x.p > max) max = x.p; });
        if (last >= max && last > 110) out.push({ sev: 'grn', text: h.name + ' just hit an all-time momentum high of ' + last.toFixed(1) + '!' });
      }
    });

    const yc = dayCompletion(yda);
    if (yc.due > 0 && yc.filled === yc.due) {
      out.push({ sev: 'grn', text: 'Perfect day yesterday — everything done 🎉' });
    }

    const order = { red: 0, yel: 1, grn: 2 };
    out.sort((a, b) => order[a.sev] - order[b.sev]);
    return out.slice(0, 7);
  }

  return {
    isScheduled, target, frac, done, scheduleDesc,
    streak, bestStreak, scheduledCount,
    windowStats, rate, rateAll, weeklyRates,
    priceSeries, price, priceDelta, volatility, habixSeries,
    gradeOf, gpa, letterFor,
    movers, dayCompletion, perfectDays, portfolioStats, weekdayRates,
    correlations, alerts
  };
})();
