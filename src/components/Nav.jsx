import { useState, useEffect } from "react";
import { C, F } from "../constants/theme.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import Btn from "./ui/Btn.jsx";

export default function Nav({ page, setPage, goContact, user, onLogout }) {
  const [sc, setSc] = useState(false);
  const [dd, setDd] = useState(false);
  const [mobMenu, setMobMenu] = useState(false);
  const w = useWindowWidth();
  const mob = w < 768;
  useEffect(() => {
    const h = () => setSc(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  useEffect(() => {
    if (!dd) return;
    const h = () => setDd(false);
    const t = setTimeout(() => document.addEventListener("click", h), 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", h);
    };
  }, [dd]);
  useEffect(() => {
    setMobMenu(false);
    setDd(false);
  }, [page]);
  const isA = (p) => page === p;
  const ddItems = [
    { l: "Over ons", p: "about" },
    { l: "Partners", p: "partners" },
  ];
  const isDdA = ddItems.some((d) => d.p === page);
  const ns = (a) => ({
    background: "none",
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    color: a ? C.primary : C.lm,
    cursor: "pointer",
    fontFamily: F,
    padding: "8px 12px",
    borderRadius: 8,
    transition: "color 0.15s",
    whiteSpace: "nowrap",
  });
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: sc || mobMenu ? "rgba(255,255,255,0.98)" : "transparent",
        backdropFilter: sc ? "blur(12px)" : "none",
        borderBottom: sc ? `1px solid ${C.lb}` : "1px solid transparent",
        boxShadow: sc ? "0 1px 12px rgba(0,0,0,0.06)" : "none",
        transition: "all 0.3s",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 60 }}>
        <div onClick={() => setPage("home")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>€</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.lt }}>
            Netto<span style={{ color: C.primary }}>Sim</span>
          </span>
        </div>
        {!mob && (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={() => setPage("home")} style={ns(isA("home"))}>Home</button>
            <button onClick={() => setPage("app")} style={ns(isA("app"))}>Berekenen</button>
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDd(!dd);
                }}
                style={{ ...ns(isDdA), display: "flex", alignItems: "center", gap: 4 }}
              >
                Platform <span style={{ fontSize: 10, transition: "transform 0.2s", display: "inline-block", transform: dd ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
              </button>
              {dd && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", borderRadius: 12, border: `1px solid ${C.lb}`, boxShadow: "0 8px 32px rgba(0,0,0,0.10)", padding: 6, minWidth: 180, zIndex: 1001 }}>
                  {ddItems.map((d, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setPage(d.p);
                        setDd(false);
                      }}
                      style={{ padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: isA(d.p) ? C.primary : C.lt, cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f7fa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {d.l}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setPage("faq")} style={ns(isA("faq"))}>FAQ</button>
            <button onClick={() => goContact()} style={ns(isA("contact"))}>Contact</button>
            {user ? (
              <button onClick={() => setPage("profile")} style={ns(isA("profile"))}>Profiel</button>
            ) : (
              <button onClick={() => setPage("login")} style={ns(isA("login"))}>Inloggen</button>
            )}
            <Btn onClick={() => setPage("app")} style={{ padding: "8px 20px", fontSize: 13, marginLeft: 8 }}>Direct Berekenen</Btn>
          </div>
        )}
        {mob && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Btn onClick={() => setPage("app")} style={{ padding: "6px 14px", fontSize: 12 }}>Bereken</Btn>
            <div onClick={() => setMobMenu(!mobMenu)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 18, height: 2, background: C.lt, borderRadius: 1 }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {mob && mobMenu && (
        <div style={{ background: "#fff", borderTop: `1px solid ${C.lb}`, padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { l: "Home", p: "home" },
            { l: "Berekenen", p: "app" },
            { l: "Over ons", p: "about" },
            { l: "Partners", p: "partners" },
            { l: "FAQ", p: "faq" },
          ].map((it, i) => (
            <div
              key={i}
              onClick={() => setPage(it.p)}
              style={{ padding: "12px 14px", borderRadius: 8, fontSize: 15, fontWeight: 600, color: isA(it.p) ? C.primary : C.lt, cursor: "pointer", background: isA(it.p) ? C.primarySoft : "transparent" }}
            >
              {it.l}
            </div>
          ))}
          {user ? (
            <div onClick={() => setPage("profile")} style={{ padding: "12px 14px", borderRadius: 8, fontSize: 15, fontWeight: 600, color: isA("profile") ? C.primary : C.lt, cursor: "pointer", background: isA("profile") ? C.primarySoft : "transparent" }}>Profiel</div>
          ) : (
            <div onClick={() => setPage("login")} style={{ padding: "12px 14px", borderRadius: 8, fontSize: 15, fontWeight: 600, color: isA("login") ? C.primary : C.lt, cursor: "pointer", background: isA("login") ? C.primarySoft : "transparent" }}>Inloggen</div>
          )}
          <div onClick={() => goContact()} style={{ padding: "12px 14px", borderRadius: 8, fontSize: 15, fontWeight: 600, color: isA("contact") ? C.primary : C.lt, cursor: "pointer", background: isA("contact") ? C.primarySoft : "transparent" }}>Contact</div>
        </div>
      )}
    </nav>
  );
}
