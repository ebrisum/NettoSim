import { useState, useMemo, useCallback, Fragment } from "react";

// ══════════════════════════════════════════════════════════════
// 🇳🇱 BELASTING SCENARIO SIMULATOR 2025
// Current → New → Decision Metrics
// ══════════════════════════════════════════════════════════════

// ─── 2025 Tax Constants ─────────────────────────────────────
const B1 = 38441, B2 = 76817;
const R1 = 0.3582, R2 = 0.3748, R3 = 0.495;
const R1_AOW = 0.1907;
const ZVW_RATE = 0.0526, ZVW_MAX_INC = 75864;

// ─── Box 1 Income Tax ───────────────────────────────────────
function calcTax(gross, isAOW = false) {
  if (gross <= 0) return 0;
  let tax = 0, r1 = isAOW ? R1_AOW : R1;
  tax += Math.min(gross, B1) * r1;
  if (gross > B1) tax += (Math.min(gross, B2) - B1) * R2;
  if (gross > B2) tax += (gross - B2) * R3;
  return tax;
}

// ─── Arbeidskorting (2025 exact thresholds) ─────────────────
function calcArbeidskorting(inc, isAOW = false) {
  if (inc <= 0) return 0;
  let ak = 0;
  if (inc <= 12169) ak = inc * 0.08052;
  else if (inc <= 26288) ak = 980 + (inc - 12169) * 0.30028;
  else if (inc <= 43071) ak = 5599;
  else if (inc <= 129078) ak = Math.max(0, 5599 - (inc - 43071) * 0.06510);
  else ak = 0;
  if (isAOW) ak *= 0.5326;
  return ak;
}

// ─── Algemene Heffingskorting ───────────────────────────────
function calcAHK(inc, isAOW = false) {
  if (inc <= 0) return 0;
  let ahk = inc <= 28406 ? 3068 : Math.max(0, 3068 - (inc - 28406) * 0.06337);
  if (isAOW) ahk *= 0.5326;
  return ahk;
}

// ─── IACK ───────────────────────────────────────────────────
function calcIACK(inc, eligible) {
  if (!eligible || inc < 6145) return 0;
  return Math.min(2986, (inc - 6145) * 0.11450);
}

// ─── Ouderenkorting ─────────────────────────────────────────
function calcOuderenkorting(inc, isAOW) {
  if (!isAOW) return 0;
  if (inc <= 44770) return 2035;
  return Math.max(0, 2035 - (inc - 44770) * 0.15);
}

function calcAlleenstaandeOuderenkorting(isAOW, isSingle) {
  return (isAOW && isSingle) ? 531 : 0;
}

// ─── Zorgtoeslag ────────────────────────────────────────────
function calcZorgtoeslag(inc, hasPartner) {
  const max = hasPartner ? 3010 : 1573;
  const limit = hasPartner ? 50206 : 39719;
  if (inc >= limit) return 0;
  if (inc <= 28406) return max;
  return Math.max(0, max * (1 - (inc - 28406) / (limit - 28406)));
}

// ─── Huurtoeslag ────────────────────────────────────────────
function calcHuurtoeslag(inc, hasPartner, rent) {
  if (rent <= 0 || rent > 900) return 0;
  const maxInc = hasPartner ? 45000 : 34000;
  if (inc >= maxInc) return 0;
  const basis = hasPartner ? 280 : 240;
  const sub = Math.max(0, rent - basis) * 12 * 0.72;
  if (inc <= 19000) return sub;
  return Math.max(0, sub - (inc - 19000) * (hasPartner ? 0.22 : 0.27));
}

// ─── Kindgebonden Budget ────────────────────────────────────
function calcKGB(inc, hasPartner, nKids, isSingleParent) {
  if (nKids <= 0) return 0;
  const base = nKids * 2511;
  const alo = (isSingleParent && !hasPartner) ? 3389 : 0;
  const total = base + alo;
  const start = hasPartner ? 37545 : 28406;
  if (inc <= start) return total;
  return Math.max(0, total - (inc - start) * 0.0710);
}

// ─── Kinderopvangtoeslag ────────────────────────────────────
function calcKinderopvangtoeslag(inc, hasPartner, nKidsOpvang, uurprijs, urenPerMaand) {
  if (nKidsOpvang <= 0 || urenPerMaand <= 0) return 0;
  const maxUur = 10.25;
  const uur = Math.min(uurprijs, maxUur);
  const uren = Math.min(urenPerMaand, 230);
  let perc1 = 0.96;
  if (inc > 29000) perc1 = Math.max(0.337, 0.96 - (inc - 29000) * 0.0000048);
  if (inc > 130000) perc1 = 0.337;
  let perc2 = Math.min(0.95, perc1 + 0.10);
  const k1 = uur * uren * 12 * perc1;
  const kRest = nKidsOpvang > 1 ? (nKidsOpvang - 1) * uur * uren * 12 * perc2 : 0;
  return k1 + kRest;
}

// ─── Kinderbijslag (SVB, not income-dependent) ──────────────
function calcKinderbijslag(nKids) {
  return nKids * 269.76 * 4;
}

// ─── ZZP / Self-employed ────────────────────────────────────
function calcZZP(winst, isStarter, urenOK) {
  let taxableProfit = winst;
  let zaAftrek = 0, startAftrek = 0, mkb = 0;
  if (urenOK) {
    zaAftrek = Math.min(2470, taxableProfit);
    taxableProfit -= zaAftrek;
    if (isStarter) {
      startAftrek = Math.min(2123, taxableProfit);
      taxableProfit -= startAftrek;
    }
  }
  mkb = taxableProfit * 0.1270;
  taxableProfit -= mkb;
  taxableProfit = Math.max(0, taxableProfit);
  const zvw = Math.min(winst, ZVW_MAX_INC) * ZVW_RATE;
  return { taxableProfit, zaAftrek, startAftrek, mkb, zvw };
}

// ─── Hypotheek ──────────────────────────────────────────────
function calcHyp(hyp, rente, woz, inc) {
  if (hyp <= 0) return { aftrek: 0, ewf: 0, netto: 0, jaarRente: 0, ewfBedrag: 0 };
  const jaarRente = hyp * (rente / 100);
  const tarief = Math.min(0.3748, inc > B2 ? 0.3748 : inc > B1 ? R2 : R1);
  const aftrek = jaarRente * tarief;
  const ewfBedrag = woz * 0.0035;
  const ewfBelasting = ewfBedrag * tarief;
  return { aftrek, ewf: ewfBelasting, netto: aftrek - ewfBelasting, jaarRente, ewfBedrag };
}

// ─── DUO ────────────────────────────────────────────────────
function calcDUO(inc, hasPartner, duoSchuld) {
  if (duoSchuld <= 0) return 0;
  const drempel = hasPartner ? 35000 : 28406;
  if (inc <= drempel) return 0;
  return Math.min(duoSchuld * 0.05, (inc - drempel) * 0.04);
}

// ─── Pension ────────────────────────────────────────────────
function calcPensioenAftrek(gross, percPremie) {
  return gross * (percPremie / 100);
}

