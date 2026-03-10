import { useState, useMemo, useEffect } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { C, F, M } from "../constants/theme.js";
import { DEF } from "../constants/defaults.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import { calc, calcMTR } from "../lib/taxEngine.js";
import { useSessionContext } from "../components/providers/SessionProvider";
import { useDebouncedCalculate } from "../hooks/useDebouncedCalculate.js";
import { generateAIAnalysis, generateSituationNote, getRelevantAdvisors } from "../lib/scenarioAnalysis.js";
import { buildInsights } from "../lib/insights.js";
import { buildPdfData } from "../buildPdfData.js";
import ResultsReportPDF from "../ResultsReportPDF.jsx";
import Nav from "../components/Nav.jsx";
import Btn from "../components/ui/Btn.jsx";
import SC from "../components/ui/StatCard.jsx";
import ScenarioForm from "../components/ScenarioForm.jsx";
import Waterfall from "../components/Waterfall.jsx";
import MTRChart from "../components/MTRChart.jsx";
import InsightsPanel from "../components/InsightsPanel.jsx";
import { EmployerView } from "../components/calculator/EmployerView";

const SCENARIO_CARDS = [
  { e: "💼", t: "Salarisverhoging of nieuwe baan", d: "Meer bruto salaris, wat blijft netto over?", preset: { employment: 42000 } },
  { e: "🧑‍💻", t: "ZZP starten naast baan", d: "Loondienst combineren met eigen onderneming.", preset: { employment: 36000, zzpIncome: 15000, urenOK: false } },
  { e: "🏡", t: "Huis kopen (huur → koop)", d: "Van huur naar koop met hypotheekrenteaftrek.", preset: { isRenter: false, hasHome: true, hypotheek: 300000, rentePerc: 3.8, wozWaarde: 380000 } },
  { e: "👶", t: "Gezinsuitbreiding", d: "Kinderen, toeslagen en kinderopvang.", preset: { hasKids: true, nKids: 1, kidsU12: 1 } },
  { e: "👫", t: "Gaan samenwonen / trouwen", d: "Fiscaal partnerschap en toeslagen.", preset: { hasPartner: true, inc2: 30000 } },
  { e: "🚀", t: "Volledig zelfstandig worden", d: "Loondienst opzeggen, volledig ZZP.", preset: { employment: 0, zzpIncome: 55000, urenOK: true } },
];

