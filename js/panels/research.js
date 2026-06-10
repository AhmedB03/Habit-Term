/* HABITERM — panels/research.js : the research terminal.
   Live desks per habit: PubMed studies, Hacker News wire, Wikipedia primer. */
window.HT = window.HT || {};
HT.panels = HT.panels || {};

HT.panels.research = (function () {
  const U = HT.util, S = HT.store, F = HT.feed;
  let tok = 0;        /* render token — drops stale async fills */
  let force = false;  /* next render bypasses the cache */

  function forceNext() { force = true; }

  function studyItem(it, i, showTk) {
    return '<div class="feed-item"><span class="fi-num">' + U.pad2(i + 1) + ')</span>' +
      '<div class="fi-body">' +
      '<div class="fi-title"><a href="' + U.esc(it.url) + '" target="_blank" rel="noopener">' + U.esc(it.title) + '</a></div>' +
      '<div class="fi-meta">' + (showTk ? '<span class="fi-src">' + U.esc(it.tk) + '</span> · ' : '') +
      '<span class="fi-src">PUBMED</span>' +
      (it.journal ? ' · ' + U.esc(it.journal.toUpperCase()) : '') +
      (it.date ? ' · ' + U.esc(it.date.toUpperCase()) : '') +
      (it.authors ? ' · ' + U.esc(it.authors.toUpperCase()) : '') +
      '</div></div></div>';
  }

  function wireItem(it, i, showTk) {
    return '<div class="feed-item"><span class="fi-num">' + U.pad2(i + 1) + ')</span>' +
      '<div class="fi-body">' +
      '<div class="fi-title"><a href="' + U.esc(it.url) + '" target="_blank" rel="noopener">' + U.esc(it.title) + '</a></div>' +
      '<div class="fi-meta">' + (showTk ? '<span class="fi-src">' + U.esc(it.tk) + '</span> · ' : '') +
      '<span class="fi-src">HN</span> · ▲' + it.points + ' · ' + it.comments + ' COMMENTS · ' + U.relTime(it.at) +
      ' · <a href="' + U.esc(it.hn) + '" target="_blank" rel="noopener">THREAD</a></div></div></div>';
  }

  function stamp(r) {
    if (!r) return '';
    return '<div class="feed-status">' + (r.stale ? 'LIVE FETCH FAILED — SHOWING CACHE FROM ' : r.cached ? 'CACHED ' : 'LIVE · FETCHED ') +
      U.relTime(r.ts) + (r.cached ? ' · ⟳ REFRESH FOR LIVE' : '') + '</div>';
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
      '<button class="btn btn-sm' + (!cur ? ' btn-acc' : '') + '" data-res="">ALL DESKS</button>' +
      hs.map(h => '<button class="btn btn-sm' + (cur && cur.id === h.id ? ' btn-acc' : '') + '" data-res="' + U.esc(h.ticker) + '">' + U.esc(h.ticker) + '</button>').join('') +
      '<span style="flex:1"></span>' +
      '<button class="btn btn-sm" id="res-refresh" title="Bypass 6h cache">⟳ REFRESH</button>' +
      (cur ? '<button class="btn btn-sm" data-cmd="EDIT ' + U.esc(cur.ticker) + '" title="Edit search keywords">KEYWORDS</button>' : '') +
      '</div>';

    root.innerHTML =
      '<div class="panel"><div class="panel-h">' +
      '<span>RESEARCH TERMINAL' + (cur ? ' — ' + U.esc(cur.ticker) + ' · ' + U.esc(cur.name.toUpperCase()) : ' — ALL DESKS') + '</span>' +
      '<span class="ph-aux">PUBMED · HACKER NEWS · WIKIPEDIA</span></div>' +
      '<div class="panel-b">' + tabs +
      (cur ? '<div id="res-primer"></div>' : '') +
      '<div class="grid">' +
      '<div class="col-6"><div class="section-title">▍LATEST STUDIES — PUBMED</div>' +
      '<div id="res-studies"><div class="feed-status blink">CONNECTING TO PUBMED…</div></div></div>' +
      '<div class="col-6"><div class="section-title">▍THE WIRE — PRODUCTS &amp; DISCUSSION</div>' +
      '<div id="res-wire"><div class="feed-status blink">PULLING THE WIRE…</div></div></div>' +
      '</div>' +
      (cur && cur.keywords ? '<div class="dim" style="font-size:10px;margin-top:10px;letter-spacing:1px">SEARCH KEYWORDS: ' +
        U.esc(cur.keywords.join(' · ').toUpperCase()) + ' — AMEND VIA KEYWORDS BUTTON</div>' : '') +
      '</div></div>';

    root.querySelectorAll('[data-res]').forEach(b => {
      b.onclick = () => HT.app.navigate('res', b.dataset.res || null);
    });
    root.querySelector('#res-refresh').onclick = () => { force = true; HT.app.render(); };

    loadFeeds(root, cur, myTok, f);
  }

  async function loadFeeds(root, cur, myTok, f) {
    const targets = cur ? [cur] : S.habits().slice(0, 4);
    const showTk = !cur;

    if (cur) {
      F.primer(cur.keywords[0] || cur.name, f).then(r => {
        const el = root.querySelector('#res-primer');
        if (tok !== myTok || !el || !r.items.length) return;
        const it = r.items[0];
        el.innerHTML = '<div class="section-title">▍PRIMER</div>' +
          '<div class="primer"><b>' + U.esc(it.title.toUpperCase()) + ':</b> ' + U.esc(it.extract) +
          (it.url ? ' <a href="' + U.esc(it.url) + '" target="_blank" rel="noopener">[WIKIPEDIA]</a>' : '') +
          '</div><hr class="hr">';
      }).catch(() => { /* primer is optional garnish */ });
    }

    /* studies desk */
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
        : '<div class="feed-status">NO RECENT STUDIES FOR THESE KEYWORDS — TRY BROADER TERMS (KEYWORDS BUTTON).</div>';
    } catch (e) {
      if (tok === myTok) stEl.innerHTML =
        '<div class="feed-status err">PUBMED DESK UNAVAILABLE (' + U.esc(e.message || 'NETWORK') + ') — TRACKER UNAFFECTED. ⟳ REFRESH TO RETRY.</div>';
    }

    /* wire desk */
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
        : '<div class="feed-status">WIRE QUIET FOR THESE KEYWORDS.</div>';
    } catch (e) {
      if (tok === myTok) wiEl.innerHTML =
        '<div class="feed-status err">WIRE UNAVAILABLE (' + U.esc(e.message || 'NETWORK') + ') — TRACKER UNAFFECTED. ⟳ REFRESH TO RETRY.</div>';
    }
  }

  return { render, forceNext };
})();
