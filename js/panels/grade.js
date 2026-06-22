/* HABITERM — panels/grade.js : the Health page — growth tiers, overall health, advice */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.grade = (function () {
  const U = HT.util, S = HT.store, M = HT.metrics;

  const PART_LABELS = { C30: '30-day', TRD: 'Momentum', STK: 'Streak', CON: 'Consistency', LIFE: 'All-time' };
  const PART_WEIGHTS = { C30: '45%', TRD: '20%', STK: '15%', CON: '10%', LIFE: '10%' };
  const OUTLOOK = { POSITIVE: 'Improving', NEGATIVE: 'Slipping', STABLE: 'Steady', NEW: 'New' };

  function healthLabel(score) {
    if (score == null) return 'Not rated yet';
    if (score >= 85) return 'Your habits are thriving 🎉';
    if (score >= 70) return 'Strong and steady';
    if (score >= 55) return 'Growing nicely';
    if (score >= 35) return 'Building momentum';
    return 'Time to show these some love';
  }

  function render(root) {
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }
    if (!HT.premium.active()) {
      HT.premium.renderLock(root, {
        emoji: '🌳',
        title: 'Habit Health is a Premium feature',
        sub: 'A growth tier for every habit, your overall health score,<br>and coaching advice on what to nurture first.'
      });
      return;
    }

    const cards = hs.map(h => ({ h: h, g: M.gradeOf(h) }))
      .sort((a, b) => (b.g.score == null ? -1 : b.g.score) - (a.g.score == null ? -1 : a.g.score));
    const health = M.healthScore();
    const htier = M.healthTier();
    const pos = cards.filter(c => c.g.outlook === 'POSITIVE').length;
    const neg = cards.filter(c => c.g.outlook === 'NEGATIVE').length;
    const ring = health == null ? 0 : Math.round(health);

    root.innerHTML =
      '<div class="grid">' +
      '<div class="panel col-4"><div class="panel-h"><span>Habit health</span>' +
      '<span class="ph-aux"><button class="btn btn-sm" data-cmd="RPT">Full stats</button></span></div>' +
      '<div class="panel-b" style="text-align:center">' +
        '<div class="health-ring" style="--p:' + ring + '">' +
          '<div class="health-ring-in"><div class="health-emoji">' + htier.emoji + '</div>' +
          '<div class="hero-num num" style="font-size:30px">' + (health == null ? '—' : ring) + '</div></div>' +
        '</div>' +
        '<div class="tier-badge tier-' + htier.key + '" style="margin-top:12px;font-size:14px;padding:4px 14px">' + htier.emoji + ' ' + htier.label + '</div>' +
        '<div class="dim" style="margin-top:8px">' + healthLabel(health) + '</div>' +
        '<div class="kv" style="margin-top:16px;text-align:left">' +
          '<span class="k">Rated habits</span><span class="v num">' + cards.filter(c => c.g.score != null).length + ' of ' + hs.length + '</span>' +
          '<span class="k">Improving</span><span class="v num up">' + pos + '</span>' +
          '<span class="k">Slipping</span><span class="v num ' + (neg ? 'dn' : 'dim') + '">' + neg + '</span>' +
        '</div>' +
        '<div class="dim" style="font-size:11.5px;margin-top:16px;line-height:1.6;text-align:left">Health blends: 45% 30-day completion · 20% momentum (this week vs this month) · 15% streak · 10% consistency · 10% all-time record.</div>' +
      '</div></div>' +

      '<div class="panel col-8"><div class="panel-h"><span>Your habits</span><span class="ph-aux">tap one for details</span></div>' +
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
        '<div class="gc-letter"><div class="tier-emoji">' + g.tier.emoji + '</div>' +
        '<div class="gc-score num">' + (g.score == null ? 'New' : Math.round(g.score) + '/100') + '</div></div>' +
        '<div class="gc-main">' +
          '<div><span class="tkr-dot" style="background:' + c.h.color + '"></span><span class="tkr">' + U.esc(c.h.name) + '</span> ' +
          U.tierBadge(g.tier) +
          ' <span class="tag ' + (oCls === 'up' ? 'tag-fill' : oCls === 'dn' ? '' : 'tag-off') + '" ' +
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