export default function SimPage({ setPage, goContact, user, onSaveScenario, loadSavedScenario }) {
  const { logEvent, sessionId, visitorId } = useSessionContext();
  const [cur, setCur] = useState({ ...DEF });
  const [nw, setNw] = useState({ ...DEF });
  const [tab, setTab] = useState("current");
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [featuredAdvisor, setFeaturedAdvisor] = useState(null);
  const [advFormName, setAdvFormName] = useState("");
  const [advFormEmail, setAdvFormEmail] = useState("");
  const [advFormMsg, setAdvFormMsg] = useState("");
  const [advSent, setAdvSent] = useState(false);
  const [advSubmitting, setAdvSubmitting] = useState(false);
  const [advError, setAdvError] = useState("");
  const [showToeslagDetails, setShowToeslagDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackStars, setFeedbackStars] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [savedScenario, setSavedScenario] = useState(null);
  const [showEmployerView, setShowEmployerView] = useState(false);

  useEffect(() => {
    if (loadSavedScenario) {
      const d = loadSavedScenario();
      setSavedScenario(d && (d.cur || d.nw) ? d : null);
    }
  }, [user?.id, loadSavedScenario]);

  const w = useWindowWidth();
  const mob = w < 768;
  const {
    rC: apiRc,
    rN: apiRn,
    employerCostCur,
    employerCostNw,
    recommendedPartnersNw,
    profileTypeNw,
    isLoading: calcLoading,
  } = useDebouncedCalculate(cur, nw);
  const fallbackRc = useMemo(() => calc(cur), [JSON.stringify(cur)]);
  const fallbackRn = useMemo(() => calc(nw), [JSON.stringify(nw)]);
  const rC = apiRc ?? fallbackRc;
  const rN = apiRn ?? fallbackRn;

  const handleCurChange = (next) => {
    setCur(next);
    logEvent("input_change", { scenario: "current", fields: Object.keys(next) });
  };
  const handleNwChange = (next) => {
    setNw(next);
    logEvent("input_change", { scenario: "new", fields: Object.keys(next) });
  };
  const copyToNew = () => setNw({ ...cur });
  const diff = rN.nI - rC.nI;
  const fmt = (v) => `€${Math.round(Math.abs(v)).toLocaleString("nl-NL")}`;
  const mC = calcMTR(cur, cur.employment || 1000);
  const mN = calcMTR(nw, nw.employment || 1000);
  const ai = useMemo(() => generateAIAnalysis(rC, rN, cur, nw), [JSON.stringify(rC), JSON.stringify(rN)]);
  const notesCur = useMemo(() => generateSituationNote(rC, cur), [JSON.stringify(rC)]);
  const notesNew = useMemo(() => generateSituationNote(rN, nw), [JSON.stringify(rN)]);
  const advisors = useMemo(() => {
    if (Array.isArray(recommendedPartnersNw) && recommendedPartnersNw.length > 0) {
      return recommendedPartnersNw.map((partner) => ({
        name: partner.name,
        type: partner.partnerType || partner.tier || "Partner",
        prov:
          Array.isArray(partner.provinces) && partner.provinces.length > 0
            ? partner.provinces[0]
            : nw.provincie || "Landelijk",
        emoji: (partner.name || "?").slice(0, 1).toUpperCase(),
        slug: partner.slug || null,
        url: null,
        reasons: partner.reasons || [],
      }));
    }
    return getRelevantAdvisors(nw.provincie || "Noord-Holland").map((partner) => ({
      ...partner,
      slug: null,
      reasons: [],
    }));
  }, [recommendedPartnersNw, nw.provincie]);
  const totalTax = (r) => r.tTx + (r.box2?.tax || 0) + (r.b3?.tax || 0);
  const pdfData = useMemo(() => buildPdfData({ rC, rN, diff, C }), [JSON.stringify(rC), JSON.stringify(rN), diff]);
  const insightForm = useMemo(
    () => ({
      ownsHome: nw.hasHome,
      isZZP: (nw.zzpIncome || 0) > 0,
      hasBV: false,
      hasInternationalIncome: false,
      isFiscalPartner: nw.hasPartner,
      box3Cash: nw.box3Spaargeld || 0,
      box3Investments: nw.box3Beleggingen || 0,
      zzpHours: 0,
      zzpProfit: nw.zzpIncome || 0,
      mortgageInterest: nw.hypotheek > 0 ? nw.hypotheek * (nw.rentePerc / 100) : 0,
      incomeEmployment: nw.employment || 0,
    }),
    [JSON.stringify(nw)]
  );
  const { cards: insightCards } = useMemo(() => buildInsights(insightForm, "results"), [JSON.stringify(insightForm)]);

  const submitAdvisorLead = async (advisor) => {
    const payload = {
      name: advFormName.trim(),
      email: advFormEmail.trim(),
      subject: `Aanvraag advies: ${advisor.name}`,
      message: advFormMsg.trim(),
      source: "advisor_match",
      partnerSlug: advisor.slug || undefined,
      sessionId: sessionId || undefined,
      visitorId: visitorId || undefined,
      profileType: profileTypeNw || undefined,
      metadata: {
        province: nw.provincie || null,
        advisorName: advisor.name,
        advisorReasons: advisor.reasons || [],
      },
    };

    if (!payload.name || !payload.email || !payload.message) {
      setAdvError("Vul naam, e-mail en bericht in.");
      return;
    }

    setAdvSubmitting(true);
    setAdvError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verzenden mislukt.");
      setAdvSent(true);
    } catch (e) {
      setAdvError(e.message || "Verzenden mislukt.");
    } finally {
      setAdvSubmitting(false);
    }
  };

  const applyScenario = (preset, index) => {
    const base = { ...DEF, ...preset };
    setCur(base);
    setNw(base);
    setTab("current");
    setSelectedScenario(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tabs = [
    { k: "current", l: mob ? "① Huidig" : "① Huidige situatie", c: C.primary },
    { k: "new", l: mob ? "② Nieuw" : "② Nieuw scenario", c: C.green },
    { k: "compare", l: mob ? "③ Vergelijk" : "③ Vergelijking", c: C.amber },
    { k: "decide", l: mob ? "④ Resultaat" : "④ Resultaat", c: C.purple },
  ];

  const Card = ({ children, sx }) => (
    <div style={{ background: C.lc, borderRadius: 16, border: `1px solid ${C.lb}`, padding: mob ? "16px" : "22px 26px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.03)", ...sx }}>{children}</div>
  );
  const SectionTitle = ({ children }) => (
    <h4 style={{ fontSize: 14, fontWeight: 700, color: C.lt, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>{children}</h4>
  );

  const compareRows = [
    { l: "Netto/mnd", a: rC.mo, b: rN.mo },
    { l: "Bruto", a: rC.gT, b: rN.gT },
    { l: "Totale belasting", a: totalTax(rC), b: totalTax(rN), f: 1 },
    { l: "Kortingen", a: rC.tC, b: rN.tC },
    { l: "Toeslagen totaal", a: rC.tT, b: rN.tT },
    { l: "Zorgtoeslag", a: rC.zt, b: rN.zt },
    { l: "Huurtoeslag", a: rC.ht, b: rN.ht },
    { l: "Kindgebonden budget", a: rC.kg, b: rN.kg },
    { l: "Kinderopvangtoeslag", a: rC.ko, b: rN.ko },
    { l: "Kinderbijslag", a: rC.kb, b: rN.kb },
    { l: "Eff.%", a: rC.eR * 100, b: rN.eR * 100, p: 1, f: 1 },
    { l: "Marg.%", a: mC.mtr * 100, b: mN.mtr * 100, p: 1, f: 1 },
  ];
  const hasToeslagen = (rC.zt + rC.ht + rC.kg + rC.ko + rC.kb + rN.zt + rN.ht + rN.kg + rN.ko + rN.kb) > 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      <Nav page="app" setPage={setPage} goContact={goContact} user={user} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: mob ? "74px 14px 60px" : "84px 20px 60px", width: "100%" }}>
        {/* Quick scenario selection */}
        <div style={{ marginBottom: mob ? 24 : 32 }}>
          <h2 style={{ fontSize: mob ? 22 : 26, fontWeight: 800, color: C.lt, margin: "0 0 6px" }}>In welke situatie zit je?</h2>
          <p style={{ fontSize: mob ? 13 : 14, color: C.lm, lineHeight: 1.6, margin: "0 0 16px" }}>Kies een scenario dat het beste past. Je kunt daarna alle waarden nog fijn‑tunen in de simulator.</p>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr", gap: mob ? 10 : 12 }}>
            {SCENARIO_CARDS.map((c, i) => (
              <div
                key={i}
                onClick={() => applyScenario(c.preset, i)}
                style={{
                  background: selectedScenario === i ? C.primarySoft : C.lc,
                  borderRadius: 14,
                  padding: mob ? "14px 12px" : "18px 16px",
                  border: selectedScenario === i ? `2px solid ${C.primary}` : `1px solid ${C.lb}`,
                  cursor: "pointer",
                  transition: "all 0.18s",
                  boxShadow: selectedScenario === i ? "0 4px 14px rgba(0,119,204,0.15)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (selectedScenario !== i) {
                    e.currentTarget.style.borderColor = C.primary + "50";
                    e.currentTarget.style.background = "#f8fafc";
                  }
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = selectedScenario === i ? "0 6px 18px rgba(0,119,204,0.2)" : "0 6px 18px rgba(15,23,42,0.08)";
                }}
                onMouseLeave={(e) => {
                  if (selectedScenario !== i) {
                    e.currentTarget.style.borderColor = C.lb;
                    e.currentTarget.style.background = C.lc;
                  }
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = selectedScenario === i ? "0 4px 14px rgba(0,119,204,0.15)" : "none";
                }}
              >
                <div style={{ fontSize: mob ? 22 : 26, marginBottom: 6 }}>{c.e}</div>
                <div style={{ fontSize: mob ? 13 : 14, fontWeight: 700, color: C.lt, margin: "0 0 4px" }}>{c.t}</div>
                <div style={{ fontSize: 12, color: C.lm, lineHeight: 1.5 }}>{c.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                padding: mob ? "8px 14px" : "10px 20px",
                borderRadius: 10,
                fontSize: mob ? 12 : 14,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                background: tab === t.k ? t.c + "0f" : "transparent",
                color: tab === t.k ? t.c : C.lmSoft,
                border: `1.5px solid ${tab === t.k ? t.c + "35" : "transparent"}`,
                fontFamily: F,
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === "current" && (
          <div>
            <Card sx={{ background: C.primarySoft, borderColor: C.primary + "20" }}>
              <div style={{ fontSize: 14, color: C.lt, lineHeight: 1.6 }}>Vul hieronder je <strong>huidige</strong> financiële situatie in. Klik op <span style={{ display: "inline-flex", width: 16, height: 16, borderRadius: 8, background: C.lb, fontSize: 9, fontWeight: 700, color: C.lm, alignItems: "center", justifyContent: "center", verticalAlign: "middle" }}>?</span> voor uitleg bij elk veld.</div>
            </Card>
            <ScenarioForm s={cur} onChange={handleCurChange} onLogEvent={logEvent} label="Huidige situatie" color={C.primary} mob={mob} />
            <Card sx={{ marginTop: 16 }}>
              <SectionTitle>📊 Overzicht {calcLoading && <span style={{ fontSize: 12, fontWeight: 500, color: C.lm }}>— Bijwerken…</span>}</SectionTitle>
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <SC label="Netto/maand" value={`€${Math.round(rC.mo).toLocaleString("nl-NL")}`} color={C.green} soft={C.greenSoft} />
                <SC label="Eff. tarief" value={`${(rC.eR * 100).toFixed(1)}%`} color={C.amber} soft={C.amberSoft} />
                <SC label="Toeslagen/jaar" value={`€${Math.round(rC.tT).toLocaleString("nl-NL")}`} color={C.primary} soft={C.primarySoft} />
              </div>
              <EmployerView employerCost={employerCostCur} visible={showEmployerView && tab === "current"} onClose={() => setShowEmployerView(false)} compact={mob} />
              {tab === "current" && !showEmployerView && (
                <Btn variant="ghost" onClick={() => setShowEmployerView(true)} style={{ fontSize: 12, marginBottom: 12 }}>Toon werkgeverskosten</Btn>
              )}
              <Waterfall r={rC} />
              {notesCur.length > 0 && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: `1px solid ${C.lb}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.lm, marginBottom: 6 }}>💡 Toelichting huidige situatie</div>
                  {notesCur.map((n, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.lm, marginBottom: 3, paddingLeft: 10, borderLeft: `2px solid ${C.primary}30` }}>{n}</div>
                  ))}
                </div>
              )}
            </Card>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Btn onClick={() => { copyToNew(); setTab("new"); }} variant="green">Door naar nieuw scenario →</Btn>
            </div>
            {user && onSaveScenario && (
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <Btn onClick={() => onSaveScenario({ cur, nw })} variant="ghost" style={{ fontSize: 12 }}>💾 Opslaan in mijn profiel</Btn>
              </div>
            )}
            {savedScenario && (savedScenario.cur || savedScenario.nw) && (
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Btn onClick={() => { if (savedScenario.cur) setCur(savedScenario.cur); if (savedScenario.nw) setNw(savedScenario.nw); }} variant="ghost" style={{ fontSize: 12 }}>📂 Laad opgeslagen situatie</Btn>
              </div>
            )}
          </div>
        )}

        {tab === "new" && (
          <div>
            <Card sx={{ background: C.greenSoft, borderColor: C.green + "20" }}>
              <div style={{ fontSize: 14, color: C.lt, lineHeight: 1.6 }}>Pas aan wat je wilt <strong>veranderen</strong>. Start vanuit je huidige situatie.</div>
            </Card>
            <div style={{ marginBottom: 14 }}><Btn onClick={copyToNew} variant="ghost">↻ Reset naar huidig</Btn></div>
            <ScenarioForm s={nw} onChange={handleNwChange} onLogEvent={logEvent} label="Nieuw scenario" color={C.green} mob={mob} />
            <Card sx={{ marginTop: 16 }}>
              <SectionTitle>📊 Overzicht {calcLoading && <span style={{ fontSize: 12, fontWeight: 500, color: C.lm }}>— Bijwerken…</span>}</SectionTitle>
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <SC label="Netto/maand" value={`€${Math.round(rN.mo).toLocaleString("nl-NL")}`} color={C.green} soft={C.greenSoft} />
                <SC label="Eff. tarief" value={`${(rN.eR * 100).toFixed(1)}%`} color={C.amber} soft={C.amberSoft} />
                <SC label="Toeslagen/jaar" value={`€${Math.round(rN.tT).toLocaleString("nl-NL")}`} color={C.primary} soft={C.primarySoft} />
              </div>
              <EmployerView employerCost={employerCostNw} visible={showEmployerView && tab === "new"} onClose={() => setShowEmployerView(false)} compact={mob} />
              {tab === "new" && !showEmployerView && (
                <Btn variant="ghost" onClick={() => setShowEmployerView(true)} style={{ fontSize: 12, marginBottom: 12 }}>Toon werkgeverskosten</Btn>
              )}
              <Waterfall r={rN} />
              {notesNew.length > 0 && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: `1px solid ${C.lb}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.lm, marginBottom: 6 }}>💡 Toelichting nieuw scenario</div>
                  {notesNew.map((n, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.lm, marginBottom: 3, paddingLeft: 10, borderLeft: `2px solid ${C.green}30` }}>{n}</div>
                  ))}
                </div>
              )}
            </Card>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Btn onClick={() => setTab("compare")} variant="amber" style={{ color: "#fff" }}>Vergelijken →</Btn>
            </div>
          </div>
        )}

        {tab === "compare" && (
          <div>
            <Card sx={{ background: diff >= 0 ? C.greenSoft : C.redSoft, borderColor: (diff >= 0 ? C.green : C.red) + "25", textAlign: "center", padding: "28px" }}>
              <div style={{ fontSize: 13, color: C.lm, marginBottom: 6 }}>Netto verschil per jaar</div>
              <div style={{ fontSize: mob ? 30 : 42, fontWeight: 900, fontFamily: M, color: diff >= 0 ? C.green : C.red, letterSpacing: "-1px" }}>{diff >= 0 ? "+" : "-"}{fmt(diff)}</div>
              <div style={{ fontSize: 14, color: C.lm, marginTop: 4 }}>= {diff >= 0 ? "+" : "-"}{fmt(diff / 12)} per maand</div>
            </Card>
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", gap: 6 }}>
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: C.primary }}>Huidig</div>
                <div style={{ textAlign: "center", fontSize: 10, color: C.lmSoft }}>Δ</div>
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: C.green }}>Nieuw</div>
                {compareRows.flatMap((r, i) => {
                  const d = r.b - r.a;
                  const ip = r.f ? d < 0 : d > 0;
                  const dc = Math.abs(d) < 0.5 ? C.lmSoft : ip ? C.green : C.red;
                  const isToesRow = r.l === "Toeslagen totaal";
                  return [
                    <div key={`a${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: `1px solid ${C.lb}` }}>
                      <span style={{ fontSize: 11, color: C.lm, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{r.l}</span>
                        {isToesRow && hasToeslagen && (
                          <button onClick={() => setShowToeslagDetails(!showToeslagDetails)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 800, color: C.primary, lineHeight: 1 }}>{showToeslagDetails ? "−" : "+"}</button>
                        )}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: M, color: C.lt }}>{r.p ? `${r.a.toFixed(1)}%` : `€${Math.round(r.a).toLocaleString("nl-NL")}`}</span>
                    </div>,
                    <div key={`d${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 11, fontWeight: 700, fontFamily: M, color: dc }}>{d >= 0 ? "+" : ""}{r.p ? `${d.toFixed(1)}%` : `€${Math.round(d).toLocaleString("nl-NL")}`}</span></div>,
                    <div key={`b${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: `1px solid ${C.lb}` }}><span style={{ fontSize: 11, color: C.lm }}>{r.l}</span><span style={{ fontSize: 13, fontWeight: 700, fontFamily: M, color: C.lt }}>{r.p ? `${r.b.toFixed(1)}%` : `€${Math.round(r.b).toLocaleString("nl-NL")}`}</span></div>,
                  ];
                })}
              </div>
            </Card>
            {showToeslagDetails && (rC.tT > 0 || rN.tT > 0) && (
              <Card sx={{ marginTop: 10, background: "#f8fafc" }}>
                <SectionTitle>🔍 Uitsplitsing toeslagen</SectionTitle>
                <div style={{ fontSize: 12, color: C.lm, marginBottom: 8 }}>Zie per regeling hoe de toeslagen veranderen.</div>
                {[
                  { l: "Zorgtoeslag", a: rC.zt, b: rN.zt },
                  { l: "Huurtoeslag", a: rC.ht, b: rN.ht },
                  { l: "Kindgebonden budget", a: rC.kg, b: rN.kg },
                  { l: "Kinderopvangtoeslag", a: rC.ko, b: rN.ko },
                  { l: "Kinderbijslag", a: rC.kb, b: rN.kb },
                ]
                  .filter((r) => r.a !== 0 || r.b !== 0)
                  .map((r, i) => {
                    const d = r.b - r.a;
                    const dc = Math.abs(d) < 0.5 ? C.lmSoft : d > 0 ? C.green : C.red;
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: i === 0 ? "none" : `1px dashed ${C.lb}` }}>
                        <span style={{ fontSize: 12, color: C.lm }}>{r.l}</span>
                        <span style={{ fontSize: 12, fontFamily: M, color: C.lm }}>€{Math.round(r.a).toLocaleString("nl-NL")} → €{Math.round(r.b).toLocaleString("nl-NL")}</span>
                        <span style={{ fontSize: 12, fontFamily: M, color: dc }}>{d >= 0 ? "+" : ""}€{Math.round(d).toLocaleString("nl-NL")}</span>
                      </div>
                    );
                  })}
              </Card>
            )}
            <Card>
              <SectionTitle>📈 Marginaal tarief — Nieuw scenario</SectionTitle>
              {nw.employment > 0 ? <MTRChart p={nw} ci={nw.employment || 1000} /> : <div style={{ fontSize: 13, color: C.lm, lineHeight: 1.6 }}>Marginaal tarief is alleen berekend op basis van loondienst inkomen. Vul een loondienst bedrag in om de grafiek te zien.</div>}
            </Card>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Btn onClick={() => setTab("decide")} style={{ background: `linear-gradient(135deg,${C.purple},${C.primary})`, color: "#fff" }}>Resultaat bekijken →</Btn>
            </div>
          </div>
        )}

        {tab === "decide" && (
          <div>
            <Card sx={{ background: `radial-gradient(circle at top left,${C.primarySoft},${C.purpleSoft})`, borderColor: C.purple + "25", padding: mob ? "22px 18px" : "26px 26px" }}>
              <div style={{ display: "flex", flexDirection: mob ? "column" : "row", gap: mob ? 14 : 20, alignItems: mob ? "stretch" : "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.6)", border: `1px solid ${C.primary}20` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: 1, textTransform: "uppercase" }}>Resultaat</span>
                    <span style={{ fontSize: 11, color: C.lm }}>Nieuw scenario vs. huidig</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.lm, marginBottom: 6 }}>Maandelijks verschil in netto besteedbaar inkomen</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: mob ? 32 : 46, fontWeight: 900, fontFamily: M, letterSpacing: "-2px", color: diff >= 0 ? C.green : C.red }}>{diff >= 0 ? "+" : "-"}€{Math.round(Math.abs(diff / 12)).toLocaleString("nl-NL")}</span>
                    <span style={{ fontSize: 13, color: C.lm }}>per maand</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.lm, marginTop: 4 }}>{diff >= 0 ? "Je houdt naar schatting elke maand meer over." : "Je houdt naar schatting elke maand minder over."}</div>
                </div>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, minWidth: mob ? 0 : 190 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 110, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${C.lb}` }}>
                      <div style={{ fontSize: 11, color: C.lm, marginBottom: 2 }}>Netto/jaar verschil</div>
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: M, color: diff >= 0 ? C.green : C.red }}>{diff >= 0 ? "+" : "-"}€{Math.round(Math.abs(diff)).toLocaleString("nl-NL")}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 110, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${C.lb}` }}>
                      <div style={{ fontSize: 11, color: C.lm, marginBottom: 2 }}>Effectief tarief</div>
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: M, color: C.amber }}>{(rN.eR * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.lm, marginTop: 2 }}>Tip: kijk ook naar de details bij <span style={{ fontWeight: 600, color: C.primary }}>Vergelijking</span> voor toeslagen en belastingen.</div>
                </div>
              </div>
            </Card>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <PDFDownloadLink
                document={<ResultsReportPDF data={pdfData} />}
                fileName="NettoSim-resultaten.pdf"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: F, transition: "all 0.18s", lineHeight: 1.4, background: "transparent", color: C.lt, border: `2px solid ${C.lb}`, textDecoration: "none" }}
              >
                {({ loading }) => (loading ? "PDF maken..." : "📄 Download PDF")}
              </PDFDownloadLink>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <Card sx={{ background: C.greenSoft, borderColor: C.green + "20" }}>
                <SectionTitle>✅ Voordelen</SectionTitle>
                {ai.voordelen.length === 0 ? <div style={{ fontSize: 13, color: C.lm }}>Geen significante voordelen gevonden</div> : ai.voordelen.map((p, i) => <div key={i} style={{ fontSize: 13, color: C.lt, marginBottom: 8, paddingLeft: 10, borderLeft: `3px solid ${C.green}40`, lineHeight: 1.5 }}>{p}</div>)}
              </Card>
              <Card sx={{ background: C.redSoft, borderColor: C.red + "20" }}>
                <SectionTitle>⚠️ Nadelen & risico's</SectionTitle>
                {ai.nadelen.length === 0 ? <div style={{ fontSize: 13, color: C.lm }}>Geen significante nadelen gevonden</div> : ai.nadelen.map((c, i) => <div key={i} style={{ fontSize: 13, color: C.lt, marginBottom: 8, paddingLeft: 10, borderLeft: `3px solid ${C.red}40`, lineHeight: 1.5 }}>{c}</div>)}
              </Card>
            </div>

            <Card sx={{ background: C.amberSoft, borderColor: C.amber + "20" }}>
              <SectionTitle>💡 Inzichten</SectionTitle>
              <div style={{ fontSize: 13, color: C.lt, lineHeight: 1.7 }}>{ai.inzichten.map((ins, i) => <p key={i} style={{ margin: "0 0 8px" }}>{ins}</p>)}</div>
            </Card>

            {ai.needsAdvisor && (
              <Card sx={{ background: `linear-gradient(135deg,${C.primarySoft},#f0f7ff)`, borderColor: C.primary + "25" }}>
                <SectionTitle>🤝 Professioneel advies aanbevolen</SectionTitle>
                <p style={{ fontSize: 13, color: C.lm, margin: "0 0 16px", lineHeight: 1.6 }}>{ai.advisorReason}</p>
                {advisors.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 10 }}>Specialisten in {nw.provincie || "uw regio"}:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {advisors.map((a, i) => {
                        const isOpen = featuredAdvisor && featuredAdvisor.name === a.name;
                        return (
                          <div key={i} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.lb}`, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{a.emoji}</div>
                              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: C.lt }}>{a.name}</div><div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>{a.type}</div></div>
                              <Btn onClick={() => { setFeaturedAdvisor(isOpen ? null : a); setAdvSent(false); setAdvSubmitting(false); setAdvError(""); setAdvFormName(""); setAdvFormEmail(""); setAdvFormMsg(""); }} style={{ padding: "6px 14px", fontSize: 11, borderRadius: 8 }}>{isOpen ? "Sluiten" : "Contact"}</Btn>
                            </div>
                            {isOpen && (
                              <div style={{ padding: "16px 18px", borderTop: `1px solid ${C.lb}`, background: "#fafbfc" }}>
                                <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
                                  <div style={{ width: 56, height: 56, borderRadius: 16, background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{a.emoji}</div>
                                  <div>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: C.lt }}>{a.name}</div>
                                    <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>{a.type}</div>
                                    <div style={{ fontSize: 11, color: C.lm, marginTop: 2 }}>Direct bericht sturen naar deze specialist.</div>
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>{a.url && <Btn onClick={() => window.open(a.url, "_blank")} variant="soft" style={{ padding: "8px 12px", fontSize: 12 }}>Bezoek website</Btn>}</div>
                                {advSent ? <div style={{ padding: "12px 0", textAlign: "center", fontSize: 13, color: C.green, fontWeight: 600 }}>Bericht verzonden. De specialist neemt zo snel mogelijk contact op.</div> : (
                                  <>
                                    <div style={{ display: "grid", gap: 8 }}>
                                      <div><div style={{ fontSize: 11, fontWeight: 600, color: C.lm, marginBottom: 3 }}>Naam</div><input value={advFormName} onChange={(e) => setAdvFormName(e.target.value)} placeholder="Je naam" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.lb}`, fontSize: 13, outline: "none" }} onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.lb)} /></div>
                                      <div><div style={{ fontSize: 11, fontWeight: 600, color: C.lm, marginBottom: 3 }}>E-mail</div><input value={advFormEmail} onChange={(e) => setAdvFormEmail(e.target.value)} placeholder="naam@voorbeeld.nl" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.lb}`, fontSize: 13, outline: "none" }} onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.lb)} /></div>
                                      <div><div style={{ fontSize: 11, fontWeight: 600, color: C.lm, marginBottom: 3 }}>Bericht</div><textarea value={advFormMsg} onChange={(e) => setAdvFormMsg(e.target.value)} rows={3} placeholder={`Vertel kort je situatie voor ${a.name}...`} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.lb}`, fontSize: 13, outline: "none", resize: "vertical" }} onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.lb)} /></div>
                                    </div>
                                    {advError && <div style={{ marginTop: 8, fontSize: 12, color: C.red }}>{advError}</div>}
                                    <div style={{ marginTop: 10, textAlign: "right" }}>
                                      <Btn onClick={() => submitAdvisorLead(a)} disabled={advSubmitting} style={{ padding: "8px 18px", fontSize: 13 }}>
                                        {advSubmitting ? "Verzenden..." : "Verstuur bericht"}
                                      </Btn>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {advisors.length === 0 && <div style={{ fontSize: 13, color: C.lm }}>Geen specifieke partners gevonden in {nw.provincie}. <span style={{ color: C.primary, cursor: "pointer", textDecoration: "underline" }} onClick={() => setPage("partners")}>Bekijk alle partners →</span></div>}
              </Card>
            )}

            <InsightsPanel cards={insightCards} userKey="anon" C={C} onNavigate={(r) => setPage(r)} />

            <Card sx={{ background: "#fffbeb", borderColor: "#fbbf2420" }}>
              <div style={{ fontSize: 12, color: C.lm, lineHeight: 1.7 }}><strong style={{ color: C.amber }}>⚠ Disclaimer:</strong> Vereenvoudigd rekenmodel voor educatieve doeleinden. Gebruik toeslagen.nl/proefberekening voor exacte bedragen. Raadpleeg een belastingadviseur. Geen rechten aan te ontlenen. Bron: Belastingdienst 2025.</div>
            </Card>
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: C.lm, marginBottom: 8 }}>Hoe tevreden was je met deze tool of heb je nog opmerkingen?</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                <Btn onClick={() => { setShowFeedbackModal(true); setFeedbackStars(0); setFeedbackText(""); setFeedbackSent(false); }} variant="soft" style={{ fontSize: 13, padding: "8px 18px" }}>Deel feedback</Btn>
                <Btn onClick={() => setPage("home")} variant="outline" style={{ fontSize: 13, padding: "8px 18px" }}>Terug naar home</Btn>
              </div>
            </div>

            {showFeedbackModal && (
              <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setShowFeedbackModal(false)}>
                <div style={{ background: C.lc, borderRadius: 20, border: `1px solid ${C.lb}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxWidth: 400, width: "100%", padding: "24px 26px", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setShowFeedbackModal(false)} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 8, border: "none", background: C.lb, color: C.lm, fontSize: 18, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }} aria-label="Sluiten">×</button>
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: C.lt, fontFamily: F }}>Deel je feedback</h3>
                  <p style={{ margin: "0 0 18px", fontSize: 13, color: C.lm }}>Hoe tevreden ben je met NettoSim?</p>
                  {!feedbackSent ? (
                    <>
                      <div style={{ display: "flex", gap: 6, marginBottom: 20 }} onMouseLeave={() => setFeedbackHover(0)}>
                        {[1, 2, 3, 4, 5].map((i) => {
                          const active = i <= (feedbackHover || feedbackStars);
                          return <button key={i} type="button" onClick={() => setFeedbackStars(i)} onMouseEnter={() => setFeedbackHover(i)} style={{ border: "none", background: "none", padding: 4, cursor: "pointer", fontSize: 28, lineHeight: 1, color: active ? C.amber : C.lb, transition: "color 0.15s" }} aria-label={`${i} sterren`}>{active ? "★" : "☆"}</button>;
                        })}
                      </div>
                      <div style={{ marginBottom: 18 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 6 }}>Wat wil je kwijt? (optioneel)</label>
                        <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Tip, opmerking of verbeteridee..." rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.lb}`, fontSize: 13, fontFamily: F, outline: "none", resize: "vertical", boxSizing: "border-box" }} onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.lb)} />
                      </div>
                      <Btn onClick={() => setFeedbackSent(true)} style={{ width: "100%", padding: "12px 20px" }}>Verstuur</Btn>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>Bedankt voor je feedback!</div>
                      <div style={{ fontSize: 13, color: C.lm, marginTop: 4 }}>We nemen je input mee.</div>
                      <Btn onClick={() => setShowFeedbackModal(false)} variant="outline" style={{ marginTop: 16 }}>Sluiten</Btn>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
