/* HABITERM — feed.js : live research feeds (PubMed, Hacker News, Wikipedia)
   All public, key-free, CORS-enabled APIs. Responses cached in localStorage for 6h. */
window.HT = window.HT || {};

HT.feed = (function () {
  const TTL = 6 * 3600 * 1000;
  const PRE = 'habiterm_feed_';

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(PRE + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function cacheSet(key, items) {
    try { localStorage.setItem(PRE + key, JSON.stringify({ ts: Date.now(), items: items })); }
    catch (e) { /* quota — feeds are disposable */ }
  }

  async function getJSON(url, timeoutMs) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs || 12000);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(t); }
  }

  async function cached(kind, query, force, fetcher) {
    const key = kind + '_' + String(query).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
    const hit = cacheGet(key);
    if (hit && !force && (Date.now() - hit.ts) < TTL) {
      return { items: hit.items, ts: hit.ts, cached: true };
    }
    try {
      const items = await fetcher();
      cacheSet(key, items);
      return { items: items, ts: Date.now(), cached: false };
    } catch (e) {
      if (hit) return { items: hit.items, ts: hit.ts, cached: true, stale: true };
      throw e;
    }
  }

  /* NCBI allows ~3 req/s without an API key — chain eutils calls ~400ms apart */
  let pmChain = Promise.resolve();
  function pmGet(url) {
    const p = pmChain.then(() => getJSON(url));
    pmChain = p.catch(() => {}).then(() => new Promise(res => setTimeout(res, 400)));
    return p;
  }

  /* latest studies via NCBI PubMed E-utilities (default sort: most recent) */
  function studies(query, n, force) {
    return cached('pm', query + '_' + n, force, async () => {
      const es = await pmGet(
        'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=' +
        n + '&term=' + encodeURIComponent(query)
      );
      const ids = (es.esearchresult && es.esearchresult.idlist) || [];
      if (!ids.length) return [];
      const sum = await pmGet(
        'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=' + ids.join(',')
      );
      const r = sum.result || {};
      return ids.map(id => r[id]).filter(Boolean).map(it => ({
        title: it.title || '(untitled)',
        journal: it.fulljournalname || it.source || '',
        date: it.pubdate || '',
        authors: (it.authors || []).slice(0, 3).map(a => a.name).join(', '),
        url: 'https://pubmed.ncbi.nlm.nih.gov/' + it.uid + '/'
      }));
    });
  }

  /* products & discussion via Hacker News (Algolia), newest first, min 5 points */
  function wire(query, n, force) {
    return cached('hn', query + '_' + n, force, async () => {
      const j = await getJSON(
        'https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=' + n +
        '&numericFilters=points%3E%3D5&query=' + encodeURIComponent(query)
      );
      return (j.hits || []).map(h => ({
        title: h.title || '(untitled)',
        url: h.url || ('https://news.ycombinator.com/item?id=' + h.objectID),
        hn: 'https://news.ycombinator.com/item?id=' + h.objectID,
        points: h.points || 0,
        comments: h.num_comments || 0,
        at: h.created_at || ''
      }));
    });
  }

  /* JSONP fallback for APIs without CORS (iTunes Search) */
  function getJSONP(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const cb = '__ht_jsonp_' + Math.random().toString(36).slice(2);
      const s = document.createElement('script');
      const t = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, timeoutMs || 12000);
      function cleanup() { clearTimeout(t); delete window[cb]; s.remove(); }
      window[cb] = data => { cleanup(); resolve(data); };
      s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + cb;
      s.onerror = () => { cleanup(); reject(new Error('network')); };
      document.head.appendChild(s);
    });
  }

  /* latest apps & tools via the iTunes Search API (key-free) */
  function apps(query, n, force) {
    return cached('app', query + '_' + n, force, async () => {
      const j = await getJSONP(
        'https://itunes.apple.com/search?media=software&entity=software&limit=' + n +
        '&term=' + encodeURIComponent(query)
      );
      return (j.results || []).map(r => ({
        name: r.trackName || '(untitled)',
        dev: r.artistName || '',
        icon: r.artworkUrl100 || '',
        rating: r.averageUserRating ? Math.round(r.averageUserRating * 10) / 10 : null,
        ratings: r.userRatingCount || 0,
        price: r.formattedPrice || (r.price === 0 ? 'Free' : ''),
        url: r.trackViewUrl || '',
        genre: (r.genres && r.genres[0]) || ''
      }));
    });
  }

  /* topic primer via Wikipedia REST summary */
  function primer(topic, force) {
    return cached('wp', topic, force, async () => {
      const j = await getJSON(
        'https://en.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(String(topic).replace(/ /g, '_')) + '?redirect=true'
      );
      if (!j || !j.extract) return [];
      return [{
        title: j.title || topic,
        extract: j.extract,
        url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ''
      }];
    });
  }

  return { studies, wire, primer, apps };
})();
