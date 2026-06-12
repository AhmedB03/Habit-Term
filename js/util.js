/* HABITERM — util.js : dates, formatting, misc helpers */
window.HT = window.HT || {};

HT.util = (function () {
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* date keys are local-time 'YYYY-MM-DD' strings; they compare correctly as strings */
  function keyFromDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseKey(k) { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); }
  function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return keyFromDate(d); }
  function weekday(k) { return parseKey(k).getDay(); }
  function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
  function monthLabel(k) { const d = parseKey(k); return MONTHS_FULL[d.getMonth()] + ' ' + d.getFullYear(); }
  function shortDate(k) { const d = parseKey(k); return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function longDate(k) { const d = parseKey(k); return WD[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ' ' + d.getFullYear(); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function fmtPct(x, d) { return (x == null || isNaN(x)) ? '—' : (x * 100).toFixed(d == null ? 0 : d) + '%'; }
  function signed(x, d, suf) {
    if (x == null || isNaN(x)) return '—';
    const v = x.toFixed(d == null ? 1 : d);
    return (x >= 0 ? '+' : '') + v + (suf || '');
  }
  function arrow(x) { return x > 0.0001 ? '↑' : x < -0.0001 ? '↓' : '·'; }
  function udClass(x) { return x > 0.0001 ? 'up' : x < -0.0001 ? 'dn' : 'dim'; }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function debounce(fn, ms) { let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  function relTime(iso) {
    const t = typeof iso === 'number' ? iso : Date.parse(iso);
    if (isNaN(t)) return '';
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.round(h / 24);
    if (d < 30) return d + 'd ago';
    const dt = new Date(t);
    return MONTHS[dt.getMonth()] + ' ' + dt.getFullYear();
  }

  function stdev(arr) {
    if (!arr.length) return 0;
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length);
  }

  return {
    WD, MONTHS, MONTHS_FULL,
    pad2, keyFromDate, parseKey, addDays, weekday, daysBetween,
    monthLabel, shortDate, longDate,
    esc, clamp, fmtPct, signed, arrow, udClass,
    uid, download, debounce, relTime, stdev
  };
})();
