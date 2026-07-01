/* ============================================================
   charts.js — dependency-free SVG charts.
   Colors reference CSS custom properties (var(--accent) …) so
   they recolor automatically on theme switch. Axes read LTR
   (numeric convention) even in RTL, which is standard for
   data dashboards.
   ============================================================ */
(function () {
  "use strict";
  let LANG = "en";
  function setLang(l) { LANG = (l === "ar") ? "ar" : "en"; }
  const nf = (n) => Math.round(n).toLocaleString(LANG === "ar" ? "ar-EG" : "en-US");
  const loc = () => (LANG === "ar" ? "ar-EG" : "en-US");
  // lang-aware decimal (fixed places, keeps trailing zeros) and percent
  const df = (n, places) => {
    const p = places == null ? 1 : places;
    return Number(n).toLocaleString(loc(), { minimumFractionDigits: p, maximumFractionDigits: p });
  };
  // integer or decimal, minimal — for values that are already whole or 1-dp
  const nfd = (n) => Number(n).toLocaleString(loc(), { maximumFractionDigits: 1 });
  // percent: value is a number (e.g. 96.9 or 97), returns localized digits + "%"
  const pf = (n) => nfd(n) + "%";
  const niceMax = (v) => {
    if (v <= 0) return 10;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / pow;
    const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return step * pow;
  };

  /* ---------- grouped bars: inbound vs outbound over months ---------- */
  function groupedBars(rows, opts) {
    opts = opts || {};
    const W = 660, H = 250, padL = 46, padR = 14, padT = 14, padB = 34;
    const iw = W - padL - padR, ih = H - padT - padB;
    const max = niceMax(Math.max(1, ...rows.flatMap((r) => [r.a, r.b])));
    const n = rows.length, slot = iw / n, bw = Math.min(26, slot / 3.4);
    const y = (v) => padT + ih - (v / max) * ih;
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const yy = padT + (ih / 4) * i, val = max - (max / 4) * i;
      g += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
      g += `<text x="${padL - 8}" y="${(yy + 3.5).toFixed(1)}" text-anchor="end" font-size="10">${nf(val)}</text>`;
    }
    rows.forEach((r, i) => {
      const cx = padL + slot * i + slot / 2;
      const x1 = cx - bw - 2, x2 = cx + 2;
      g += `<rect x="${x1.toFixed(1)}" y="${y(r.a).toFixed(1)}" width="${bw}" height="${(padT + ih - y(r.a)).toFixed(1)}" rx="3" fill="var(--accent)"/>`;
      g += `<rect x="${x2.toFixed(1)}" y="${y(r.b).toFixed(1)}" width="${bw}" height="${(padT + ih - y(r.b)).toFixed(1)}" rx="3" fill="var(--violet)"/>`;
      g += `<text x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="10.5">${r.label}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.aria || ""}">${g}</svg></div>`;
  }

  /* ---------- line: on-time % vs target ---------- */
  function lineTarget(rows, opts) {
    opts = opts || {};
    const W = 660, H = 250, padL = 40, padR = 16, padT = 16, padB = 32;
    const iw = W - padL - padR, ih = H - padT - padB;
    const lo = 80, hi = 100;
    const x = (i) => padL + (iw / (rows.length - 1)) * i;
    const y = (v) => padT + ih - ((v - lo) / (hi - lo)) * ih;
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const yy = padT + (ih / 4) * i, val = hi - ((hi - lo) / 4) * i;
      g += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
      g += `<text x="${padL - 7}" y="${(yy + 3.5).toFixed(1)}" text-anchor="end" font-size="10">${pf(val)}</text>`;
    }
    const tgt = opts.target != null ? opts.target : 95;
    const ty = y(tgt);
    g += `<line x1="${padL}" y1="${ty.toFixed(1)}" x2="${W - padR}" y2="${ty.toFixed(1)}" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    g += `<text x="${W - padR}" y="${(ty - 5).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--warn)">${opts.targetLabel || "Target"}</text>`;
    const pts = rows.map((r, i) => [x(i), y(r.v)]);
    const area = `M ${padL} ${padT + ih} ` + pts.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") + ` L ${x(rows.length - 1)} ${padT + ih} Z`;
    g += `<path d="${area}" fill="var(--accent-weak)"/>`;
    g += `<polyline points="${pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`;
    rows.forEach((r, i) => {
      g += `<circle cx="${x(i).toFixed(1)}" cy="${y(r.v).toFixed(1)}" r="3.6" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>`;
      g += `<text x="${x(i).toFixed(1)}" y="${(y(r.v) - 11).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--fg-2)" font-weight="700">${nfd(r.v)}</text>`;
      g += `<text x="${x(i).toFixed(1)}" y="${H - 11}" text-anchor="middle" font-size="10.5">${r.label}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.aria || ""}">${g}</svg></div>`;
  }

  /* ---------- area line (single series, e.g. items) ---------- */
  function area(rows, opts) {
    opts = opts || {};
    const W = 660, H = 230, padL = 44, padR = 16, padT = 14, padB = 30;
    const iw = W - padL - padR, ih = H - padT - padB;
    const max = niceMax(Math.max(1, ...rows.map((r) => r.v)));
    const x = (i) => padL + (iw / (rows.length - 1)) * i;
    const y = (v) => padT + ih - (v / max) * ih;
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const yy = padT + (ih / 4) * i, val = max - (max / 4) * i;
      g += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
      g += `<text x="${padL - 7}" y="${(yy + 3.5).toFixed(1)}" text-anchor="end" font-size="10">${nf(val)}</text>`;
    }
    const pts = rows.map((r, i) => [x(i), y(r.v)]);
    const areaP = `M ${padL} ${padT + ih} ` + pts.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") + ` L ${x(rows.length - 1)} ${padT + ih} Z`;
    g += `<path d="${areaP}" fill="var(--violet-weak)"/>`;
    g += `<polyline points="${pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="none" stroke="var(--violet)" stroke-width="2.5" stroke-linejoin="round"/>`;
    rows.forEach((r, i) => {
      g += `<circle cx="${x(i).toFixed(1)}" cy="${y(r.v).toFixed(1)}" r="3.4" fill="var(--surface)" stroke="var(--violet)" stroke-width="2"/>`;
      g += `<text x="${x(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="10.5">${r.label}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.aria || ""}">${g}</svg></div>`;
  }

  /* ---------- donut ---------- */
  function donut(segs, opts) {
    opts = opts || {};
    const S = 230, cx = S / 2, cy = S / 2, rO = 96, rI = 62;
    const total = segs.reduce((a, s) => a + s.v, 0) || 1;
    let ang = -Math.PI / 2, g = "";
    const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    segs.forEach((s) => {
      const frac = s.v / total, a2 = ang + frac * Math.PI * 2;
      const large = a2 - ang > Math.PI ? 1 : 0;
      const [x1, y1] = pt(rO, ang), [x2, y2] = pt(rO, a2);
      const [x3, y3] = pt(rI, a2), [x4, y4] = pt(rI, ang);
      g += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rO} ${rO} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${rI} ${rI} 0 ${large} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`;
      ang = a2;
    });
    const center = opts.center
      ? `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--fg)">${opts.center}</text>
         <text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="11" fill="var(--muted)">${opts.centerSub || ""}</text>`
      : "";
    return `<div class="chart" style="max-width:240px;margin-inline:auto"><svg viewBox="0 0 ${S} ${S}" role="img" aria-label="${opts.aria || ""}">${g}${center}</svg></div>`;
  }

  /* ---------- sparkline (KPI cards) ---------- */
  function spark(values, color) {
    const W = 110, H = 34, p = 3;
    const max = Math.max(...values), min = Math.min(...values), rng = (max - min) || 1;
    const x = (i) => p + ((W - p * 2) / (values.length - 1)) * i;
    const y = (v) => p + (H - p * 2) - ((v - min) / rng) * (H - p * 2);
    const pts = values.map((v, i) => [x(i), y(v)]);
    const line = pts.map((pp) => pp[0].toFixed(1) + "," + pp[1].toFixed(1)).join(" ");
    const fill = `M ${pts[0][0].toFixed(1)} ${H} ` + pts.map((pp) => `L ${pp[0].toFixed(1)} ${pp[1].toFixed(1)}`).join(" ") + ` L ${pts[pts.length - 1][0].toFixed(1)} ${H} Z`;
    return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <path d="${fill}" fill="${color}" opacity="0.13"/>
      <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="2.6" fill="${color}"/>
    </svg>`;
  }

  /* ---------- mini ring gauge (on-time clearance) ---------- */
  function ring(pct, opts) {
    opts = opts || {};
    const S = 132, cx = S / 2, cy = S / 2, r = 54, c = 2 * Math.PI * r;
    const off = c * (1 - pct / 100);
    const col = pct >= 95 ? "var(--ok)" : pct >= 90 ? "var(--warn)" : "var(--danger)";
    return `<div class="gauge" style="width:${S}px;height:${S}px">
      <svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="11"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="11" stroke-linecap="round"
          stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
      </svg>
      <div class="gv"><b>${pf(pct)}</b><span>${opts.label || ""}</span></div>
    </div>`;
  }

  window.CH = { groupedBars, lineTarget, area, donut, spark, ring, nf, df, nfd, pf, niceMax, setLang };
})();
