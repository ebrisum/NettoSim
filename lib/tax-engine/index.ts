/**
 * Tax engine 2025 — server-side only. Box 1, Box 2, Box 3, toeslagen, heffingskortingen.
 * Port of src/lib/taxEngine.js. Deterministic, no side effects.
 */

import type { CalculateParams } from "../validation/calculate";

const B1 = 38441;
const B2 = 76817;
const R1 = 0.3582;
const R2 = 0.3748;
const R3 = 0.495;
const R1A = 0.1907;
const ZR = 0.0526;
const ZM = 75864;

function cT(g: number, a: boolean): number {
  if (g <= 0) return 0;
  let t = 0;
  const r = a ? R1A : R1;
  t += Math.min(g, B1) * r;
  if (g > B1) t += (Math.min(g, B2) - B1) * R2;
  if (g > B2) t += (g - B2) * R3;
  return t;
}

function cAK(i: number, a: boolean): number {
  if (i <= 0) return 0;
  let k = 0;
  if (i <= 12169) k = i * 0.08052;
  else if (i <= 26288) k = 980 + (i - 12169) * 0.30028;
  else if (i <= 43071) k = 5599;
  else if (i <= 129078) k = Math.max(0, 5599 - (i - 43071) * 0.0651);
  if (a) k *= 0.5326;
  return k;
}

function cAHK(i: number, a: boolean): number {
  if (i <= 0) return 0;
  const h = i <= 28406 ? 3068 : Math.max(0, 3068 - (i - 28406) * 0.06337);
  return a ? h * 0.5326 : h;
}

function cIACK(i: number, e: boolean): number {
  return !e || i < 6145 ? 0 : Math.min(2986, (i - 6145) * 0.1145);
}

function cOK(i: number, a: boolean): number {
  if (!a) return 0;
  return i <= 44770 ? 2035 : Math.max(0, 2035 - (i - 44770) * 0.15);
}

function cAOK(a: boolean, s: boolean): number {
  return a && s ? 531 : 0;
}

function cZT(i: number, p: boolean): number {
  const m = p ? 3010 : 1573;
  const l = p ? 50206 : 39719;
  if (i >= l) return 0;
  if (i <= 28406) return m;
  return Math.max(0, m * (1 - (i - 28406) / (l - 28406)));
}

function cHT(i: number, p: boolean, r: number): number {
  if (r <= 0 || r > 900) return 0;
  const m = p ? 45000 : 34000;
  if (i >= m) return 0;
  const b = p ? 280 : 240;
  const s = Math.max(0, r - b) * 12 * 0.72;
  if (i <= 19000) return s;
  return Math.max(0, s - (i - 19000) * (p ? 0.22 : 0.27));
}

function cKGB(i: number, p: boolean, n: number, s: boolean): number {
  if (n <= 0) return 0;
  const b = n * 2511;
  const a = s && !p ? 3389 : 0;
  const t = b + a;
  const st = p ? 37545 : 28406;
  if (i <= st) return t;
  return Math.max(0, t - (i - st) * 0.071);
}

function cKOT(i: number, p: boolean, n: number, u: number, h: number): number {
  if (n <= 0 || h <= 0) return 0;
  const uu = Math.min(u, 10.25);
  const hh = Math.min(h, 230);
  let p1 = 0.96;
  if (i > 29000) p1 = Math.max(0.337, 0.96 - (i - 29000) * 0.0000048);
  if (i > 130000) p1 = 0.337;
  const p2 = Math.min(0.95, p1 + 0.1);
  return uu * hh * 12 * p1 + (n > 1 ? (n - 1) * uu * hh * 12 * p2 : 0);
}

function cKB(n: number): number {
  return n * 269.76 * 4;
}

function cZZP(w: number, s: boolean, u: boolean): { tp: number; za: number; sa: number; mk: number; zv: number } {
  let t = w;
  let za = 0;
  let sa = 0;
  let mk = 0;
  if (u) {
    za = Math.min(2470, t);
    t -= za;
    if (s) {
      sa = Math.min(2123, t);
      t -= sa;
    }
  }
  mk = t * 0.127;
  t -= mk;
  t = Math.max(0, t);
  return { tp: t, za, sa, mk, zv: Math.min(w, ZM) * ZR };
}

function cHYP(
  h: number,
  r: number,
  w: number,
  i: number
): { af: number; ew: number; nt: number; jr: number; eb: number } {
  if (h <= 0) return { af: 0, ew: 0, nt: 0, jr: 0, eb: 0 };
  const j = h * (r / 100);
  const t = Math.min(0.3748, i > B2 ? 0.3748 : i > B1 ? R2 : R1);
  const a = j * t;
  const eb = w * 0.0035;
  const et = eb * t;
  return { af: a, ew: et, nt: a - et, jr: j, eb };
}

function cDUO(i: number, p: boolean, d: number): number {
  if (d <= 0) return 0;
  const dr = p ? 35000 : 28406;
  if (i <= dr) return 0;
  return Math.min(d * 0.05, (i - dr) * 0.04);
}

