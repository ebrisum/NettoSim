import { useState } from "react";
import { C, F } from "../constants/theme.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import Nav from "../components/Nav.jsx";
import Btn from "../components/ui/Btn.jsx";
import { saveUser } from "../lib/userStorage.js";
import { supabase } from "../../lib/supabase/client";

function mapUser(authUser) {
  return {
    id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Gebruiker",
    email: authUser.email || "",
    provider: "supabase",
    supabaseUserId: authUser.id,
  };
}

export default function LoginPage({ setPage, setUser }) {
  const w = useWindowWidth();
  const mob = w < 768;
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleGuest = () => {
    const u = { id: "guest-" + Date.now(), name: "Gast", provider: "guest" };
    setUser(u);
    saveUser(u);
    setPage("home");
  };

  const handleAuth = async () => {
    setError("");
    setMessage("");
    if (!email.trim() || !password.trim()) {
      setError("Vul e-mail en wachtwoord in.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { full_name: name.trim() || undefined },
          },
        });
        if (signUpError) throw signUpError;

        if (data?.user) {
          const mapped = mapUser(data.user);
          setUser(mapped);
          saveUser(mapped);
        }

        if (!data?.session) {
          setMessage("Account aangemaakt. Controleer je e-mail voor bevestiging.");
        } else {
          setPage("profile");
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (signInError) throw signInError;
        if (!data?.user) throw new Error("Inloggen mislukt.");

        const mapped = mapUser(data.user);
        setUser(mapped);
        saveUser(mapped);
        setPage("profile");
      }
    } catch (e) {
      setError(e?.message || "Inloggen mislukt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      <Nav page="login" setPage={setPage} goContact={() => setPage("contact")} user={null} />
      <div style={{ maxWidth: 460, margin: "0 auto", padding: mob ? "100px 20px 60px" : "120px 24px 80px" }}>
        <div style={{ background: C.lc, borderRadius: 20, border: `1px solid ${C.lb}`, padding: mob ? "28px 22px" : "36px 32px", boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}>
          <h1 style={{ fontSize: mob ? 24 : 28, fontWeight: 900, color: C.lt, margin: "0 0 8px", fontFamily: F }}>
            {mode === "login" ? "Inloggen" : "Account maken"}
          </h1>
          <p style={{ fontSize: 14, color: C.lm, marginBottom: 20, lineHeight: 1.6 }}>
            Log in om je scenario's, levensmomenten en profielgegevens veilig op te slaan.
          </p>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={() => setMode("login")} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${mode === "login" ? C.primary : C.lb}`, background: mode === "login" ? C.primarySoft : "#fff", color: mode === "login" ? C.primary : C.lm, fontWeight: 700, cursor: "pointer" }}>Inloggen</button>
            <button type="button" onClick={() => setMode("signup")} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${mode === "signup" ? C.primary : C.lb}`, background: mode === "signup" ? C.primarySoft : "#fff", color: mode === "signup" ? C.primary : C.lm, fontWeight: 700, cursor: "pointer" }}>Registreren</button>
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 4 }}>Naam</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Je naam" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.lb}`, fontSize: 14, boxSizing: "border-box" }} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 4 }}>E-mail</div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@voorbeeld.nl" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.lb}`, fontSize: 14, boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.lm, marginBottom: 4 }}>Wachtwoord</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.lb}`, fontSize: 14, boxSizing: "border-box" }} />
          </div>

          {error && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{error}</div>}
          {message && <div style={{ fontSize: 12, color: C.green, marginBottom: 10 }}>{message}</div>}

          <Btn onClick={handleAuth} disabled={loading} style={{ width: "100%", padding: "14px 20px", marginBottom: 12 }}>
            {loading ? "Bezig..." : mode === "login" ? "Inloggen" : "Account aanmaken"}
          </Btn>

          <Btn onClick={handleGuest} variant="outline" style={{ width: "100%", padding: "12px 20px" }}>
            Doorgaan zonder account
          </Btn>
        </div>
      </div>
    </div>
  );
}
