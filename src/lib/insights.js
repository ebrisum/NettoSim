export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function buildSignals(form = {}) {
  const f = form || {};
  const box3 = (Number(f.box3Cash) || 0) + (Number(f.box3Investments) || 0);
  const ownsHome = !!f.ownsHome;
  const isZZP = !!f.isZZP;
  const hasBV = !!f.hasBV;
  const hasInternationalIncome = !!f.hasInternationalIncome;
  const isFiscalPartner = !!f.isFiscalPartner;

  let score = 0;
  if (isZZP) score += 25;
  if (hasBV) score += 35;
  if (hasInternationalIncome) score += 30;
  if (ownsHome) score += 10;
  if (box3 > 50000) score += 15;
  if (isFiscalPartner) score += 8;

  return {
    box3,
    ownsHome,
    isZZP,
    hasBV,
    hasInternationalIncome,
    isFiscalPartner,
    complexityScore: clamp(score, 0, 100),
  };
}

export function buildInsights(form = {}, pageId = "results") {
  const f = form || {};
  const s = buildSignals(f);

  const cards = [];

  const add = (card) => cards.push(card);

  // 1) Hypotheekrente check
  if (s.ownsHome && (Number(f.mortgageInterest) || 0) === 0) {
    add({
      id: "missing_mortgage_interest",
      type: "nudge",
      priority: 0.9,
      title: "Controleer hypotheekrenteaftrek",
      body: "Je hebt een eigen woning ingevuld maar geen hypotheekrente. Klopt dat? Dit is een veelgemaakte missen-invoer.",
      ctaLabel: "Ga naar Woning",
      ctaRoute: "app",
      tags: ["woning", "box1"],
      pageIds: ["app", "results"],
    });
  }

  // 2) Urencriterium (ZZP)
  if (s.isZZP && (Number(f.zzpHours) || 0) > 0 && (Number(f.zzpHours) || 0) < 1225) {
    add({
      id: "urencriterium_risk",
      type: "warning",
      priority: 0.85,
      title: "Urencriterium: check je uren",
      body: "Je zit onder 1.225 uur. Mogelijk gelden sommige ondernemersaftrekken niet. Controleer je urenregistratie.",
      ctaLabel: "Bekijk ZZP",
      ctaRoute: "app",
      tags: ["zzp"],
      pageIds: ["app", "results"],
    });
  }

  // 3) MKB-winstvrijstelling (info)
  if (s.isZZP && (Number(f.zzpProfit) || 0) > 0) {
    add({
      id: "mkb_winstvrijstelling_info",
      type: "benefit",
      priority: 0.6,
      title: "MKB-winstvrijstelling",
      body: "Bij winst uit onderneming is MKB-winstvrijstelling vaak van toepassing. Check of je winst en kosten correct zijn ingevuld.",
      ctaLabel: "Controleer winst",
      ctaRoute: "app",
      tags: ["zzp"],
      pageIds: ["app", "results"],
    });
  }

  // 4) Box 3 check
  if (s.box3 > 50000) {
    add({
      id: "box3_check",
      type: "nudge",
      priority: 0.7,
      title: "Box 3: controleer verdeling & peildatum",
      body: "Bij spaargeld/beleggingen kan verdeling (bij fiscaal partners) en schulden veel uitmaken. Loop je Box 3 input nog even na.",
      ctaLabel: "Ga naar Box 3",
      ctaRoute: "app",
      tags: ["box3"],
      pageIds: ["app", "results"],
    });
  }

  // 5) Partners: verdeling
  if (s.isFiscalPartner && s.box3 > 0) {
    add({
      id: "partner_split_box3",
      type: "benefit",
      priority: 0.65,
      title: "Optimaliseer verdeling tussen partners",
      body: "Als je fiscaal partner bent, kun je in sommige gevallen verdelen voor een gunstiger uitkomst. Kijk of verdeling is ingesteld.",
      ctaLabel: "Bekijk verdeling",
      ctaRoute: "app",
      tags: ["partners", "box3"],
      pageIds: ["app", "results"],
    });
  }

  // 6) Internationale inkomsten (advies)
  if (s.hasInternationalIncome) {
    add({
      id: "international_warning",
      type: "warning",
      priority: 0.95,
      title: "Internationale situatie: extra check",
      body: "Bij inkomen over de grens gelden vaak uitzonderingen en verdragen. Overweeg om dit te laten controleren door een specialist.",
      ctaLabel: "Bekijk hulpopties",
      ctaRoute: "partners",
      tags: ["internationaal"],
      pageIds: ["results"],
    });
  }

  // 7) BV/DGA (Box 2) (advies)
  if (s.hasBV) {
    add({
      id: "bv_box2_warning",
      type: "warning",
      priority: 0.92,
      title: "BV/DGA: Box 2 en salarisstructuur",
      body: "Als je een BV hebt, spelen Box 2 (dividend) en DGA-salaris mee. Dit loont vaak om te laten checken.",
      ctaLabel: "Vind een specialist",
      ctaRoute: "partners",
      tags: ["bv", "box2"],
      pageIds: ["results"],
    });
  }

  // 8) Toeslagen hint (zonder bedragen)
  const incomeEmployment = Number(f.incomeEmployment) || 0;
  if (incomeEmployment > 0 && incomeEmployment < 35000) {
    add({
      id: "possible_toeslagen_hint",
      type: "nudge",
      priority: 0.55,
      title: "Mogelijk recht op toeslagen",
      body: "Op basis van je (lagere) inkomen kan het zijn dat je recht hebt op toeslagen. Check dit even als je het nog niet gedaan hebt.",
      ctaLabel: "Bekijk toeslagen",
      ctaRoute: "app",
      externalUrl: "https://www.belastingdienst.nl/rekenhulpen/toeslagen/",
      tags: ["toeslagen"],
      pageIds: ["results"],
    });
  }

  const filtered = cards.filter((c) => !c.pageIds || c.pageIds.includes(pageId));

  filtered.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return { cards: filtered, complexityScore: s.complexityScore, signals: s };
}

