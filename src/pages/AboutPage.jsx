import { C, F, M } from "../constants/theme.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import Nav from "../components/Nav.jsx";
import Btn from "../components/ui/Btn.jsx";

const TEAM = [
  { name: "Lars de Vries", role: "Oprichter", bio: "Voormalig belastingadviseur.", av: "👨‍💼" },
  { name: "Sophie Bakker", role: "Lead Dev", bio: "Full-stack & data-viz.", av: "👩‍💻" },
  { name: "Thomas Jansen", role: "Fiscalist", bio: "Registerbelastingadviseur.", av: "👨‍⚖️" },
  { name: "Emma Visser", role: "UX Design", bio: "Voorheen bij ING.", av: "👩‍🎨" },
];
const STATS = [
  { n: "80%", d: "begrijpt aanslag niet volledig" },
  { n: "€2.400", d: "misgelopen toeslagen per huishouden" },
  { n: "14", d: "regelingen in één overzicht" },
];

export default function AboutPage({ setPage, goContact, user }) {
  const w = useWindowWidth();
  const mob = w < 768;
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      <Nav page="about" setPage={setPage} goContact={goContact} user={user} />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: mob ? "90px 20px 60px" : "120px 24px 80px" }}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>Over ons</div>
          <h1 style={{ fontSize: mob ? 28 : 40, fontWeight: 900, color: C.lt, margin: "0 0 14px" }}>Wij maken belasting <span style={{ color: C.primary }}>begrijpelijk</span></h1>
          <p style={{ fontSize: 16, color: C.lm, lineHeight: 1.8, margin: 0 }}>NettoSim is gebouwd vanuit de overtuiging dat iedereen recht heeft op helder financieel inzicht — zonder jargon, zonder kosten.</p>
        </div>
        <div style={{ background: C.lc, borderRadius: 16, border: `1px solid ${C.lb}`, padding: mob ? "22px" : "28px 32px", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.lt, margin: "0 0 14px" }}>🎯 Missie & Visie</h2>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.primary, margin: "0 0 6px" }}>Onze missie</h3>
              <p style={{ fontSize: 14, color: C.lm, lineHeight: 1.7, margin: 0 }}>Het Nederlandse belastingstelsel transparant en toegankelijk maken voor elke Nederlander.</p>
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.primary, margin: "0 0 6px" }}>Onze visie</h3>
              <p style={{ fontSize: 14, color: C.lm, lineHeight: 1.7, margin: 0 }}>Een wereld waarin financiële beslissingen niet worden gehinderd door complexiteit.</p>
            </div>
          </div>
        </div>
        <div style={{ background: C.lc, borderRadius: 16, border: `1px solid ${C.lb}`, padding: mob ? "22px" : "28px 32px", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.lt, margin: "0 0 14px" }}>💡 Waarom wij dit bouwen</h2>
          <p style={{ fontSize: 14, color: C.lm, lineHeight: 1.8, margin: "0 0 16px" }}>Het Nederlandse belastingstelsel telt meer dan 14 regelingen die op complexe manieren interacteren. De toeslagenval en verborgen afbouwpercentages maken het onmogelijk om impact te overzien zonder hulpmiddelen.</p>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: 14, background: C.bg, borderRadius: 12 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.primary, fontFamily: M }}>{s.n}</div>
                <div style={{ fontSize: 11, color: C.lm, marginTop: 4 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.lt, margin: "0 0 20px" }}>👥 Ons team</h2>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 14 }}>
            {TEAM.map((t, i) => (
              <div key={i} style={{ background: C.lc, borderRadius: 14, border: `1px solid ${C.lb}`, padding: "20px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{t.av}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.lt }}>{t.name}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.primary, marginBottom: 4 }}>{t.role}</div>
                <div style={{ fontSize: 11, color: C.lm }}>{t.bio}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Btn onClick={() => setPage("app")}>Naar de Simulator →</Btn>
        </div>
      </div>
    </div>
  );
}
