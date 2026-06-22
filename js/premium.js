/* HABITERM — premium.js : free plan limits, trial, license keys, upgrade page.

   ── SELLER SETUP (that's you) ─────────────────────────────────────────────
   1. CONFIG.checkoutUrl  → your Gumroad / Lemon Squeezy / Stripe Payment Link.
   2. CONFIG.amazonTag    → your Amazon Associates tag (powers the Gear links).
   3. Keys: anything matching HT-XXXX-XXXX-XXXX activates the app. Generate
      them however you like (Gumroad can auto-issue license keys). Validation
      is client-side / honor-system; for real verification, call your payment
      provider's license API inside activate() below.
   ──────────────────────────────────────────────────────────────────────── */
window.HT = window.HT || {};

HT.premium = (function () {
  const S = HT.store;

  const CONFIG = {
    priceLabel: '$19',
    periodLabel: 'one-time, yours forever',
    checkoutUrl: '',          /* e.g. 'https://yourname.gumroad.com/l/habiterm' */
    amazonTag: ''             /* e.g. 'habiterm-20' */
  };
  const TRIAL_DAYS = 14;
  const FREE_HABIT_LIMIT = 3;

  function license() { return S.settings().license || null; }
  function keyValid(k) { return /^HT(-[A-Z0-9]{4}){3}$/.test(String(k || '').trim().toUpperCase()); }
  function isPaid() { const l = license(); return !!(l && keyValid(l.key)); }

  function trialDaysLeft() {
    const used = Math.floor((Date.now() - S.firstRunAt()) / 86400000);
    return Math.max(0, TRIAL_DAYS - used);
  }

  function active() { return isPaid() || trialDaysLeft() > 0; }

  function activate(key) {
    const k = String(key || '').trim().toUpperCase();
    if (!keyValid(k)) return { ok: false, error: 'That key doesn\'t look right — the format is HT-XXXX-XXXX-XXXX.' };
    /* Real-world hook: verify k against Gumroad/Lemon Squeezy license API here. */
    S.updateSettings({ license: { key: k, activatedAt: S.todayKey() } });
    return { ok: true };
  }

  function deactivate() { S.updateSettings({ license: null }); }

  function canAddHabit() { return active() || S.habits().length < FREE_HABIT_LIMIT; }

  function statusText() {
    if (isPaid()) return 'Premium active — thank you! 💜';
    const d = trialDaysLeft();
    return d > 0 ? 'Free trial · ' + d + ' day' + (d === 1 ? '' : 's') + ' left' : 'Free plan';
  }

  function gate(what) {
    HT.app.msg((what || 'This feature') + ' is part of Habiterm Premium.', 'info');
    HT.app.navigate('premium');
  }

  /* shared lock screen for gated pages */
  function renderLock(root, opts) {
    root.innerHTML =
      '<div class="panel"><div class="panel-b"><div class="empty">' +
      '<div style="font-size:44px;margin-bottom:12px">' + (opts.emoji || '👑') + '</div>' +
      '<div class="e-big">' + opts.title + '</div>' +
      '<div class="e-sub">' + opts.sub + '</div>' +
      '<button class="btn btn-acc" data-cmd="PREMIUM">👑 See Premium</button>' +
      (trialDaysLeft() <= 0 ? '<div class="dim" style="margin-top:16px;font-size:12px">Your free trial has ended — everything you tracked is safe.</div>' : '') +
      '</div></div></div>';
  }

  return { CONFIG, TRIAL_DAYS, FREE_HABIT_LIMIT,
           active, isPaid, trialDaysLeft, statusText,
           activate, deactivate, canAddHabit, gate, renderLock, license };
})();