function cAlimentatie(b: number): number {
  return Math.max(0, b);
}

function cLijfrente(premie: number, income: number, pensioenPerc: number): { aftrek: number; maxJaarruimte: number } {
  const pg = Math.max(0, income - 16322);
  const jr = Math.min(
    34649,
    pg * 0.133 - income * (pensioenPerc / 100) * 14.4 * 0.133
  );
  const aftrek = Math.min(premie, Math.max(0, jr));
  return { aftrek, maxJaarruimte: Math.max(0, jr) };
}

function cWWWIA(inc: number, hasWW: boolean, hasWIA: boolean): { wwKost: number; wiaKost: number; totaal: number } {
  const ww = hasWW ? Math.min(inc, 66701) * 0.0264 : 0;
  const wia = hasWIA ? Math.min(inc, 71628) * 0.0803 : 0;
  return { wwKost: ww, wiaKost: wia, totaal: ww + wia };
}

const GEM: Record<string, { ozb: number; af: number; ri: number; wa: number }> = {
  laag: { ozb: 0.08, af: 280, ri: 190, wa: 340 },
  midden: { ozb: 0.1, af: 340, ri: 230, wa: 370 },
  hoog: { ozb: 0.13, af: 400, ri: 280, wa: 410 },
};

function cGemHeff(
  woz: number,
  hasHome: boolean,
  cat: string
): { ozb: number; afval: number; riool: number; water: number; totaal: number } {
  const g = GEM[cat] ?? GEM.midden;
  const ozb = hasHome ? woz * (g.ozb / 100) : 0;
  return { ozb, afval: g.af, riool: g.ri, water: g.wa, totaal: ozb + g.af + g.ri + g.wa };
}

function cBox2(inc: number, partner: boolean): { tax: number; b1: number; b2: number } {
  if (inc <= 0) return { tax: 0, b1: 0, b2: 0 };
  const lim = partner ? 134000 : 67000;
  const b1 = Math.min(inc, lim) * 0.245;
  const b2 = inc > lim ? (inc - lim) * 0.33 : 0;
  return { tax: b1 + b2, b1, b2 };
}

const B3_V = 57000;
const B3_SP = 0.0103;
const B3_BL = 0.0604;
const B3_SC = 0.0247;
const B3_T = 0.36;

function cBox3(
  spaar: number,
  beleg: number,
  schuld: number,
  partner: boolean
): { tax: number; grondslag: number; rendement: number; totVerm: number; pctRen: number } {
  const vrij = partner ? B3_V * 2 : B3_V;
  const tot = spaar + beleg - schuld;
  const gr = Math.max(0, tot - vrij);
  if (gr <= 0 || spaar + beleg <= 0)
    return { tax: 0, grondslag: 0, rendement: 0, totVerm: tot, pctRen: 0 };
  const rS = spaar * B3_SP;
  const rB = beleg * B3_BL;
  const rSc = schuld * B3_SC;
  const totR = rS + rB - rSc;
  const pR = totR / (spaar + beleg);
  const fR = gr * Math.max(0, pR);
  return { tax: fR * B3_T, grondslag: gr, rendement: fR, totVerm: tot, pctRen: pR };
}

const VG_A = 127582;
const VG_P = 161329;

function checkVermGrens(totV: number, partner: boolean): boolean {
  return totV > (partner ? VG_P : VG_A);
}

export interface CalcResult {
  gT: number;
  tTx: number;
  tC: number;
  tT: number;
  nI: number;
  mo: number;
  eR: number;
  tx1: number;
  tx2: number;
  t1: number;
  t2: number;
  zt: number;
  ht: number;
  kg: number;
  ko: number;
  kb: number;
  hy: { af: number; ew: number; nt: number; jr: number; eb: number };
  zv: number;
  du: number;
  pn1: number;
  pn2: number;
  box2: { tax: number; b1: number; b2: number };
  b3: { tax: number; grondslag: number; totVerm: number };
  ww: { totaal: number };
  gem: { totaal: number };
  vermBlock: boolean;
}

