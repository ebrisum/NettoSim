import { useState } from "react";
import { C, F } from "../constants/theme.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import Nav from "../components/Nav.jsx";

const FAQS = [
  { q: "Hoe nauwkeurig is NettoSim?", a: "We gebruiken officiële tarieven 2025. Box 2/3 en bijzondere situaties zijn niet meegenomen." },
  { q: "Kan ik loondienst en ZZP combineren?", a: "Ja! Vul beide in. Gecombineerde belasting incl. aftrekposten wordt automatisch berekend." },
  { q: "Wat is het marginale tarief?", a: "Hoeveel belasting over de laatst verdiende euro. Kan oplopen tot 60-80% door afbouw kortingen/toeslagen." },
  { q: "Worden mijn gegevens opgeslagen?", a: "Nee. Alles draait lokaal in uw browser. Niets wordt verstuurd." },
  { q: "Wat is de toeslagenval?", a: "Meer verdienen → minder toeslagen. Het netto effect kan veel kleiner zijn dan verwacht." },
  { q: "Welke regelingen ontbreken?", a: "Box 2/3, WW/WIA, alimentatie, lijfrente, gemeentelijke toeslagen, vermogensgrenzen." },
];

export default function FaqPage({ setPage, goContact, user }) {
  const w = useWindowWidth();
  const mob = w < 768;
  const [open, setOpen] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      <Nav page="faq" setPage={setPage} goContact={goContact} user={user} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: mob ? "90px 20px 60px" : "120px 24px 80px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>Ondersteuning</div>
        <h1 style={{ fontSize: mob ? 28 : 40, fontWeight: 900, color: C.lt, margin: "0 0 28px" }}>Veelgestelde <span style={{ color: C.primary }}>vragen</span></h1>
        {FAQS.map((f, i) => (
          <div key={i} style={{ background: C.lc, borderRadius: 12, border: `1px solid ${C.lb}`, marginBottom: 8, overflow: "hidden" }}>
            <div onClick={() => setOpen(open === i ? null : i)} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.lt, flex: 1 }}>{f.q}</span>
              <span style={{ fontSize: 18, color: C.primary, flexShrink: 0, marginLeft: 12, transition: "transform 0.2s", transform: open === i ? "rotate(45deg)" : "rotate(0)" }}>+</span>
            </div>
            {open === i && <div style={{ padding: "0 18px 14px", fontSize: 14, color: C.lm, lineHeight: 1.7 }}>{f.a}</div>}
          </div>
        ))}
        <div style={{ marginTop: 28, padding: "18px 22px", background: C.dark, borderRadius: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Vraag niet beantwoord?</h3>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Mail naar <span style={{ color: C.primary }}>info@nettosim.nl</span> of gebruik ons <span style={{ color: C.primary, cursor: "pointer", textDecoration: "underline" }} onClick={() => setPage("contact")}>contactformulier</span></p>
        </div>
      </div>
    </div>
  );
}
