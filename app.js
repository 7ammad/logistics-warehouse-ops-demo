/* ============================================================
   app.js — render engine + state for the Logistics dashboard.
   Consumes: styles.css, i18n.js (t / I18N), data.js (DATA),
   charts.js (CH). Vanilla JS, no frameworks.
   ============================================================ */
(function () {
  "use strict";
  const D = window.DATA, t = window.t, I = window.I18N;
  const nf = CH.nf;
  const pf = CH.pf;   // lang-aware percent, e.g. "96.9%" / "٩٦٫٩٪"
  const nfd = CH.nfd; // lang-aware integer-or-1dp decimal
  const MONTHS = D.MONTHS, PROJECTS = D.PROJECTS;
  const PCOLORS = ["var(--accent)", "var(--violet)", "var(--info)", "var(--ok)", "var(--warn)", "var(--orange)", "var(--accent-2)"];
  const ROW_CAP = 60;

  /* ---------- state ---------- */
  const KEY = "siemens.logistics.sel";
  const defaults = { view: "overview", project: "all", month: D.LATEST, lang: "ar", theme: "dark", shipType: "all", docTab: "dn", docShip: null };
  let state = Object.assign({}, defaults);
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---------- small helpers ---------- */
  const L = (o) => (o ? (state.lang === "ar" ? o.ar : o.en) : "");
  const projName = (id) => { const p = D.project(id); return p ? L(p) : t("filter.all"); };
  const monName = (id) => { const m = D.month(id); return m ? L(m) : t("filter.allMonths"); };
  const monShort = (id) => { const m = D.month(id); return m ? (state.lang === "ar" ? m.sar : m.sen) : ""; };
  const money = (v) => nf(v);
  function mb32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  const seedFrom = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  const CHIP = {
    cleared: "ok", delivered: "ok", completed: "ok", issued: "ok", in_stock: "ok", closed: "muted",
    in_progress: "warn", in_transit: "info", scheduled: "info", open: "warn", held: "danger",
    low: "warn", out: "danger", gather: "info", palletized: "violet", boxed: "warn",
  };
  const chip = (st) => `<span class="chip ${CHIP[st] || "muted"}">${t("st." + st)}</span>`;
  const kitChip = (st) => `<span class="chip ${CHIP[st] || "muted"}">${t("st." + st)}</span>`;

  /* ---------- icons ---------- */
  const IP = {
    report: '<path d="M4 4h16v16H4z" opacity=".0"/><path d="M5 21V5a1 1 0 0 1 1-1h9l4 4v13"/><path d="M14 4v5h5"/><path d="M8 13h7M8 17h5"/>',
    shipIn: '<path d="M3 13h18l-1.5 6H4.5z"/><path d="M6 13V6h7l4 4v3"/><path d="M9 9V3M9 3l-2.5 2.5M9 3l2.5 2.5"/>',
    shipOut: '<path d="M3 13h18l-1.5 6H4.5z"/><path d="M6 13V6h7l4 4v3"/><path d="M9 3v6M9 9l-2.5-2.5M9 9l2.5-2.5"/>',
    box: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    truck: '<path d="M2 5h11v11H2zM13 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    percent: '<path d="M5 19L19 5"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    hours: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v4l3 2"/><path d="M9 2.5h6"/>',
    warehouse: '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-7h10v7"/><path d="M7 14h10"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M15.5 14.5A6 6 0 0 1 21 20"/>',
    equip: '<path d="M3 18V8l5-3 5 3v10"/><path d="M13 18v-6h7l1 6"/><circle cx="7" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/>',
    collection: '<path d="M4 7h16v13H4z"/><path d="M9 7V4h6v3"/><path d="M4 12h16"/>',
    alert: '<path d="M12 3l9 16H3z"/><path d="M12 9v5M12 17h.01"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h6"/>',
    inventory: '<path d="M4 4h16v6H4zM4 14h16v6H4z"/><path d="M8 7h.01M8 17h.01"/>',
    leaf: '<path d="M5 19c0-8 6-13 14-13 0 8-6 13-14 13z"/><path d="M5 19c3-5 7-7 11-8"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    flow: '<path d="M4 6h6M14 6h6M4 12h16M4 18h6M14 18h6"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>',
    print: '<path d="M6 9V3h12v6"/><path d="M6 18H4v-7h16v7h-2"/><path d="M8 14h8v7H8z"/>',
  };
  const icon = (n, cls) => `<svg class="${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${IP[n] || ""}</svg>`;
  const arrowUp = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  const arrowDn = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';

  /* ---------- monthly series (project-filtered, all months) ---------- */
  function monthSeries() {
    return MONTHS.map((m) => {
      const cs = D.CELLS.filter((c) => c.mon === m.id && (state.project === "all" || c.proj === state.project));
      const sum = (k) => cs.reduce((a, c) => a + c[k], 0);
      const inb = sum("inbound"), out = sum("outbound"), tot = inb + out;
      const won = cs.reduce((a, c) => a + c.onTimePct * (c.inbound + c.outbound), 0);
      const wav = cs.reduce((a, c) => a + c.avgDays * (c.inbound + c.outbound), 0);
      return {
        m, inbound: inb, outbound: out, equipment: sum("equipment"), collections: sum("collections"),
        items: sum("items"), mirs: sum("mirs"), manHours: sum("hours"), laborCost: sum("laborCost"),
        spaceCost: sum("spaceCost"), breaches: sum("breaches"),
        onTimePct: tot ? +(won / tot).toFixed(1) : 0, avgDays: tot ? +(wav / tot).toFixed(1) : 0,
      };
    });
  }

  /* ---------- KPI card ---------- */
  function kpiCard(cfg, agg, ser) {
    const vals = ser.map((s) => s[cfg.k]);
    let cur, prev;
    if (state.month !== "all") {
      const i = MONTHS.findIndex((m) => m.id === state.month);
      cur = vals[i]; prev = i > 0 ? vals[i - 1] : null;
    } else { cur = vals[vals.length - 1]; prev = vals[0]; }
    const vsLabel = state.month !== "all" ? t("vs.prev") : t("vs.first");

    let raw = agg[cfg.k];
    let disp, unit = cfg.unit ? t(cfg.unit) : "";
    if (cfg.pct) { disp = nfd(raw); unit = "%"; }
    else if (cfg.dec) { disp = nfd(+raw); }
    else { disp = nf(raw); }

    let deltaHtml = "";
    if (prev != null && prev !== 0) {
      const d = ((cur - prev) / prev) * 100;
      const flat = Math.abs(d) < 0.6;
      const isGood = cfg.lowerBetter ? d <= 0 : d >= 0;
      const cls = flat ? "flat" : isGood ? "up" : "down";
      const arrow = flat ? "" : d > 0 ? arrowUp : arrowDn;
      deltaHtml = `<span class="delta ${cls}">${arrow}${pf(Math.abs(d))}</span><span class="vs">${vsLabel}</span>`;
    } else {
      deltaHtml = `<span class="delta flat">—</span><span class="vs">${vsLabel}</span>`;
    }
    return `<div class="kpi ${cfg.cls || ""}">
      <div class="k-label">${icon(cfg.icon)}${t(cfg.label)}</div>
      <div class="k-value">${disp}${unit ? `<span class="unit">${unit}</span>` : ""}</div>
      <div class="k-foot">${deltaHtml}${CH.spark(vals, cfg.color)}</div>
    </div>`;
  }

  const OV_KPIS = [
    { k: "inbound", label: "kpi.inbound", icon: "shipIn", unit: "unit.shipment", cls: "", color: "var(--accent)" },
    { k: "outbound", label: "kpi.outbound", icon: "shipOut", unit: "unit.shipment", cls: "k-violet", color: "var(--violet)" },
    { k: "equipment", label: "kpi.equipment", icon: "equip", unit: "unit.unit", cls: "", color: "var(--accent)" },
    { k: "collections", label: "kpi.collections", icon: "collection", unit: "unit.order", cls: "", color: "var(--info)" },
    { k: "items", label: "kpi.items", icon: "box", unit: "unit.item", cls: "k-violet", color: "var(--violet)" },
    { k: "onTimePct", label: "kpi.ontime", icon: "percent", pct: true, cls: "k-ok", color: "var(--ok)" },
    { k: "avgDays", label: "kpi.avgdays", icon: "clock", unit: "unit.days", dec: true, lowerBetter: true, cls: "k-warn", color: "var(--warn)" },
    { k: "manHours", label: "kpi.manhours", icon: "hours", unit: "unit.hour", cls: "", color: "var(--accent)" },
    { k: "spaceCost", label: "kpi.spaceCost", icon: "warehouse", unit: "unit.sar", cls: "k-violet", color: "var(--violet)" },
    { k: "laborCost", label: "kpi.laborCost", icon: "people", unit: "unit.sar", cls: "", color: "var(--accent)" },
  ];

  /* ---------- narrative ---------- */
  function narrative(agg) {
    const scope = state.project === "all" ? `${nf(PROJECTS.length)} ${t("projects.word")}` : projName(state.project);
    const mlabel = state.month === "all" ? monName("all") : monName(state.month);
    const totalShip = agg.inbound + agg.outbound;
    let lead;
    if (state.lang === "ar") {
      lead = `خلال <b>${mlabel}</b> أنجز فريق اللوجستيات والمستودعات تخليص <b>${nf(totalShip)}</b> شحنة
        (<b>${nf(agg.inbound)}</b> واردة / <b>${nf(agg.outbound)}</b> صادرة) عبر <b>${scope}</b>،
        ونقل <b>${nf(agg.equipment)}</b> وحدة معدات كبيرة، وأنجز <b>${nf(agg.collections)}</b> أمر تجميع،
        وصرف <b>${nf(agg.items)}</b> صنفاً إلى قسم الحماية. بلغت نسبة الالتزام بالتخليص الجمركي
        <b>${pf(agg.onTimePct)}</b> مقابل المستهدف ≤ ٣ أيام (بمتوسط <b>${nfd(agg.avgDays)}</b> يوم)،
        مع <b>${nf(agg.breaches)}</b> تجاوزاً تمّت معالجته وتوثيقه في سجل الأسباب الجذرية.`;
    } else {
      lead = `In <b>${mlabel}</b>, the Logistics &amp; Warehouse team cleared <b>${nf(totalShip)}</b> shipments
        (<b>${nf(agg.inbound)}</b> inbound / <b>${nf(agg.outbound)}</b> outbound) across <b>${scope}</b>,
        moved <b>${nf(agg.equipment)}</b> large-equipment units, completed <b>${nf(agg.collections)}</b> collection orders,
        and issued <b>${nf(agg.items)}</b> items to the Protection department. Customs clearance held at
        <b>${pf(agg.onTimePct)}</b> on-time against the ≤ 3-day target (avg <b>${nfd(agg.avgDays)}</b> days),
        with <b>${nf(agg.breaches)}</b> breach(es) logged and resolved in the root-cause log.`;
    }
    const pill = (label, val) => `<span class="npill">${label}<b>${val}</b></span>`;
    return `<div class="narrative">
      <div class="eyebrow">${t("narr.eyebrow")} · ${mlabel}</div>
      <p class="lead">${lead}</p>
      <div class="pills">
        ${pill(t("kpi.ontime") + " ", pf(agg.onTimePct))}
        ${pill(t("kpi.avgdays") + " ", nfd(agg.avgDays) + " " + t("unit.days"))}
        ${pill(t("kpi.manhours") + " ", nf(agg.manHours) + " " + t("unit.hour"))}
        ${pill(t("kpi.spaceCost") + " ", nf(agg.spaceCost) + " " + t("sar"))}
        ${pill(t("kpi.laborCost") + " ", nf(agg.laborCost) + " " + t("sar"))}
      </div>
    </div>`;
  }

  /* ---------- shared table builder ---------- */
  function tableCard(titleKey, subKey, head, rows, total) {
    const shown = rows.length;
    return `<div class="card">
      <div class="card-head"><h3>${t(titleKey)}</h3><span class="sub">${subKey ? t(subKey) : ""}</span></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>
      <div class="table-foot"><span>${t("showing")} <b>${shown}</b> ${t("of")} <b>${nf(total != null ? total : shown)}</b></span><span class="spacer"></span></div>
    </div>`;
  }
  const th = (k, cls) => `<th class="${cls || ""}">${t(k)}</th>`;

  /* ============================================================
     VIEW: Overview / Management Report
     ============================================================ */
  function viewOverview() {
    const agg = D.aggregate(state);
    const ser = monthSeries();
    const bp = D.byProject(state);

    const kpis = OV_KPIS.map((c) => kpiCard(c, agg, ser)).join("");

    const volRows = ser.map((s) => ({ label: monShort(s.m.id), a: s.inbound, b: s.outbound }));
    const volChart = CH.groupedBars(volRows, { aria: t("chart.volTrend") });
    const clearRows = ser.map((s) => ({ label: monShort(s.m.id), v: s.onTimePct }));
    const clearChart = CH.lineTarget(clearRows, { target: 95, targetLabel: t("legend.target"), aria: t("chart.clearTrend") });

    // distribution donut by project
    const distSegs = bp.filter((b) => b.total > 0).map((b, i) => ({ v: b.total, color: PCOLORS[i % PCOLORS.length] }));
    const distTotal = distSegs.reduce((a, s) => a + s.v, 0);
    const distLegend = bp.filter((b) => b.total > 0).map((b, i) =>
      `<div class="si"><div class="l"><span class="swd" style="background:${PCOLORS[i % PCOLORS.length]}"></span>${L(b.proj)}</div><div class="v">${nf(b.total)}</div></div>`).join("");
    const distDonut = CH.donut(distSegs, { center: nf(distTotal), centerSub: t("th.volume"), aria: t("chart.byProject") });

    // cost split donut
    const costSegs = [
      { v: agg.spaceCost, color: "var(--accent)" },
      { v: agg.laborCost, color: "var(--violet)" },
    ];
    const costDonut = CH.donut(costSegs, { center: nf(agg.spaceCost + agg.laborCost), centerSub: t("sar"), aria: t("chart.costSplit") });
    const costLegend = `
      <div class="si"><div class="l"><span class="swd" style="background:var(--accent)"></span>${t("legend.space")}</div><div class="v">${nf(agg.spaceCost)}</div></div>
      <div class="si"><div class="l"><span class="swd" style="background:var(--violet)"></span>${t("legend.labor")}</div><div class="v">${nf(agg.laborCost)}</div></div>`;

    // scorecard
    const maxVol = Math.max(1, ...bp.map((b) => b.total));
    const scoreRows = bp.map((b) => `<tr>
      <td class="strong">${L(b.proj)} <span class="mono" style="color:var(--faint)">${b.proj.code || ""}</span></td>
      <td><div class="bar-cell"><div class="bar-track"><div class="bar-fill" style="width:${(b.total / maxVol * 100).toFixed(0)}%"></div></div><span class="pct">${nf(b.total)}</span></div></td>
      <td><span class="chip ${b.onTimePct >= 95 ? "ok" : b.onTimePct >= 90 ? "warn" : "danger"}">${pf(b.onTimePct)}</span></td>
      <td class="num">${nfd(b.avgDays)}</td>
      <td class="num">${nf(b.items)}</td>
    </tr>`);
    const scoreHead = th("th.project") + th("th.volume") + th("th.ontime") + th("th.avgdays") + th("th.items", "num");
    const scorecardReal = `<div class="card">
      <div class="card-head"><h3>${t("card.projectScore")}</h3><span class="sub">${t("card.projectScore.sub")}</span></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>${scoreHead}</tr></thead><tbody>${scoreRows.join("")}</tbody></table></div>
    </div>`;

    // exceptions
    const exc = D.exceptions(state);
    const excBody = exc.length
      ? exc.slice(0, 6).map((e) => `<div class="si"><div class="l"><span class="swd" style="background:${e.headline ? "var(--danger)" : "var(--warn)"}"></span>
          <span><b>${L(e.cat)}</b> · <span class="mono" style="color:var(--faint)">${e.shipRef}</span><br><span style="color:var(--muted);font-size:11.5px">${L(e.cause)}</span></span></div>
          <div class="v"><span class="chip ${e.status === "open" ? "warn" : "muted"}">${t("st." + e.status)}</span></div></div>`).join("")
      : `<div class="empty">${t("exc.none")}</div>`;
    const exceptions = `<div class="card">
      <div class="card-head"><h3>${t("card.exceptions")}</h3><span class="sub">${t("card.exceptions.sub")}</span></div>
      <div class="card-body"><div class="statlist">${excBody}</div></div>
    </div>`;

    return `<div class="view report-print" id="ov-report">
      <div class="report-actions">
        <button class="iconbtn toggle-on" id="btn-print-report">${icon("print")}${t("doc.print")}</button>
      </div>
      ${narrative(agg)}
      <div style="height:18px"></div>
      <div class="kpi-grid">${kpis}</div>
      <div class="grid cols-2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>${t("chart.volTrend")}</h3><span class="sub">${t("chart.volTrend.sub")}</span><span class="spacer"></span>
          <div class="legend" style="margin:0"><span class="li"><span class="sw" style="background:var(--accent)"></span>${t("legend.inbound")}</span><span class="li"><span class="sw" style="background:var(--violet)"></span>${t("legend.outbound")}</span></div></div>
          <div class="card-body">${volChart}</div></div>
        <div class="card"><div class="card-head"><h3>${t("chart.byProject")}</h3><span class="sub">${t("chart.byProject.sub")}</span></div>
          <div class="card-body"><div class="gauge-wrap" style="align-items:flex-start;flex-wrap:wrap">${distDonut}<div class="statlist" style="flex:1;min-width:170px">${distLegend}</div></div></div></div>
      </div>
      <div class="grid cols-2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>${t("chart.clearTrend")}</h3><span class="sub">${t("chart.clearTrend.sub")}</span></div>
          <div class="card-body">${clearChart}</div></div>
        <div class="card"><div class="card-head"><h3>${t("chart.costSplit")}</h3><span class="sub">${t("sar")}</span></div>
          <div class="card-body"><div class="gauge-wrap" style="align-items:flex-start;flex-wrap:wrap">${costDonut}<div class="statlist" style="flex:1;min-width:160px">${costLegend}</div></div></div></div>
      </div>
      <div class="grid cols-2">
        ${scorecardReal}
        ${exceptions}
      </div>
      <p class="foot-note">${t("doc.footer")}</p>
    </div>`;
  }

  /* ============================================================
     VIEW: Shipments & Clearance
     ============================================================ */
  function viewShipments() {
    const agg = D.aggregate(state);
    let rows = D.SHIPMENTS.filter((s) =>
      (state.project === "all" || s.proj === state.project) &&
      (state.month === "all" || s.mon === state.month));
    if (state.shipType !== "all") rows = rows.filter((s) => s.type === state.shipType);
    // breaches first, then by date
    rows.sort((a, b) => (b.breach - a.breach) || (a.arrival < b.arrival ? 1 : -1));
    const total = rows.length;
    const disp = rows.slice(0, ROW_CAP);

    const body = disp.map((s) => `<tr class="${s.breach ? "row-breach" : ""}">
      <td class="mono strong">${s.ref}</td>
      <td>${chip(s.type)}</td>
      <td>${L(s.party)}</td>
      <td>${L(D.ORIGINS[s.origin] || { ar: s.origin, en: s.origin })}</td>
      <td>${t("mode." + s.mode)}</td>
      <td class="plain">${s.incoterm}</td>
      <td class="num">${s.items}</td>
      <td class="num">${s.weight}</td>
      <td class="mono">${s.arrival}</td>
      <td class="num" style="color:${s.daysClear > 3 ? "var(--danger)" : "var(--fg)"};font-weight:${s.daysClear > 3 ? 700 : 500}">${s.daysClear}${s.daysClear > 3 ? " ⚑" : ""}</td>
      <td>${chip(s.status)}</td>
    </tr>`);
    const head = th("th.ref") + th("th.type") + th("th.supplier") + th("th.origin") + th("th.mode") + th("th.incoterm") +
      th("th.items", "num") + th("th.weight", "num") + th("th.arrival") + th("th.daysclear", "num") + th("th.status");

    const seg = `<div class="doc-tabs">
      <div class="doc-tab ${state.shipType === "all" ? "active" : ""}" data-shiptype="all">${t("filter.all").replace(t("projects.word"), "").trim() || "All"}</div>
      <div class="doc-tab ${state.shipType === "inbound" ? "active" : ""}" data-shiptype="inbound">${t("legend.inbound")}</div>
      <div class="doc-tab ${state.shipType === "outbound" ? "active" : ""}" data-shiptype="outbound">${t("legend.outbound")}</div>
    </div>`;

    const ser = monthSeries();
    const kpis = [
      { k: "inbound", label: "kpi.inbound", icon: "shipIn", unit: "unit.shipment", cls: "", color: "var(--accent)" },
      { k: "outbound", label: "kpi.outbound", icon: "shipOut", unit: "unit.shipment", cls: "k-violet", color: "var(--violet)" },
      { k: "onTimePct", label: "kpi.ontime", icon: "percent", pct: true, cls: "k-ok", color: "var(--ok)" },
      { k: "avgDays", label: "kpi.avgdays", icon: "clock", unit: "unit.days", dec: true, lowerBetter: true, cls: "k-warn", color: "var(--warn)" },
      { k: "breaches", label: "kpi.breaches", icon: "alert", unit: "", lowerBetter: true, cls: "k-danger", color: "var(--danger)" },
    ].map((c) => kpiCard(c, agg, ser)).join("");

    return `<div class="view">
      <div class="kpi-grid">${kpis}</div>
      <div class="card" style="margin-bottom:16px"><div class="card-body" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        ${CH.ring(Math.round(agg.onTimePct), { label: t("legend.ontime") })}
        <div style="flex:1;min-width:200px">
          <div style="font-size:13.5px;font-weight:700">${t("chart.clearTrend")}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">${t("target")}: <b style="color:var(--accent)">${t("target.clear")}</b> · ${t("kpi.avgdays")}: <b>${nfd(agg.avgDays)} ${t("unit.days")}</b> · ${t("kpi.breaches")}: <b style="color:var(--danger)">${nf(agg.breaches)}</b></div>
          <div style="margin-top:12px">${CH.lineTarget(ser.map((s) => ({ label: monShort(s.m.id), v: s.onTimePct })), { target: 95, targetLabel: t("legend.target") })}</div>
        </div>
      </div></div>
      <div class="section-head"><span class="spacer"></span>${seg}</div>
      ${tableCard("nav.shipments", "page.shipments.sub", head, body, total)}
      <p class="foot-note">⚑ ${t("breach")} — ${t("th.daysclear")} &gt; ${t("target.clear")}. ${t("doc.footer")}</p>
    </div>`;
  }

  /* ============================================================
     VIEW: Material Issuance
     ============================================================ */
  function viewIssuance() {
    let rows = D.MIRS.filter((r) =>
      (state.project === "all" || r.proj === state.project) &&
      (state.month === "all" || r.mon === state.month));
    rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    const total = rows.length;
    const disp = rows.slice(0, ROW_CAP);

    const stageCount = { gather: 0, palletized: 0, boxed: 0, issued: 0 };
    rows.forEach((r) => { stageCount[r.stage]++; });
    const totalItems = rows.reduce((a, r) => a + r.lineItems, 0);
    const avgTA = rows.length ? (rows.reduce((a, r) => a + r.turnaround, 0) / rows.length).toFixed(1) : 0;
    const issuedPct = rows.length ? Math.round(stageCount.issued / rows.length * 100) : 0;

    const pipeline = `<div class="pipeline">
      <div class="pstage s1"><div class="pn">${nf(stageCount.gather)}</div><div class="pl">${t("kit.gather")}</div></div>
      <div class="pstage s2"><div class="pn">${nf(stageCount.palletized)}</div><div class="pl">${t("kit.palletized")}</div></div>
      <div class="pstage s3"><div class="pn">${nf(stageCount.boxed)}</div><div class="pl">${t("kit.boxed")}</div></div>
      <div class="pstage s4"><div class="pn">${nf(stageCount.issued)}</div><div class="pl">${t("kit.issued")}</div></div>
    </div>`;

    const kpiStrip = `<div class="kpi-grid">
      <div class="kpi"><div class="k-label">${icon("flow")}${t("kpi.mirs")}</div><div class="k-value">${nf(total)}</div><div class="k-foot"><span class="vs">${monName(state.month)}</span></div></div>
      <div class="kpi k-violet"><div class="k-label">${icon("box")}${t("th.lineitems")}</div><div class="k-value">${nf(totalItems)}<span class="unit">${t("unit.item")}</span></div><div class="k-foot"><span class="vs">${t("avgMonth")} ~${nf(rows.length ? Math.round(totalItems / rows.length) : 0)}/${t("th.mir")}</span></div></div>
      <div class="kpi k-warn"><div class="k-label">${icon("clock")}${t("th.turnaround")}</div><div class="k-value">${nfd(avgTA)}<span class="unit">${t("unit.hour")}</span></div><div class="k-foot"><span class="vs">${t("blended")}</span></div></div>
      <div class="kpi k-ok"><div class="k-label">${icon("percent")}${t("kit.issued")}</div><div class="k-value">${nfd(issuedPct)}<span class="unit">%</span></div><div class="k-foot"><span class="vs">${t("dept.protection")}</span></div></div>
    </div>`;

    const body = disp.map((r) => `<tr>
      <td class="mono strong">${r.mir}</td>
      <td>${projName(r.proj)}</td>
      <td><span class="chip violet plain">${t("dept.protection")}</span></td>
      <td class="mono">${r.date}</td>
      <td class="num">${r.lineItems}</td>
      <td>${kitChip(r.stage)}</td>
      <td class="num">${r.turnaround} ${t("unit.hour")}</td>
      <td>${L(r.requester)}</td>
    </tr>`);
    const head = th("th.mir") + th("th.project") + th("th.dept") + th("th.date") + th("th.lineitems", "num") + th("th.stage") + th("th.turnaround", "num") + th("th.requestedby");

    return `<div class="view">
      ${kpiStrip}
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${t("nav.issuance")}</h3><span class="sub">${t("kit.gather")} → ${t("kit.palletized")} / ${t("kit.boxed")} → ${t("kit.toProtection")}</span></div><div class="card-body">${pipeline}</div></div>
      ${tableCard("page.issuance.title", "page.issuance.sub", head, body, total)}
      <p class="foot-note">${t("doc.footer")}</p>
    </div>`;
  }

  /* ============================================================
     VIEW: Inventory
     ============================================================ */
  function viewInventory() {
    let rows = D.INVENTORY.filter((r) => state.project === "all" || r.proj === state.project);
    rows.sort((a, b) => (a.status === "out" ? -2 : a.status === "low" ? -1 : 0) - (b.status === "out" ? -2 : b.status === "low" ? -1 : 0));
    const total = rows.length;
    const disp = rows.slice(0, ROW_CAP);
    const inStock = rows.filter((r) => r.status === "in_stock").length;
    const low = rows.filter((r) => r.status === "low").length;
    const out = rows.filter((r) => r.status === "out").length;

    const kpiStrip = `<div class="kpi-grid">
      <div class="kpi"><div class="k-label">${icon("inventory")}${t("th.code")}</div><div class="k-value">${nf(total)}<span class="unit">SKU</span></div><div class="k-foot"><span class="vs">${state.project === "all" ? t("filter.all") : projName(state.project)}</span></div></div>
      <div class="kpi k-ok"><div class="k-label">${icon("box")}${t("st.in_stock")}</div><div class="k-value">${nf(inStock)}</div><div class="k-foot"><span class="vs">${pf(total ? Math.round(inStock / total * 100) : 0)}</span></div></div>
      <div class="kpi k-warn"><div class="k-label">${icon("alert")}${t("st.low")}</div><div class="k-value">${nf(low)}</div><div class="k-foot"><span class="vs">${t("th.available")} &lt; 25</span></div></div>
      <div class="kpi k-danger"><div class="k-label">${icon("alert")}${t("st.out")}</div><div class="k-value">${nf(out)}</div><div class="k-foot"><span class="vs">${t("note")}</span></div></div>
    </div>`;

    const maxOnHand = Math.max(1, ...rows.map((r) => r.onHand));
    const body = disp.map((r) => `<tr class="${r.status === "out" ? "row-breach" : ""}">
      <td class="mono strong">${r.code}</td>
      <td>${L(r.cat)}</td>
      <td>${projName(r.proj)}</td>
      <td class="plain">${r.uom}</td>
      <td><div class="bar-cell"><div class="bar-track"><div class="bar-fill" style="width:${(r.onHand / maxOnHand * 100).toFixed(0)}%;background:${r.status === "out" ? "var(--danger)" : r.status === "low" ? "var(--warn)" : "var(--accent)"}"></div></div><span class="pct">${nf(r.onHand)}</span></div></td>
      <td class="num">${nf(r.reserved)}</td>
      <td class="num strong">${nf(r.avail)}</td>
      <td class="mono">${r.bin}</td>
      <td>${chip(r.status)}</td>
    </tr>`);
    const head = th("th.code") + th("th.desc") + th("th.project") + th("th.uom") + th("th.onhand") + th("th.reserved", "num") + th("th.available", "num") + th("th.bin") + th("th.status");

    return `<div class="view">${kpiStrip}${tableCard("page.inventory.title", "page.inventory.sub", head, body, total)}<p class="foot-note">${t("doc.footer")}</p></div>`;
  }

  /* ============================================================
     VIEW: Warehouse Space & Cost
     ============================================================ */
  function viewWarehouse() {
    const bp = D.byProject(state).filter((b) => b.indoorM2 + b.outdoorM2 > 0);
    const agg = D.aggregate(state);
    const totalM2 = agg.indoorM2 + agg.outdoorM2;

    const kpiStrip = `<div class="kpi-grid">
      <div class="kpi"><div class="k-label">${icon("warehouse")}${t("legend.indoor")}</div><div class="k-value">${nf(agg.indoorM2)}<span class="unit">${t("unit.m2")}</span></div><div class="k-foot"><span class="vs">${pf(totalM2 ? Math.round(agg.indoorM2 / totalM2 * 100) : 0)}</span></div></div>
      <div class="kpi k-violet"><div class="k-label">${icon("warehouse")}${t("legend.outdoor")}</div><div class="k-value">${nf(agg.outdoorM2)}<span class="unit">${t("unit.m2")}</span></div><div class="k-foot"><span class="vs">${pf(totalM2 ? Math.round(agg.outdoorM2 / totalM2 * 100) : 0)}</span></div></div>
      <div class="kpi k-ok"><div class="k-label">${icon("inventory")}${t("th.totalspace")}</div><div class="k-value">${nf(totalM2)}<span class="unit">${t("unit.m2")}</span></div><div class="k-foot"><span class="vs">${monName(state.month)}</span></div></div>
      <div class="kpi k-warn"><div class="k-label">${icon("warehouse")}${t("kpi.spaceCost")}</div><div class="k-value">${nf(agg.spaceCost)}<span class="unit">${t("sar")}</span></div><div class="k-foot"><span class="vs">${t("perMonth")}</span></div></div>
    </div>`;

    const donutSegs = [{ v: agg.indoorM2, color: "var(--accent)" }, { v: agg.outdoorM2, color: "var(--violet)" }];
    const donut = CH.donut(donutSegs, { center: nf(totalM2), centerSub: t("unit.m2"), aria: "space" });

    const body = bp.map((b) => `<tr>
      <td class="strong">${L(b.proj)}</td>
      <td class="num">${nf(b.indoorM2)}</td>
      <td class="num">${nf(b.outdoorM2)}</td>
      <td class="num strong">${nf(b.indoorM2 + b.outdoorM2)}</td>
      <td class="num">${b.spaceRate}</td>
      <td class="num strong" style="color:var(--accent)">${nf(b.spaceCost)}</td>
    </tr>`);
    body.push(`<tr style="background:var(--surface-2)"><td class="strong">${t("grandtotal")}</td>
      <td class="num strong">${nf(agg.indoorM2)}</td><td class="num strong">${nf(agg.outdoorM2)}</td>
      <td class="num strong">${nf(totalM2)}</td><td class="num">—</td>
      <td class="num strong" style="color:var(--accent)">${nf(agg.spaceCost)}</td></tr>`);
    const head = th("th.project") + th("th.indoor", "num") + th("th.outdoor", "num") + th("th.totalspace", "num") + th("th.rate", "num") + th("th.cost", "num");

    return `<div class="view">
      ${kpiStrip}
      <div class="grid cols-2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>${t("page.warehouse.title")}</h3><span class="sub">${t("page.warehouse.sub")}</span></div>
          <div class="table-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body.join("")}</tbody></table></div></div>
        <div class="card"><div class="card-head"><h3>${t("legend.space")}</h3><span class="sub">${t("legend.indoor")} / ${t("legend.outdoor")}</span></div>
          <div class="card-body"><div class="gauge-wrap" style="align-items:flex-start;flex-wrap:wrap">${donut}
            <div class="statlist" style="flex:1;min-width:150px">
              <div class="si"><div class="l"><span class="swd" style="background:var(--accent)"></span>${t("legend.indoor")}</div><div class="v">${nf(agg.indoorM2)}</div></div>
              <div class="si"><div class="l"><span class="swd" style="background:var(--violet)"></span>${t("legend.outdoor")}</div><div class="v">${nf(agg.outdoorM2)}</div></div>
              <div class="si"><div class="l">${t("kpi.spaceCost")}</div><div class="v" style="color:var(--accent)">${nf(agg.spaceCost)} ${t("sar")}</div></div>
            </div></div></div></div>
      </div>
      <p class="foot-note">${t("note")}: ~5,000 ${t("unit.m2")} ≈ 200,000 ${t("sar")}${t("perMonth")}. ${t("doc.footer")}</p>
    </div>`;
  }

  /* ============================================================
     VIEW: Man-Hours & Labor Cost
     ============================================================ */
  function viewLabor() {
    const bp = D.byProject(state).filter((b) => b.manHours > 0);
    const agg = D.aggregate(state);
    const totHc = bp.reduce((a, b) => a + b.headcount, 0);
    const blended = agg.manHours ? (agg.laborCost / agg.manHours).toFixed(1) : 0;
    const monthsInScope = state.month === "all" ? MONTHS.length : 1;
    const hcDisplay = state.project === "all" ? bp.reduce((a, b) => a + b.headcount, 0) : (bp[0] ? bp[0].headcount : 0);

    const kpiStrip = `<div class="kpi-grid">
      <div class="kpi"><div class="k-label">${icon("people")}${t("th.headcount")}</div><div class="k-value">${nf(hcDisplay)}<span class="unit">${t("unit.person")}</span></div><div class="k-foot"><span class="vs">${t("note")}: ~260 ${t("unit.hour")}/${t("unit.person")}</span></div></div>
      <div class="kpi k-violet"><div class="k-label">${icon("hours")}${t("kpi.manhours")}</div><div class="k-value">${nf(agg.manHours)}<span class="unit">${t("unit.hour")}</span></div><div class="k-foot"><span class="vs">${monName(state.month)}</span></div></div>
      <div class="kpi k-ok"><div class="k-label">${icon("percent")}${t("th.hourrate")}</div><div class="k-value">${nfd(blended)}<span class="unit">${t("sar")}</span></div><div class="k-foot"><span class="vs">${t("blended")}</span></div></div>
      <div class="kpi k-warn"><div class="k-label">${icon("people")}${t("kpi.laborCost")}</div><div class="k-value">${nf(agg.laborCost)}<span class="unit">${t("sar")}</span></div><div class="k-foot"><span class="vs">${t("perMonth")}</span></div></div>
    </div>`;

    const maxCost = Math.max(1, ...bp.map((b) => b.laborCost));
    const body = bp.map((b) => `<tr>
      <td class="strong">${L(b.proj)}</td>
      <td class="num">${b.headcount}</td>
      <td class="num">${nf(b.manHours)}</td>
      <td class="num">${b.laborRate}</td>
      <td><div class="bar-cell"><div class="bar-track"><div class="bar-fill" style="width:${(b.laborCost / maxCost * 100).toFixed(0)}%;background:var(--violet)"></div></div><span class="pct">${nf(b.laborCost)}</span></div></td>
    </tr>`);
    body.push(`<tr style="background:var(--surface-2)"><td class="strong">${t("grandtotal")}</td>
      <td class="num strong">${nf(totHc)}</td><td class="num strong">${nf(agg.manHours)}</td>
      <td class="num">${nfd(blended)}</td><td class="num strong" style="color:var(--violet)">&nbsp;${nf(agg.laborCost)} ${t("sar")}</td></tr>`);
    const head = th("th.project") + th("th.headcount", "num") + th("th.hours", "num") + th("th.hourrate", "num") + th("th.cost");

    return `<div class="view">${kpiStrip}
      <div class="card"><div class="card-head"><h3>${t("page.labor.title")}</h3><span class="sub">${t("page.labor.sub")}</span></div>
        <div class="table-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body.join("")}</tbody></table></div></div>
      <p class="foot-note">${t("note")}: ${t("page.labor.sub")} · ~9–10 ${t("unit.person")}. ${t("doc.footer")}</p>
    </div>`;
  }

  /* ============================================================
     VIEW: Equipment & Collections
     ============================================================ */
  function viewEquipment() {
    let eq = D.EQUIP.filter((r) => (state.project === "all" || r.proj === state.project) && (state.month === "all" || r.mon === state.month));
    let co = D.COLLECTIONS.filter((r) => (state.project === "all" || r.proj === state.project) && (state.month === "all" || r.mon === state.month));
    eq.sort((a, b) => (a.date < b.date ? 1 : -1));
    co.sort((a, b) => (a.date < b.date ? 1 : -1));

    const eqDone = eq.filter((r) => r.status === "completed").length;
    const coDone = co.filter((r) => r.status === "completed").length;

    const kpiStrip = `<div class="kpi-grid">
      <div class="kpi"><div class="k-label">${icon("equip")}${t("kpi.equipment")}</div><div class="k-value">${nf(eq.length)}<span class="unit">${t("unit.unit")}</span></div><div class="k-foot"><span class="vs">${eqDone} ${t("st.completed")}</span></div></div>
      <div class="kpi k-info"><div class="k-label">${icon("collection")}${t("kpi.collections")}</div><div class="k-value">${nf(co.length)}<span class="unit">${t("unit.order")}</span></div><div class="k-foot"><span class="vs">${coDone} ${t("st.completed")}</span></div></div>
      <div class="kpi k-ok"><div class="k-label">${icon("truck")}${t("st.completed")}</div><div class="k-value">${nf(eqDone + coDone)}</div><div class="k-foot"><span class="vs">${monName(state.month)}</span></div></div>
      <div class="kpi k-warn"><div class="k-label">${icon("clock")}${t("st.scheduled")}</div><div class="k-value">${nf(eq.length + co.length - eqDone - coDone)}</div><div class="k-foot"><span class="vs">${t("st.in_transit")} / ${t("st.open")}</span></div></div>
    </div>`;

    const eqBody = eq.slice(0, ROW_CAP).map((r) => `<tr>
      <td class="mono strong">${r.ref}</td>
      <td>${L(r.equip)}</td>
      <td>${projName(r.proj)}</td>
      <td>${L(r.from)}</td>
      <td>${L(r.to)}</td>
      <td>${L(r.trailer)}</td>
      <td class="num">${nf(r.weight)} t</td>
      <td class="mono">${r.date}</td>
      <td>${chip(r.status)}</td>
    </tr>`);
    const eqHead = th("th.ref") + th("th.equip") + th("th.project") + th("th.from") + th("th.to") + th("th.trailer") + th("th.weight", "num") + th("th.date") + th("th.status");

    const coBody = co.slice(0, ROW_CAP).map((r) => `<tr>
      <td class="mono strong">${r.ref}</td>
      <td>${L(r.vendor)}</td>
      <td>${projName(r.proj)}</td>
      <td>${L(r.from)}</td>
      <td class="num">${r.items}</td>
      <td class="mono">${r.date}</td>
      <td>${chip(r.status)}</td>
    </tr>`);
    const coHead = th("th.ref") + th("th.supplier") + th("th.project") + th("th.from") + th("th.items", "num") + th("th.date") + th("th.status");

    return `<div class="view">${kpiStrip}
      ${tableCard("page.equipment.title", "page.equipment.sub", eqHead, eqBody, eq.length)}
      <div style="height:16px"></div>
      ${tableCard("kpi.collections", null, coHead, coBody, co.length)}
      <p class="foot-note">${t("doc.footer")}</p>
    </div>`;
  }

  /* ============================================================
     VIEW: Root-Cause Log
     ============================================================ */
  function viewRootcause() {
    let rows = D.ROOTCAUSE.filter((r) => (state.project === "all" || r.proj === state.project) && (state.month === "all" || r.mon === state.month));
    rows.sort((a, b) => (b.headline - a.headline) || (b.delay - a.delay));
    const total = rows.length;
    const open = rows.filter((r) => r.status === "open").length;
    const closed = total - open;
    const avgDelay = total ? (rows.reduce((a, r) => a + r.delay, 0) / total).toFixed(1) : 0;

    const kpiStrip = `<div class="kpi-grid">
      <div class="kpi k-danger"><div class="k-label">${icon("alert")}${t("kpi.breaches")}</div><div class="k-value">${nf(total)}</div><div class="k-foot"><span class="vs">${monName(state.month)}</span></div></div>
      <div class="kpi k-warn"><div class="k-label">${icon("doc")}${t("st.open")}</div><div class="k-value">${nf(open)}</div><div class="k-foot"><span class="vs">${t("card.exceptions.sub")}</span></div></div>
      <div class="kpi k-ok"><div class="k-label">${icon("doc")}${t("st.closed")}</div><div class="k-value">${nf(closed)}</div><div class="k-foot"><span class="vs">${pf(total ? Math.round(closed / total * 100) : 0)}</span></div></div>
      <div class="kpi k-violet"><div class="k-label">${icon("clock")}${t("th.delay")}</div><div class="k-value">${nfd(avgDelay)}<span class="unit">${t("unit.days")}</span></div><div class="k-foot"><span class="vs">${t("avgMonth")}</span></div></div>
    </div>`;

    const body = rows.map((r) => `<tr class="${r.headline ? "row-breach" : ""}">
      <td class="mono strong">${r.ref}</td>
      <td>${projName(r.proj)}</td>
      <td><span class="chip ${r.headline ? "danger" : "warn"} plain">${L(r.cat)}</span></td>
      <td class="mono">${r.shipRef}</td>
      <td class="num" style="color:var(--danger);font-weight:700">${r.daysClear}</td>
      <td style="white-space:normal;max-width:280px;color:var(--fg-2)">${L(r.cause)}</td>
      <td style="white-space:normal;max-width:280px;color:var(--fg-2)">${L(r.corr)}</td>
      <td class="num strong">${r.delay} ${t("unit.days")}</td>
      <td class="mono">${r.raised}</td>
      <td>${chip(r.status)}</td>
    </tr>`);
    const head = th("th.ref") + th("th.project") + th("th.category") + "<th>" + t("doc.ref") + "</th>" + th("th.daysclear", "num") + th("th.cause") + th("th.corrective") + th("th.delay", "num") + th("th.raised") + th("th.status");

    const bodyOut = body.length ? body : [`<tr><td colspan="10"><div class="empty">${t("exc.none")}</div></td></tr>`];
    return `<div class="view">${kpiStrip}
      <div class="card"><div class="card-head"><h3>${t("page.rootcause.title")}</h3><span class="sub">${t("page.rootcause.sub")}</span></div>
        <div class="table-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${bodyOut.join("")}</tbody></table></div>
        <div class="table-foot"><span>${t("showing")} <b>${total}</b> ${t("of")} <b>${total}</b></span><span class="spacer"></span></div></div>
      <p class="foot-note">${t("doc.footer")}</p>
    </div>`;
  }

  /* ============================================================
     VIEW: Documents (Delivery Note / Packing List)
     ============================================================ */
  const MATERIALS = [
    { code: "VLV-2204", ar: 'صمام بوابة ٦"', en: 'Gate valve 6"', uom: "EA", w: 42, pkgAr: "صندوق خشبي", pkgEn: "Wooden crate" },
    { code: "TBN-5510", ar: "ريشة توربين – طقم", en: "Turbine blade set", uom: "SET", w: 88, pkgAr: "صندوق فولاذي", pkgEn: "Steel case" },
    { code: "CBL-3120", ar: "كابل جهد عالٍ ٣٣ ك.ف", en: "HV cable 33kV", uom: "MTR", w: 6, pkgAr: "بكرة", pkgEn: "Drum" },
    { code: "GKT-7740", ar: "جوان حلقي – صندوق", en: "Ring gasket box", uom: "BOX", w: 12, pkgAr: "كرتون", pkgEn: "Carton" },
    { code: "INS-9015", ar: "جهاز قياس ضغط", en: "Pressure transmitter", uom: "EA", w: 4, pkgAr: "صندوق", pkgEn: "Box" },
    { code: "PNL-4400", ar: "لوحة تحكم MCC", en: "MCC control panel", uom: "EA", w: 145, pkgAr: "هيكل خشبي", pkgEn: "Wooden frame" },
    { code: "FST-1180", ar: "براغي شد عالية – طقم", en: "High-tension bolt set", uom: "SET", w: 9, pkgAr: "كرتون", pkgEn: "Carton" },
    { code: "BRG-6620", ar: "محمل كروي", en: "Roller bearing", uom: "EA", w: 17, pkgAr: "صندوق", pkgEn: "Box" },
    { code: "PIP-2090", ar: 'وصلة أنابيب ٨"', en: 'Pipe spool 8"', uom: "EA", w: 63, pkgAr: "ربطة", pkgEn: "Bundle" },
    { code: "PPE-3300", ar: "مهمات وقاية – طقم", en: "PPE kit", uom: "SET", w: 7, pkgAr: "كرتون", pkgEn: "Carton" },
    { code: "TBN-5512", ar: "وحدة إحكام – توربين", en: "Turbine seal unit", uom: "EA", w: 33, pkgAr: "صندوق فولاذي", pkgEn: "Steel case" },
    { code: "INS-9044", ar: "محول حراري RTD", en: "RTD temperature sensor", uom: "EA", w: 2, pkgAr: "صندوق", pkgEn: "Box" },
  ];
  function docShipments() {
    return D.SHIPMENTS.filter((s) => s.type === "outbound" || s.status === "delivered" || s.status === "cleared").slice(0, 80);
  }
  function pickDocShip() {
    const list = docShipments();
    if (state.docShip) { const f = D.SHIPMENTS.find((s) => s.ref === state.docShip); if (f) return f; }
    return list[0] || D.SHIPMENTS[0];
  }
  function docLines(ship) {
    const r = mb32(seedFrom(ship.ref));
    const n = Math.min(12, Math.max(4, Math.round(ship.items / 12)));
    const lines = [];
    for (let i = 0; i < n; i++) {
      const m = MATERIALS[Math.floor(r() * MATERIALS.length)];
      const qty = 1 + Math.floor(r() * 14);
      const net = +(m.w * qty).toFixed(1);
      lines.push({ m, qty, net, gross: +(net * 1.08).toFixed(1), pkg: state.lang === "ar" ? m.pkgAr : m.pkgEn });
    }
    return lines;
  }
  function viewDocuments() {
    const list = docShipments();
    const ship = pickDocShip();
    const lines = docLines(ship);
    const totalPkg = lines.reduce((a, l) => a + l.qty, 0);
    const totalW = lines.reduce((a, l) => a + l.gross, 0);
    const isDN = state.docTab === "dn";
    const proj = D.project(ship.proj);
    const dn = "SE-DN-26" + ship.ref.slice(-4);

    const options = list.map((s) => `<option value="${s.ref}" ${s.ref === ship.ref ? "selected" : ""}>${s.ref} · ${projName(s.proj)} · ${L(s.party)}</option>`).join("");

    const toolbar = `<div class="doc-toolbar">
      <div class="control" style="min-width:280px"><label>${t("doc.selectShip")}</label>
        <select class="sel" id="doc-ship" style="min-width:280px">${options}</select></div>
      <div class="doc-tabs">
        <div class="doc-tab ${isDN ? "active" : ""}" data-doctab="dn">${t("doc.dn")}</div>
        <div class="doc-tab ${!isDN ? "active" : ""}" data-doctab="pl">${t("doc.pl")}</div>
      </div>
      <span class="spacer" style="flex:1"></span>
      <button class="iconbtn toggle-on" id="btn-print">${icon("print")}${t("doc.print")}</button>
    </div>`;

    const brandSvg = `<div class="dm">${icon("leaf")}</div>`;
    const head = `<div class="doc-head">
      <div class="doc-brand">${brandSvg}<div class="dt"><b>${t("app.org")}</b><span>${t("app.unit")}</span></div></div>
      <div class="doc-title"><h2>${isDN ? t("doc.deliveryNote") : t("doc.packingList")}</h2><div class="docno">${isDN ? dn : "SE-PL-26" + ship.ref.slice(-4)}</div></div>
    </div>`;

    const metaBlock = (lab, val) => `<div class="meta-block"><div class="ml">${lab}</div><div class="mv">${val}</div></div>`;
    const meta = `<div class="doc-meta">
      ${metaBlock(t("doc.from"), `<b>${t("app.org")}</b><br>${t("doc.warehouse")} · ${L(proj)}`)}
      ${metaBlock(t("doc.to"), `<b>${L(D.SITES[ship.proj] || ship.party)}</b><br>${state.lang === "ar" ? "قسم الحماية" : "Protection Dept."}`)}
      ${metaBlock(t("doc.project"), `<b>${L(proj)}</b> · ${proj ? proj.code : ""}`)}
      ${metaBlock(t("doc.ref"), `<b>${ship.ref}</b> · ${ship.po}`)}
      ${metaBlock(t("doc.date"), ship.arrival)}
      ${metaBlock(t("doc.mode") + " / " + t("doc.incoterm"), `${t("mode." + ship.mode)} · ${ship.incoterm}`)}
    </div>`;

    let tableHead, tableBody, totals;
    if (isDN) {
      tableHead = `<th class="num">${t("doc.no")}</th><th>${t("doc.code")}</th><th>${t("doc.material")}</th><th class="num">${t("doc.qty")}</th><th>${t("doc.uom")}</th><th class="num">${t("doc.netw")} (kg)</th>`;
      tableBody = lines.map((l, i) => `<tr><td class="num">${i + 1}</td><td>${l.m.code}</td><td>${state.lang === "ar" ? l.m.ar : l.m.en}</td><td class="num">${l.qty}</td><td>${l.m.uom}</td><td class="num">${nf(l.net)}</td></tr>`).join("");
      totals = `<div class="doc-tot"><div><div class="tl">${t("doc.totalpkg")}</div><div class="tv">${totalPkg}</div></div><div><div class="tl">${t("doc.totalw")}</div><div class="tv">${nf(totalW)}</div></div></div>`;
    } else {
      tableHead = `<th class="num">${t("doc.no")}</th><th>${t("doc.code")}</th><th>${t("doc.material")}</th><th class="num">${t("doc.qty")}</th><th>${t("doc.pkg")}</th><th class="num">${t("doc.netw")}</th><th class="num">${t("doc.grossw")}</th>`;
      tableBody = lines.map((l, i) => `<tr><td class="num">${i + 1}</td><td>${l.m.code}</td><td>${state.lang === "ar" ? l.m.ar : l.m.en}</td><td class="num">${l.qty}</td><td>${l.pkg}</td><td class="num">${nf(l.net)}</td><td class="num">${nf(l.gross)}</td></tr>`).join("");
      totals = `<div class="doc-tot"><div><div class="tl">${t("doc.totalpkg")}</div><div class="tv">${totalPkg}</div></div><div><div class="tl">${t("doc.totalw")}</div><div class="tv">${nf(totalW)}</div></div></div>`;
    }

    const sign = `<div class="doc-sign">
      <div class="sign-box"><div class="sign-line"></div><div class="sl">${t("doc.preparedby")}</div></div>
      <div class="sign-box"><div class="sign-line"></div><div class="sl">${t("doc.checkedby")}</div></div>
      <div class="sign-box"><div class="sign-line"></div><div class="sl">${t("doc.receivedby")}</div></div>
    </div>`;
    const foot = `<div class="doc-foot"><span>${t("doc.footer")}</span><span>${isDN ? dn : "SE-PL-26" + ship.ref.slice(-4)}</span></div>`;

    return `<div class="view">
      ${toolbar}
      <div class="paper printing" id="doc-paper">${head}${meta}
        <table class="doc-tbl"><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
        ${totals}${sign}${foot}
      </div>
      <p class="foot-note">${t("page.documents.sub")} · ${t("showing")} ${lines.length} ${t("of")} ${ship.items}.</p>
    </div>`;
  }

  /* ---------- nav ---------- */
  const NAV = [
    { group: "nav.group.ops", items: [
      { id: "overview", icon: "report" }, { id: "shipments", icon: "shipIn" },
      { id: "issuance", icon: "flow" }, { id: "equipment", icon: "equip" } ] },
    { group: "nav.group.resources", items: [
      { id: "inventory", icon: "inventory" }, { id: "warehouse", icon: "warehouse" }, { id: "labor", icon: "people" } ] },
    { group: "nav.group.gov", items: [
      { id: "rootcause", icon: "alert" }, { id: "documents", icon: "doc" } ] },
  ];
  function renderNav() {
    const openRC = D.ROOTCAUSE.filter((r) => r.status === "open" && (state.project === "all" || r.proj === state.project) && (state.month === "all" || r.mon === state.month)).length;
    let html = "";
    NAV.forEach((g) => {
      html += `<div class="nav-group-label">${t(g.group)}</div>`;
      g.items.forEach((it) => {
        const badge = it.id === "rootcause" && openRC > 0 ? `<span class="badge">${openRC}</span>` : "";
        html += `<div class="nav-item ${state.view === it.id ? "active" : ""}" data-nav="${it.id}">${icon(it.icon)}<span>${t("nav." + it.id)}</span>${badge}</div>`;
      });
    });
    document.getElementById("nav").innerHTML = html;
  }

  /* ---------- chrome / filters ---------- */
  function fillFilters() {
    const ps = document.getElementById("f-project");
    const ms = document.getElementById("f-month");
    ps.innerHTML = `<option value="all">${t("filter.all")}</option>` + PROJECTS.map((p) => `<option value="${p.id}">${L(p)}</option>`).join("");
    ms.innerHTML = `<option value="all">${t("filter.allMonths")}</option>` + MONTHS.map((m) => `<option value="${m.id}">${L(m)}</option>`).join("");
    ps.value = state.project; ms.value = state.month;
  }

  const VIEWS = {
    overview: viewOverview, shipments: viewShipments, issuance: viewIssuance,
    inventory: viewInventory, warehouse: viewWarehouse, labor: viewLabor,
    equipment: viewEquipment, rootcause: viewRootcause, documents: viewDocuments,
  };

  function render() {
    const root = document.documentElement;
    root.lang = state.lang;
    root.dir = state.lang === "ar" ? "rtl" : "ltr";
    root.setAttribute("data-theme", state.theme);
    I.setLang(state.lang);
    CH.setLang(state.lang);

    // brand + chrome text
    document.getElementById("brand-org").textContent = t("app.org");
    document.getElementById("brand-unit").textContent = t("app.unit");
    document.getElementById("live-txt").textContent = t("live");
    document.getElementById("lang-txt").textContent = t("toggle.lang");
    document.getElementById("theme-icon").innerHTML = state.theme === "dark" ? IP.sun : IP.moon;
    document.getElementById("lbl-project").textContent = t("filter.project");
    document.getElementById("lbl-month").textContent = t("filter.month");

    fillFilters();
    renderNav();

    document.getElementById("page-title").textContent = t("page." + state.view + ".title");
    document.getElementById("page-sub").textContent = t("page." + state.view + ".sub");

    const fn = VIEWS[state.view] || viewOverview;
    const content = document.getElementById("content");
    content.innerHTML = fn();
    content.scrollTop = 0;
    save();
  }

  /* ---------- events (delegated) ---------- */
  function bind() {
    document.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-nav]");
      if (nav) { state.view = nav.getAttribute("data-nav"); closeSidebar(); render(); return; }
      const st = e.target.closest("[data-shiptype]");
      if (st) { state.shipType = st.getAttribute("data-shiptype"); render(); return; }
      const dt = e.target.closest("[data-doctab]");
      if (dt) { state.docTab = dt.getAttribute("data-doctab"); render(); return; }
      if (e.target.closest("#btn-print")) { doPrint(); return; }
      if (e.target.closest("#btn-print-report")) { doPrintReport(); return; }
      if (e.target.closest("#btn-lang")) { state.lang = state.lang === "ar" ? "en" : "ar"; render(); return; }
      if (e.target.closest("#btn-theme")) { state.theme = state.theme === "dark" ? "light" : "dark"; render(); return; }
      if (e.target.closest("#btn-menu")) { toggleSidebar(); return; }
      if (e.target.closest("#scrim")) { closeSidebar(); return; }
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "f-project") { state.project = e.target.value; render(); }
      else if (e.target.id === "f-month") { state.month = e.target.value; render(); }
      else if (e.target.id === "doc-ship") { state.docShip = e.target.value; render(); }
    });
  }
  function toggleSidebar() { document.getElementById("sidebar").classList.toggle("open"); document.getElementById("scrim").classList.toggle("show"); }
  function closeSidebar() { document.getElementById("sidebar").classList.remove("open"); document.getElementById("scrim").classList.remove("show"); }
  function doPrint() {
    const paper = document.getElementById("doc-paper");
    if (paper) paper.classList.add("printing");
    window.print();
  }
  function doPrintReport() {
    document.documentElement.classList.add("printing-report");
    const clear = () => document.documentElement.classList.remove("printing-report");
    if (window.matchMedia) { const m = window.matchMedia("print"); const h = (ev) => { if (!ev.matches) { clear(); m.removeListener(h); } }; m.addListener(h); }
    window.addEventListener("afterprint", clear, { once: true });
    window.print();
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () { bind(); render(); });
})();
