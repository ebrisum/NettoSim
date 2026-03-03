import React from "react";

function lsKey(userKey) {
  return `insights_done_${userKey || "anon"}`;
}

function loadDone(userKey) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(userKey)) || "{}");
  } catch {
    return {};
  }
}

function saveDone(userKey, obj) {
  try {
    localStorage.setItem(lsKey(userKey), JSON.stringify(obj));
  } catch {
    // ignore
  }
}

export default function InsightsPanel({
  cards = [],
  userKey = "anon",
  maxVisible = 5,
  onNavigate,
  C = { lt: "#111", lm: "#666", lb: "rgba(0,0,0,.08)", primary: "#2563eb", lc: "#fff" },
}) {
  const [showAll, setShowAll] = React.useState(false);
  const [doneMap, setDoneMap] = React.useState({});

  React.useEffect(() => {
    setDoneMap(loadDone(userKey));
  }, [userKey]);

  const toggleDone = (id) => {
    const next = { ...doneMap, [id]: !doneMap[id] };
    setDoneMap(next);
    saveDone(userKey, next);
  };

  const visible = showAll ? cards : cards.slice(0, maxVisible);

  const badgeStyle = (type) => {
    const base = {
      fontSize: 11,
      fontWeight: 800,
      padding: "4px 8px",
      borderRadius: 999,
      border: `1px solid ${C.lb}`,
    };
    if (type === "warning")
      return { ...base, color: "#b45309", background: "rgba(245,158,11,0.10)" };
    if (type === "benefit")
      return { ...base, color: "#047857", background: "rgba(16,185,129,0.10)" };
    if (type === "partner")
      return { ...base, color: C.primary, background: "rgba(37,99,235,0.10)" };
    return { ...base, color: C.lm, background: "rgba(0,0,0,0.03)" };
  };

  if (!cards.length) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 900,
            color: C.lt,
          }}
        >
          Inzichten & tips
        </h3>
        {cards.length > maxVisible && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: C.primary,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {showAll ? "Toon minder" : "Bekijk alle"}
          </button>
        )}
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {visible.map((c) => {
          const done = !!doneMap[c.id];
          return (
            <div
              key={c.id}
              style={{
                background: C.lc,
                border: `1px solid ${C.lb}`,
                borderRadius: 14,
                padding: 16,
                boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
                opacity: done ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={badgeStyle(c.type || "nudge")}>
                    {(c.type || "nudge").toUpperCase()}
                  </span>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      color: C.lt,
                    }}
                  >
                    {c.title}
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 12,
                    color: C.lm,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleDone(c.id)}
                  />
                  gedaan
                </label>
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: C.lm,
                }}
              >
                {c.body}
              </div>

              {c.ctaLabel && (c.ctaRoute || c.externalUrl) && (
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => {
                      if (c.externalUrl) {
                        window.open(c.externalUrl, "_blank", "noopener,noreferrer");
                      } else if (onNavigate && c.ctaRoute) {
                        onNavigate(c.ctaRoute);
                      } else if (c.ctaRoute) {
                        window.location.href = c.ctaRoute;
                      }
                    }}
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${C.lb}`,
                      background: "white",
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontWeight: 900,
                      color: C.lt,
                    }}
                  >
                    {c.ctaLabel} →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