/** Main calculation: given scenario params, returns full result. Deterministic, server-only. */
export function calc(p: CalculateParams): CalcResult {
  const premie = p.lijfrentePremie ?? 0;
  const iS = !p.hasPartner;
  const eT =
    p.employment > 0 ? p.employment - p.employment * (p.pensioenPerc / 100) : 0;
  let zi: { tp: number; zv: number } | null = null;
  let zt2 = 0;
  if (p.zzpIncome > 0) {
    zi = cZZP(p.zzpIncome, p.isStarter, p.urenOK);
    zt2 = zi.tp;
  }
  const aliAf = cAlimentatie(p.alimentatieBetaald ?? 0);
  const aliBij = p.alimentatieOntvangen ?? 0;
  const ljr = cLijfrente(p.lijfrentePremie ?? 0, eT + zt2, p.pensioenPerc);
  const wwInc = p.wwwiaIncome ?? 0;
  const t1 = Math.max(0, eT + zt2 + wwInc + aliBij - aliAf - ljr.aftrek);
  const pn2 = p.hasPartner ? (p.inc2 * (p.pensioenPerc / 100)) : 0;
  const t2 = p.hasPartner ? Math.max(0, p.inc2 - pn2) : 0;
  const hy = p.hasHome
    ? cHYP(p.hypotheek, p.rentePerc, p.wozWaarde, Math.max(t1, t2))
    : { af: 0, ew: 0, nt: 0, jr: 0, eb: 0 };
  const tx1 = cT(t1, p.isAOW);
  const tx2 = p.hasPartner ? cT(t2, false) : 0;
  const arbInc = eT + zt2;
  const hL = arbInc > 0;
  const ak1 = hL ? cAK(arbInc, p.isAOW) : 0;
  const ak2 = p.hasPartner && p.inc2 > 0 ? cAK(t2, false) : 0;
  const ah1 = cAHK(t1, p.isAOW);
  const ah2 = p.hasPartner ? cAHK(t2, false) : 0;
  const le = p.hasPartner ? (t1 <= t2 ? 1 : 2) : 1;
  const ia1 = cIACK(arbInc, !!(p.hasKids && p.kidsU12 > 0 && (iS || le === 1)));
  const ia2 = p.hasPartner
    ? cIACK(t2, !!(p.hasKids && p.kidsU12 > 0 && le === 2))
    : 0;
  const ok1 = cOK(t1, p.isAOW);
  const aok = cAOK(p.isAOW, iS);
  const tC = ak1 + ak2 + ah1 + ah2 + ia1 + ia2 + ok1 + aok;
  const b3 = cBox3(
    p.box3Spaargeld ?? 0,
    p.box3Beleggingen ?? 0,
    p.box3Schulden ?? 0,
    p.hasPartner
  );
  const vermBlock = checkVermGrens(b3.totVerm, p.hasPartner);
  const tI = t1 + t2;
  let zt = 0;
  let ht = 0;
  let kg = 0;
  if (!vermBlock) {
    zt = cZT(tI, p.hasPartner);
    ht = p.isRenter ? cHT(tI, p.hasPartner, p.rent) : 0;
    kg = p.hasKids ? cKGB(tI, p.hasPartner, p.nKids, iS) : 0;
  }
  const ko =
    p.hasKids && p.nKidsOpvang > 0
      ? cKOT(tI, p.hasPartner, p.nKidsOpvang, p.kotUur, p.kotUren)
      : 0;
  const kb = p.hasKids ? cKB(p.nKids) : 0;
  const tT = zt + ht + kg + ko + kb;
  const zv = zi ? zi.zv : 0;
  const du = cDUO(tI, p.hasPartner, p.duoSchuld);
  const pn1 = p.employment > 0 ? p.employment * (p.pensioenPerc / 100) : 0;
  const box2 = cBox2(p.box2Income ?? 0, p.hasPartner);
  const ww =
    p.zzpIncome > 0
      ? cWWWIA(p.zzpIncome, p.hasVolWW, p.hasVolWIA)
      : { wwKost: 0, wiaKost: 0, totaal: 0 };
  const gem = cGemHeff(
    p.wozWaarde ?? 0,
    p.hasHome,
    p.gemCategorie ?? "midden"
  );
  const gT =
    p.employment +
    p.zzpIncome +
    (p.hasPartner ? p.inc2 : 0) +
    wwInc +
    (p.box2Income ?? 0) +
    aliBij;
  const tTx = tx1 + tx2;
  const nI =
    gT -
    tTx +
    tC +
    tT +
    hy.nt -
    zv -
    du -
    pn1 -
    pn2 -
    box2.tax -
    b3.tax -
    ww.totaal -
    gem.totaal -
    aliAf -
    premie;

  return {
    gT,
    tTx,
    tC,
    tT,
    nI,
    mo: nI / 12,
    eR: gT > 0 ? (tTx + box2.tax + b3.tax - tC + zv + du) / gT : 0,
    tx1,
    tx2,
    t1,
    t2,
    zt,
    ht,
    kg,
    ko,
    kb,
    hy,
    zv,
    du,
    pn1,
    pn2,
    box2,
    b3,
    ww,
    gem,
    vermBlock,
  };
}

export interface CalculateResponse {
  net: number;
  gross: number;
  effectiveTaxRate: number;
  breakdown: CalcResult;
}

/** API-friendly: full params in, { net, breakdown, effectiveTaxRate } out. */
export function calculate(params: CalculateParams): CalculateResponse {
  const breakdown = calc(params);
  return {
    net: breakdown.nI,
    gross: breakdown.gT,
    effectiveTaxRate: breakdown.eR,
    breakdown,
  };
}

/** Alias for API route: SERVER-SIDE ONLY — do not import in client components. */
export const calculateTax = calculate;
