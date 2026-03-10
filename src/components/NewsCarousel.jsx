import { C } from "../constants/theme.js";
import { NEWS_ITEMS } from "../constants/newsItems.js";

export default function NewsCarousel() {
  const duplicated = [...NEWS_ITEMS, ...NEWS_ITEMS];
  const cardMin = 280;
  return (
    <section style={{ width: "100%", padding: "18px 0 14px", borderBottom: `1px solid ${C.lb}`, background: "#ffffff", overflow: "hidden" }}>
      <style>{`@keyframes newsScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div style={{ width: "100%", paddingLeft: 20, paddingRight: 20, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: 1.5 }}>Nieuws & ontwikkelingen</span>
      </div>
      <div style={{ overflow: "hidden", width: "100%" }}>
        <div style={{ display: "flex", gap: 14, width: "max-content", animation: "newsScroll 32s linear infinite", willChange: "transform" }}>
          {duplicated.map((it, i) => (
            <div key={i} style={{ minWidth: cardMin, flexShrink: 0 }}>
              <div style={{ background: C.bg, borderRadius: 14, padding: "12px 14px", border: `1px solid ${C.lb}`, display: "flex", gap: 10, marginLeft: 7, marginRight: 7 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{it.img}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.lm, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.tag} · {it.source} · {it.date}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.lt, marginBottom: 2, lineHeight: 1.4 }}>{it.title}</div>
                  <div style={{ fontSize: 12, color: C.lm, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.body}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