// ─── Combined income: employment + side business ────────────
function calcCombinedIncome(p) {
  const isS = !p.hasPartner;

  // Employment income
  let employmentTaxable = p.employment > 0 ? p.employment - calcPensioenAftrek(p.employment, p.pensioenPerc) : 0;

  // Side business / ZZP income
  let zzpInfo = null;
  let zzpTaxable = 0;
  if (p.zzpIncome > 0) {
    zzpInfo = calcZZP(p.zzpIncome, p.isStarter, p.urenOK);
    zzpTaxable = zzpInfo.taxableProfit;
  }

  // Total box 1 taxable income for person 1
  const taxable1 = employmentTaxable + zzpTaxable;

  // Partner
  const pensioen2 = p.hasPartner ? calcPensioenAftrek(p.inc2, p.pensioenPerc2 || p.pensioenPerc) : 0;
  const taxable2 = p.hasPartner ? Math.max(0, p.inc2 - pensioen2) : 0;

  // Hypotheek
  const hyp = p.hasHome ? calcHyp(p.hypotheek, p.rentePerc, p.wozWaarde, Math.max(taxable1, taxable2)) : { aftrek: 0, ewf: 0, netto: 0, jaarRente: 0, ewfBedrag: 0 };

  // Tax
  const tax1 = calcTax(taxable1, p.isAOW);
  const tax2 = p.hasPartner ? calcTax(taxable2, false) : 0;

  // Credits — use total taxable for phase-outs
  const hasLabour = p.employment > 0 || p.zzpIncome > 0;
  const ak1 = hasLabour ? calcArbeidskorting(taxable1, p.isAOW) : 0;
  const ak2 = p.hasPartner && p.inc2 > 0 ? calcArbeidskorting(taxable2) : 0;
  const ahk1 = calcAHK(taxable1, p.isAOW);
  const ahk2 = p.hasPartner ? calcAHK(taxable2) : 0;

  const lowestEarner = p.hasPartner ? (taxable1 <= taxable2 ? 1 : 2) : 1;
  const iack1 = calcIACK(taxable1, p.hasKids && p.kidsU12 > 0 && (isS || lowestEarner === 1));
  const iack2 = p.hasPartner ? calcIACK(taxable2, p.hasKids && p.kidsU12 > 0 && lowestEarner === 2) : 0;

  const ok1 = calcOuderenkorting(taxable1, p.isAOW);
  const aok = calcAlleenstaandeOuderenkorting(p.isAOW, isS);

  const totalCredits = ak1 + ak2 + ahk1 + ahk2 + iack1 + iack2 + ok1 + aok;

  // Toeslagen — based on combined taxable
  const totalInc = taxable1 + taxable2;
  const zt = calcZorgtoeslag(totalInc, p.hasPartner);
  const ht = p.isRenter ? calcHuurtoeslag(totalInc, p.hasPartner, p.rent) : 0;
  const kgb = p.hasKids ? calcKGB(totalInc, p.hasPartner, p.nKids, isS) : 0;
  const kot = (p.hasKids && p.nKidsOpvang > 0) ? calcKinderopvangtoeslag(totalInc, p.hasPartner, p.nKidsOpvang, p.kotUur, p.kotUren) : 0;
  const kb = p.hasKids ? calcKinderbijslag(p.nKids) : 0;
  const totalToesl = zt + ht + kgb + kot + kb;

  // ZVW for ZZP
  const zvw = zzpInfo ? zzpInfo.zvw : 0;

  // DUO
  const duo = calcDUO(totalInc, p.hasPartner, p.duoSchuld);

  // Pensioen totals
  const pensioen1 = p.employment > 0 ? calcPensioenAftrek(p.employment, p.pensioenPerc) : 0;

  // Gross total
  const grossTotal = p.employment + p.zzpIncome + (p.hasPartner ? p.inc2 : 0);

  // Net income
  const totalTax = tax1 + tax2;
  const netIncome = grossTotal - totalTax + totalCredits + totalToesl + hyp.netto - zvw - duo - pensioen1 - pensioen2;

  return {
    grossTotal, totalTax, totalCredits, totalToesl, hyp, zvw, duo,
    pensioen1, pensioen2, netIncome, zzpInfo, kb,
    ak1, ak2, ahk1, ahk2, iack1, iack2, ok1, aok,
    zt, ht, kgb, kot,
    effectiveRate: grossTotal > 0 ? (totalTax - totalCredits + zvw + duo) / grossTotal : 0,
    monthly: netIncome / 12,
    tax1, tax2, taxable1, taxable2,
    employment: p.employment, zzpIncome: p.zzpIncome,
  };
}

// ─── Marginal Rate ──────────────────────────────────────────
function calcMTR(p, atIncome) {
  // bump employment income by €100
  const p1 = { ...p, employment: atIncome };
  const p2 = { ...p, employment: atIncome + 100 };
  const r1 = calcCombinedIncome(p1);
  const r2 = calcCombinedIncome(p2);
  const kept = r2.netIncome - r1.netIncome;
  return { mtr: 1 - kept / 100, kept };
}


// ═══════════════════════════════════════════════════════════
// DEFAULT SCENARIO
// ═══════════════════════════════════════════════════════════
const defaultScenario = {
  employment: 36000,
  zzpIncome: 0,
  hasPartner: false,
  inc2: 0,
  pensioenPerc: 5,
  pensioenPerc2: 5,
  isAOW: false,
  hasKids: false,
  nKids: 1,
  kidsU12: 1,
  nKidsOpvang: 0,
  kotUur: 9.5,
  kotUren: 100,
  isRenter: true,
  rent: 750,
  hasHome: false,
  hypotheek: 250000,
  rentePerc: 3.8,
  wozWaarde: 350000,
  isStarter: false,
  urenOK: true,
  duoSchuld: 0,
};


// ═══════════════════════════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════
export const theme = {
  bg: "#ffffff",
  card: "#fcfdfe",
  cardHover: "#f3f4f6",
  border: "#e2e8f0",
  borderLight: "#e5e7eb",
  accent: "#0284c7",
  accentGlow: "rgba(2,132,199,0.12)",
  green: "#16a34a",
  greenGlow: "rgba(22,163,74,0.10)",
  red: "#ef4444",
  redGlow: "rgba(239,68,68,0.10)",
  amber: "#f59e0b",
  amberGlow: "rgba(245,158,11,0.10)",
  purple: "#4f46e5",
  purpleGlow: "rgba(79,70,229,0.10)",
  text: "#0f172a",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  white: "#ffffff",
};

export const font = `'DM Sans', -apple-system, 'Segoe UI', sans-serif`;
const mono = `'JetBrains Mono', 'SF Mono', 'Fira Code', monospace`;

// ═══════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════

function SliderInput({ label, value, onChange, min = 0, max = 150000, step = 500, prefix = "€", suffix = "", desc }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: theme.textMuted, fontFamily: font }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: mono, color: theme.white }}>
          {prefix}{typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value.toLocaleString("nl-NL")}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: theme.accent, height: 4, cursor: "pointer", background: "transparent" }} />
      {desc && <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{desc}</div>}
    </div>
  );
}

