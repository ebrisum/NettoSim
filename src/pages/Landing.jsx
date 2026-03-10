import { useRef } from "react";
import { C, F } from "../constants/theme.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import Nav from "../components/Nav.jsx";
import Btn from "../components/ui/Btn.jsx";
import NewsCarousel from "../components/NewsCarousel.jsx";

export default function Landing({ setPage, goContact, user }) {
  const howRef = useRef(null);
  const w = useWindowWidth();
  const mob = w < 768;
  return (
    <div style={{ fontFamily: F, background: C.bg, minHeight: "100vh" }}>
      <Nav page="home" setPage={setPage} goContact={goContact} user={user} />
      <section style={{ paddingTop: mob ? 100 : 130, paddingBottom: mob ? 32 : 48, textAlign: "center", background: `linear-gradient(180deg,#f0f7ff 0%,${C.bg} 100%)`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `radial-gradient(${C.primary} 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 50, fontSize: 13, fontWeight: 600, color: C.primary, background: "#fff", border: `1px solid ${C.primary}20`, marginBottom: 24 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: C.primary, display: "inline-block" }} /> Update: Belastingregels 2025
          </div>
          <h1 style={{ fontSize: mob ? 32 : 54, fontWeight: 900, color: C.lt, lineHeight: 1.08, margin: "0 0 20px", letterSpacing: "-1.5px" }}>
            Maak complexe cijfers <span style={{ color: C.primary, fontStyle: "italic" }}>begrijpelijk</span>.
          </h1>
          <p style={{ fontSize: mob ? 15 : 18, color: C.lm, lineHeight: 1.65, margin: "0 auto 32px", maxWidth: 540 }}>
            De meest complete simulator voor het berekenen van uw netto salaris, sociale lasten en toeslagen volgens de laatste Nederlandse wetgeving.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn onClick={() => setPage("app")}>Start Simulator</Btn>
            <Btn onClick={() => howRef.current?.scrollIntoView({ behavior: "smooth" })} variant="outline">Hoe het werkt</Btn>
          </div>
        </div>
      </section>
      <NewsCarousel />
      <section style={{ padding: mob ? "32px 20px" : "48px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: mob ? 20 : 32 }}>
          <h2 style={{ fontSize: mob ? 22 : 28, fontWeight: 800, color: C.lt, margin: 0 }}>Welke levenskeuze onderzoek je?</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr", gap: mob ? 10 : 14 }}>
          {[
            { e: "💼", t: "Salarisverhoging", d: "Hoeveel netto van meer bruto?" },
            { e: "🧑‍💻", t: "ZZP naast baan", d: "Loondienst + eigen klanten." },
            { e: "🏡", t: "Huis kopen", d: "Van huur naar koop, fiscaal." },
            { e: "👶", t: "Gezinsuitbreiding", d: "Budget, bijslag, opvangtoeslag." },
            { e: "👫", t: "Samenwonen", d: "Fiscaal partnerschap." },
            { e: "🚀", t: "Volledig ZZP", d: "Loondienst opzeggen." },
          ].map((c, i) => (
            <div
              key={i}
              onClick={() => setPage("app")}
              style={{ background: C.lc, borderRadius: 14, padding: mob ? "16px" : "20px", border: `1.5px solid ${C.lb}`, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.primary + "50";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.lb;
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: mob ? 24 : 28, marginBottom: 8 }}>{c.e}</div>
              <h4 style={{ fontSize: mob ? 13 : 15, fontWeight: 700, color: C.lt, margin: "0 0 4px" }}>{c.t}</h4>
              <p style={{ fontSize: mob ? 11 : 13, color: C.lm, lineHeight: 1.5, margin: 0 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding: "28px 20px", textAlign: "center", borderTop: `1px solid ${C.lb}`, borderBottom: `1px solid ${C.lb}` }}>
        <div style={{ display: "flex", justifyContent: "center", gap: mob ? 16 : 40, flexWrap: "wrap", opacity: 0.45 }}>
          {["Belastingdienst", "Dienst Toeslagen", "SVB", "Rijksoverheid"].map((s, i) => (
            <span key={i} style={{ fontSize: mob ? 12 : 14, fontWeight: 700, color: C.lt }}>{s}</span>
          ))}
        </div>
      </section>
      <section ref={howRef} style={{ padding: mob ? "48px 20px" : "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: mob ? 28 : 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>Hoe het werkt</div>
          <h2 style={{ fontSize: mob ? 24 : 34, fontWeight: 900, color: C.lt, margin: 0 }}>In drie stappen naar inzicht</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: mob ? 14 : 20 }}>
          {[
            { s: "01", ic: "📋", t: "Huidige situatie", d: "Vul uw inkomen en omstandigheden in. Alle 14 regelingen worden berekend." },
            { s: "02", ic: "🔄", t: "Nieuw scenario", d: "Simuleer een verandering. Zie direct het effect op netto en toeslagen." },
            { s: "03", ic: "📊", t: "Vergelijk & beslis", d: "Vergelijking met AI-analyse, voor- en nadelen, en advies op maat." },
          ].map((s, i) => (
            <div key={i} style={{ background: C.lc, borderRadius: 16, padding: mob ? "22px 18px" : "28px 24px", border: `1px solid ${C.lb}`, position: "relative" }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: C.primary + "10", fontFamily: "inherit", position: "absolute", top: 14, right: 16 }}>{s.s}</div>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{s.ic}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: C.lt, margin: "0 0 6px" }}>{s.t}</h3>
              <p style={{ fontSize: 13, color: C.lm, lineHeight: 1.6, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding: mob ? "48px 20px" : "64px 24px", background: `linear-gradient(135deg,${C.dark},#0f1f3a)`, textAlign: "center" }}>
        <h2 style={{ fontSize: mob ? 22 : 30, fontWeight: 900, color: "#fff", margin: "0 0 12px" }}>Klaar om te rekenen?</h2>
        <p style={{ fontSize: 15, color: C.muted, margin: "0 0 28px" }}>Gratis, geen registratie. Uw gegevens worden niet opgeslagen.</p>
        <Btn onClick={() => setPage("app")} style={{ fontSize: 16, padding: "14px 36px" }}>Start Simulator →</Btn>
      </section>
      <footer style={{ padding: "28px 20px", borderTop: `1px solid ${C.lb}`, background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>€</div>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.lt }}>
              Netto<span style={{ color: C.primary }}>Sim</span>
            </span>
          </div>
          <div style={{ fontSize: 11, color: C.lmSoft }}>Vereenvoudigd rekenmodel. Geen rechten aan te ontlenen. Bron: Belastingdienst 2025.</div>
        </div>
      </footer>
    </div>
  );
}
