/* HABITERM — charts.js : hand-rolled canvas charts (no dependencies) */
window.HT = window.HT || {};

HT.charts = (function () {

  const FONT = '"Segoe UI", -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';

  function cssVar(name, fallback) {
    return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
  }

  function accent() { return cssVar('--acc', '#6c5ce7'); }
  function gridColor() { return cssVar('--chart-grid', 'rgba(32,40,62,0.08)'); }
  function labelColor() { return cssVar('--chart-label', '#98a1b8'); }

  function hexA(hex, a) {
    let h = String(hex || '#6c5ce7').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function setup(c, cssH) {
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth || (c.parentNode && c.parentNode.clientWidth) || 300;
    const h = cssH || 120;
    c.style.height = h + 'px';
    c.width = Math.max(60, Math.round(w * dpr));
    c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx: ctx, W: c.width / dpr, H: h };
  }

  /* pts: [{v: number, k: 'Jun 9'}], opts: {height, color, base, min, max, yfmt, xlabels} */
  function line(c, pts, opts) {
    opts = opts || {};
    const s = setup(c, opts.height || 160);
    const ctx = s.ctx, W = s.W, H = s.H;
    ctx.clearRect(0, 0, W, H);
    if (!pts || pts.length < 2) {
      ctx.fillStyle = labelColor();
      ctx.font = '12px ' + FONT;
      ctx.fillText('Not enough data yet', 8, 20);
      return;
    }
    const padL = 6, padR = 50, padT = 10, padB = (opts.xlabels === false) ? 6 : 18;
    const yfmt = opts.yfmt || (x => x.toFixed(0));
    let min = Infinity, max = -Infinity;
    pts.forEach(p => { if (p.v < min) min = p.v; if (p.v > max) max = p.v; });
    if (opts.min != null && opts.min < min) min = opts.min;
    if (opts.max != null && opts.max > max) max = opts.max;
    if (max - min < 1e-9) { max += 1; min -= 1; }
    const pad = (max - min) * 0.08;
    min -= pad; max += pad;

    const X = i => padL + (W - padL - padR) * (i / (pts.length - 1));
    const Y = v => padT + (H - padT - padB) * (1 - (v - min) / (max - min));
    const col = opts.color || accent();
    const lab = labelColor();

    ctx.font = '10.5px ' + FONT;
    ctx.textBaseline = 'middle';
    for (let g = 0; g <= 2; g++) {
      const v = min + (max - min) * (g / 2);
      const y = Y(v);
      ctx.strokeStyle = gridColor();
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = lab;
      ctx.fillText(yfmt(v), W - padR + 6, y);
    }
    if (opts.base != null && opts.base > min && opts.base < max) {
      const y = Y(opts.base);
      ctx.strokeStyle = gridColor();
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.setLineDash([]);
    }

    /* area fill */
    ctx.beginPath();
    pts.forEach((p, i) => { i ? ctx.lineTo(X(i), Y(p.v)) : ctx.moveTo(X(i), Y(p.v)); });
    ctx.lineTo(X(pts.length - 1), H - padB);
    ctx.lineTo(X(0), H - padB);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
    grad.addColorStop(0, hexA(col, 0.20));
    grad.addColorStop(1, hexA(col, 0.02));
    ctx.fillStyle = grad;
    ctx.fill();

    /* line */
    ctx.beginPath();
    pts.forEach((p, i) => { i ? ctx.lineTo(X(i), Y(p.v)) : ctx.moveTo(X(i), Y(p.v)); });
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    /* last value marker + value tag */
    const lv = pts[pts.length - 1].v;
    const ly = Y(lv);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(X(pts.length - 1), ly, 3, 0, 7); ctx.fill();
    const labTxt = yfmt(lv);
    ctx.font = '600 10.5px ' + FONT;
    const tw = ctx.measureText(labTxt).width;
    roundRect(ctx, W - padR + 2, ly - 8, tw + 10, 16, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(labTxt, W - padR + 7, ly);

    if (opts.xlabels !== false) {
      ctx.fillStyle = lab;
      ctx.font = '10px ' + FONT;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(pts[0].k || '', padL, H - 5);
      const endLab = pts[pts.length - 1].k || '';
      ctx.fillText(endLab, W - padR - ctx.measureText(endLab).width - 4, H - 5);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* minimal sparkline: vals = [numbers] */
  function spark(c, vals, opts) {
    opts = opts || {};
    const s = setup(c, opts.height || 34);
    const ctx = s.ctx, W = s.W, H = s.H;
    ctx.clearRect(0, 0, W, H);
    if (!vals || vals.length < 2) return;
    let min = Infinity, max = -Infinity;
    vals.forEach(v => { if (v < min) min = v; if (v > max) max = v; });
    if (max - min < 1e-9) { max += 1; min -= 1; }
    const X = i => 2 + (W - 4) * (i / (vals.length - 1));
    const Y = v => 3 + (H - 6) * (1 - (v - min) / (max - min));
    const col = opts.color ||
      (vals[vals.length - 1] >= vals[0] ? cssVar('--up', '#16a34a') : cssVar('--dn', '#e23c52'));
    ctx.beginPath();
    vals.forEach((v, i) => { i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)); });
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(X(vals.length - 1), Y(vals[vals.length - 1]), 2, 0, 7); ctx.fill();
  }

  return { line, spark, hexA, accent };
})();