function Toggle({ label, checked, onChange, desc }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex", gap: 12, cursor: "pointer", marginBottom: 12, alignItems: "flex-start",
        padding: "10px 14px", borderRadius: 10,
        background: checked ? theme.accentGlow : "transparent",
        border: `1px solid ${checked ? theme.accent + "40" : theme.border}`,
        transition: "all 0.2s",
      }}>
      <div style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0, marginTop: 1,
        background: checked ? theme.accent : theme.border, transition: "0.2s", position: "relative",
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute",
          top: 2, left: checked ? 20 : 2, transition: "0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? theme.white : theme.textMuted }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: theme.textDim, marginTop: 1 }}>{desc}</div>}
      </div>
    </div>
  );
}

function NumberChip({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 4 }}>
        {options.map(n => (
          <div key={n} onClick={() => onChange(n)}
            style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
              background: value === n ? theme.accent : theme.card,
              color: value === n ? "#fff" : theme.textMuted,
              border: `1px solid ${value === n ? theme.accent : theme.border}`,
            }}>{n}</div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = theme.accent, glow }) {
  return (
    <div style={{
      background: glow || color + "10", borderRadius: 12, padding: "14px 16px",
      border: `1px solid ${color}20`, flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 4, fontFamily: font }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: mono, letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function DeltaIndicator({ oldVal, newVal, prefix = "€", perMonth = false, flip = false }) {
  const diff = newVal - oldVal;
  const isPositive = flip ? diff < 0 : diff > 0;
  const color = Math.abs(diff) < 1 ? theme.textDim : isPositive ? theme.green : theme.red;
  const sign = diff > 0 ? "+" : "";
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: mono }}>
      {sign}{prefix}{Math.round(Math.abs(diff)).toLocaleString("nl-NL")}
      {perMonth && <span style={{ fontSize: 10, fontWeight: 400, color: theme.textDim }}>/mnd</span>}
    </span>
  );
}


