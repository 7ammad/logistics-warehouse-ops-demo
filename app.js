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
  // SE-tonal categorical palette (per-project) — purple family + blue/green + grey, all in-palette
  const PCOLORS = ["#8a00e5", "#007aff", "#14da79", "#a54bf7", "#b96cff", "#5d596e", "#cf9bff"];
  const ROW_CAP = 60;

  /* ---------- state ---------- */
  const KEY = "siemens.logistics.sel";
  const defaults = { view: "overview", project: "all", month: D.LATEST, lang: "ar", theme: "dark", shipType: "all", docTab: "dn", docShip: null, impexpTab: "imports" };
  let state = Object.assign({}, defaults);
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  /* sanitize stale persisted state (project list / views changed 2026-07-02) */
  if (state.project !== "all" && !D.project(state.project)) state.project = "all";
  if (["imports", "exports"].indexOf(state.impexpTab) < 0) state.impexpTab = "imports";
  if (["dn", "pl", "gp"].indexOf(state.docTab) < 0) state.docTab = "dn";
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  /* transient wizard state (not persisted) */
  let wiz = null;

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
    rfq_sent: "info", quotes_in: "info", docs_review: "warn", sicus_issued: "violet",
    awarded: "ok", booked: "info", picked_up: "ok", express: "violet",
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
      const inMonth = (x) => x.mon === m.id && (state.project === "all" || x.proj === state.project);
      const savings = D.IMPORTS.filter(inMonth).reduce((a, x) => a + (x.saving || 0), 0) +
        D.TRANSPORTS.filter(inMonth).reduce((a, x) => a + (x.saving || 0), 0);
      return {
        m, inbound: inb, outbound: out, mbos: sum("mbos"),
        impexp: sum("importsN") + sum("exportsN"), transports: sum("transportsN"), savings,
        items: sum("items"), mirs: sum("mirs"), manHours: sum("hours"), laborCost: sum("laborCost"),
        spaceCost: sum("spaceCost"), breaches: sum("breaches"),
        onTimePct: tot ? +(won / tot).toFixed(1) : 0, avgDays: tot ? +(wav / tot).toFixed(1) : 0,
      };
    });
  }
  /* enrich aggregate with derived keys used by KPI cards */
  function aggPlus() {
    const agg = D.aggregate(state);
    agg.impexp = agg.importsN + agg.exportsN;
    agg.transports = agg.transportsN;
    agg.savings = agg.importSaving + agg.toSaving;
    return agg;
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
    { k: "mbos", label: "kpi.equipment", icon: "equip", unit: "unit.unit", cls: "", color: "var(--accent)" },
    { k: "impexp", label: "kpi.impexp", icon: "collection", unit: "unit.order", cls: "", color: "var(--info)" },
    { k: "transports", label: "kpi.transports", icon: "truck", unit: "unit.order", cls: "k-violet", color: "var(--violet)" },
    { k: "savings", label: "kpi.savings", icon: "percent", unit: "unit.sar", cls: "k-ok", color: "var(--ok)" },
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
        وأخرج <b>${nf(agg.mbos)}</b> معدة كبيرة (MBO) إلى الإنتاج، وأنجز <b>${nf(agg.impexp)}</b> شحنة استيراد وتصدير
        و<b>${nf(agg.transports)}</b> أمر نقل ثقيل بتوفير إجمالي <b>${nf(agg.savings)}</b> ر.س من مقارنة العروض،
        وصرف <b>${nf(agg.items)}</b> صنفاً لفريق الإنتاج. بلغت نسبة الالتزام بالتخليص الجمركي
        <b>${pf(agg.onTimePct)}</b> مقابل المستهدف (جوي ≤ ٣ أيام · بحري ≤ ٥ أيام)،
        مع <b>${nf(agg.breaches)}</b> تجاوزاً تمّت معالجته وتوثيقه في سجل الأسباب الجذرية.`;
    } else {
      lead = `In <b>${mlabel}</b>, the Logistics &amp; Warehouse team cleared <b>${nf(totalShip)}</b> shipments
        (<b>${nf(agg.inbound)}</b> inbound / <b>${nf(agg.outbound)}</b> outbound) across <b>${scope}</b>,
        released <b>${nf(agg.mbos)}</b> major buyouts (MBO) to production, completed <b>${nf(agg.impexp)}</b> import &amp; export
        shipments and <b>${nf(agg.transports)}</b> heavy-transport orders — saving <b>${nf(agg.savings)}</b> SAR through
        rate comparison — and issued <b>${nf(agg.items)}</b> items to the production team. Customs clearance held at
        <b>${pf(agg.onTimePct)}</b> on-time against target (air ≤ 3 days · sea ≤ 5 days),
        with <b>${nf(agg.breaches)}</b> breach(es) logged and resolved in the root-cause log.`;
    }
    const pill = (label, val) => `<span class="npill">${label}<b>${val}</b></span>`;
    return `<div class="narrative">
      <div class="eyebrow">${t("narr.eyebrow")} · ${mlabel}</div>
      <p class="lead">${lead}</p>
      <div class="pills">
        ${pill(t("kpi.ontime") + " ", pf(agg.onTimePct))}
        ${pill(t("kpi.savings") + " ", nf(agg.savings) + " " + t("sar"))}
        ${pill(t("kpi.manhours") + " ", nf(agg.manHours) + " " + t("unit.hour"))}
        ${pill(t("kpi.spaceCost") + " ", nf(agg.spaceCost) + " " + t("sar"))}
        ${pill(t("kpi.laborCost") + " ", nf(agg.laborCost) + " " + t("sar"))}
      </div>
    </div>`;
  }

  /* ---------- KPI target table (brief §4: target · actual · status) ---------- */
  function kpiTargetTable(agg) {
    const rows = [
      { label: "kpit.air", formula: "kpit.formula.air", target: D.TARGETS.air, actual: agg.airDays },
      { label: "kpit.sea", formula: "kpit.formula.sea", target: D.TARGETS.sea, actual: agg.seaDays },
      { label: "kpit.recv", formula: "kpit.formula.recv", target: D.TARGETS.recv, actual: agg.recvDays },
      { label: "kpit.grn", formula: "kpit.formula.grn", target: D.TARGETS.grn, actual: agg.grnDays },
    ];
    const body = rows.map((r) => {
      const ok = r.actual <= r.target;
      return `<tr>
        <td class="strong" style="white-space:normal">${t(r.label)}<br><span style="color:var(--faint);font-size:11px;font-weight:500">${t(r.formula)}</span></td>
        <td class="num">≤ ${nfd(r.target)} ${t("unit.days")}</td>
        <td class="num strong" style="color:${ok ? "var(--fg)" : "var(--danger)"}">${nfd(r.actual)} ${t("unit.days")}</td>
        <td><span class="chip ${ok ? "ok" : "danger"}">${ok ? t("kpit.ok") : t("kpit.breach")}</span></td>
      </tr>`;
    }).join("");
    const head = th("kpit.kpi") + th("kpit.target", "num") + th("kpit.actual", "num") + th("kpit.status");
    return `<div class="card">
      <div class="card-head"><h3>${t("kpit.title")}</h3><span class="sub">${t("kpit.sub")}</span></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    </div>`;
  }

  /* ---------- alerts card (brief §9: 4 alert rules) ---------- */
  function alertsCard() {
    const list = D.alerts(state);
    const order = { danger: 0, warn: 1, info: 2 };
    list.sort((a, b) => order[a.sev] - order[b.sev]);
    const msg = (a) => {
      if (a.rule === "eta") return t("alert.eta.msg").replace("{d}", nfd(a.days));
      if (a.rule === "grn") return t("alert.grn.msg") + " (" + nfd(a.days) + " " + t("unit.days") + ")";
      if (a.rule === "air") return t("alert.air.msg") + " (" + nfd(a.days) + " " + t("unit.days") + ")";
      return t("alert.sea.msg") + " (" + nfd(a.days) + " " + t("unit.days") + ")";
    };
    const color = { danger: "var(--danger)", warn: "var(--warn)", info: "var(--info)" };
    const body = list.length
      ? list.slice(0, 8).map((a) => `<div class="si"><div class="l"><span class="swd" style="background:${color[a.sev]}"></span>
          <span><b>${t("alert." + a.rule)}</b> · <span class="mono" style="color:var(--faint)">${a.ref}</span><br>
          <span style="color:var(--muted);font-size:11.5px">${msg(a)} · ${projName(a.proj)}</span></span></div>
          <div class="v"><span class="chip ${a.sev === "info" ? "info" : a.sev === "warn" ? "warn" : "danger"}">${nfd(a.days)} ${t("alerts.day")}</span></div></div>`).join("")
      : `<div class="empty">${t("alerts.none")}</div>`;
    return `<div class="card">
      <div class="card-head"><h3>${t("alerts.title")}</h3><span class="sub">${t("alerts.sub")}</span></div>
      <div class="card-body"><div class="statlist">${body}</div></div>
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
    const agg = aggPlus();
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
      <div class="grid cols-2" style="margin-bottom:16px">
        ${kpiTargetTable(agg)}
        ${alertsCard()}
      </div>
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

    const body = disp.map((s) => {
      const over = s.type === "inbound" && s.target != null && s.daysClear > s.target;
      return `<tr class="${s.breach ? "row-breach" : ""}">
      <td class="mono strong">${s.ref}</td>
      <td>${chip(s.type)}</td>
      <td>${L(s.party)}</td>
      <td>${t("mode." + s.mode)}</td>
      <td>${L(s.port)}</td>
      <td class="mono">${s.arrival}</td>
      <td class="num" style="color:${over ? "var(--danger)" : "var(--fg)"};font-weight:${over ? 700 : 500}">${s.daysClear != null ? nfd(s.daysClear) : "—"}${over ? " ⚑" : ""}</td>
      <td class="num" style="color:var(--faint)">${s.target != null ? "≤ " + nfd(s.target) : "—"}</td>
      <td>${s.broker ? L(s.broker) : "—"}</td>
      <td>${s.emp ? L(D.EMPLOYEES[s.emp]) : "—"}</td>
      <td>${chip(s.status)}</td>
    </tr>`;
    });
    const head = th("th.ref") + th("th.type") + th("th.supplier") + th("th.mode") + th("th.port") +
      th("th.arrival") + th("th.daysclear", "num") + th("th.target", "num") + th("th.broker") + th("th.employee") + th("th.status");

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

    /* broker performance (Metab: avg clearance per broker + on-time %) */
    const bperf = D.brokerPerf(state);
    const bpBody = bperf.map((b) => `<tr>
      <td class="strong">${L(b.broker)}</td>
      <td class="num">${nf(b.n)}</td>
      <td class="num strong">${nfd(b.avgDays)} ${t("unit.days")}</td>
      <td><span class="chip ${b.onTimePct >= 95 ? "ok" : b.onTimePct >= 88 ? "warn" : "danger"}">${pf(b.onTimePct)}</span></td>
    </tr>`).join("");
    const bpHead = th("th.broker") + th("th.shipments", "num") + th("th.avgdays", "num") + th("th.ontime");
    const brokerCard = `<div class="card">
      <div class="card-head"><h3>${t("card.brokerPerf")}</h3><span class="sub">${t("card.brokerPerf.sub")}</span></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>${bpHead}</tr></thead><tbody>${bpBody}</tbody></table></div>
    </div>`;

    const clearCard = `<div class="card"><div class="card-body" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        ${CH.ring(Math.round(agg.onTimePct), { label: t("legend.ontime") })}
        <div style="flex:1;min-width:200px">
          <div style="font-size:13.5px;font-weight:700">${t("chart.clearTrend")}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">${t("target")}: <b style="color:var(--accent)">${t("target.air")} · ${t("target.sea")}</b> · ${t("kpi.breaches")}: <b style="color:var(--danger)">${nf(agg.breaches)}</b></div>
          <div style="margin-top:12px">${CH.lineTarget(ser.map((s) => ({ label: monShort(s.m.id), v: s.onTimePct })), { target: 95, targetLabel: t("legend.target") })}</div>
        </div>
      </div></div>`;

    return `<div class="view">
      <div class="kpi-grid">${kpis}</div>
      <div class="grid cols-2" style="margin-bottom:16px">${clearCard}${brokerCard}</div>
      <div class="section-head">
        <button class="iconbtn toggle-on" data-wiz-open>${icon("flow")}${t("wiz.open")}</button>
        <span class="spacer"></span>${seg}
      </div>
      ${tableCard("nav.shipments", "page.shipments.sub", head, body, total)}
      <p class="foot-note">⚑ ${t("breach")} — ${t("target.air")} · ${t("target.sea")}. ${t("doc.footer")}</p>
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
    const avgAcc = rows.length ? (rows.reduce((a, r) => a + r.accuracy, 0) / rows.length).toFixed(1) : 0;

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
      <div class="kpi k-ok"><div class="k-label">${icon("percent")}${t("kpi.accuracy")}</div><div class="k-value">${nfd(avgAcc)}<span class="unit">%</span></div><div class="k-foot"><span class="vs">${t("dept.production")}</span></div></div>
    </div>`;

    const body = disp.map((r) => `<tr>
      <td class="mono strong">${r.mir}${r.rev ? ` <span class="chip warn plain" style="margin-inline-start:4px">R${r.rev}</span>` : ""}</td>
      <td>${projName(r.proj)}</td>
      <td><span class="chip violet plain">${t("dept.production")}</span></td>
      <td class="mono">${r.date}</td>
      <td class="num">${r.lineItems}</td>
      <td>${kitChip(r.stage)}${r.signed ? ` <span class="chip ok plain" style="margin-inline-start:4px">${t("signed")}</span>` : ""}</td>
      <td class="num">${nfd(r.turnaround)} ${t("unit.hour")}</td>
      <td class="num">${pf(r.accuracy)}</td>
      <td>${r.crew.map((c) => L(D.EMPLOYEES[c])).join("، ")}</td>
    </tr>`);
    const head = th("th.mir") + th("th.project") + th("th.dept") + th("th.date") + th("th.lineitems", "num") + th("th.stage") + th("th.turnaround", "num") + th("th.accuracy", "num") + th("th.crew");

    return `<div class="view">
      ${kpiStrip}
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${t("nav.issuance")}</h3><span class="sub">${t("kit.gather")} → ${t("kit.palletized")} / ${t("kit.boxed")} → ${t("kit.toProduction")}</span></div><div class="card-body">${pipeline}</div></div>
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
     VIEW: MBO Releases (major buyouts — warehouse → production)
     ============================================================ */
  function viewEquipment() {
    let eq = D.MBOS.filter((r) => (state.project === "all" || r.proj === state.project) && (state.month === "all" || r.mon === state.month));
    eq.sort((a, b) => (a.date < b.date ? 1 : -1));
    const eqDone = eq.filter((r) => r.status === "completed").length;
    const avgDur = eq.length ? (eq.reduce((a, r) => a + r.durationH, 0) / eq.length).toFixed(1) : 0;
    const photos = eq.reduce((a, r) => a + r.photos, 0);

    const kpiStrip = `<div class="kpi-grid">
      <div class="kpi"><div class="k-label">${icon("equip")}${t("kpi.equipment")}</div><div class="k-value">${nf(eq.length)}<span class="unit">${t("unit.unit")}</span></div><div class="k-foot"><span class="vs">${monName(state.month)}</span></div></div>
      <div class="kpi k-warn"><div class="k-label">${icon("clock")}${t("th.duration")}</div><div class="k-value">${nfd(avgDur)}<span class="unit">${t("unit.hour")}</span></div><div class="k-foot"><span class="vs">${t("avgMonth")}</span></div></div>
      <div class="kpi k-ok"><div class="k-label">${icon("truck")}${t("st.completed")}</div><div class="k-value">${nf(eqDone)}</div><div class="k-foot"><span class="vs">${pf(eq.length ? Math.round(eqDone / eq.length * 100) : 0)}</span></div></div>
      <div class="kpi k-violet"><div class="k-label">${icon("doc")}${t("th.photos")}</div><div class="k-value">${nf(photos)}</div><div class="k-foot"><span class="vs">${t("note")}</span></div></div>
    </div>`;

    const eqBody = eq.slice(0, ROW_CAP).map((r) => `<tr>
      <td class="mono strong">${r.ref}</td>
      <td>${L(r.equip)}</td>
      <td>${projName(r.proj)}</td>
      <td class="num">${nf(r.weight)} t</td>
      <td class="num strong">${nfd(r.durationH)} ${t("unit.hour")}</td>
      <td>${r.crew.map((c) => L(D.EMPLOYEES[c])).join(", ")}</td>
      <td class="num">${nf(r.photos)}</td>
      <td class="mono">${r.date}</td>
      <td>${chip(r.status)}</td>
    </tr>`);
    const eqHead = th("th.ref") + th("th.equip") + th("th.project") + th("th.weight", "num") + th("th.duration", "num") + th("th.crew") + th("th.photos", "num") + th("th.date") + th("th.status");

    return `<div class="view">${kpiStrip}
      ${tableCard("page.equipment.title", "page.equipment.sub", eqHead, eqBody, eq.length)}
      <p class="foot-note">${t("doc.footer")}</p>
    </div>`;
  }

  /* ============================================================
     VIEW: Import & Export shipments (was "Collections" — renamed per brief)
     ============================================================ */
  function viewImpExp() {
    const isImp = state.impexpTab !== "exports";
    const inScope = (x) => (state.project === "all" || x.proj === state.project) && (state.month === "all" || x.mon === state.month);
    const imps = D.IMPORTS.filter(inScope).sort((a, b) => (a.date < b.date ? 1 : -1));
    const exps = D.EXPORTS.filter(inScope).sort((a, b) => (a.date < b.date ? 1 : -1));
    const savingTot = imps.reduce((a, x) => a + (x.saving || 0), 0);
    const sicusN = imps.filter((x) => x.sicus).length;
    const avgRfq = (() => { const r = imps.filter((x) => x.rfqDays != null); return r.length ? (r.reduce((a, x) => a + x.rfqDays, 0) / r.length).toFixed(1) : 0; })();

    const kpiStrip = `<div class="kpi-grid">
      <div class="kpi"><div class="k-label">${icon("collection")}${t("kpi.imports")}</div><div class="k-value">${nf(imps.length)}<span class="unit">${t("unit.order")}</span></div><div class="k-foot"><span class="vs">${monName(state.month)}</span></div></div>
      <div class="kpi k-violet"><div class="k-label">${icon("shipOut")}${t("kpi.exports")}</div><div class="k-value">${nf(exps.length)}<span class="unit">${t("unit.order")}</span></div><div class="k-foot"><span class="vs">${monName(state.month)}</span></div></div>
      <div class="kpi k-ok"><div class="k-label">${icon("percent")}${t("kpi.savings")}</div><div class="k-value">${nf(savingTot)}<span class="unit">${t("sar")}</span></div><div class="k-foot"><span class="vs">${t("imp.savingNote")}</span></div></div>
      <div class="kpi"><div class="k-label">${icon("doc")}SICUS</div><div class="k-value">${nf(sicusN)}</div><div class="k-foot"><span class="vs">${t("st.rfq_sent")} → ${t("st.quotes_in")}: ~${nfd(avgRfq)} ${t("unit.days")}</span></div></div>
    </div>`;

    const seg = `<div class="doc-tabs">
      <div class="doc-tab ${isImp ? "active" : ""}" data-impexp="imports">${t("imp.tab.imports")}</div>
      <div class="doc-tab ${!isImp ? "active" : ""}" data-impexp="exports">${t("imp.tab.exports")}</div>
    </div>`;

    const fwd = (id) => L(D.FORWARDERS.find((f) => f.id === id));
    const q = (x, id) => {
      if (x.express) return "—";
      const v = x.q[id];
      const won = x.awardedTo === id;
      return `<span class="${won ? "q-award" : ""}">${nf(v)}</span>`;
    };
    const impBody = imps.slice(0, ROW_CAP).map((x) => `<tr>
      <td class="mono strong">${x.ref}</td>
      <td>${L(x.shipper)}</td>
      <td>${projName(x.proj)}</td>
      <td class="num">${q(x, "dsv")}</td>
      <td class="num">${q(x, "dhl")}</td>
      <td class="num">${q(x, "schenker")}</td>
      <td>${x.express ? `<span class="chip violet">${t("st.express")}</span>` : `<span class="chip ok plain">${fwd(x.awardedTo)}</span>`}</td>
      <td class="num strong" style="color:var(--ok)">${x.saving != null ? nf(x.saving) : "—"}</td>
      <td class="mono">${x.sicus || "—"}</td>
      <td>${chip(x.stage)}</td>
    </tr>`);
    const impHead = th("th.jobno") + th("th.shipper") + th("th.project") + "<th class=\"num\">DSV</th><th class=\"num\">DHL</th><th class=\"num\">Schenker</th>" +
      th("th.awarded") + th("th.saving", "num") + th("th.sicus") + th("th.status");

    const expBody = exps.slice(0, ROW_CAP).map((x) => `<tr>
      <td class="mono strong">${x.ref}</td>
      <td>${L(x.consignee)}</td>
      <td>${projName(x.proj)}</td>
      <td>${L(x.dest)}</td>
      <td class="plain">${x.incoterm}</td>
      <td class="num">${x.items}</td>
      <td class="mono">${x.date}</td>
      <td>${chip(x.status)}</td>
    </tr>`);
    const expHead = th("th.ref") + th("th.consignee") + th("th.project") + th("th.dest") + "<th>Incoterm</th>" + th("th.items", "num") + th("th.date") + th("th.status");

    const flowNote = `<div class="card" style="margin-bottom:16px"><div class="card-body" style="font-size:12.5px;color:var(--muted)">${t("imp.flow")}</div></div>`;

    return `<div class="view">
      ${kpiStrip}
      ${isImp ? flowNote : ""}
      <div class="section-head"><span class="spacer"></span>${seg}</div>
      ${isImp
        ? tableCard("imp.tab.imports", "page.impexp.sub", impHead, impBody, imps.length)
        : tableCard("imp.tab.exports", null, expHead, expBody, exps.length)}
      <p class="foot-note">${t("imp.savingNote")}. ${t("doc.footer")}</p>
    </div>`;
  }

  /* ============================================================
     VIEW: Transport Orders (heavy transport — WhatsApp 2026-07-02)
     ============================================================ */
  function viewTransport() {
    const inScope = (x) => (state.project === "all" || x.proj === state.project) && (state.month === "all" || x.mon === state.month);
    const tos = D.TRANSPORTS.filter(inScope).sort((a, b) => (a.date < b.date ? 1 : -1));
    const savingTot = tos.reduce((a, x) => a + x.saving, 0);
    const avgSaving = tos.length ? Math.round(savingTot / tos.length) : 0;
    const done = tos.filter((x) => x.status === "completed").length;

    const kpiStrip = `<div class="kpi-grid">
      <div class="kpi"><div class="k-label">${icon("truck")}${t("to.count")}</div><div class="k-value">${nf(tos.length)}<span class="unit">${t("unit.order")}</span></div><div class="k-foot"><span class="vs">${monName(state.month)}</span></div></div>
      <div class="kpi k-ok"><div class="k-label">${icon("percent")}${t("kpi.savings")}</div><div class="k-value">${nf(savingTot)}<span class="unit">${t("sar")}</span></div><div class="k-foot"><span class="vs">${t("imp.savingNote")}</span></div></div>
      <div class="kpi k-violet"><div class="k-label">${icon("percent")}${t("to.avgSaving")}</div><div class="k-value">${nf(avgSaving)}<span class="unit">${t("sar")}</span></div><div class="k-foot"><span class="vs">${t("avgMonth")}</span></div></div>
      <div class="kpi"><div class="k-label">${icon("truck")}${t("st.completed")}</div><div class="k-value">${nf(done)}</div><div class="k-foot"><span class="vs">${pf(tos.length ? Math.round(done / tos.length * 100) : 0)}</span></div></div>
    </div>`;

    const tr = (id) => L(D.TRANSPORTERS.find((f) => f.id === id));
    const rate = (x, id) => {
      const won = x.awardedTo === id;
      return `<span class="${won ? "q-award" : ""}">${nf(x.rates[id])}</span>`;
    };
    const body = tos.slice(0, ROW_CAP).map((x) => `<tr>
      <td class="mono strong">${x.ref}</td>
      <td>${L(x.from)} ${state.lang === "ar" ? "←" : "→"} ${L(x.to)}</td>
      <td>${L(x.cargo)}</td>
      <td>${projName(x.proj)}</td>
      <td class="num">${rate(x, "t1")}</td>
      <td class="num">${rate(x, "t2")}</td>
      <td class="num">${rate(x, "t3")}</td>
      <td><span class="chip ok plain">${tr(x.awardedTo)}</span></td>
      <td class="num strong" style="color:var(--ok)">${nf(x.saving)}</td>
      <td class="mono">${x.date}</td>
      <td>${chip(x.status)}</td>
    </tr>`);
    const head = th("th.ref") + th("th.route") + th("th.cargo") + th("th.project") +
      `<th class="num">${tr("t1")}</th><th class="num">${tr("t2")}</th><th class="num">${tr("t3")}</th>` +
      th("th.awarded") + th("th.saving", "num") + th("th.date") + th("th.status");

    const flowNote = `<div class="card" style="margin-bottom:16px"><div class="card-body" style="font-size:12.5px;color:var(--muted)">${t("to.flow")}</div></div>`;

    return `<div class="view">
      ${kpiStrip}
      ${flowNote}
      ${tableCard("page.transport.title", "page.transport.sub", head, body, tos.length)}
      <p class="foot-note">${t("imp.savingNote")}. ${t("doc.footer")}</p>
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
    const kind = state.docTab; // dn | pl | gp
    const isDN = kind === "dn", isGP = kind === "gp";
    const proj = D.project(ship.proj);
    const docNo = (isDN ? "SE-DN-26" : isGP ? "SE-GP-26" : "SE-PL-26") + ship.ref.slice(-4);
    const docTitle = isDN ? t("doc.deliveryNote") : isGP ? t("doc.gatePass") : t("doc.packingList");

    const options = list.map((s) => `<option value="${s.ref}" ${s.ref === ship.ref ? "selected" : ""}>${s.ref} · ${projName(s.proj)} · ${L(s.party)}</option>`).join("");

    const toolbar = `<div class="doc-toolbar">
      <div class="control" style="min-width:280px"><label>${t("doc.selectShip")}</label>
        <select class="sel" id="doc-ship" style="min-width:280px">${options}</select></div>
      <div class="doc-tabs">
        <div class="doc-tab ${kind === "dn" ? "active" : ""}" data-doctab="dn">${t("doc.dn")}</div>
        <div class="doc-tab ${kind === "pl" ? "active" : ""}" data-doctab="pl">${t("doc.pl")}</div>
        <div class="doc-tab ${kind === "gp" ? "active" : ""}" data-doctab="gp">${t("doc.gp")}</div>
      </div>
      <span class="spacer" style="flex:1"></span>
      <button class="iconbtn toggle-on" id="btn-print">${icon("print")}${t("doc.print")}</button>
    </div>`;

    const brandSvg = `<div class="dm">${icon("leaf")}</div>`;
    const head = `<div class="doc-head">
      <div class="doc-brand">${brandSvg}<div class="dt"><b>${t("app.org")}</b><span>${t("app.unit")}</span></div></div>
      <div class="doc-title"><h2>${docTitle}</h2><div class="docno">${docNo}</div></div>
    </div>`;

    const metaBlock = (lab, val) => `<div class="meta-block"><div class="ml">${lab}</div><div class="mv">${val}</div></div>`;
    const r = mb32(seedFrom("gp" + ship.ref));
    const vehicle = "TRL-" + (1000 + Math.floor(r() * 8999));
    const meta = isGP
      ? `<div class="doc-meta">
      ${metaBlock(t("doc.from"), `<b>${t("app.org")}</b><br>${t("doc.warehouse")} · ${L(proj)}`)}
      ${metaBlock(t("doc.to"), `<b>${L(D.SITES[ship.proj] || ship.party)}</b>`)}
      ${metaBlock(t("doc.project"), `<b>${L(proj)}</b> · ${proj ? proj.code : ""}`)}
      ${metaBlock(t("doc.ref"), `<b>${ship.ref}</b> · ${ship.po}`)}
      ${metaBlock(t("doc.date"), ship.arrival)}
      ${metaBlock(t("doc.vehicle") + " / " + t("doc.driver"), `${vehicle} · —`)}
    </div>`
      : `<div class="doc-meta">
      ${metaBlock(t("doc.from"), `<b>${t("app.org")}</b><br>${t("doc.warehouse")} · ${L(proj)}`)}
      ${metaBlock(t("doc.to"), `<b>${L(D.SITES[ship.proj] || ship.party)}</b><br>${t("dept.production")}`)}
      ${metaBlock(t("doc.project"), `<b>${L(proj)}</b> · ${proj ? proj.code : ""}`)}
      ${metaBlock(t("doc.ref"), `<b>${ship.ref}</b> · ${ship.po}`)}
      ${metaBlock(t("doc.date"), ship.arrival)}
      ${metaBlock(t("doc.mode"), `${t("mode." + ship.mode)} · ${ship.awb}`)}
    </div>`;

    let tableHead, tableBody, totals;
    if (isDN || isGP) {
      tableHead = `<th class="num">${t("doc.no")}</th><th>${t("doc.code")}</th><th>${t("doc.material")}</th><th class="num">${t("doc.qty")}</th><th>${t("doc.uom")}</th><th class="num">${t("doc.netw")} (kg)</th>`;
      tableBody = lines.map((l, i) => `<tr><td class="num">${i + 1}</td><td>${l.m.code}</td><td>${state.lang === "ar" ? l.m.ar : l.m.en}</td><td class="num">${l.qty}</td><td>${l.m.uom}</td><td class="num">${nf(l.net)}</td></tr>`).join("");
      totals = `<div class="doc-tot"><div><div class="tl">${t("doc.totalpkg")}</div><div class="tv">${totalPkg}</div></div><div><div class="tl">${t("doc.totalw")}</div><div class="tv">${nf(totalW)}</div></div></div>`;
    } else {
      tableHead = `<th class="num">${t("doc.no")}</th><th>${t("doc.code")}</th><th>${t("doc.material")}</th><th class="num">${t("doc.qty")}</th><th>${t("doc.pkg")}</th><th class="num">${t("doc.netw")}</th><th class="num">${t("doc.grossw")}</th>`;
      tableBody = lines.map((l, i) => `<tr><td class="num">${i + 1}</td><td>${l.m.code}</td><td>${state.lang === "ar" ? l.m.ar : l.m.en}</td><td class="num">${l.qty}</td><td>${l.pkg}</td><td class="num">${nf(l.net)}</td><td class="num">${nf(l.gross)}</td></tr>`).join("");
      totals = `<div class="doc-tot"><div><div class="tl">${t("doc.totalpkg")}</div><div class="tv">${totalPkg}</div></div><div><div class="tl">${t("doc.totalw")}</div><div class="tv">${nf(totalW)}</div></div></div>`;
    }

    const gpNote = isGP ? `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">${t("doc.gpNote")}</p>` : "";
    const sign = isGP
      ? `<div class="doc-sign">
      <div class="sign-box"><div class="sign-line"></div><div class="sl">${t("doc.preparedby")}</div></div>
      <div class="sign-box"><div class="sign-line"></div><div class="sl">${t("doc.authorizedby")}</div></div>
      <div class="sign-box"><div class="sign-line"></div><div class="sl">${t("doc.securityby")}</div></div>
    </div>`
      : `<div class="doc-sign">
      <div class="sign-box"><div class="sign-line"></div><div class="sl">${t("doc.preparedby")}</div></div>
      <div class="sign-box"><div class="sign-line"></div><div class="sl">${t("doc.checkedby")}</div></div>
      <div class="sign-box"><div class="sign-line"></div><div class="sl">${t("doc.receivedby")}</div></div>
    </div>`;
    const foot = `<div class="doc-foot"><span>${t("doc.footer")}</span><span>${docNo}</span></div>`;

    return `<div class="view">
      ${toolbar}
      <div class="paper printing" id="doc-paper">${head}${meta}
        <table class="doc-tbl"><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
        ${totals}${gpNote}${sign}${foot}
      </div>
      <p class="foot-note">${t("page.documents.sub")} · ${t("showing")} ${lines.length} ${t("of")} ${ship.items}.</p>
    </div>`;
  }

  /* ---------- nav ---------- */
  const NAV = [
    { group: "nav.group.ops", items: [
      { id: "overview", icon: "report" }, { id: "shipments", icon: "shipIn" },
      { id: "issuance", icon: "flow" }, { id: "equipment", icon: "equip" } ] },
    { group: "nav.group.logistics", items: [
      { id: "impexp", icon: "collection" }, { id: "transport", icon: "truck" } ] },
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
    equipment: viewEquipment, impexp: viewImpExp, transport: viewTransport,
    rootcause: viewRootcause, documents: viewDocuments,
  };
  if (!VIEWS[state.view]) state.view = "overview";

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
    wizRender(); /* keep wizard painted across lang/theme re-renders */
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
      const ie = e.target.closest("[data-impexp]");
      if (ie) { state.impexpTab = ie.getAttribute("data-impexp"); render(); return; }
      /* wizard */
      if (e.target.closest("[data-wiz-open]")) { wizOpen(); return; }
      const att = e.target.closest("[data-wiz-att]");
      if (att) { wiz.data[att.getAttribute("data-wiz-att")] = true; wizRender(); return; }
      if (e.target.closest("#wz-next")) {
        wizCollect();
        if (wizValid()) { wiz.err = false; wiz.step++; } else { wiz.err = true; }
        wizRender(); return;
      }
      if (e.target.closest("#wz-back")) { wizCollect(); wiz.err = false; wiz.step = Math.max(0, wiz.step - 1); wizRender(); return; }
      if (e.target.closest("#wz-save")) { wiz.done = true; wizRender(); return; }
      if (e.target.closest("#wz-close") || e.target.closest("#wz-close2") || e.target.closest("#wz-scrim")) { wizClose(); return; }
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
      else if (e.target.id === "wz-opened" && wiz) { wiz.data.opened = e.target.checked; }
      else if (e.target.id === "wz-segregated" && wiz) { wiz.data.segregated = e.target.checked; }
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

  /* ============================================================
     Guided capture wizard (demo) — Metab: "follow every step
     to not miss anything". Steps are enforced; no skipping.
     ============================================================ */
  const WIZ_STEPS = ["wiz.step1", "wiz.step2", "wiz.step3", "wiz.step4", "wiz.step5", "wiz.step6"];
  function wizOpen() {
    wiz = {
      step: 0, err: false, done: false,
      data: { ref: "", supplier: "", project: PROJECTS[0].id, mode: "sea", arrival: "", boxes: "", opened: false, segregated: false, inspect: "ok", inspNote: "", docDN: false, docPL: false, photos: false },
    };
    wizRender();
  }
  function wizClose() { wiz = null; wizRender(); }
  const wzv = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
  function wizCollect() {
    if (!wiz) return;
    const d = wiz.data;
    if (wiz.step === 0) {
      d.ref = wzv("wz-ref") || d.ref; d.supplier = wzv("wz-sup") || d.supplier;
      const p = document.getElementById("wz-proj"); if (p) d.project = p.value;
      const m = document.getElementById("wz-mode"); if (m) d.mode = m.value;
    }
    if (wiz.step === 1) { d.arrival = wzv("wz-arr") || d.arrival; d.boxes = wzv("wz-box") || d.boxes; }
    if (wiz.step === 3) {
      const c = document.querySelector('input[name="wz-insp"]:checked'); if (c) d.inspect = c.value;
      d.inspNote = wzv("wz-note") || d.inspNote;
    }
  }
  function wizValid() {
    const d = wiz.data;
    if (wiz.step === 0) return !!(d.ref && d.supplier);
    if (wiz.step === 1) return !!(d.arrival && d.boxes);
    if (wiz.step === 2) return d.opened && d.segregated;
    if (wiz.step === 4) return d.docDN && d.docPL && d.photos;
    return true;
  }
  function wizBody() {
    const d = wiz.data;
    const field = (label, inner) => `<div class="wz-field"><label>${label}</label>${inner}</div>`;
    const attach = (key, label) => `<div class="wz-attach ${d[key] ? "ok" : ""}">
      <span>${label}</span>
      <button class="wz-attbtn" data-wiz-att="${key}">${d[key] ? t("wiz.uploaded") : t("wiz.upload")}</button>
    </div>`;
    if (wiz.done) {
      return `<div class="wz-done">
        <div class="wz-done-ic">✓</div>
        <h4>${t("wiz.done.title")}</h4>
        <p>${t("wiz.done.msg")}</p>
        <div class="wz-review"><b>${t("wiz.review")}</b><br>
          ${d.ref} · ${projName(d.project)} · ${t("mode." + d.mode)} · ${L(D.SUPPLIERS.find((s) => s.en === d.supplier) || { ar: d.supplier, en: d.supplier })}<br>
          ${t("wiz.arrival")}: ${d.arrival} · ${t("wiz.boxes")}: ${d.boxes} · ${t("wiz.inspect")}: ${d.inspect === "ok" ? t("wiz.inspect.ok") : t("wiz.inspect.damage")}</div>
      </div>`;
    }
    switch (wiz.step) {
      case 0: return [
        field(t("wiz.ref"), `<input id="wz-ref" type="text" value="${d.ref}" placeholder="${t("wiz.ref.ph")}">`),
        field(t("wiz.supplier"), `<input id="wz-sup" type="text" value="${d.supplier}" placeholder="${t("wiz.supplier.ph")}">`),
        field(t("wiz.project"), `<select id="wz-proj" class="sel">${PROJECTS.map((p) => `<option value="${p.id}" ${p.id === d.project ? "selected" : ""}>${L(p)}</option>`).join("")}</select>`),
        field(t("wiz.mode"), `<select id="wz-mode" class="sel">${["sea", "air", "express"].map((m) => `<option value="${m}" ${m === d.mode ? "selected" : ""}>${t("mode." + m)}</option>`).join("")}</select>`),
      ].join("");
      case 1: return [
        field(t("wiz.arrival"), `<input id="wz-arr" type="date" value="${d.arrival}">`),
        field(t("wiz.boxes"), `<input id="wz-box" type="number" min="1" value="${d.boxes}">`),
        `<p class="wz-hint">${t("kpit.recv")}: ≤ ${nfd(D.TARGETS.recv)} ${t("unit.days")}</p>`,
      ].join("");
      case 2: return [
        `<label class="wz-check ${d.opened ? "ok" : ""}"><input type="checkbox" id="wz-opened" ${d.opened ? "checked" : ""}> ${t("wiz.opened")}</label>`,
        `<label class="wz-check ${d.segregated ? "ok" : ""}"><input type="checkbox" id="wz-segregated" ${d.segregated ? "checked" : ""}> ${t("wiz.segregated")}</label>`,
      ].join("");
      case 3: return [
        field(t("wiz.inspect"), `<div class="wz-radio">
          <label><input type="radio" name="wz-insp" value="ok" ${d.inspect === "ok" ? "checked" : ""}> ${t("wiz.inspect.ok")}</label>
          <label><input type="radio" name="wz-insp" value="damage" ${d.inspect === "damage" ? "checked" : ""}> ${t("wiz.inspect.damage")}</label>
        </div>`),
        field(t("wiz.inspNote"), `<textarea id="wz-note" rows="3" placeholder="${t("wiz.inspNote.ph")}">${d.inspNote}</textarea>`),
      ].join("");
      case 4: return [
        attach("docDN", t("wiz.docDN")),
        attach("docPL", t("wiz.docPL")),
        attach("photos", t("wiz.photos")),
      ].join("");
      case 5: return `<div class="wz-review"><b>${t("wiz.review")}</b><br>
        ${d.ref} · ${projName(d.project)} · ${t("mode." + d.mode)} · ${d.supplier}<br>
        ${t("wiz.arrival")}: ${d.arrival} · ${t("wiz.boxes")}: ${d.boxes}<br>
        ${t("wiz.opened")} ✓ · ${t("wiz.segregated")} ✓ · ${t("wiz.inspect")}: ${d.inspect === "ok" ? t("wiz.inspect.ok") : t("wiz.inspect.damage")}<br>
        ${t("wiz.docDN")} ✓ · ${t("wiz.docPL")} ✓ · ${t("wiz.photos")} ✓</div>`;
    }
    return "";
  }
  function wizRender() {
    let root = document.getElementById("wiz-root");
    if (!root) { root = document.createElement("div"); root.id = "wiz-root"; document.body.appendChild(root); }
    if (!wiz) { root.innerHTML = ""; return; }
    const stepper = WIZ_STEPS.map((k, i) => {
      const cls = wiz.done || i < wiz.step ? "done" : i === wiz.step ? "cur" : "lock";
      return `<div class="wz-step ${cls}" title="${cls === "lock" ? t("wiz.locked") : ""}"><span class="wz-dot">${wiz.done || i < wiz.step ? "✓" : i + 1}</span><span class="wz-lab">${t(k)}</span></div>`;
    }).join(`<span class="wz-conn"></span>`);
    const last = wiz.step === WIZ_STEPS.length - 1;
    const foot = wiz.done
      ? `<button class="wz-btn primary" id="wz-close2">${t("wiz.close")}</button>`
      : `${wiz.step > 0 ? `<button class="wz-btn" id="wz-back">${t("wiz.back")}</button>` : ""}
         <span class="spacer" style="flex:1"></span>
         ${wiz.err ? `<span class="wz-err">${t("wiz.required")}</span>` : ""}
         <button class="wz-btn primary" id="${last ? "wz-save" : "wz-next"}">${last ? t("wiz.save") : t("wiz.next")}</button>`;
    root.innerHTML = `
      <div class="wz-scrim" id="wz-scrim"></div>
      <div class="wz-modal" role="dialog" aria-modal="true">
        <div class="wz-head"><div><b>${t("wiz.title")}</b><div class="wz-sub">${t("wiz.sub")}</div></div>
          <button class="wz-x" id="wz-close" aria-label="close">×</button></div>
        <div class="wz-stepper">${stepper}</div>
        <div class="wz-body">${wizBody()}</div>
        <div class="wz-foot">${foot}</div>
      </div>`;
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () { bind(); render(); });
})();
