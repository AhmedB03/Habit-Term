/* HABITERM — panels/grade.js : the report card — letter grades, GPA, advisory notes */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.grade = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics;

  const PART_LABELS = { C30: '30D FILL', TRD: 'MOMENTUM', STK: 'STREAK', CON: 'CONSISTENCY', LIFE: 'LIFETIME' };
  const PART_WEIGHTS = { C30: '45%', TRD: '20%', STK: '15%', CON: '10%', LIFE: '10%' };

  function gpaLabel(g) {
    if (g == null) return 'NOT RATED';
    if (g >= 3.7) return "DEAN'S LIST";
    if (g >= 3.0) return 'SOLID BOOK';
    if (g >= 2.0) return 'UNDER REVIEW';
    return 'RESTRUCTURING REQUIRED';
  }

  function render(root) {
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }

    const cards = hs.map(h => ({ h: h, g: M.gradeOf(h) }))
      .sort((a, b) => (b.g.score == null ? -1 : b.g.score) - (a.g.score == null ? -1 : a.g.score));
    const gpa = M.gpa();
    const pos = cards.filter(c => c.g.outlook === 'POSITIVE').length;
    const neg = cards.filter(c => c.g.outlook === 'NEGATIVE').length;

    root.innerHTML =
      '<div class="grid">' +
      '<div class="panel col-4"><div class="panel-h"><span>PORTFOLIO GPA</span></div>' +
      '<div class="panel-b">' +
        '<div class="hero-num num ' + (gpa != null && gpa >= 3 ? 'up' : gpa != null && gpa < 2 ? 'dn' : '') + '">' +
          (gpa == null ? 'NR' : gpa.toFixed(2)) + '</div>' +
        '<div class="hero-sub acc">' + gpaLabel(gpa) + '</div>' +
        '<div class="kv" style="margin-top:12px">' +
          '<span class="k">RATED SECURITIES</span><span class="v num">' + cards.filter(c => c.g.letter !== 'NR').length + ' / ' + hs.length + '</span>' +
          '<span class="k">POSITIVE OUTLOOK</span><span class="v num up">' + pos + '</span>' +
          '<span class="k">NEGATIVE OUTLOOK</span><span class="v num ' + (neg ? 'dn' : 'dim') + '">' + neg + '</span>' +
        '</div>' +
        '<div class="dim" style="font-size:10px;margin-top:14px;line-height:1.6">GRADE MODEL: 45% 30-DAY FILL RATE · 20% MOMENTUM (7D VS 30D) · 15% STREAK POWER · 10% WEEK-TO-WEEK CONSISTENCY · 10% LIFETIME RECORD.</div>' +
      '</div></div>' +

      '<div class="panel col-8"><div class="panel-h"><span>REPORT CARD</span><span class="ph-aux">CLICK A ROW FOR THE FULL TEAR SHEET</span></div>' +
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
        '<div class="gc-score num">' + (g.score == null ? 'UNRATED' : g.score.toFixed(1) + ' PTS') + '</div></div>' +
        '<div class="gc-main">' +
          '<div><span class="tkr-dot" style="background:' + c.h.color + '"></span><span class="tkr">' + U.esc(c.h.ticker) + '</span> ' +
          '<span class="dim">' + U.esc(c.h.name) + '</span> · <span class="' + oCls + '" style="font-size:10px;letter-spacing:1px">OUTLOOK ' + g.outlook + '</span></div>' +
          '<div class="gc-advice">▍' + U.esc(g.advice) + '</div>' +
          parts +
        '</div>';
      wrap.appendChild(card);
    });
  }

  return { render };
})();