// ═══════════════════════════════════════════════════════════
// WATERFALL
// ═══════════════════════════════════════════════════════════
function MiniWaterfall({ r, compact = false }) {
  const items = [
    { l: "Bruto inkomen", v: r.grossTotal, c: theme.accent },
    ...(r.pensioen1 > 0 || r.pensioen2 > 0 ? [{ l: "Pensioenaftrek", v: -(r.pensioen1 + r.pensioen2), c: theme.purple }] : []),
    ...(r.zzpInfo ? [{ l: "Ondernemersaftrek", v: -(r.zzpInfo.zaAftrek + r.zzpInfo.startAftrek + r.zzpInfo.mkb), c: theme.purple }] : []),
    { l: "Inkomstenbelasting", v: -r.totalTax, c: theme.red },
    { l: "Heffingskortingen", v: r.totalCredits, c: theme.green },
    ...(r.totalToesl > 0 ? [{ l: "Toeslagen & KB", v: r.totalToesl, c: theme.amber }] : []),
    ...(r.hyp?.netto && r.hyp.netto !== 0 ? [{ l: "Hypotheekvoordeel", v: r.hyp.netto, c: theme.purple }] : []),
    ...(r.zvw > 0 ? [{ l: "Zvw-bijdrage", v: -r.zvw, c: theme.red }] : []),
    ...(r.duo > 0 ? [{ l: "DUO-aflossing", v: -r.duo, c: theme.red }] : []),
  ];

  const maxAbs = Math.max(r.grossTotal, Math.abs(r.netIncome)) * 1.05;

  return (
    <div>
      {items.map((item, i) => {
        const barW = maxAbs > 0 ? Math.abs(item.v) / maxAbs * 100 : 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 3 : 5 }}>
            <div style={{ width: compact ? 100 : 130, fontSize: compact ? 10 : 11, color: theme.textDim, textAlign: "right", flexShrink: 0 }}>{item.l}</div>
            <div style={{ flex: 1, height: compact ? 18 : 22, position: "relative", background: theme.bg, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${barW}%`, height: "100%", background: item.c + "25", borderRadius: 4, transition: "width 0.4s ease" }} />
              <span style={{
                position: "absolute", right: 8, top: compact ? 2 : 3,
                fontSize: compact ? 10 : 11, fontWeight: 600, fontFamily: mono,
                color: item.v >= 0 ? theme.textMuted : theme.red,
              }}>
                {item.v >= 0 ? "+" : "-"}€{Math.round(Math.abs(item.v)).toLocaleString("nl-NL")}
              </span>
            </div>
          </div>
        );
      })}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 8,
        borderTop: `2px solid ${theme.green}40`,
      }}>
        <div style={{ width: compact ? 100 : 130, fontSize: 12, color: theme.green, textAlign: "right", fontWeight: 700, flexShrink: 0 }}>= Netto</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: theme.green, fontFamily: mono }}>€{Math.round(r.netIncome).toLocaleString("nl-NL")}</span>
          <span style={{ fontSize: 12, color: theme.textDim }}>(€{Math.round(r.monthly).toLocaleString("nl-NL")}/mnd)</span>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// MTR CHART
// ═══════════════════════════════════════════════════════════
function MTRChart({ p, currentInc }) {
  const W = 520, H = 200;
  const pad = { t: 30, r: 16, b: 38, l: 50 };
  const w = W - pad.l - pad.r, h = H - pad.t - pad.b;

  const pts = [];
  for (let i = 1000; i <= 130000; i += 500) {
    const { mtr } = calcMTR(p, i);
    pts.push({ x: i, y: Math.max(0, Math.min(0.90, mtr)) });
  }

  const sx = x => pad.l + (x / 130000) * w;
  const sy = y => pad.t + h - (y / 0.90) * h;
  const path = pts.map((pt, i) => `${i ? "L" : "M"}${sx(pt.x).toFixed(1)},${sy(pt.y).toFixed(1)}`).join(" ");
  const cur = calcMTR(p, currentInc);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
      <defs>
        <linearGradient id="mtrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.accent} stopOpacity="0.15" />
          <stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={pad.l} y={pad.t} width={w} height={h} fill={theme.bg} rx="4" />
      {[0, 0.2, 0.4, 0.6, 0.8].map(v => (
        <g key={v}>
          <line x1={pad.l} x2={pad.l + w} y1={sy(v)} y2={sy(v)} stroke={theme.border} strokeWidth="0.5" />
          <text x={pad.l - 6} y={sy(v) + 3} textAnchor="end" fill={theme.textDim} fontSize="9" fontFamily={mono}>{(v * 100)}%</text>
        </g>
      ))}
      {[0, 25000, 50000, 75000, 100000, 125000].map(v => (
        <text key={v} x={sx(v)} y={pad.t + h + 16} textAnchor="middle" fill={theme.textDim} fontSize="9" fontFamily={mono}>{v / 1000}k</text>
      ))}
      <rect x={sx(43071)} y={pad.t} width={sx(76817) - sx(43071)} height={h} fill="rgba(239,68,68,0.06)" />
      <text x={(sx(43071) + sx(76817)) / 2} y={pad.t + 12} textAnchor="middle" fill={theme.red} fontSize="8" fontWeight="600" opacity="0.6">PIEKZONE</text>
      <path d={path + `L${sx(130000).toFixed(1)},${sy(0).toFixed(1)}L${sx(1000).toFixed(1)},${sy(0).toFixed(1)}Z`} fill="url(#mtrGrad)" />
      <path d={path} fill="none" stroke={theme.accent} strokeWidth="2" />
      <circle cx={sx(currentInc)} cy={sy(Math.max(0, Math.min(0.90, cur.mtr)))} r="5" fill={theme.red} stroke={theme.bg} strokeWidth="2" />
      <text x={sx(currentInc) + 8} y={sy(cur.mtr) - 8} fill={theme.red} fontSize="11" fontWeight="700" fontFamily={mono}>{(cur.mtr * 100).toFixed(0)}%</text>
      <text x={pad.l + w / 2} y={H - 4} textAnchor="middle" fill={theme.textDim} fontSize="10" fontFamily={font}>Bruto inkomen →</text>
      <text x={pad.l + w / 2} y={pad.t - 10} textAnchor="middle" fill={theme.text} fontSize="11" fontWeight="700" fontFamily={font}>Effectief Marginaal Tarief</text>
    </svg>
  );
}


// ═══════════════════════════════════════════════════════════
// SCENARIO INPUT FORM
// ═══════════════════════════════════════════════════════════
function ScenarioForm({ scenario, onChange, label, color }) {
  const u = (key, val) => onChange({ ...scenario, [key]: val });
  const hasZZP = scenario.zzpIncome > 0;
  const hasKids = scenario.hasKids;

  return (
    <div style={{
      background: theme.card, borderRadius: 14, border: `1px solid ${color}30`,
      padding: "20px 22px", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, ${color}60)`,
      }} />
      <h3 style={{ fontSize: 15, fontWeight: 800, color, margin: "0 0 18px", fontFamily: font }}>{label}</h3>

      {/* Employment */}
      <SliderInput label="Bruto jaarsalaris (loondienst)" value={scenario.employment} onChange={v => u("employment", v)} />

      {/* Side business */}
      <SliderInput label="Winst uit eigen onderneming / ZZP"
        value={scenario.zzpIncome} onChange={v => u("zzpIncome", v)}
        desc="Combineer met loondienst of alleen ZZP" />

      {hasZZP && (
        <div style={{ marginLeft: 8, marginBottom: 8, paddingLeft: 12, borderLeft: `2px solid ${theme.purple}30` }}>
          <Toggle label="Urencriterium (1.225+ uur/jaar)" checked={scenario.urenOK} onChange={v => u("urenOK", v)} />
          <Toggle label="Startersaftrek (eerste 5 jaar)" checked={scenario.isStarter} onChange={v => u("isStarter", v)} />
        </div>
      )}

      {/* Partner */}
      <Toggle label="Partner / samenwonend" desc="Toeslagpartner meetellen" checked={scenario.hasPartner} onChange={v => { u("hasPartner", v); if (!v) u("inc2", 0); }} />
      {scenario.hasPartner && (
        <SliderInput label="Partner bruto jaarsalaris" value={scenario.inc2} onChange={v => u("inc2", v)} />
      )}

      {/* Pension */}
      {scenario.employment > 0 && (
        <SliderInput label="Pensioenpremie" value={scenario.pensioenPerc} onChange={v => u("pensioenPerc", v)} min={0} max={15} step={0.5} prefix="" suffix="% van bruto" />
      )}

      {/* Kids */}
      <Toggle label="Kinderen (<18 jaar)" checked={scenario.hasKids} onChange={v => u("hasKids", v)} />
      {hasKids && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <NumberChip label="Aantal kinderen" value={scenario.nKids} onChange={v => u("nKids", v)} options={[1,2,3,4]} />
          <NumberChip label="Onder 12 jaar" value={scenario.kidsU12} onChange={v => u("kidsU12", v)} options={Array.from({length: scenario.nKids+1},(_,i)=>i)} />
          <NumberChip label="In opvang" value={scenario.nKidsOpvang} onChange={v => u("nKidsOpvang", v)} options={Array.from({length: scenario.nKids+1},(_,i)=>i)} />
        </div>
      )}
      {hasKids && scenario.nKidsOpvang > 0 && (
        <div style={{ marginLeft: 8 }}>
          <SliderInput label="Uurtarief opvang" value={scenario.kotUur} onChange={v => u("kotUur", v)} min={5} max={15} step={0.25} prefix="€" />
          <SliderInput label="Uren opvang/maand" value={scenario.kotUren} onChange={v => u("kotUren", v)} min={20} max={230} step={10} prefix="" />
        </div>
      )}

      {/* Housing */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { key: "renter", label: "🏢 Huur", active: scenario.isRenter },
          { key: "owner", label: "🏡 Koopwoning", active: scenario.hasHome },
          { key: "neither", label: "🏠 Anders", active: !scenario.isRenter && !scenario.hasHome },
        ].map(opt => (
          <div key={opt.key} onClick={() => {
            if (opt.key === "renter") { u("isRenter", true); onChange({...scenario, isRenter: true, hasHome: false}); }
            else if (opt.key === "owner") { onChange({...scenario, isRenter: false, hasHome: true}); }
            else { onChange({...scenario, isRenter: false, hasHome: false}); }
          }}
            style={{
              flex: 1, padding: "8px", borderRadius: 8, textAlign: "center", cursor: "pointer",
              fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              background: opt.active ? theme.accentGlow : theme.bg,
              border: `1px solid ${opt.active ? theme.accent + "50" : theme.border}`,
              color: opt.active ? theme.white : theme.textDim,
            }}>{opt.label}</div>
        ))}
      </div>

      {scenario.isRenter && (
        <SliderInput label="Kale huur per maand" value={scenario.rent} onChange={v => u("rent", v)} min={0} max={1500} step={25} />
      )}
      {scenario.hasHome && (<>
        <SliderInput label="Hypotheekbedrag" value={scenario.hypotheek} onChange={v => u("hypotheek", v)} min={0} max={800000} step={5000} />
        <SliderInput label="Hypotheekrente" value={scenario.rentePerc} onChange={v => u("rentePerc", v)} min={1} max={6} step={0.1} prefix="" suffix="%" />
        <SliderInput label="WOZ-waarde" value={scenario.wozWaarde} onChange={v => u("wozWaarde", v)} min={100000} max={1000000} step={10000} />
      </>)}

      {/* AOW & DUO */}
      <Toggle label="AOW-leeftijd bereikt" desc="Lager tarief schijf 1 (19,07%), ouderenkorting" checked={scenario.isAOW} onChange={v => u("isAOW", v)} />
      <SliderInput label="DUO studieschuld" value={scenario.duoSchuld} onChange={v => u("duoSchuld", v)} min={0} max={100000} step={1000} />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// COMPARISON VIEW
// ═══════════════════════════════════════════════════════════
function ComparisonDashboard({ current, newScen, rCurrent, rNew }) {
  const diff = rNew.netIncome - rCurrent.netIncome;
  const diffMonthly = diff / 12;
  const diffTax = rNew.totalTax - rCurrent.totalTax;
  const diffCredits = rNew.totalCredits - rCurrent.totalCredits;
  const diffToesl = rNew.totalToesl - rCurrent.totalToesl;
  const mtrCur = calcMTR(current, current.employment || 1000);
  const mtrNew = calcMTR(newScen, newScen.employment || 1000);

  const fmt = v => `€${Math.round(Math.abs(v)).toLocaleString("nl-NL")}`;

  return (
    <div>
      {/* Hero delta */}
      <div style={{
        background: diff >= 0 ? theme.greenGlow : theme.redGlow,
        border: `1px solid ${diff >= 0 ? theme.green : theme.red}25`,
        borderRadius: 16, padding: "24px 28px", marginBottom: 20, textAlign: "center",
      }}>
        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>Netto verschil per jaar</div>
        <div style={{ fontSize: 36, fontWeight: 900, fontFamily: mono, color: diff >= 0 ? theme.green : theme.red, letterSpacing: "-1px" }}>
          {diff >= 0 ? "+" : "-"}{fmt(diff)}
        </div>
        <div style={{ fontSize: 14, color: theme.textMuted, marginTop: 4 }}>
          = {diff >= 0 ? "+" : "-"}{fmt(diffMonthly)} per maand
        </div>
      </div>

      {/* Side by side stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 6, marginBottom: 20 }}>
        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: theme.accent, fontFamily: font }}>Huidig</div>
        <div style={{ textAlign: "center", fontSize: 10, color: theme.textDim }}>Verschil</div>
        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: theme.green, fontFamily: font }}>Nieuw</div>

        {[
          { label: "Netto/maand", cur: rCurrent.monthly, nw: rNew.monthly },
          { label: "Bruto totaal", cur: rCurrent.grossTotal, nw: rNew.grossTotal },
          { label: "Belasting", cur: rCurrent.totalTax, nw: rNew.totalTax, flip: true },
          { label: "Kortingen", cur: rCurrent.totalCredits, nw: rNew.totalCredits },
          { label: "Toeslagen", cur: rCurrent.totalToesl, nw: rNew.totalToesl },
          { label: "Eff. tarief", cur: rCurrent.effectiveRate * 100, nw: rNew.effectiveRate * 100, pct: true, flip: true },
          { label: "Marginaal", cur: mtrCur.mtr * 100, nw: mtrNew.mtr * 100, pct: true, flip: true },
        ].map((row, i) => {
          const d = row.nw - row.cur;
          const isPos = row.flip ? d < 0 : d > 0;
          const dColor = Math.abs(d) < 0.5 ? theme.textDim : isPos ? theme.green : theme.red;
          return (
            <Fragment key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: theme.bg, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <span style={{ fontSize: 11, color: theme.textDim }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: theme.text }}>
                  {row.pct ? `${row.cur.toFixed(1)}%` : `€${Math.round(row.cur).toLocaleString("nl-NL")}`}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: dColor }}>
                  {d >= 0 ? "+" : ""}{row.pct ? `${d.toFixed(1)}%` : `€${Math.round(d).toLocaleString("nl-NL")}`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: theme.bg, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <span style={{ fontSize: 11, color: theme.textDim }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: theme.text }}>
                  {row.pct ? `${row.nw.toFixed(1)}%` : `€${Math.round(row.nw).toLocaleString("nl-NL")}`}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Breakdown deltas */}
      <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: "18px 20px", marginBottom: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: "0 0 14px", fontFamily: font }}>Gedetailleerde veranderingen</h4>
        {[
          { label: "Zorgtoeslag", cur: rCurrent.zt, nw: rNew.zt },
          { label: "Huurtoeslag", cur: rCurrent.ht, nw: rNew.ht },
          { label: "Kindgebonden budget", cur: rCurrent.kgb, nw: rNew.kgb },
          { label: "Kinderopvangtoeslag", cur: rCurrent.kot, nw: rNew.kot },
          { label: "Kinderbijslag", cur: rCurrent.kb, nw: rNew.kb },
          { label: "Arbeidskorting", cur: rCurrent.ak1, nw: rNew.ak1 },
          { label: "Algemene heffingskorting", cur: rCurrent.ahk1, nw: rNew.ahk1 },
          { label: "IACK", cur: rCurrent.iack1, nw: rNew.iack1 },
          { label: "Hypotheekvoordeel", cur: rCurrent.hyp?.netto || 0, nw: rNew.hyp?.netto || 0 },
          { label: "ZVW (ZZP)", cur: rCurrent.zvw, nw: rNew.zvw, flip: true },
          { label: "DUO-aflossing", cur: rCurrent.duo, nw: rNew.duo, flip: true },
        ].filter(r => r.cur > 0 || r.nw > 0).map((row, i) => {
          const d = row.nw - row.cur;
          const isPos = row.flip ? d < 0 : d > 0;
          const dColor = Math.abs(d) < 1 ? theme.textDim : isPos ? theme.green : theme.red;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
              <span style={{ fontSize: 12, color: theme.textMuted, flex: 1 }}>{row.label}</span>
              <span style={{ fontSize: 11, fontFamily: mono, color: theme.textDim, width: 70, textAlign: "right" }}>€{Math.round(row.cur).toLocaleString("nl-NL")}</span>
              <span style={{ fontSize: 11, fontFamily: mono, color: theme.textDim, width: 20, textAlign: "center" }}>→</span>
              <span style={{ fontSize: 11, fontFamily: mono, color: theme.text, width: 70, textAlign: "right" }}>€{Math.round(row.nw).toLocaleString("nl-NL")}</span>
              <span style={{ fontSize: 11, fontFamily: mono, color: dColor, width: 75, textAlign: "right", fontWeight: 700 }}>
                {d >= 0 ? "+" : ""}{Math.round(d).toLocaleString("nl-NL")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// DECISION METRICS
// ═══════════════════════════════════════════════════════════
function DecisionMetrics({ rCurrent, rNew, current, newScen }) {
  const diffNet = rNew.netIncome - rCurrent.netIncome;
  const diffMonthly = diffNet / 12;
  const diffEffRate = (rNew.effectiveRate - rCurrent.effectiveRate) * 100;
  const diffToesl = rNew.totalToesl - rCurrent.totalToesl;

  // Simple "score" logic
  const pros = [];
  const cons = [];

  if (diffNet > 500) pros.push(`€${Math.round(diffNet).toLocaleString("nl-NL")} meer netto per jaar`);
  if (diffNet < -500) cons.push(`€${Math.round(Math.abs(diffNet)).toLocaleString("nl-NL")} minder netto per jaar`);
  if (diffToesl > 200) pros.push(`€${Math.round(diffToesl).toLocaleString("nl-NL")} meer toeslagen`);
  if (diffToesl < -200) cons.push(`€${Math.round(Math.abs(diffToesl)).toLocaleString("nl-NL")} minder toeslagen`);
  if (diffEffRate < -2) pros.push(`Effectief tarief ${Math.abs(diffEffRate).toFixed(1)}% lager`);
  if (diffEffRate > 2) cons.push(`Effectief tarief ${diffEffRate.toFixed(1)}% hoger`);

  // ZZP specific
  if (newScen.zzpIncome > 0 && current.zzpIncome === 0) {
    if (rNew.zzpInfo) {
      pros.push(`Ondernemersaftrekken: €${Math.round(rNew.zzpInfo.zaAftrek + rNew.zzpInfo.startAftrek + rNew.zzpInfo.mkb).toLocaleString("nl-NL")}`);
      cons.push(`Zvw-bijdrage: €${Math.round(rNew.zzpInfo.zvw).toLocaleString("nl-NL")}/jaar`);
      cons.push("Administratie & boekhouding nodig");
      cons.push("Geen WW/WIA zekerheid als zelfstandige");
    }
  }
  if (newScen.zzpIncome > 0 && newScen.employment > 0) {
    pros.push("Combinatie loondienst + onderneming: WW-vangnet behouden");
  }

  // Housing change
  if (current.isRenter && newScen.hasHome) {
    if (rNew.hyp?.netto > 0) pros.push(`Hypotheekrenteaftrek: €${Math.round(rNew.hyp.netto).toLocaleString("nl-NL")}/jaar`);
    if (rCurrent.ht > 0) cons.push(`Verlies huurtoeslag: €${Math.round(rCurrent.ht).toLocaleString("nl-NL")}/jaar`);
    cons.push("Eigen vermogen nodig voor aanbetaling");
  }

  // Partner change
  if (!current.hasPartner && newScen.hasPartner) {
    pros.push("Toeslagpartner: mogelijk hogere zorgtoeslag");
    cons.push("Gezamenlijk toetsingsinkomen kan toeslagen verlagen");
  }

  // Kids
  if (!current.hasKids && newScen.hasKids) {
    if (rNew.kgb > 0) pros.push(`Kindgebonden budget: €${Math.round(rNew.kgb).toLocaleString("nl-NL")}/jaar`);
    if (rNew.kb > 0) pros.push(`Kinderbijslag: €${Math.round(rNew.kb).toLocaleString("nl-NL")}/jaar`);
  }

  const mtrNew = calcMTR(newScen, newScen.employment || 1000);
  if (mtrNew.mtr > 0.60) cons.push(`Let op: marginaal tarief is ${(mtrNew.mtr * 100).toFixed(0)}% — extra werken levert weinig op`);

  return (
    <div>
      <div style={{
        textAlign: "center", padding: "24px 20px", marginBottom: 20,
        background: `linear-gradient(135deg, ${theme.card}, ${theme.bg})`,
        borderRadius: 16, border: `1px solid ${theme.border}`,
      }}>
        <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>Maandelijks verschil</div>
        <div style={{
          fontSize: 42, fontWeight: 900, fontFamily: mono, letterSpacing: "-2px",
          color: diffMonthly >= 0 ? theme.green : theme.red,
        }}>
          {diffMonthly >= 0 ? "+" : "-"}€{Math.round(Math.abs(diffMonthly)).toLocaleString("nl-NL")}
        </div>
        <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>per maand netto {diffMonthly >= 0 ? "erbij" : "minder"}</div>
      </div>

      {/* Pros & Cons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: theme.greenGlow, borderRadius: 14, border: `1px solid ${theme.green}20`, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.green, marginBottom: 10 }}>✅ Voordelen</div>
          {pros.length === 0 && <div style={{ fontSize: 12, color: theme.textDim }}>Geen significante voordelen gevonden</div>}
          {pros.map((p, i) => (
            <div key={i} style={{ fontSize: 12, color: theme.text, marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid ${theme.green}40` }}>{p}</div>
          ))}
        </div>
        <div style={{ background: theme.redGlow, borderRadius: 14, border: `1px solid ${theme.red}20`, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.red, marginBottom: 10 }}>⚠️ Nadelen & risico's</div>
          {cons.length === 0 && <div style={{ fontSize: 12, color: theme.textDim }}>Geen significante nadelen gevonden</div>}
          {cons.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: theme.text, marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid ${theme.red}40` }}>{c}</div>
          ))}
        </div>
      </div>

      {/* Smart insights */}
      <div style={{
        background: theme.amberGlow, borderRadius: 14, border: `1px solid ${theme.amber}20`,
        padding: "16px 18px", marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.amber, marginBottom: 8 }}>💡 Inzichten</div>
        <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.7 }}>
          {newScen.zzpIncome > 0 && newScen.employment > 0 && (
            <p style={{ margin: "0 0 6px" }}>
              <strong>Hybride constructie:</strong> Je combineert loondienst (€{newScen.employment.toLocaleString("nl-NL")}) met onderneming (€{newScen.zzpIncome.toLocaleString("nl-NL")}). 
              Dit behoudt WW-recht via de dienstbetrekking terwijl je profiteert van ondernemersaftrekken.
              {newScen.urenOK ? " Je voldoet aan het urencriterium → zelfstandigenaftrek van toepassing." : " Let op: zonder urencriterium (1.225+ uur) vervalt de zelfstandigenaftrek."}
            </p>
          )}
          {diffNet > 0 && Math.abs(diffToesl) > 500 && diffToesl < 0 && (
            <p style={{ margin: "0 0 6px" }}>
              <strong>Toeslagenval:</strong> Ondanks hoger netto-inkomen verlies je €{Math.round(Math.abs(diffToesl)).toLocaleString("nl-NL")} aan toeslagen. 
              Het werkelijke voordeel is kleiner dan het salarisverschil suggereert.
            </p>
          )}
          {mtrNew.mtr > 0.55 && (
            <p style={{ margin: "0 0 6px" }}>
              <strong>Hoog marginaal tarief ({(mtrNew.mtr * 100).toFixed(0)}%):</strong> Van iedere extra €100 bruto houd je slechts €{Math.round(mtrNew.kept)} over. 
              Overweeg alternatieven zoals pensioenopbouw of werktijdvermindering.
            </p>
          )}
          {current.isRenter && newScen.hasHome && (
            <p style={{ margin: "0 0 6px" }}>
              <strong>Huur → koop:</strong> Je verliest {rCurrent.ht > 0 ? `€${Math.round(rCurrent.ht)}/jaar huurtoeslag maar ` : ""}
              krijgt {rNew.hyp?.netto > 0 ? `€${Math.round(rNew.hyp.netto)}/jaar hypotheekvoordeel.` : "beperkt hypotheekvoordeel."} 
              {" "}Let op: vermogensopbouw in de woning is niet meegenomen in deze berekening.
            </p>
          )}
          <p style={{ margin: "0", fontStyle: "italic", color: theme.textDim }}>
            Tip: Experimenteer met kleine aanpassingen om het optimale punt te vinden. Het belastingstelsel kent diverse drempels waar kleine inkomensverschillen groot effect hebben.
          </p>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════
function HomePage({ onStart }) {
  const cards = [
    {
      emoji: "💼", title: "Salarisverhoging of nieuwe baan",
      desc: "Wat houd ik netto over van een hoger salaris? Hoeveel toeslagen verlies ik?",
      preset: { employment: 42000 },
    },
    {
      emoji: "🧑‍💻", title: "ZZP starten (naast baan)",
      desc: "Loondienst combineren met eigen onderneming. Wat zijn de voordelen en kosten?",
      preset: { employment: 36000, zzpIncome: 15000, urenOK: false },
    },
    {
      emoji: "🏡", title: "Huis kopen (huur → koop)",
      desc: "Hypotheekrenteaftrek vs. verlies huurtoeslag. Wat is het verschil?",
      preset: { isRenter: false, hasHome: true, hypotheek: 300000, rentePerc: 3.8, wozWaarde: 380000 },
    },
    {
      emoji: "👶", title: "Gezinsuitbreiding",
      desc: "Kindgebonden budget, kinderbijslag, kinderopvangtoeslag — hoeveel krijg je?",
      preset: { hasKids: true, nKids: 1, kidsU12: 1 },
    },
    {
      emoji: "👫", title: "Gaan samenwonen / trouwen",
      desc: "Fiscaal partnerschap: effect op toeslagen en kortingen.",
      preset: { hasPartner: true, inc2: 30000 },
    },
    {
      emoji: "📈", title: "Volledig zelfstandig worden",
      desc: "Loondienst opzeggen → volledig ZZP. Alle aftrekposten en risico's.",
      preset: { employment: 0, zzpIncome: 55000, urenOK: true },
    },
  ];

  return (
    <div style={{ padding: "40px 3%", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🇳🇱</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: theme.white, margin: "0 0 8px", fontFamily: font, letterSpacing: "-0.5px" }}>
          Belasting Scenario Simulator
        </h1>
        <p style={{ fontSize: 15, color: theme.textMuted, margin: "0 0 6px", lineHeight: 1.6, fontFamily: font }}>
          Vergelijk je huidige financiële situatie met een nieuw scenario.
        </p>
        <p style={{ fontSize: 13, color: theme.textDim, margin: 0, fontFamily: font }}>
          Alle 14 regelingen uit het Nederlandse belastingstelsel 2025
        </p>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted, marginBottom: 12, fontFamily: font }}>
        Wat wil je onderzoeken?
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {cards.map((card, i) => (
          <div key={i} onClick={() => onStart(card.preset)}
            style={{
              background: theme.card, borderRadius: 14, padding: "18px 20px",
              border: `1px solid ${theme.border}`, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent + "60"; e.currentTarget.style.background = theme.cardHover; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.card; }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.white, marginBottom: 4, fontFamily: font }}>{card.title}</div>
            <div style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.5 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <div onClick={() => onStart({})}
          style={{
            display: "inline-block", padding: "10px 20px", borderRadius: 10,
            background: theme.accent, color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: font, transition: "transform 0.1s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Blanco beginnen →
        </div>
      </div>

      <div style={{ marginTop: 32, padding: "14px 18px", background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 11, color: theme.textDim, lineHeight: 1.7 }}>
          <strong style={{ color: theme.textMuted }}>⚠ Disclaimer:</strong> Dit is een vereenvoudigd rekenmodel voor educatieve en oriënterende doeleinden. 
          Werkelijke bedragen kunnen afwijken door persoonlijke omstandigheden, vermogensgrenzen, en regelingen die niet volledig zijn gemodelleerd. 
          Gebruik <strong>toeslagen.nl/proefberekening</strong> voor exacte bedragen. 
          Raadpleeg een belastingadviseur voor persoonlijk advies. 
          Bron: Belastingdienst, Dienst Toeslagen, SVB, Rijksoverheid (2025).
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// MAIN SIMULATOR EXPORT
// ═══════════════════════════════════════════════════════════
export default function TaxSimulator() {
  const [current, setCurrent] = useState({ ...defaultScenario });
  const [newScen, setNewScen] = useState({ ...defaultScenario });
  const [activeTab, setActiveTab] = useState("current"); // current | new | compare | decide
  const [started, setStarted] = useState(false); // show scenario selection first

  const rCurrent = useMemo(() => calcCombinedIncome(current), [JSON.stringify(current)]);
  const rNew = useMemo(() => calcCombinedIncome(newScen), [JSON.stringify(newScen)]);

  const handleStart = useCallback((preset) => {
    const base = { ...defaultScenario, ...preset };
    setCurrent(base);
    setNewScen(base);
    setActiveTab("current");
    setStarted(true);
  }, []);

  const handleCopyCurrentToNew = () => {
    setNewScen({ ...current });
  };

  const tabs = [
    { key: "current", label: "① Huidige situatie", color: theme.accent },
    { key: "new", label: "② Nieuw scenario", color: theme.green },
    { key: "compare", label: "③ Vergelijking", color: theme.amber },
    { key: "decide", label: "④ Beslismetrieken", color: theme.purple },
  ];

  return (
    <div style={{ width: "100%", fontFamily: font }}>
      {/* Header (no external navigation – App controls page routing) */}
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.card}, #0f1a2e)`,
          borderBottom: `1px solid ${theme.border}`,
          padding: "14px 16px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }} title="Belasting Scenario Simulator">
              🇳🇱
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: theme.white }}>Scenario Simulator 2025</div>
              <div style={{ fontSize: 10, color: theme.textDim }}>Huidig → Nieuw → Beslissing</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", padding: "16px 12px 60px" }}>
        {!started && (
          <HomePage onStart={handleStart} />
        )}

        {started && (
        {/* Tab navigation */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {tabs.map(t => (
            <div key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                background: activeTab === t.key ? t.color + "18" : "transparent",
                color: activeTab === t.key ? t.color : theme.textDim,
                border: `1px solid ${activeTab === t.key ? t.color + "40" : "transparent"}`,
              }}>{t.label}</div>
          ))}
        </div>

        {/* ── STEP 1: Current situation ── */}
        {activeTab === "current" && (
          <div>
            <div style={{ marginBottom: 16, padding: "12px 16px", background: theme.accentGlow, borderRadius: 12, border: `1px solid ${theme.accent}20` }}>
              <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.6 }}>
                Vul hieronder je <strong>huidige</strong> financiële situatie in. Dit is je uitgangspunt voor de vergelijking.
              </div>
            </div>

            <ScenarioForm scenario={current} onChange={setCurrent} label="Huidige situatie" color={theme.accent} />

            {/* Quick overview */}
            <div style={{
              background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`,
              padding: "18px 20px", marginTop: 16,
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: "0 0 14px" }}>Huidige situatie — Overzicht</h4>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <StatCard label="Netto/maand" value={`€${Math.round(rCurrent.monthly).toLocaleString("nl-NL")}`} color={theme.green} />
                <StatCard label="Eff. tarief" value={`${(rCurrent.effectiveRate * 100).toFixed(1)}%`} color={theme.amber} />
                <StatCard label="Toeslagen/jaar" value={`€${Math.round(rCurrent.totalToesl).toLocaleString("nl-NL")}`} color={theme.accent} />
              </div>
              <MiniWaterfall r={rCurrent} compact />
            </div>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <div onClick={() => { handleCopyCurrentToNew(); setActiveTab("new"); }}
                style={{
                  display: "inline-block", padding: "10px 20px", borderRadius: 8,
                  background: theme.green, color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "transform 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                Door naar nieuw scenario →
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: New scenario ── */}
        {activeTab === "new" && (
          <div>
            <div style={{ marginBottom: 16, padding: "12px 16px", background: theme.greenGlow, borderRadius: 12, border: `1px solid ${theme.green}20` }}>
              <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.6 }}>
                Pas hieronder aan wat je wilt <strong>veranderen</strong>. Start vanuit je huidige situatie en wijzig wat relevant is.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div onClick={handleCopyCurrentToNew}
                style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: `1px solid ${theme.border}`, color: theme.textMuted,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = theme.green; e.currentTarget.style.color = theme.white; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
              >↻ Reset naar huidig</div>
            </div>

            <ScenarioForm scenario={newScen} onChange={setNewScen} label="Nieuw scenario" color={theme.green} />

            <div style={{
              background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`,
              padding: "18px 20px", marginTop: 16,
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: "0 0 14px" }}>Nieuw scenario — Overzicht</h4>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <StatCard label="Netto/maand" value={`€${Math.round(rNew.monthly).toLocaleString("nl-NL")}`} color={theme.green} />
                <StatCard label="Eff. tarief" value={`${(rNew.effectiveRate * 100).toFixed(1)}%`} color={theme.amber} />
                <StatCard label="Toeslagen/jaar" value={`€${Math.round(rNew.totalToesl).toLocaleString("nl-NL")}`} color={theme.accent} />
              </div>
              <MiniWaterfall r={rNew} compact />
            </div>

            <div style={{ textAlign: "center", marginTop: 20, display: "flex", gap: 10, justifyContent: "center" }}>
              <div onClick={() => setActiveTab("compare")}
                style={{
                  display: "inline-block", padding: "10px 20px", borderRadius: 8,
                  background: theme.amber, color: "#000", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "transform 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                Vergelijken →
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Comparison ── */}
        {activeTab === "compare" && (
          <div>
            <ComparisonDashboard current={current} newScen={newScen} rCurrent={rCurrent} rNew={rNew} />

            {/* MTR chart for new scenario */}
            <div style={{
              background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`,
              padding: "18px 20px", marginBottom: 16,
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: "0 0 10px" }}>Marginaal tarief — Nieuw scenario</h4>
              <MTRChart p={newScen} currentInc={newScen.employment || 1000} />
            </div>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <div onClick={() => setActiveTab("decide")}
                style={{
                  display: "inline-block", padding: "10px 20px", borderRadius: 8,
                  background: `linear-gradient(135deg, ${theme.purple}, ${theme.accent})`,
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "transform 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                Beslismetrieken bekijken →
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Decision Metrics ── */}
        {activeTab === "decide" && (
          <div>
            <DecisionMetrics rCurrent={rCurrent} rNew={rNew} current={current} newScen={newScen} />

            {/* Checklist of all 14 categories */}
            <div style={{
              background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`,
              padding: "18px 20px", marginBottom: 16,
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: "0 0 12px" }}>📋 Alle 14 regelingen — Status</h4>
              {[
                { n: "Inkomstenbelasting Box 1", inc: true, note: "3 schijven: 35,82% / 37,48% / 49,50%" },
                { n: "Algemene heffingskorting", inc: true, note: `€${Math.round(rNew.ahk1)}` },
                { n: "Arbeidskorting", inc: true, note: `€${Math.round(rNew.ak1)}` },
                { n: "IACK", inc: rNew.iack1 > 0, note: rNew.iack1 > 0 ? `€${Math.round(rNew.iack1)}` : "n.v.t." },
                { n: "Ouderenkorting", inc: rNew.ok1 > 0, note: rNew.ok1 > 0 ? `€${Math.round(rNew.ok1)}` : "n.v.t." },
                { n: "Zorgtoeslag", inc: true, note: `€${Math.round(rNew.zt)}/jaar` },
                { n: "Huurtoeslag", inc: rNew.ht > 0, note: rNew.ht > 0 ? `€${Math.round(rNew.ht)}/jaar` : "n.v.t." },
                { n: "Kinderopvangtoeslag", inc: rNew.kot > 0, note: rNew.kot > 0 ? `€${Math.round(rNew.kot)}/jaar` : "n.v.t." },
                { n: "Kindgebonden budget", inc: rNew.kgb > 0, note: rNew.kgb > 0 ? `€${Math.round(rNew.kgb)}/jaar` : "n.v.t." },
                { n: "Kinderbijslag", inc: rNew.kb > 0, note: rNew.kb > 0 ? `€${Math.round(rNew.kb)}/jaar` : "n.v.t." },
                { n: "Hypotheekrenteaftrek + EWF", inc: rNew.hyp?.netto > 0, note: rNew.hyp?.netto > 0 ? `€${Math.round(rNew.hyp.netto)}/jaar` : "n.v.t." },
                { n: "ZZP-aftrekposten", inc: !!rNew.zzpInfo, note: rNew.zzpInfo ? `€${Math.round(rNew.zzpInfo.zaAftrek + rNew.zzpInfo.startAftrek + rNew.zzpInfo.mkb)}` : "n.v.t." },
                { n: "Pensioenaftrek", inc: rNew.pensioen1 > 0, note: rNew.pensioen1 > 0 ? `€${Math.round(rNew.pensioen1)}` : "n.v.t." },
                { n: "DUO studieschuld", inc: rNew.duo > 0, note: rNew.duo > 0 ? `€${Math.round(rNew.duo)}/jaar` : "n.v.t." },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0", borderBottom: i < 13 ? `1px solid ${theme.border}` : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12 }}>{item.inc ? "✅" : "⬜"}</span>
                    <span style={{ fontSize: 12, color: item.inc ? theme.text : theme.textDim }}>{item.n}</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: mono, color: item.inc ? theme.green : theme.textDim }}>{item.note}</span>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{
              padding: "14px 18px", background: theme.card, borderRadius: 12,
              border: `1px solid ${theme.border}`, marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: theme.textDim, lineHeight: 1.7 }}>
                <strong style={{ color: theme.amber }}>⚠ Disclaimer:</strong> Dit is een vereenvoudigd rekenmodel voor educatieve en oriënterende doeleinden. 
                Werkelijke bedragen kunnen afwijken door persoonlijke omstandigheden, vermogensgrenzen (Box 3), en regelingen die niet volledig zijn gemodelleerd 
                (o.a. WW/WIA, Box 2, alimentatie, fiscale partnerverdeling). 
                Gebruik <strong>toeslagen.nl/proefberekening</strong> voor exacte toeslagbedragen.
                Raadpleeg een belastingadviseur voor persoonlijk financieel advies. 
                Geen rechten kunnen worden ontleend aan deze berekeningen.
                <br/>Bron: Belastingdienst, Dienst Toeslagen, SVB, Rijksoverheid (2025).
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block", padding: "10px 20px", borderRadius: 8,
                  border: `1px solid ${theme.border}`, color: theme.textMuted,
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                }}
              >
                ← Nieuw scenario starten
              </div>
            </div>
          </div>
        )}
        {/* end started */}
        )}
      </div>
    </div>
  );
}