/* ---------- the Premium page ---------- */
HT.panels = HT.panels || {};
HT.panels.premium = (function () {
  const U = HT.util, P = HT.premium;

  function compareRow(feat, free, pro) {
    return '<tr><td>' + feat + '</td><td class="r dim">' + free + '</td><td class="r up" style="font-weight:600">' + pro + '</td></tr>';
  }

  function render(root) {
    const paid = P.isPaid();
    const trial = P.trialDaysLeft();

    const status = paid
      ? '<div class="alert-row"><span class="al-flag al-grn">Active</span><span>Premium is active — thank you for supporting Habiterm! 💜</span></div>' +
        '<div class="dim" style="font-size:12.5px;margin:6px 0 12px">License ' + U.esc(P.license().key.replace(/^(HT-[A-Z0-9]{4}).+$/, '$1-····-····')) +
        ' · activated ' + U.esc(P.license().activatedAt) +
        ' · <a href="#" id="pr-deact">remove key</a></div>'
      : trial > 0
        ? '<div class="alert-row"><span class="al-flag al-yel">Trial</span><span>You\'re on the free trial — <b>' + trial + ' day' + (trial === 1 ? '' : 's') + ' left</b> with everything unlocked.</span></div>'
        : '<div class="alert-row"><span class="al-flag al-red">Free plan</span><span>Your trial has ended. Your data is safe — upgrade to unlock everything again.</span></div>';

    root.innerHTML =
      '<div class="grid">' +

      '<div class="panel col-5"><div class="panel-h"><span>👑 Habiterm Premium</span></div>' +
      '<div class="panel-b">' + status +
        '<div class="price-num num">' + P.CONFIG.priceLabel + '</div>' +
        '<div class="dim" style="font-size:13px;margin-bottom:14px">' + P.CONFIG.periodLabel + '</div>' +
        '<div class="feat-list">' +
        '<div class="feat"><span class="fk">✓</span> Unlimited habits <span class="dim">(free: ' + P.FREE_HABIT_LIMIT + ')</span></div>' +
        '<div class="feat"><span class="fk">✓</span> Full Stats — trends, weekdays, habit pairs</div>' +
        '<div class="feat"><span class="fk">✓</span> Habit Health — growth tiers &amp; advice</div>' +
        '<div class="feat"><span class="fk">✓</span> Dark mode + all accent colors</div>' +
        '<div class="feat"><span class="fk">✓</span> Every future Premium feature</div>' +
        '<div class="feat"><span class="fk">✓</span> Support an indie developer 💜</div>' +
        '</div>' +
        (paid ? '' :
          '<button class="btn btn-acc" id="pr-buy" style="margin-top:16px;font-size:14px;padding:10px 22px">Get Premium — ' + P.CONFIG.priceLabel + '</button>') +
      '</div></div>' +

      '<div class="col-7">' +
      (paid ? '' :
        '<div class="panel"><div class="panel-h"><span>Already have a key?</span></div>' +
        '<div class="panel-b"><div class="inline">' +
        '<input class="in" id="pr-key" placeholder="HT-XXXX-XXXX-XXXX" style="max-width:260px;text-transform:uppercase">' +
        '<button class="btn btn-acc" id="pr-activate">Activate</button>' +
        '</div><div class="form-err hidden" id="pr-err"></div>' +
        '<div class="dim" style="font-size:12px;margin-top:10px">Your key arrives by email right after purchase. Activation works offline.</div>' +
        '</div></div>') +

      '<div class="panel" style="margin-top:' + (paid ? '0' : '14px') + '"><div class="panel-h"><span>Free vs Premium</span></div>' +
      '<div class="panel-b"><table class="tbl"><thead><tr><th>Feature</th><th class="r">Free</th><th class="r">Premium</th></tr></thead><tbody>' +
      compareRow('Habits', P.FREE_HABIT_LIMIT, 'Unlimited') +
      compareRow('Today, Calendar &amp; Home', '✓', '✓') +
      compareRow('Streaks &amp; momentum scores', '✓', '✓') +
      compareRow('Discover — research, apps &amp; gear', '✓', '✓') +
      compareRow('Stats — trends &amp; habit pairs', '—', '✓') +
      compareRow('Habit Health — tiers &amp; advice', '—', '✓') +
      compareRow('Dark mode &amp; accent colors', '—', '✓') +
      compareRow('Backup export / import', '✓', '✓') +
      '</tbody></table>' +
      '<div class="dim" style="font-size:11.5px;margin-top:10px">Your data always stays on your device — Premium just unlocks features, never your own history.</div>' +
      '</div></div>' +
      '</div>' +

      '</div>';

    const buy = root.querySelector('#pr-buy');
    if (buy) buy.onclick = () => {
      if (P.CONFIG.checkoutUrl) window.open(P.CONFIG.checkoutUrl, '_blank', 'noopener');
      else HT.app.msg('Almost there: paste your checkout link into CONFIG.checkoutUrl in js/premium.js to start selling.', 'info');
    };

    const act = root.querySelector('#pr-activate');
    if (act) act.onclick = () => {
      const res = P.activate(root.querySelector('#pr-key').value);
      if (res.ok) {
        HT.app.applySettings();
        HT.app.msg('Welcome to Premium! Everything is unlocked. 🎉', 'ok');
        HT.app.navigate('premium');
      } else {
        const e = root.querySelector('#pr-err');
        e.textContent = res.error;
        e.classList.remove('hidden');
      }
    };

    const deact = root.querySelector('#pr-deact');
    if (deact) deact.onclick = (e) => {
      e.preventDefault();
      if (confirm('Remove your license key from this device?')) {
        P.deactivate();
        HT.app.applySettings();
        HT.app.navigate('premium');
      }
    };
  }

  return { render };
})();
