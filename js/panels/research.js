/* HABITERM — panels/research.js : Discover.
   Live feeds per habit: PubMed studies, Hacker News products & discussion, Wikipedia primer. */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.research = (function () {
  const U = HT.util, S = HT.store, F = HT.feed;
  let tok = 0;        /* render token — drops stale async fills */
  let force = false;  /* next render bypasses the cache */

  function forceNext() { force = true; }

  function studyItem(it, i, showTk) {
    return '<div class="feed-item"><span class="fi-num">' + (i + 1) + '</span>' +
      '<div class="fi-body">' +
      '<div class="fi-title"><a href="' + U.esc(it.url) + '" target="_blank" rel="noopener">' + U.esc(it.title) + '</a></div>' +
      '<div class="fi-meta">' + (showTk ? '<span class="fi-src">' + U.esc(it.tk) + '</span> · ' : '') +
      '<span class="fi-src">PubMed</span>' +
      (it.journal ? ' · ' + U.esc(it.journal) : '') +
      (it.date ? ' · ' + U.esc(it.date) : '') +
      (it.authors ? ' · ' + U.esc(it.authors) : '') +
      '</div></div></div>';
  }

  function wireItem(it, i, showTk) {
    return '<div class="feed-item"><span class="fi-num">' + (i + 1) + '</span>' +
      '<div class="fi-body">' +
      '<div class="fi-title"><a href="' + U.esc(it.url) + '" target="_blank" rel="noopener">' + U.esc(it.title) + '</a></div>' +
      '<div class="fi-meta">' + (showTk ? '<span class="fi-src">' + U.esc(it.tk) + '</span> · ' : '') +
      '<span class="fi-src">HN</span> · ▲' + it.points + ' · ' + it.comments + ' comments · ' + U.relTime(it.at) +
      ' · <a href="' + U.esc(it.hn) + '" target="_blank" rel="noopener">thread</a></div></div></div>';
  }

  function stamp(r) {
    if (!r) return '';
    return '<div class="feed-status">' + (r.stale ? 'Couldn\'t reach the feed — showing a copy from ' : r.cached ? 'Updated ' : 'Live · fetched ') +
      U.relTime(r.ts) + (r.cached ? ' · hit Refresh for the latest' : '') + '</div>';
  }

  function render(root, arg) {
    const hs = S.habits();
    if (!hs.length) { HT.app.emptyState(root); return; }
    const cur = arg ? S.getHabit(arg) : null;
    const myTok = ++tok;
    const f = force;
    force = false;

    const tabs =
      '<div class="restabs">' +
      '<button class="btn btn-sm' + (!cur ? ' btn-acc' : '') + '" data-res="">All habits</button>' +
      hs.map(h => '<button class="btn btn-sm' + (cur && cur.id === h.id ? ' btn-acc' : '') + '" data-res="' + U.esc(h.ticker) + '">' + U.esc(h.name) + '</button>').join('') +
      '<span style="flex:1"></span>' +
      '<button class="btn btn-sm" id="res-refresh" title="Skip the 6-hour cache">↻ Refresh</button>' +
      (cur ? '<button class="btn btn-sm" data-cmd="EDIT ' + U.esc(cur.ticker) + '" title="Edit this habit\'s search keywords">Edit keywords</button>' : '') +
      '</div>';

    root.innerHTML =
      '<div class="panel"><div class="panel-h">' +
      '<span>Discover' + (cur ? ' · ' + U.esc(cur.name) : '') + '</span>' +
      '<span class="ph-aux">research, products & ideas for your habits</span></div>' +
      '<div class="panel-b">' + tabs +
      (cur ? '<div id="res-primer"></div>' : '') +
      (cur
        ? '<div class="section-title">📱 Latest apps &amp; tools</div>' +
          '<div id="res-apps" class="prod-grid"><div class="feed-status blink">Finding apps…</div></div>' +
          '<div class="section-title">🛒 Gear for this habit</div>' +
          '<div id="res-gear" class="chips"></div>'
        : '<div class="dim" style="font-size:12.5px;margin:2px 0 6px">Pick a habit above to see its latest apps, tools and gear.</div>') +
      '<div class="grid" style="margin-top:14px">' +
      '<div class="col-6"><div class="section-title">🔬 Latest research</div>' +
      '<div id="res-studies"><div class="feed-status blink">Loading studies…</div></div></div>' +
      '<div class="col-6"><div class="section-title">💬 Launches & discussion</div>' +
      '<div id="res-wire"><div class="feed-status blink">Loading discussions…</div></div></div>' +
      '</div>' +
      (cur && cur.keywords ? '<div class="dim" style="font-size:11.5px;margin-top:12px">Searching for: ' +
        U.esc(cur.keywords.join(' · ')) + '</div>' : '') +
      '</div></div>';

    root.querySelectorAll('[data-res]').forEach(b => {
      b.onclick = () => HT.app.navigate('res', b.dataset.res || null);
    });
    root.querySelector('#res-refresh').onclick = () => { force = true; HT.app.render(); };

    loadFeeds(root, cur, myTok, f);
  }

  function appCard(a) {
    const meta = [
      a.rating != null ? '★ ' + a.rating + (a.ratings ? ' (' + (a.ratings >= 1000 ? Math.round(a.ratings / 1000) + 'k' : a.ratings) + ')' : '') : '',
      a.price, a.genre
    ].filter(Boolean).join(' · ');
    return '<a class="prod-card" href="' + U.esc(a.url) + '" target="_blank" rel="noopener">' +
      (a.icon ? '<img class="prod-icon" src="' + U.esc(a.icon) + '" alt="" loading="lazy">' : '<span class="prod-icon prod-icon-blank">📱</span>') +
      '<span class="prod-body"><span class="prod-name">' + U.esc(a.name) + '</span>' +
      '<span class="prod-meta">' + U.esc(meta || a.dev) + '</span></span></a>';
  }

  function gearLinks(cur) {
    const P = HT.premium ? HT.premium.CONFIG : {};
    const tag = P.amazonTag ? '&tag=' + encodeURIComponent(P.amazonTag) : '';
    const kws = (cur.keywords && cur.keywords.length ? cur.keywords : [cur.name]).slice(0, 2);
    const links = [];
    kws.forEach(kw => {
      const q = encodeURIComponent(kw + ' gear');
      links.push('<a class="btn btn-sm" href="https://www.amazon.com/s?k=' + q + tag + '" target="_blank" rel="noopener">🛒 ' + U.esc(kw) + ' gear on Amazon ↗</a>');
    });
    const q0 = encodeURIComponent(kws[0]);
    links.push('<a class="btn btn-sm" href="https://www.etsy.com/search?q=' + q0 + '" target="_blank" rel="noopener">Etsy ↗</a>');
    links.push('<a class="btn btn-sm" href="https://www.ebay.com/sch/i.html?_nkw=' + q0 + '" target="_blank" rel="noopener">eBay ↗</a>');
    return links.join('');
  }

  async function loadFeeds(root, cur, myTok, f) {
    const targets = cur ? [cur] : S.habits().slice(0, 4);
    const showTk = !cur;

    if (cur) {
      /* gear links are instant */
      const gr = root.querySelector('#res-gear');
      if (gr) gr.innerHTML = gearLinks(cur);

      /* apps & tools */
      const apEl = root.querySelector('#res-apps');
      F.apps((cur.keywords && cur.keywords[0]) || cur.name, 6, f).then(r => {
        if (tok !== myTok || !apEl) return;
        apEl.innerHTML = r.items.length
          ? r.items.map(appCard).join('')
          : '<div class="feed-status">No apps found for these keywords.</div>';
      }).catch(e => {
        if (tok === myTok && apEl) apEl.innerHTML =
          '<div class="feed-status err">Couldn\'t reach the App Store (' + U.esc(e.message || 'network') + ').</div>';
      });
    }

    if (cur) {
      F.primer(cur.keywords[0] || cur.name, f).then(r => {
        const el = root.querySelector('#res-primer');
        if (tok !== myTok || !el || !r.items.length) return;
        const it = r.items[0];
        el.innerHTML = '<div class="section-title">📖 Primer</div>' +
          '<div class="primer"><b>' + U.esc(it.title) + ':</b> ' + U.esc(it.extract) +
          (it.url ? ' <a href="' + U.esc(it.url) + '" target="_blank" rel="noopener">Wikipedia</a>' : '') +
          '</div><hr class="hr">';
      }).catch(() => { /* primer is optional garnish */ });
    }

    /* studies */
    const stEl = root.querySelector('#res-studies');
    try {
      const per = cur ? 8 : 3;
      const items = [];
      let last = null;
      for (const h of targets) {
        const q = (h.keywords && h.keywords.length) ? h.keywords.join(' OR ') : h.name;
        const r = await F.studies(q, per, f);
        if (tok !== myTok) return;
        last = r;
        r.items.forEach(it => items.push(Object.assign({ tk: h.ticker }, it)));
      }
      stEl.innerHTML = items.length
        ? items.map((it, i) => studyItem(it, i, showTk)).join('') + stamp(last)
        : '<div class="feed-status">No recent studies for these keywords — try broader ones via Edit keywords.</div>';
    } catch (e) {
      if (tok === myTok) stEl.innerHTML =
        '<div class="feed-status err">Couldn\'t reach PubMed (' + U.esc(e.message || 'network') + ') — your tracker still works. Hit Refresh to retry.</div>';
    }

    /* products & discussion */
    const wiEl = root.querySelector('#res-wire');
    try {
      const per = cur ? 10 : 3;
      let items = [];
      let last = null;
      for (const h of targets) {
        const q = (h.keywords && h.keywords[0]) || h.name;
        const r = await F.wire(q, per, f);
        if (tok !== myTok) return;
        last = r;
        r.items.forEach(it => items.push(Object.assign({ tk: h.ticker }, it)));
      }
      items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
      wiEl.innerHTML = items.length
        ? items.map((it, i) => wireItem(it, i, showTk)).join('') + stamp(last)
        : '<div class="feed-status">Nothing new for these keywords right now.</div>';
    } catch (e) {
      if (tok === myTok) wiEl.innerHTML =
        '<div class="feed-status err">Couldn\'t load discussions (' + U.esc(e.message || 'network') + ') — your tracker still works. Hit Refresh to retry.</div>';
    }
  }

  return { render, forceNext };
})();
