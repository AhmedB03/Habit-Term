/* HABITERM — panels/grade.js : the report card — letter grades, GPA, advice */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.grade = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics;

  const PART_LABELS = { C30: '30-day', TRD: 'Momentum', STK: 'Streak', CON: 'Consistency', LIFE: 'All-time' };
  const PART_WEIGHTS = { C30: '45%', TRD: '20%', STK: '15%', CON: '10%', LIFE: '10%' };
  const OUTLOOK = { POSITIVE: 'Improving', NEGATIVE: 'Slipping', STABLE: 'Steady', NEW: 'New' };

  function gpaLabel(g) {
    if (g == null) return 'Not graded yet';
    if (g >= 3.7) return "Dean's list 🏅";
    if (g >= 3.0) return 'Solid work';
    if (g >= 2.0) return 'Needs focus';
    return 'Time for a reset';
  }

  function render(root) {
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }
    if (!HT.premium.active()) {
      HT.premium.renderLock(root, {
        emoji: '🎓',
        title: 'The report card is a Premium feature',
        sub: 'Letter grades for every habit, an overall GPA,<br>and coaching advice on what to fix first.'
      });
      return;
    }

    const cards = hs.map(h => ({ h: h, g: M.gradeOf(h) }))
      .sort((a, b) => (b.g.score == null ? -1 : b.g.score) - (a.g.score == null ? -1 : a.g.score));
    const gpa = M.gpa();
    const pos = cards.filter(c => c.g.outlook === 'POSITIVE').length;
    const neg = cards.filter(c => c.g.outlook === 'NEGATIVE').length;

    root.innerHTML =
      '<div class="grid">' +
      '<div class="panel col-4"><div class="panel-h"><span>Grade average</span></div>' +
      '<div class="panel-b">' +
        '<div class="hero-num num ' + (gpa != null && gpa >= 3 ? 'up' : gpa != null && gpa < 2 ? 'dn' : '') + '">' +
          (gpa == null ? '—' : gpa.toFixed(2)) + '</div>' +
        '<div class="hero-sub acc" style="font-weight:600">' + gpaLabel(gpa) + '</div>' +
        '<div class="kv" style="margin-top:14px">' +
          '<span class="k">Graded habits</span><span class="v num">' + cards.filter(c => c.g.letter !== 'NR').length + ' of ' + hs.length + '</span>' +
          '<span class="k">Improving</span><span class="v num up">' + pos + '</span>' +
          '<span class="k">Slipping</span><span class="v num ' + (neg ? 'dn' : 'dim') + '">' + neg + '</span>' +
        '</div>' +
        '<div class="dim" style="font-size:11.5px;margin-top:16px;line-height:1.6">How grades work: 45% 30-day completion · 20% momentum (this week vs this month) · 15% streak · 10% consistency · 10% all-time record.</div>' +
      '</div></div>' +

      '<div class="panel col-8"><div class="panel-h"><span>Report card</span><span class="ph-aux">click a habit for details</span></div>' +
      '<div class="panel-b" id="gr-cards"></div></div>' +
      '</div>';

    const wrap = root.querySelector('#gr-cards');
    cards.forEach(c => {
      const g = c.g;
      const card = document.createElement('div');
      card.className = 'gradecard rowlink';
      card.style.cursor = 'pointer';
      card.onclick = () => HT.app.navigate('hab', c.h.ticker);

      let parts = '';
      if (g.parts) {
        parts = '<div class="gc-parts">' + Object.keys(g.parts).map(k =>
          '<span class="gc-part">' + PART_LABELS[k] + ' <b>' + Math.round(g.parts[k]) + '</b>' +
          '<span class="minibar"><i style="width:' + Math.round(g.parts[k]) + '%"></i></span>' +
          ' <span title="weight">' + PART_WEIGHTS[k] + '</span></span>'
        ).join('') + '</div>';
      }
      const oCls = g.outlook === 'POSITIVE' ? 'up' : g.outlook === 'NEGATIVE' ? 'dn' : 'dim';
      card.innerHTML =
        '<div class="gc-letter"><div class="grade-letter g-' + g.letter[0] + '">' + g.letter + '</div>' +
        '<div class="gc-score num">' + (g.score == null ? 'New' : g.score.toFixed(1) + ' / 100') + '</div></div>' +
        '<div class="gc-main">' +
          '<div><span class="tkr-dot" style="background:' + c.h.color + '"></span><span class="tkr">' + U.esc(c.h.name) + '</span> ' +
          '<span class="tag ' + (oCls === 'up' ? 'tag-fill' : oCls === 'dn' ? '' : 'tag-off') + '" ' +
          (oCls === 'dn' ? 'style="background:var(--dn-soft);color:var(--dn)"' : '') + '>' +
          (OUTLOOK[g.outlook] || g.outlook) + '</span></div>' +
          '<div class="gc-advice">' + U.esc(g.advice) + '</div>' +
          parts +
        '</div>';
      wrap.appendChild(card);
    });
  }

  return { render };
})();
