/* ============================================================
   data.js — deterministic, self-consistent sample data
   Siemens Energy KSA · Logistics & Warehouse Operations
   All figures are SYNTHETIC demo data.
   Grounded in Metab's written brief (2026-07-02):
     · 10 authoritative projects
     · KPI targets: air clearance 3d · sea 5d · receiving 4d · GRN 2d
     · brokers, handling employees, delay reasons
     · Import/Export shipments (RFQ×3 → SICUS → award → saving)
     · Transport orders (RFQ×3 transporters → award → saving)
     · MBO releases to production · MIR → kitting → PRODUCTION
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

  /* ---- dimensions: Metab's authoritative project list (brief §6) ---- */
  const PROJECTS = [
    { id: "abqaiq_isv",  code: "ABQ-ISV", ar: "بقيق ISV",           en: "CP Abqaiq ISV",    w: 1.05 },
    { id: "abqaiq_rev",  code: "ABQ-REV", ar: "تطوير بقيق",         en: "CP Abqaiq revamp", w: 1.00 },
    { id: "jafurah_gcp", code: "JAF-GCP", ar: "الجافورة ٢ – GCP",   en: "CP Jafurah 2 GCP", w: 1.15 },
    { id: "jafurah_gpp", code: "JAF-GPP", ar: "الجافورة ٢ – GPP",   en: "CP Jafurah 2 GPP", w: 1.20 },
    { id: "fadhili2",    code: "FAD-2",   ar: "الفاضلي ٢",          en: "CP Fadhili 2",     w: 1.25 },
    { id: "rumah",       code: "RUM",     ar: "رماح",               en: "LGT Rumah",        w: 0.80 },
    { id: "nayriah",     code: "NAY",     ar: "النعيرية",           en: "LGT Nayriah",      w: 0.75 },
    { id: "qassim",      code: "QAS",     ar: "القصيم",             en: "LGT Qassim",       w: 0.70 },
    { id: "taiba",       code: "TAI",     ar: "طيبة",               en: "LGT Taiba",        w: 0.72 },
    { id: "mrt",         code: "MRT",     ar: "MRT",                en: "CP MRT",           w: 0.88 },
  ];
  const SUMW = PROJECTS.reduce((a, p) => a + p.w, 0);

  const MONTHS = [
    { id: "2026-01", ar: "يناير ٢٠٢٦",  en: "Jan 2026", sar: "يناير", sen: "Jan", n: 1, f: 0.87 },
    { id: "2026-02", ar: "فبراير ٢٠٢٦", en: "Feb 2026", sar: "فبراير", sen: "Feb", n: 2, f: 0.92 },
    { id: "2026-03", ar: "مارس ٢٠٢٦",   en: "Mar 2026", sar: "مارس", sen: "Mar", n: 3, f: 0.97 },
    { id: "2026-04", ar: "أبريل ٢٠٢٦",  en: "Apr 2026", sar: "أبريل", sen: "Apr", n: 4, f: 1.01 },
    { id: "2026-05", ar: "مايو ٢٠٢٦",   en: "May 2026", sar: "مايو", sen: "May", n: 5, f: 1.06 },
    { id: "2026-06", ar: "يونيو ٢٠٢٦",  en: "Jun 2026", sar: "يونيو", sen: "Jun", n: 6, f: 1.11 },
  ];
  const LATEST = MONTHS[MONTHS.length - 1].id;

  /* ---- KPI targets (brief §4) — days ---- */
  const TARGETS = { air: 3, sea: 5, express: null, recv: 4, grn: 2 };

  /* ---- Metab's named team (brief §5 owners) — synthetic attribution ---- */
  const EMPLOYEES = {
    meshal:      { ar: "مشعل",       en: "Meshal" },
    abdurrahman: { ar: "عبدالرحمن",  en: "Abdur Rahman" },
    hassan:      { ar: "حسن",        en: "Hassan" },
    abdulaziz:   { ar: "عبدالعزيز",  en: "Abdulaziz" },
    junaid:      { ar: "جنيد",       en: "Junaid" },
  };
  const CLEAR_EMPS = ["abdulaziz", "junaid"];
  const MIR_EMPS = ["meshal", "abdurrahman"];

  /* ---- customs brokers (synthetic names) ---- */
  const BROKERS = [
    { id: "gulf",  ar: "الخليج للتخليص",   en: "Gulf Clearance" },
    { id: "sharq", ar: "الشرق للتخليص",    en: "Sharq Customs" },
    { id: "wataniya", ar: "الوطنية اللوجستية", en: "Wataniya Logistics" },
  ];

  /* ---- freight forwarders — Metab's own words (imports RFQ) ---- */
  const FORWARDERS = [
    { id: "dsv",      ar: "DSV",         en: "DSV" },
    { id: "dhl",      ar: "DHL",         en: "DHL" },
    { id: "schenker", ar: "شنكر",        en: "Schenker" },
  ];

  /* ---- heavy transporters (synthetic — brief names none) ---- */
  const TRANSPORTERS = [
    { id: "t1", ar: "الناقل الخليجي",      en: "Gulf Haulage" },
    { id: "t2", ar: "الوطنية للنقل الثقيل", en: "National Heavy Trans." },
    { id: "t3", ar: "الشرق للنقل",          en: "Sharq Transport" },
  ];

  /* headcount per project (third-party labor) — ~10 people total */
  const HEADCOUNT = { abqaiq_isv: 1, abqaiq_rev: 1, jafurah_gcp: 1, jafurah_gpp: 2, fadhili2: 2, rumah: 1, nayriah: 1, qassim: 0, taiba: 0, mrt: 1 };
  /* warehouse rate SAR / m² / month per project */
  const SPACE_RATE = { abqaiq_isv: 39, abqaiq_rev: 40, jafurah_gcp: 42, jafurah_gpp: 40, fadhili2: 41, rumah: 38, nayriah: 38, qassim: 37, taiba: 37, mrt: 39 };
  /* blended labor rate SAR / hour per project */
  const LABOR_RATE = { abqaiq_isv: 47, abqaiq_rev: 49, jafurah_gcp: 54, jafurah_gpp: 53, fadhili2: 52, rumah: 46, nayriah: 46, qassim: 45, taiba: 45, mrt: 48 };
  /* base indoor/outdoor m² per project */
  const SPACE_BASE = {
    abqaiq_isv:  { in: 700,  out: 1000 },
    abqaiq_rev:  { in: 850,  out: 1150 },
    jafurah_gcp: { in: 1000, out: 1450 },
    jafurah_gpp: { in: 1050, out: 1550 },
    fadhili2:    { in: 1100, out: 1600 },
    rumah:       { in: 450,  out: 700 },
    nayriah:     { in: 420,  out: 650 },
    qassim:      { in: 380,  out: 600 },
    taiba:       { in: 400,  out: 620 },
    mrt:         { in: 550,  out: 850 },
  };

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
    abqaiq_isv:  { ar: "بقيق ISV", en: "Abqaiq ISV Site" },
    abqaiq_rev:  { ar: "معمل بقيق", en: "Abqaiq Plant" },
    jafurah_gcp: { ar: "الجافورة – GCP", en: "Jafurah GCP" },
    jafurah_gpp: { ar: "الجافورة – GPP", en: "Jafurah GPP" },
    fadhili2:    { ar: "معمل غاز الفاضلي", en: "Fadhili Gas Plant" },
    rumah:       { ar: "موقع رماح", en: "Rumah Site" },
    nayriah:     { ar: "موقع النعيرية", en: "Nayriah Site" },
    qassim:      { ar: "موقع القصيم", en: "Qassim Site" },
    taiba:       { ar: "موقع طيبة", en: "Taiba Site" },
    mrt:         { ar: "موقع MRT", en: "MRT Site" },
  };
  /* shipment types per Metab: sea freight, air freight, express */
  const MODES = ["sea", "air", "express"];
  const SHIP_STATUS = ["cleared", "cleared", "cleared", "in_progress", "held"];
  const PORTS = [
    { ar: "ميناء الدمام", en: "Dammam Port" }, { ar: "ميناء الجبيل التجاري", en: "Jubail Comm. Port" },
    { ar: "ميناء الملك عبدالعزيز", en: "King Abdulaziz Port" }, { ar: "مطار الملك فهد الدولي", en: "King Fahd Intl. Airport" },
  ];
  const EXT_WAREHOUSE = { ar: "المستودع الخارجي", en: "External warehouse" };
  const FACTORY = { ar: "المصنع – الدمام", en: "Dammam Factory" };
  /* delay reasons (root-cause categories) */
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
      cause: { ar: "بانتظار موافقة هيئة (فسح/إعفاء سابر)", en: "Awaiting regulatory approval (Fasah / SABER exemption)" },
      corr: { ar: "تصعيد الطلب وتقديم الشهادات البديلة", en: "Escalated request and provided alternate certificates" },
      delay: 3,
    },
  ];

  function dayInMonth(monId, r) {
    const dd = String(r.int(2, 27)).padStart(2, "0");
    return monId + "-" + dd;
  }

  /* ---- per (project, month) volume anchors ---- */
  const CELLS = [];
  const cellMap = {};
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const r = R(hash(p.id + m.id));
      const share = p.w / SUMW;
      const mf = m.f * (1 + r.dec(-0.05, 0.05, 3));
      const inbound = Math.round(2000 * share * mf);
      const outbound = Math.round(1000 * share * mf);
      const mbos = Math.max(1, Math.round(50 * share * mf));
      const importsN = Math.max(1, Math.round(14 * share * mf));
      const exportsN = Math.max(0, Math.round(7 * share * mf));
      const transportsN = Math.max(1, Math.round(10 * share * mf));
      const items = Math.round(1000 * share * mf);
      const mirs = Math.max(1, Math.round(18 * share * (0.9 + r.f() * 0.3)));
      const hc = HEADCOUNT[p.id];
      const hours = Math.round(Math.max(hc, 0.5) * 260 * (0.96 + r.dec(0, 0.1, 3)));
      const lrate = LABOR_RATE[p.id];
      const laborCost = Math.round(hours * lrate);
      const sb = SPACE_BASE[p.id];
      const indoorM2 = Math.round(sb.in * (0.97 + r.dec(0, 0.06, 3)));
      const outdoorM2 = Math.round(sb.out * (0.97 + r.dec(0, 0.06, 3)));
      const srate = SPACE_RATE[p.id];
      const spaceCost = Math.round((indoorM2 + outdoorM2) * srate);
      const cell = {
        proj: p.id, mon: m.id, inbound, outbound, mbos, importsN, exportsN, transportsN, items, mirs,
        headcount: hc, hours, laborRate: lrate, laborCost,
        indoorM2, outdoorM2, spaceRate: srate, spaceCost,
        /* clearance metrics filled after shipment-row generation (rows are the truth) */
        breaches: 0, avgDays: 0, onTimePct: 0,
        airDaysSum: 0, airN: 0, seaDaysSum: 0, seaN: 0, recvSum: 0, recvN: 0, grnSum: 0, grnN: 0,
      };
      CELLS.push(cell);
      cellMap[p.id + "|" + m.id] = cell;
    });
  });

  /* ---- shipments (rows are the source of truth for clearance KPIs) ---- */
  const SHIPMENTS = [];
  let shipSeq = 4100;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("ship" + p.id + m.id));
      const nIn = Math.min(9, Math.max(3, Math.round(cell.inbound / 60)));
      const nOut = Math.min(6, Math.max(2, Math.round(cell.outbound / 60)));
      /* seed ~1-2 breach rows in some cells; guarantee the headline breach */
      let breachQuota = r.chance(0.22) ? 1 : 0;
      if (r.chance(0.05)) breachQuota += 1;
      if (p.id === "jafurah_gpp" && m.id === "2026-06") breachQuota = Math.max(breachQuota, 1);
      if (p.id === "abqaiq_rev" && m.id === "2026-05") breachQuota = Math.max(breachQuota, 1);
      const make = (type) => {
        shipSeq++;
        const isIn = type === "inbound";
        const sup = r.pick(SUPPLIERS);
        const mode = r.pick(["sea", "sea", "sea", "air", "air", "express"]);
        const target = TARGETS[mode];
        let days, breach = false, delayTpl = null;
        if (isIn && target != null && breachQuota > 0 && r.chance(0.6)) {
          days = +(target + r.dec(0.5, 2.5, 1)).toFixed(1);
          breach = true; breachQuota--;
          delayTpl = r.pick(RC_TEMPLATES);
        } else if (target != null) {
          days = r.dec(Math.max(0.8, target - 2.2), target - 0.2, 1);
        } else {
          days = r.dec(0.5, 1.5, 1); /* express — no stated target */
        }
        const status = breach ? (r.chance(0.5) ? "in_progress" : "held") : r.pick(SHIP_STATUS);
        /* receiving (target 4d) + GRN (target 2d) — inbound only */
        const recvDays = isIn ? (r.chance(0.12) ? r.dec(4.2, 5.6, 1) : r.dec(1.6, 3.8, 1)) : null;
        const grnDays = isIn ? (r.chance(0.10) ? r.dec(2.2, 3.4, 1) : r.dec(0.4, 1.9, 1)) : null;
        const arrival = dayInMonth(m.id, r);
        const etaSoonDays = null;
        SHIPMENTS.push({
          proj: p.id, mon: m.id, type,
          ref: "SE-" + (isIn ? "IN" : "OUT") + "-26" + String(shipSeq).slice(-4),
          po: "PO-" + r.int(70000, 79999),
          awb: (mode === "sea" ? "BL-" : "AWB-") + r.int(400000, 499999),
          party: isIn ? sup : SITES[p.id],
          origin: isIn ? sup.origin : "SA",
          port: r.pick(PORTS),
          mode,
          items: r.int(8, 140), weight: r.dec(0.4, 48, 1),
          arrival,
          daysClear: isIn ? days : null,
          target,
          breach: isIn ? breach : false,
          delayTpl,
          broker: isIn ? r.pick(BROKERS) : null,
          emp: isIn ? r.pick(CLEAR_EMPS) : null,
          recvDays, grnDays,
          status,
        });
        const s = SHIPMENTS[SHIPMENTS.length - 1];
        if (isIn) {
          if (s.breach) cell.breaches += 1;
          if (mode === "air") { cell.airDaysSum += days; cell.airN++; }
          if (mode === "sea") { cell.seaDaysSum += days; cell.seaN++; }
          cell.recvSum += recvDays; cell.recvN++;
          cell.grnSum += grnDays; cell.grnN++;
        }
      };
      for (let i = 0; i < nIn; i++) make("inbound");
      for (let i = 0; i < nOut; i++) make("outbound");
      /* derive cell clearance metrics FROM rows (headline == rows) */
      const inRows = SHIPMENTS.filter((s) => s.proj === p.id && s.mon === m.id && s.type === "inbound" && s.target != null);
      const onTime = inRows.filter((s) => s.daysClear <= s.target).length;
      cell.onTimePct = inRows.length ? +((onTime / inRows.length) * 100).toFixed(1) : 100;
      cell.avgDays = inRows.length ? +(inRows.reduce((a, s) => a + s.daysClear, 0) / inRows.length).toFixed(1) : 0;
    });
  });
  /* headline narrative breach */
  const headline = SHIPMENTS.find((s) => s.proj === "jafurah_gpp" && s.mon === "2026-06" && s.breach);
  if (headline) { headline.daysClear = headline.mode === "sea" ? 8 : 6; headline.status = "held"; headline.headline = true; headline.party = SUPPLIERS[0]; headline.origin = "DE"; headline.delayTpl = RC_TEMPLATES[0]; }

  /* ---- upcoming arrivals (ETA alert rule: 5 days before ETA) ---- */
  const UPCOMING = [];
  {
    let seq = 60;
    PROJECTS.slice(0, 6).forEach((p, i) => {
      const r = R(hash("eta" + p.id));
      const n = r.int(1, 2);
      for (let k = 0; k < n; k++) {
        seq++;
        const inDays = r.int(1, 5);
        UPCOMING.push({
          proj: p.id, mon: LATEST,
          ref: "SE-IN-26" + (5200 + seq),
          party: r.pick(SUPPLIERS),
          mode: r.pick(["sea", "sea", "air"]),
          port: r.pick(PORTS),
          etaInDays: inDays,
          eta: "2026-07-" + String(2 + inDays).padStart(2, "0"),
        });
      }
    });
  }

  /* ---- material issuance requests (MIR → kitting → PRODUCTION) ---- */
  const KIT_STAGES = ["gather", "palletized", "boxed", "issued"];
  const MIRS = [];
  let mirSeq = 800;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("mir" + p.id + m.id));
      const n = Math.min(6, Math.max(2, Math.round(cell.mirs / 1.2)));
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
          rev: r.chance(0.25) ? r.int(1, 2) : 0,
          dept: "production",
          date: dayInMonth(m.id, r),
          lineItems, stage,
          turnaround: ta,
          crew: [r.pick(MIR_EMPS)],
          accuracy: r.chance(0.8) ? r.dec(98, 100, 1) : r.dec(95, 98, 1),
          signed: stage === "issued",
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
    { ar: "مهمات وقاية", en: "PPE", code: "PPE" },
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

  /* ---- MBO releases (major buyouts — warehouse → production) ---- */
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
  const MBOS = [];
  let eqSeq = 300;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("mbo" + p.id + m.id));
      const n = cell.mbos; // one row per MBO so the headline count == table rows
      for (let i = 0; i < n; i++) {
        eqSeq++;
        const isLast = m.id === LATEST;
        MBOS.push({
          proj: p.id, mon: m.id,
          ref: "MBO-26-" + String(eqSeq).slice(-3),
          equip: r.pick(EQUIP_TYPES),
          weight: r.int(8, 165),
          durationH: r.dec(2.5, 9.5, 1), /* box-open + de-preservation + crane move */
          crew: ["hassan"],
          photos: r.int(3, 9),
          date: dayInMonth(m.id, r),
          status: isLast && r.chance(0.4) ? (r.chance(0.5) ? "scheduled" : "in_progress") : "completed",
        });
      }
    });
  });

  /* ---- import shipments (RFQ×3 → SICUS → award → booking → pickup) ---- */
  const IMP_STAGES = ["rfq_sent", "quotes_in", "docs_review", "sicus_issued", "awarded", "booked", "picked_up"];
  const IMPORTS = [];
  let impSeq = 200;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("imp" + p.id + m.id));
      const n = Math.min(4, Math.max(1, Math.round(cell.importsN / 3)));
      for (let i = 0; i < n; i++) {
        impSeq++;
        const express = r.chance(0.18); /* DHL-express path — no RFQ */
        const isLast = m.id === LATEST;
        const base = r.int(9000, 46000);
        const q = express ? null : {
          dsv: Math.round(base * r.dec(0.97, 1.18, 3)),
          dhl: Math.round(base * r.dec(0.95, 1.2, 3)),
          schenker: Math.round(base * r.dec(0.96, 1.22, 3)),
        };
        let awardedTo = null, awarded = null, saving = null;
        if (q) {
          const entries = [["dsv", q.dsv], ["dhl", q.dhl], ["schenker", q.schenker]];
          entries.sort((a, b) => a[1] - b[1]);
          awardedTo = entries[0][0]; awarded = entries[0][1];
          saving = entries[2][1] - awarded; /* saving vs highest quote */
        }
        const stage = express
          ? (isLast && r.chance(0.4) ? "booked" : "picked_up")
          : (isLast ? IMP_STAGES[r.int(0, 6)] : (r.chance(0.8) ? "picked_up" : IMP_STAGES[r.int(3, 6)]));
        const stageIdx = IMP_STAGES.indexOf(stage);
        IMPORTS.push({
          proj: p.id, mon: m.id,
          ref: "IMP-26-" + String(impSeq).slice(-3),
          shipper: r.pick(SUPPLIERS),
          express,
          q, awardedTo, awarded, saving,
          sicus: stageIdx >= 3 || express ? "SIC-26" + r.int(1000, 9999) : null,
          awbbl: (r.chance(0.5) ? "BL-" : "AWB-") + r.int(400000, 499999),
          rfqDays: express ? null : r.dec(1, 4, 1),   /* RFQ → quotes in */
          docDays: r.dec(0.5, 3, 1),                   /* customs dept review */
          bookDays: stageIdx >= 5 ? r.dec(1, 5, 1) : null,
          date: dayInMonth(m.id, r),
          stage,
        });
      }
    });
  });

  /* ---- export shipments ---- */
  const EXP_DESTS = [
    { ar: "برلين – ألمانيا", en: "Berlin, Germany" }, { ar: "مسقط – عُمان", en: "Muscat, Oman" },
    { ar: "دبي – الإمارات", en: "Dubai, UAE" }, { ar: "الدوحة – قطر", en: "Doha, Qatar" },
    { ar: "هيوستن – الولايات المتحدة", en: "Houston, USA" },
  ];
  const EXPORTS = [];
  let expSeq = 100;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("exp" + p.id + m.id));
      const n = Math.min(2, Math.max(cell.exportsN > 0 ? 1 : 0, Math.round(cell.exportsN / 2)));
      for (let i = 0; i < n; i++) {
        expSeq++;
        const isLast = m.id === LATEST;
        EXPORTS.push({
          proj: p.id, mon: m.id,
          ref: "EXP-26-" + String(expSeq).slice(-3),
          consignee: r.pick(SUPPLIERS),
          dest: r.pick(EXP_DESTS),
          incoterm: r.pick(["DAP", "CIF", "FOB", "DDP", "EXW"]),
          items: r.int(3, 60),
          date: dayInMonth(m.id, r),
          status: isLast && r.chance(0.45) ? (r.chance(0.5) ? "open" : "scheduled") : "completed",
        });
      }
    });
  });

  /* ---- transport orders (heavy transport: port / ext-warehouse → factory) ---- */
  const TRANSPORTS = [];
  let toSeq = 400;
  PROJECTS.forEach((p) => {
    MONTHS.forEach((m) => {
      const cell = cellMap[p.id + "|" + m.id];
      const r = R(hash("to" + p.id + m.id));
      const n = Math.min(3, Math.max(1, Math.round(cell.transportsN / 4)));
      for (let i = 0; i < n; i++) {
        toSeq++;
        const base = r.int(3500, 26000);
        const rates = {
          t1: Math.round(base * r.dec(0.97, 1.16, 3)),
          t2: Math.round(base * r.dec(0.95, 1.2, 3)),
          t3: Math.round(base * r.dec(0.96, 1.18, 3)),
        };
        const entries = [["t1", rates.t1], ["t2", rates.t2], ["t3", rates.t3]];
        entries.sort((a, b) => a[1] - b[1]);
        const isLast = m.id === LATEST;
        TRANSPORTS.push({
          proj: p.id, mon: m.id,
          ref: "TO-26-" + String(toSeq).slice(-3),
          from: r.chance(0.6) ? r.pick(PORTS) : EXT_WAREHOUSE,
          to: FACTORY,
          cargo: r.pick(EQUIP_TYPES),
          weight: r.int(12, 180),
          rates,
          awardedTo: entries[0][0],
          awarded: entries[0][1],
          saving: entries[2][1] - entries[0][1], /* vs highest quote */
          date: dayInMonth(m.id, r),
          status: isLast && r.chance(0.4) ? (r.chance(0.5) ? "scheduled" : "in_transit") : "completed",
        });
      }
    });
  });

  /* ---- root-cause log (every clearance breach) ---- */
  const ROOTCAUSE = [];
  let rcSeq = 90;
  SHIPMENTS.filter((s) => s.breach).forEach((s) => {
    const r = R(hash("rc" + s.ref));
    const tpl = s.delayTpl || r.pick(RC_TEMPLATES);
    rcSeq++;
    ROOTCAUSE.push({
      proj: s.proj, mon: s.mon,
      ref: "RCA-26-" + String(rcSeq).slice(-2),
      shipRef: s.ref,
      cat: tpl.cat, cause: tpl.cause, corr: tpl.corr,
      delay: s.headline ? 7 : tpl.delay,
      daysClear: s.daysClear,
      mode: s.mode,
      emp: s.emp,
      raised: s.arrival,
      status: s.mon === LATEST ? (r.chance(0.5) ? "open" : "closed") : "closed",
      headline: !!s.headline,
    });
  });

  /* ---- alerts (Metab's 4 rules, brief §9) ---- */
  function alerts(state) {
    const inScope = (x) => (state.project === "all" || x.proj === state.project) &&
      (state.month === "all" || x.mon === state.month || x.mon === undefined);
    const list = [];
    /* rule 1: 5 days before shipment ETA at port of arrival */
    UPCOMING.filter((u) => state.project === "all" || u.proj === state.project).forEach((u) => {
      list.push({ rule: "eta", sev: "info", ref: u.ref, proj: u.proj, mode: u.mode, port: u.port, days: u.etaInDays, party: u.party });
    });
    /* rule 2: GRN exceeds 2 days from factory arrival */
    SHIPMENTS.filter((s) => s.type === "inbound" && s.grnDays > TARGETS.grn && inScope(s)).forEach((s) => {
      list.push({ rule: "grn", sev: "warn", ref: s.ref, proj: s.proj, days: s.grnDays });
    });
    /* rules 3+4: air > 3d / sea > 5d in clearance */
    SHIPMENTS.filter((s) => s.breach && inScope(s)).forEach((s) => {
      list.push({ rule: s.mode === "air" ? "air" : "sea", sev: "danger", ref: s.ref, proj: s.proj, days: s.daysClear, broker: s.broker, emp: s.emp });
    });
    return list;
  }

  /* ---- aggregation helpers ---- */
  function cellsFor(state) {
    return CELLS.filter((c) =>
      (state.project === "all" || c.proj === state.project) &&
      (state.month === "all" || c.mon === state.month));
  }
  function shipsFor(state) {
    return SHIPMENTS.filter((s) =>
      (state.project === "all" || s.proj === state.project) &&
      (state.month === "all" || s.mon === state.month));
  }
  function aggregate(state) {
    const cs = cellsFor(state);
    const sum = (k) => cs.reduce((a, c) => a + c[k], 0);
    const inbound = sum("inbound"), outbound = sum("outbound");
    /* KPI actuals from shipment rows (rows are the truth) */
    const inRows = shipsFor(state).filter((s) => s.type === "inbound");
    const tRows = inRows.filter((s) => s.target != null);
    const onTime = tRows.filter((s) => s.daysClear <= s.target).length;
    const onTimePct = tRows.length ? +((onTime / tRows.length) * 100).toFixed(1) : 100;
    const avgDays = tRows.length ? +(tRows.reduce((a, s) => a + s.daysClear, 0) / tRows.length).toFixed(1) : 0;
    const avgOf = (rows, k) => rows.length ? +(rows.reduce((a, s) => a + s[k], 0) / rows.length).toFixed(1) : 0;
    const airRows = inRows.filter((s) => s.mode === "air");
    const seaRows = inRows.filter((s) => s.mode === "sea");
    const impRows = IMPORTS.filter((x) => (state.project === "all" || x.proj === state.project) && (state.month === "all" || x.mon === state.month));
    const toRows = TRANSPORTS.filter((x) => (state.project === "all" || x.proj === state.project) && (state.month === "all" || x.mon === state.month));
    return {
      inbound, outbound, mbos: sum("mbos"),
      importsN: sum("importsN"), exportsN: sum("exportsN"), transportsN: sum("transportsN"),
      items: sum("items"), mirs: sum("mirs"), manHours: sum("hours"),
      laborCost: sum("laborCost"), spaceCost: sum("spaceCost"),
      indoorM2: sum("indoorM2"), outdoorM2: sum("outdoorM2"),
      breaches: sum("breaches"), onTimePct, avgDays,
      airDays: avgOf(airRows, "daysClear"),
      seaDays: avgOf(seaRows, "daysClear"),
      recvDays: avgOf(inRows, "recvDays"),
      grnDays: avgOf(inRows, "grnDays"),
      importSaving: impRows.reduce((a, x) => a + (x.saving || 0), 0),
      toSaving: toRows.reduce((a, x) => a + (x.saving || 0), 0),
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
      const inRows = SHIPMENTS.filter((s) => s.proj === p.id && s.type === "inbound" && s.target != null &&
        (state.month === "all" || s.mon === state.month));
      const onTime = inRows.filter((s) => s.daysClear <= s.target).length;
      return {
        proj: p, inbound: inb, outbound: out, total: inb + out,
        items: sum("items"), mbos: sum("mbos"),
        importsN: sum("importsN"), exportsN: sum("exportsN"), transportsN: sum("transportsN"),
        mirs: sum("mirs"), manHours: sum("hours"), laborCost: sum("laborCost"),
        spaceCost: sum("spaceCost"), indoorM2: sum("indoorM2"), outdoorM2: sum("outdoorM2"),
        spaceRate: SPACE_RATE[p.id], laborRate: LABOR_RATE[p.id], headcount: HEADCOUNT[p.id],
        breaches: sum("breaches"),
        onTimePct: inRows.length ? +((onTime / inRows.length) * 100).toFixed(1) : 100,
        avgDays: inRows.length ? +(inRows.reduce((a, s) => a + s.daysClear, 0) / inRows.length).toFixed(1) : 0,
      };
    });
  }
  /* broker performance (Metab: avg clearance per broker + % on-time) */
  function brokerPerf(state) {
    const rows = shipsFor(state).filter((s) => s.type === "inbound" && s.broker && s.target != null);
    return BROKERS.map((b) => {
      const rs = rows.filter((s) => s.broker.id === b.id);
      const onTime = rs.filter((s) => s.daysClear <= s.target).length;
      return {
        broker: b, n: rs.length,
        avgDays: rs.length ? +(rs.reduce((a, s) => a + s.daysClear, 0) / rs.length).toFixed(1) : 0,
        onTimePct: rs.length ? +((onTime / rs.length) * 100).toFixed(0) : 0,
      };
    }).filter((x) => x.n > 0);
  }

  /* ---- exceptions feed (overview) ---- */
  function exceptions(state) {
    return ROOTCAUSE.filter((rc) =>
      (state.project === "all" || rc.proj === state.project) &&
      (state.month === "all" || rc.mon === state.month));
  }

  window.DATA = {
    PROJECTS, MONTHS, LATEST, SUPPLIERS, ORIGINS, SITES, MODES, TARGETS,
    EMPLOYEES, BROKERS, FORWARDERS, TRANSPORTERS, FACTORY, EXT_WAREHOUSE,
    CELLS, SHIPMENTS, UPCOMING, MIRS, INVENTORY, MBOS, IMPORTS, EXPORTS, TRANSPORTS, ROOTCAUSE,
    IMP_STAGES,
    project: (id) => PROJECTS.find((p) => p.id === id),
    month: (id) => MONTHS.find((m) => m.id === id),
    cellsFor, aggregate, series, byProject, exceptions, alerts, brokerPerf,
  };
})();
