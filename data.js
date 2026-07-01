/* ============================================================
   data.js — deterministic, self-consistent sample data
   Siemens Energy KSA · Logistics & Warehouse Operations
   All figures are demo data; client will confirm names.
   Monthly anchors (across all projects):
     ~2000 inbound · ~1000 outbound · 50 equipment moves
     20 collections · 1000 items issued · ~2500 man-hours
   ============================================================ */
(function () {
  "use strict";

  /* ---- deterministic PRNG (mulberry32) ---- */
  function mb32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function R(seed) {
    const r = mb32(seed);
    return {
      f: r,
      int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)),
      dec: (lo, hi, d) => +(lo + r() * (hi - lo)).toFixed(d == null ? 1 : d),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      chance: (p) => r() < p,
    };
  }
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  /* ---- dimensions ---- */
  const PROJECTS = [
    { id: "fadhili2",    code: "FAD-2",   ar: "فاضلي ٢",                 en: "Fadhili 2",        w: 1.25 },
    { id: "abqaiq_rev",  code: "ABQ-R",   ar: "تطوير بقيق",              en: "Abqaiq Revamp",    w: 1.05 },
    { id: "abqaiq_isp",  code: "ABQ-ISP", ar: "بقيق ISP",               en: "Abqaiq ISP",       w: 0.90 },
    { id: "jafurah_gcb", code: "JAF-GCB", ar: "الجافورة ٢ – GCB",       en: "Jafurah 2 – GCB",  w: 1.15 },
    { id: "jafurah_gpp", code: "JAF-GPP", ar: "الجافورة ٢ – GPP",       en: "Jafurah 2 – GPP",  w: 1.20 },
    { id: "rumah_gt",    code: "RUM-GT",  ar: "توربينات غازية (رماح)",  en: "Gas Turbine (Rumah)", w: 0.72 },
    { id: "tanajib",     code: "TNJ",     ar: "تناجيب",                  en: "Tanajib",          w: 0.85 },
  ];
  const SUMW = PROJECTS.reduce((a, p) => a + p.w, 0);

  const MONTHS = [
    { id: "2026-01", ar: "يناير ٢٠٢٦",  en: "Jan 2026", sar: "يناير", sen: "Jan", n: 1, f: 0.87 },
    { id: "2026-02", ar: "فبراير ٢٠٢٦", en: "Feb 2026", sar: "فبراير", sen: "Feb", n: 2, f: 0.92 },
    { id: "2026-03", ar: "مارس ٢٠٢٦",   en: "Mar 2026", sar: "مارس", sen: "Mar", n: 3, f: 0.97 },
    { id: "2026-04", ar: "أبريل ٢٠٢٦",  en: "Apr 2026", sar: "أبريل", sen: "Apr", n: 4, f: 1.01 },
    { id: "2026-05", ar: "مايو ٢٠٢٦",   en: "Mai 2026", sar: "مايو", sen: "May", n: 5, f: 1.06 },
    { id: "2026-06", ar: "يونيو ٢٠٢٦",  en: "Jun 2026", sar: "يونيو", sen: "Jun", n: 6, f: 1.11 },
  ];
  const LATEST = MONTHS[MONTHS.length - 1].id;

  /* headcount per project (third-party labor) — totals ~10 people */
  const HEADCOUNT = { fadhili2: 2, abqaiq_rev: 1, abqaiq_isp: 1, jafurah_gcb: 2, jafurah_gpp: 2, rumah_gt: 1, tanajib: 1 };
  /* warehouse rate SAR / m² / month per project */
  const SPACE_RATE = { fadhili2: 41, abqaiq_rev: 40, abqaiq_isp: 39, jafurah_gcb: 42, jafurah_gpp: 40, rumah_gt: 38, tanajib: 39 };
  /* blended labor rate SAR / hour per project */
  const LABOR_RATE = { fadhili2: 52, abqaiq_rev: 49, abqaiq_isp: 47, jafurah_gcb: 54, jafurah_gpp: 53, rumah_gt: 46, tanajib: 48 };
  /* base indoor/outdoor m² per project */
  const SPACE_BASE = {
    fadhili2:    { in: 1450, out: 2100 },
    abqaiq_rev:  { in: 1100, out: 1500 },
    abqaiq_isp:  { in: 900,  out: 1200 },
    jafurah_gcb: { in: 1300, out: 1900 },
    jafurah_gpp: { in: 1400, out: 2050 },
    rumah_gt:    { in: 700,  out: 1050 },
    tanajib:     { in: 850,  out: 1250 },
  };

  /* ---- per (project, month) cells ---- */
  const CELLS = [];
  const cellMap = {};
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const r = R(hash(p.id + m.id));
      const share = p.w / SUMW;
      const mf = m.f * (1 + r.dec(-0.05, 0.05, 3));
      const inbound = Math.round(2000 * share * mf);
      const outbound = Math.round(1000 * share * mf);
      const equipment = Math.max(1, Math.round(50 * share * mf));
      const collections = Math.max(1, Math.round(20 * share * mf));
      const items = Math.round(1000 * share * mf);
      const mirs = Math.max(1, Math.round(18 * share * (0.9 + r.f() * 0.3)));
      const hc = HEADCOUNT[p.id];
      const hours = Math.round(hc * 260 * (0.96 + r.dec(0, 0.1, 3)));
      const lrate = LABOR_RATE[p.id];
      const laborCost = Math.round(hours * lrate);
      const sb = SPACE_BASE[p.id];
      const indoorM2 = Math.round(sb.in * (0.97 + r.dec(0, 0.06, 3)));
      const outdoorM2 = Math.round(sb.out * (0.97 + r.dec(0, 0.06, 3)));
      const srate = SPACE_RATE[p.id];
      const spaceCost = Math.round((indoorM2 + outdoorM2) * srate);
      // breaches: sparse; one seeded headline breach
      let breaches = r.chance(0.16) ? 1 : 0;
      if (r.chance(0.05)) breaches += 1;
      if (p.id === "jafurah_gpp" && m.id === "2026-06") breaches = Math.max(breaches, 1);
      if (p.id === "abqaiq_rev" && m.id === "2026-05") breaches = Math.max(breaches, 1);
      const avgDays = +(breaches > 0 ? r.dec(2.6, 3.4, 1) : r.dec(1.5, 2.6, 1));
      const onTimePct = Math.max(86, Math.min(99, Math.round(98 - breaches * 3.1 - r.dec(0, 1.6, 1))));
      const cell = {
        proj: p.id, mon: m.id, inbound, outbound, equipment, collections, items, mirs,
        headcount: hc, hours, laborRate: lrate, laborCost,
        indoorM2, outdoorM2, spaceRate: srate, spaceCost,
        breaches, avgDays, onTimePct,
      };
      CELLS.push(cell);
      cellMap[p.id + "|" + m.id] = cell;
    });
  });

  /* ---- aggregation helpers ---- */
  function cellsFor(state) {
    return CELLS.filter((c) =>
      (state.project === "all" || c.proj === state.project) &&
      (state.month === "all" || c.mon === state.month));
  }
  function aggregate(state) {
    const cs = cellsFor(state);
    const sum = (k) => cs.reduce((a, c) => a + c[k], 0);
    const inbound = sum("inbound"), outbound = sum("outbound");
    const totalClear = inbound + outbound;
    const wOnTime = cs.reduce((a, c) => a + c.onTimePct * (c.inbound + c.outbound), 0);
    const onTimePct = totalClear ? +(wOnTime / totalClear).toFixed(1) : 0;
    const wAvg = cs.reduce((a, c) => a + c.avgDays * (c.inbound + c.outbound), 0);
    const avgDays = totalClear ? +(wAvg / totalClear).toFixed(1) : 0;
    return {
      inbound, outbound, equipment: sum("equipment"), collections: sum("collections"),
      items: sum("items"), mirs: sum("mirs"), manHours: sum("hours"),
      laborCost: sum("laborCost"), spaceCost: sum("spaceCost"),
      indoorM2: sum("indoorM2"), outdoorM2: sum("outdoorM2"),
      breaches: sum("breaches"), onTimePct, avgDays,
    };
  }
  /* monthly series respecting project filter (ignores month filter) */
  function series(state) {
    return MONTHS.map((m) => {
      const cs = CELLS.filter((c) => c.mon === m.id && (state.project === "all" || c.proj === state.project));
      const sum = (k) => cs.reduce((a, c) => a + c[k], 0);
      const inb = sum("inbound"), out = sum("outbound");
      const wOn = cs.reduce((a, c) => a + c.onTimePct * (c.inbound + c.outbound), 0);
      return {
        mon: m, inbound: inb, outbound: out, items: sum("items"),
        onTimePct: (inb + out) ? +(wOn / (inb + out)).toFixed(1) : 0,
      };
    });
  }
  /* per-project breakdown for the selected month(s) — honors project filter */
  function byProject(state) {
    return PROJECTS.filter((p) => state.project === "all" || p.id === state.project).map((p) => {
      const cs = CELLS.filter((c) => c.proj === p.id && (state.month === "all" || c.mon === state.month));
      const sum = (k) => cs.reduce((a, c) => a + c[k], 0);
      const inb = sum("inbound"), out = sum("outbound");
      const wOn = cs.reduce((a, c) => a + c.onTimePct * (c.inbound + c.outbound), 0);
      const wAvg = cs.reduce((a, c) => a + c.avgDays * (c.inbound + c.outbound), 0);
      return {
        proj: p, inbound: inb, outbound: out, total: inb + out,
        items: sum("items"), equipment: sum("equipment"), collections: sum("collections"),
        mirs: sum("mirs"), manHours: sum("hours"), laborCost: sum("laborCost"),
        spaceCost: sum("spaceCost"), indoorM2: sum("indoorM2"), outdoorM2: sum("outdoorM2"),
        spaceRate: SPACE_RATE[p.id], laborRate: LABOR_RATE[p.id], headcount: HEADCOUNT[p.id],
        breaches: sum("breaches"),
        onTimePct: (inb + out) ? +(wOn / (inb + out)).toFixed(1) : 0,
        avgDays: (inb + out) ? +(wAvg / (inb + out)).toFixed(1) : 0,
      };
    });
  }

  /* ---- row-level catalogs ---- */
  const SUPPLIERS = [
    { ar: "سيمنس إنرجي العالمية", en: "Siemens Energy AG", origin: "DE" },
    { ar: "دريسر-راند", en: "Dresser-Rand", origin: "US" },
    { ar: "فليندر", en: "Flender GmbH", origin: "DE" },
    { ar: "بيكر هيوز", en: "Baker Hughes", origin: "US" },
    { ar: "ABB", en: "ABB Ltd.", origin: "CH" },
    { ar: "شنايدر إلكتريك", en: "Schneider Electric", origin: "FR" },
    { ar: "هيونداي للصناعات الثقيلة", en: "Hyundai Heavy Ind.", origin: "KR" },
    { ar: "مان للطاقة", en: "MAN Energy Solutions", origin: "DE" },
    { ar: "الزامل للحديد", en: "Zamil Steel", origin: "SA" },
    { ar: "نوفا الصناعية", en: "NOV Inc.", origin: "US" },
  ];
  const ORIGINS = {
    DE: { ar: "ألمانيا", en: "Germany" }, US: { ar: "الولايات المتحدة", en: "USA" },
    CH: { ar: "سويسرا", en: "Switzerland" }, FR: { ar: "فرنسا", en: "France" },
    KR: { ar: "كوريا الجنوبية", en: "South Korea" }, SA: { ar: "السعودية", en: "KSA" },
    IT: { ar: "إيطاليا", en: "Italy" }, CN: { ar: "الصين", en: "China" }, AE: { ar: "الإمارات", en: "UAE" },
  };
  const SITES = {
    fadhili2:    { ar: "معمل غاز فاضلي", en: "Fadhili Gas Plant" },
    abqaiq_rev:  { ar: "معمل بقيق", en: "Abqaiq Plant" },
    abqaiq_isp:  { ar: "بقيق ISP", en: "Abqaiq ISP Site" },
    jafurah_gcb: { ar: "حقل الجافورة – GCB", en: "Jafurah GCB" },
    jafurah_gpp: { ar: "حقل الجافورة – GPP", en: "Jafurah GPP" },
    rumah_gt:    { ar: "موقع رماح", en: "Rumah GT Site" },
    tanajib:     { ar: "تناجيب", en: "Tanajib Site" },
  };
  const MODES = ["sea", "air", "land"];
  const INCOTERMS = ["DAP", "CIF", "FOB", "DDP", "EXW"];
  const SHIP_STATUS = ["cleared", "cleared", "cleared", "in_progress", "held"];
  const PORTS = [
    { ar: "ميناء الدمام", en: "Dammam Port" }, { ar: "ميناء الجبيل التجاري", en: "Jubail Comm. Port" },
    { ar: "ميناء الملك عبدالعزيز", en: "King Abdulaziz Port" }, { ar: "ميناء جدة الإسلامي", en: "Jeddah Islamic Port" },
  ];

  function dayInMonth(monId, r) {
    const dd = String(r.int(2, 27)).padStart(2, "0");
    return monId + "-" + dd;
  }

  /* ---- shipments ---- */
  const SHIPMENTS = [];
  let shipSeq = 4100;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("ship" + p.id + m.id));
      const nIn = Math.min(9, Math.max(3, Math.round(cell.inbound / 95)));
      const nOut = Math.min(6, Math.max(2, Math.round(cell.outbound / 95)));
      let breachesLeft = cell.breaches;
      const make = (type) => {
        shipSeq++;
        const isIn = type === "inbound";
        const sup = r.pick(SUPPLIERS);
        const mode = r.pick(MODES);
        let days, status, breach = false;
        if (breachesLeft > 0 && isIn) {
          days = r.int(4, 6); breach = true; status = r.chance(0.5) ? "in_progress" : "held"; breachesLeft--;
        } else {
          days = r.dec(0.8, 3.0, 1);
          status = r.pick(SHIP_STATUS);
          if (days > 3) days = 2.8;
        }
        SHIPMENTS.push({
          proj: p.id, mon: m.id, type,
          ref: "SE-" + (isIn ? "IN" : "OUT") + "-26" + String(shipSeq).slice(-4),
          po: "PO-" + r.int(70000, 79999),
          party: isIn ? sup : SITES[p.id],
          origin: isIn ? sup.origin : "SA",
          dest: isIn ? p.id : "site",
          mode, incoterm: r.pick(INCOTERMS),
          items: r.int(8, 140), weight: r.dec(0.4, 48, 1),
          arrival: dayInMonth(m.id, r),
          daysClear: days, breach, status,
        });
      };
      for (let i = 0; i < nIn; i++) make("inbound");
      for (let i = 0; i < nOut; i++) make("outbound");
    });
  });
  // ensure the headline narrative breach exists & is described
  const headline = SHIPMENTS.find((s) => s.proj === "jafurah_gpp" && s.mon === "2026-06" && s.breach);
  if (headline) { headline.daysClear = 6; headline.status = "held"; headline.headline = true; headline.party = SUPPLIERS[0]; headline.origin = "DE"; }

  /* ---- material issuance requests (MIR → kitting → issue to Protection) ---- */
  const KIT_STAGES = ["gather", "palletized", "boxed", "issued"];
  const REQUESTERS = [
    { ar: "أحمد القحطاني", en: "A. Al-Qahtani" }, { ar: "فهد العتيبي", en: "F. Al-Otaibi" },
    { ar: "سعود الدوسري", en: "S. Al-Dosari" }, { ar: "خالد الشهري", en: "K. Al-Shahri" },
    { ar: "ناصر الغامدي", en: "N. Al-Ghamdi" }, { ar: "ماجد الحربي", en: "M. Al-Harbi" },
  ];
  const MIRS = [];
  let mirSeq = 800;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("mir" + p.id + m.id));
      const n = Math.min(6, Math.max(2, Math.round(cell.mirs / 1.4)));
      for (let i = 0; i < n; i++) {
        mirSeq++;
        const lineItems = r.int(60, 140);
        const isLast = m.id === LATEST;
        const stageIdx = isLast ? r.int(0, 3) : (r.chance(0.85) ? 3 : r.int(1, 3));
        const stage = KIT_STAGES[stageIdx];
        const ta = stage === "issued" ? r.dec(6, 34, 1) : r.dec(2, 20, 1);
        MIRS.push({
          proj: p.id, mon: m.id,
          mir: "MIR-26-" + String(mirSeq).slice(-3),
          dept: "protection",
          date: dayInMonth(m.id, r),
          lineItems, stage,
          turnaround: ta,
          requester: r.pick(REQUESTERS),
        });
      }
    });
  });

  /* ---- inventory snapshot ---- */
  const INV_CATS = [
    { ar: "صمامات", en: "Valves", code: "VLV" },
    { ar: "جوانات", en: "Gaskets", code: "GKT" },
    { ar: "براغي ومثبتات", en: "Bolts & Fasteners", code: "FST" },
    { ar: "كابلات الجهد العالي", en: "HV Cable", code: "CBL" },
    { ar: "أجهزة قياس", en: "Instrumentation", code: "INS" },
    { ar: "قطع غيار توربينات", en: "Turbine Spares", code: "TBN" },
    { ar: "مهمات الوقاية", en: "PPE / Protection", code: "PPE" },
    { ar: "لوحات تحكم", en: "Control Panels", code: "PNL" },
    { ar: "مواسير وتركيبات", en: "Pipe & Fittings", code: "PIP" },
    { ar: "محامل", en: "Bearings", code: "BRG" },
  ];
  const UOMS = ["EA", "SET", "MTR", "BOX", "PKG"];
  const INVENTORY = [];
  let invSeq = 1000;
  for (let i = 0; i < 96; i++) {
    const r = R(hash("inv" + i));
    const cat = r.pick(INV_CATS);
    const proj = r.pick(PROJECTS);
    invSeq += r.int(1, 4);
    const onHand = r.int(0, 1400);
    const reserved = Math.min(onHand, r.int(0, Math.round(onHand * 0.5)));
    const avail = onHand - reserved;
    let status = "in_stock";
    if (onHand === 0) status = "out";
    else if (avail < 25) status = "low";
    INVENTORY.push({
      proj: proj.id,
      code: cat.code + "-" + invSeq,
      cat,
      uom: r.pick(UOMS),
      onHand, reserved, avail, status,
      bin: String.fromCharCode(65 + r.int(0, 5)) + "-" + r.int(1, 24) + "-" + r.int(1, 6),
    });
  }

  /* ---- equipment moves ---- */
  const EQUIP_TYPES = [
    { ar: "دوّار توربين غازي", en: "Gas turbine rotor" },
    { ar: "عضو ثابت لمولّد", en: "Generator stator" },
    { ar: "محوّل كهربائي", en: "Power transformer" },
    { ar: "خلية GIS", en: "GIS bay" },
    { ar: "وحدة ضاغط", en: "Compressor module" },
    { ar: "بكرة كابل جهد عالٍ", en: "HV cable drum" },
    { ar: "مبادل حراري", en: "Heat exchanger" },
    { ar: "لوحة توزيع", en: "Switchgear panel" },
  ];
  const TRAILERS = [
    { ar: "مقطورة منخفضة", en: "Lowbed trailer" },
    { ar: "مسطحة ٤٠ قدم", en: "Flatbed 40ft" },
    { ar: "ناقلة SPMT", en: "SPMT module" },
    { ar: "مقطورة هيدروليكية", en: "Hydraulic trailer" },
  ];
  const EQUIP = [];
  let eqSeq = 300;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("eq" + p.id + m.id));
      const n = cell.equipment; // one row per equipment move so the headline count == table rows
      for (let i = 0; i < n; i++) {
        eqSeq++;
        const isLast = m.id === LATEST;
        EQUIP.push({
          proj: p.id, mon: m.id,
          ref: "EQ-26-" + String(eqSeq).slice(-3),
          equip: r.pick(EQUIP_TYPES),
          from: r.pick(PORTS),
          to: SITES[p.id],
          trailer: r.pick(TRAILERS),
          weight: r.int(8, 165),
          date: dayInMonth(m.id, r),
          status: isLast && r.chance(0.4) ? (r.chance(0.5) ? "scheduled" : "in_transit") : "completed",
        });
      }
    });
  });

  /* ---- collection orders ---- */
  const COLLECTIONS = [];
  let coSeq = 500;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("co" + p.id + m.id));
      const n = cell.collections; // one row per collection order so the headline count == table rows
      for (let i = 0; i < n; i++) {
        coSeq++;
        const isLast = m.id === LATEST;
        COLLECTIONS.push({
          proj: p.id, mon: m.id,
          ref: "COL-26-" + String(coSeq).slice(-3),
          from: r.pick(PORTS),
          vendor: r.pick(SUPPLIERS),
          items: r.int(3, 60),
          date: dayInMonth(m.id, r),
          status: isLast && r.chance(0.45) ? (r.chance(0.5) ? "open" : "scheduled") : "completed",
        });
      }
    });
  });

  /* ---- root-cause log (every breach / delay) ---- */
  const RC_TEMPLATES = [
    {
      cat: { ar: "مستندات", en: "Documentation" },
      cause: { ar: "مستندات المورّد غير جاهزة عند الوصول (شهادة منشأ + قائمة تعبئة)", en: "Supplier documents not ready on arrival (CoO + packing list)" },
      corr: { ar: "تعديل المستندات لدى الجمارك وإعادة التقديم؛ تأخر التخليص أسبوعاً", en: "Documents amended with customs and resubmitted; clearance delayed one week" },
      delay: 7,
    },
    {
      cat: { ar: "فحص", en: "Inspection" },
      cause: { ar: "إحالة الشحنة للفحص الفيزيائي من الجهة الرقابية", en: "Shipment routed to physical inspection by regulator" },
      corr: { ar: "حجز موعد فحص مبكر وتنسيق مع المخلّص الجمركي", en: "Booked early inspection slot and coordinated with broker" },
      delay: 3,
    },
    {
      cat: { ar: "تصنيف", en: "Classification" },
      cause: { ar: "اختلاف في البند الجمركي (HS Code) لبعض الأصناف", en: "HS-code mismatch on several line items" },
      corr: { ar: "مراجعة التصنيف مع الجمارك وتصحيح البيان", en: "Re-classified with customs and corrected declaration" },
      delay: 2,
    },
    {
      cat: { ar: "موافقات", en: "Permits" },
      cause: { ar: "بانتظار موافقة هيئة (SASO/معدات خاصة)", en: "Awaiting regulatory approval (SASO / restricted item)" },
      corr: { ar: "تصعيد الطلب وتقديم الشهادات البديلة", en: "Escalated request and provided alternate certificates" },
      delay: 3,
    },
  ];
  const ROOTCAUSE = [];
  let rcSeq = 90;
  SHIPMENTS.filter((s) => s.breach).forEach((s) => {
    const r = R(hash("rc" + s.ref));
    const tpl = s.headline ? RC_TEMPLATES[0] : r.pick(RC_TEMPLATES);
    rcSeq++;
    ROOTCAUSE.push({
      proj: s.proj, mon: s.mon,
      ref: "RCA-26-" + String(rcSeq).slice(-2),
      shipRef: s.ref,
      cat: tpl.cat, cause: tpl.cause, corr: tpl.corr,
      delay: s.headline ? 7 : tpl.delay,
      daysClear: s.daysClear,
      raised: s.arrival,
      status: s.mon === LATEST ? (r.chance(0.5) ? "open" : "closed") : "closed",
      headline: !!s.headline,
    });
  });

  /* ---- exceptions feed (overview) ---- */
  function exceptions(state) {
    const list = [];
    ROOTCAUSE.filter((rc) =>
      (state.project === "all" || rc.proj === state.project) &&
      (state.month === "all" || rc.mon === state.month))
      .forEach((rc) => list.push(rc));
    return list;
  }

  window.DATA = {
    PROJECTS, MONTHS, LATEST, SUPPLIERS, ORIGINS, SITES, MODES,
    CELLS, SHIPMENTS, MIRS, INVENTORY, EQUIP, COLLECTIONS, ROOTCAUSE,
    project: (id) => PROJECTS.find((p) => p.id === id),
    month: (id) => MONTHS.find((m) => m.id === id),
    cellsFor, aggregate, series, byProject, exceptions,
  };
})();
