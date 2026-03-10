import { useEffect, useMemo, useState } from "react";
import { C, F } from "../constants/theme.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import Nav from "../components/Nav.jsx";
import Btn from "../components/ui/Btn.jsx";

function formatPartnerType(partner) {
  if (partner.partnerType) return partner.partnerType;
  if (partner.tier === "featured") return "Uitgelicht";
  return "Partner";
}

export default function PartnersPage({ setPage, goContact, user }) {
  const w = useWindowWidth();
  const mob = w < 768;
  const [region, setRegion] = useState("Alle");
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/v1/partners?limit=80")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Partners laden mislukt"))))
      .then((data) => {
        if (!mounted) return;
        setPartners(data.partners || []);
        setError("");
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || "Partners laden mislukt.");
        setPartners([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const regions = useMemo(() => {
    const set = new Set();
    for (const partner of partners) {
      const provinces = Array.isArray(partner.provinces) ? partner.provinces : [];
      if (provinces.length === 0) set.add("Landelijk");
      for (const p of provinces) set.add(p);
    }
    return ["Alle", ...Array.from(set).slice(0, 10)];
  }, [partners]);

  const filtered = useMemo(() => {
    if (region === "Alle") return partners;
    return partners.filter((partner) => {
      const provinces = Array.isArray(partner.provinces) ? partner.provinces : [];
      if (provinces.length === 0) return region === "Landelijk";
      return provinces.includes(region);
    });
  }, [partners, region]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      <Nav page="partners" setPage={setPage} goContact={goContact} user={user} />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: mob ? "90px 20px 60px" : "120px 24px 80px" }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>Netwerk</div>
          <h1 style={{ fontSize: mob ? 28 : 40, fontWeight: 900, color: C.lt, margin: "0 0 12px" }}>Vind een <span style={{ color: C.primary }}>specialist</span> bij jou in de buurt</h1>
          <p style={{ fontSize: 15, color: C.lm, lineHeight: 1.7, margin: "0 0 10px", maxWidth: 560 }}>Partners worden direct uit de admin-omgeving geladen en op de website getoond.</p>
          <div onClick={() => goContact("Partner worden bij NettoSim")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: C.primarySoft, border: `1px solid ${C.primary}30`, fontSize: 12, color: C.lt, cursor: "pointer" }}>
            <span style={{ fontWeight: 700, color: C.primary }}>Partner worden?</span>
            <span style={{ color: C.lm }}>Sluit je aan bij het NettoSim netwerk.</span>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 6 }}>Filter op regio</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {regions.map((r) => (
              <div key={r} onClick={() => setRegion(r)} style={{ padding: "5px 14px", borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: "pointer", background: region === r ? C.primary : C.lc, color: region === r ? "#fff" : C.lt, border: `1px solid ${region === r ? C.primary : C.lb}` }}>{r}</div>
            ))}
          </div>
        </div>

        {error && <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontSize: 13 }}>{error}</div>}

        {loading ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: C.lm }}>Partners laden...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 40 }}>
            {filtered.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", background: C.lc, borderRadius: 16, border: `1px solid ${C.lb}`, padding: "24px", color: C.lm, fontSize: 14 }}>
                Geen partners gevonden voor deze regio.
              </div>
            ) : (
              filtered.map((p) => {
                const primaryRegion =
                  Array.isArray(p.provinces) && p.provinces.length > 0
                    ? p.provinces[0]
                    : "Landelijk";
                return (
                  <div key={p.id} style={{ background: C.lc, borderRadius: 16, border: `1px solid ${C.lb}`, padding: "22px", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 11, background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: C.primary }}>{(p.name || "?").slice(0, 1).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.lt }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>{formatPartnerType(p)}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: C.lm, lineHeight: 1.5, margin: "0 0 12px", flex: 1 }}>{p.description || "Partner binnen het NettoSim netwerk."}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: C.lm, background: "#f5f7fa", padding: "3px 10px", borderRadius: 50 }}>📍 {primaryRegion}</span>
                      <Btn onClick={() => goContact(`Vraag over partner: ${p.name}`, { partnerSlug: p.slug })} style={{ padding: "6px 14px", fontSize: 11, borderRadius: 8 }}>Neem contact op</Btn>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div style={{ background: `linear-gradient(135deg,${C.dark},#0f1f3a)`, borderRadius: 20, padding: mob ? "28px 22px" : "44px 36px", textAlign: "center" }}>
          <h2 style={{ fontSize: mob ? 22 : 28, fontWeight: 900, color: "#fff", margin: "0 0 10px" }}>Word partner van NettoSim</h2>
          <p style={{ fontSize: 14, color: C.muted, margin: "0 auto 24px", maxWidth: 460 }}>Nieuwe partners worden direct opgeslagen in Supabase en direct zichtbaar op deze pagina.</p>
          <Btn onClick={() => goContact("Partner worden bij NettoSim")}>Word partner →</Btn>
        </div>
      </div>
    </div>
  );
}
