import { C } from "../../constants/theme.js";

export default function NC({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: C.lm, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {options.map((n) => (
          <div
            key={n}
            onClick={() => onChange(n)}
            style={{
              padding: "4px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
              userSelect: "none",
              background: value === n ? C.primary : C.lc,
              color: value === n ? "#fff" : C.lm,
              border: `1.5px solid ${value === n ? C.primary : C.lb}`,
            }}
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
