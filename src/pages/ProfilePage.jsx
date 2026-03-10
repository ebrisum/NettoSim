import { useEffect, useState } from "react";
import { C, F } from "../constants/theme.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import Nav from "../components/Nav.jsx";
import Btn from "../components/ui/Btn.jsx";
import {
  loadProfile,
  saveProfile,
  loadMoments,
  saveMoments,
  loadSavedScenario,
  saveUser,
} from "../lib/userStorage.js";
import { supabase } from "../../lib/supabase/client";
import { useSessionContext } from "../components/providers/SessionProvider";

async function getAuthHeaders(visitorId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    ...(visitorId ? { "x-visitor-id": visitorId } : {}),
  };
}

function normalizeRemoteMoment(event) {
  return {
    id: event.id,
    date: event.eventDate,
    title: event.title,
    description: event.description || "",
  };
}

export default function ProfilePage({ setPage, goContact, user, setUser }) {
  const w = useWindowWidth();
  const mob = w < 768;
  const { visitorId } = useSessionContext();
  const [displayName, setDisplayName] = useState("");
  const [moments, setMoments] = useState([]);
  const [savedScenario, setSavedScenario] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isSupabaseUser =
    user?.provider === "supabase" || !!user?.supabaseUserId;

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!user) return;
      setLoading(true);
      setError("");

      if (!isSupabaseUser) {
        const p = loadProfile(user.id);
        if (!mounted) return;
        setDisplayName(p.displayName || "");
        setMoments(loadMoments(user.id));
        setSavedScenario(loadSavedScenario(user.id));
        setLoading(false);
        return;
      }

      try {
        const headers = await getAuthHeaders(visitorId);
        if (!headers) throw new Error("Geen actieve sessie. Log opnieuw in.");
        const [profileRes, eventsRes, scenariosRes] = await Promise.all([
          fetch("/api/v1/user/profile", { headers }),
          fetch("/api/v1/user/events?limit=100", { headers }),
          fetch("/api/v1/user/scenarios?limit=1", { headers }),
        ]);

        const profileData = await profileRes.json();
        const eventsData = await eventsRes.json();
        const scenariosData = await scenariosRes.json();

        if (!profileRes.ok) throw new Error(profileData.error || "Profiel laden mislukt.");

        if (!mounted) return;

        setDisplayName(profileData.profile?.displayName || "");
        setMoments(
          Array.isArray(eventsData.events)
            ? eventsData.events.map(normalizeRemoteMoment)
            : []
        );

        const firstScenario = Array.isArray(scenariosData.scenarios)
          ? scenariosData.scenarios[0]
          : null;
        setSavedScenario(
          firstScenario
            ? { cur: firstScenario.current, nw: firstScenario.proposed }
            : null
        );
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Profiel laden mislukt.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [user?.id, isSupabaseUser, visitorId]);

  const saveDisplayName = async () => {
    if (!user) return;
    if (!isSupabaseUser) {
      saveProfile(user.id, { ...loadProfile(user.id), displayName: displayName.trim() });
      return;
    }
    try {
      const headers = await getAuthHeaders(visitorId);
      if (!headers) return;
      const res = await fetch("/api/v1/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Opslaan mislukt.");
      }
    } catch (e) {
      setError(e.message || "Opslaan mislukt.");
    }
  };

  const addMoment = async () => {
    if (!newTitle.trim()) return;
    if (!user) return;

    const optimistic = {
      id: "tmp-" + Date.now(),
      date: newDate || new Date().toISOString().slice(0, 10),
      title: newTitle.trim(),
      description: newDesc.trim(),
    };

    if (!isSupabaseUser) {
      const next = [optimistic, ...moments];
      setMoments(next);
      saveMoments(user.id, next);
      setNewDate("");
      setNewTitle("");
      setNewDesc("");
      return;
    }

    try {
      const headers = await getAuthHeaders(visitorId);
      if (!headers) throw new Error("Geen sessie beschikbaar.");
      const res = await fetch("/api/v1/user/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          title: optimistic.title,
          description: optimistic.description || undefined,
          eventDate: optimistic.date,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Toevoegen mislukt.");
      setMoments((prev) => [normalizeRemoteMoment(data.event), ...prev]);
      setNewDate("");
      setNewTitle("");
      setNewDesc("");
    } catch (e) {
      setError(e.message || "Moment toevoegen mislukt.");
    }
  };

  const removeMoment = async (id) => {
    if (!user) return;
    if (!isSupabaseUser) {
      const next = moments.filter((x) => x.id !== id);
      setMoments(next);
      saveMoments(user.id, next);
      return;
    }
    try {
      const headers = await getAuthHeaders(visitorId);
      if (!headers) throw new Error("Geen sessie beschikbaar.");
      const res = await fetch(`/api/v1/user/events/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt.");
      setMoments((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message || "Moment verwijderen mislukt.");
    }
  };

  const logout = async () => {
    if (isSupabaseUser) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    saveUser(null);
    setPage("home");
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      <Nav page="profile" setPage={setPage} goContact={goContact} user={user} onLogout={logout} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: mob ? "90px 20px 60px" : "100px 24px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: mob ? 26 : 32, fontWeight: 900, color: C.lt, margin: "0 0 8px" }}>Mijn profiel</h1>
          <p style={{ fontSize: 14, color: C.lm }}>
            {isSupabaseUser
              ? "Je gegevens worden opgeslagen in je account."
              : "Je gegevens worden lokaal op je apparaat opgeslagen."}
          </p>
        </div>

        {loading && (
          <div style={{ marginBottom: 16, color: C.lm, fontSize: 13 }}>Laden...</div>
        )}
        {error && (
          <div style={{ marginBottom: 16, color: C.red, fontSize: 13 }}>{error}</div>
        )}

        <div style={{ background: C.lc, borderRadius: 16, border: `1px solid ${C.lb}`, padding: "24px", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.lt, margin: "0 0 14px" }}>Mijn gegevens</h2>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.lm, display: "block", marginBottom: 4 }}>Weergavenaam (optioneel)</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} onBlur={saveDisplayName} placeholder="Bijv. Jan" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.lb}`, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={{ background: C.lc, borderRadius: 16, border: `1px solid ${C.lb}`, padding: "24px", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.lt, margin: "0 0 14px" }}>Levensmomenten</h2>
          <p style={{ fontSize: 13, color: C.lm, marginBottom: 16 }}>Noteer momenten waarop er iets veranderde (nieuwe baan, verhuizing, etc.).</p>
          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.lb}`, fontSize: 13, outline: "none" }} />
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titel (bijv. Salarisverhoging)" style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.lb}`, fontSize: 13, outline: "none" }} />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Korte omschrijving (optioneel)" style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.lb}`, fontSize: 13, outline: "none" }} />
            <Btn onClick={addMoment} variant="soft" style={{ alignSelf: "start" }}>Moment toevoegen</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {moments.length === 0 ? (
              <p style={{ fontSize: 13, color: C.lm }}>Nog geen momenten. Voeg er een toe.</p>
            ) : (
              moments.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: C.bg, borderRadius: 10, border: `1px solid ${C.lb}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.lt }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: C.lm }}>{m.date}{m.description ? " · " + m.description : ""}</div>
                  </div>
                  <button onClick={() => removeMoment(m.id)} style={{ border: "none", background: "none", color: C.lm, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Verwijderen</button>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ background: C.lc, borderRadius: 16, border: `1px solid ${C.lb}`, padding: "24px", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.lt, margin: "0 0 14px" }}>Opgeslagen situatie</h2>
          {savedScenario ? <p style={{ fontSize: 13, color: C.lm, marginBottom: 12 }}>Je hebt een situatie opgeslagen vanuit de simulator.</p> : <p style={{ fontSize: 13, color: C.lm, marginBottom: 12 }}>Geen opgeslagen situatie. Ga naar Berekenen en sla je situatie op.</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => setPage("app")} variant="soft">Naar Berekenen</Btn>
            {savedScenario && <Btn onClick={() => setPage("app")}>Open in simulator</Btn>}
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <Btn onClick={logout} variant="outline">Uitloggen</Btn>
        </div>
      </div>
    </div>
  );
}
