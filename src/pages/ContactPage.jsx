import { useEffect, useState } from "react";
import { C, F } from "../constants/theme.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import Nav from "../components/Nav.jsx";
import Btn from "../components/ui/Btn.jsx";
import { useSessionContext } from "../components/providers/SessionProvider";

const CONTACT_INFO = [
  { ic: "✉️", l: "E-mail", v: "info@nettosim.nl" },
  { ic: "📍", l: "Locatie", v: "Amsterdam, NL" },
  { ic: "⏰", l: "Reactietijd", v: "Binnen 24 uur" },
];

export default function ContactPage({
  setPage,
  goContact,
  initialSubject,
  initialPartnerSlug,
  user,
}) {
  const w = useWindowWidth();
  const mob = w < 768;
  const { sessionId, visitorId } = useSessionContext();
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState(initialSubject || "");
  const [message, setMessage] = useState("");
  const [subscribe, setSubscribe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const submitContact = async () => {
    setError("");
    const payload = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      source: initialPartnerSlug ? "partner_contact" : "contact_page",
      partnerSlug: initialPartnerSlug || undefined,
      sessionId: sessionId || undefined,
      visitorId: visitorId || undefined,
      subscribe,
      metadata: {
        channel: "website_contact",
      },
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      setError("Vul naam, e-mail, onderwerp en bericht in.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verzenden mislukt.");
      setSent(true);
      setMessage("");
    } catch (e) {
      setError(e.message || "Verzenden mislukt.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      <Nav page="contact" setPage={setPage} goContact={goContact} user={user} />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: mob ? "90px 20px 60px" : "120px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 36 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>Contact</div>
            <h1 style={{ fontSize: mob ? 28 : 34, fontWeight: 900, color: C.lt, margin: "0 0 14px" }}>Neem contact op</h1>
            <p style={{ fontSize: 14, color: C.lm, lineHeight: 1.7, margin: "0 0 24px" }}>Vraag, suggestie of samenwerking? We horen graag van je.</p>
            {CONTACT_INFO.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{c.ic}</div>
                <div>
                  <div style={{ fontSize: 11, color: C.lm, fontWeight: 600 }}>{c.l}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.lt }}>{c.v}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: C.lc, borderRadius: 16, border: `1px solid ${C.lb}`, padding: "24px" }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "36px 0" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.lt, margin: "0 0 6px" }}>Verzonden!</h3>
                <p style={{ fontSize: 13, color: C.lm }}>We nemen snel contact op.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: C.lt, margin: "0 0 18px" }}>Stuur een bericht</h3>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 3 }}>Naam</div>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Je volledige naam" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.lb}`, fontSize: 14, fontFamily: F, outline: "none", boxSizing: "border-box" }} onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.lb)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 3 }}>E-mail</div>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@voorbeeld.nl" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.lb}`, fontSize: 14, fontFamily: F, outline: "none", boxSizing: "border-box" }} onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.lb)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 3 }}>Onderwerp</div>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Waar gaat het over?" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.lb}`, fontSize: 14, fontFamily: F, outline: "none", boxSizing: "border-box" }} onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.lb)} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 3 }}>Bericht</div>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Typ je bericht..." rows={4} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.lb}`, fontSize: 14, fontFamily: F, outline: "none", resize: "vertical", boxSizing: "border-box" }} onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.lb)} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.lm, marginBottom: 12 }}>
                  <input type="checkbox" checked={subscribe} onChange={(e) => setSubscribe(e.target.checked)} />
                  Houd me op de hoogte via e-mail.
                </label>
                {error && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>{error}</div>}
                <Btn onClick={submitContact} style={{ width: "100%" }} disabled={submitting}>
                  {submitting ? "Verzenden..." : "Verstuur bericht"}
                </Btn>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
