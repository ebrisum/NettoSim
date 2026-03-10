import { C, M } from "../../constants/theme.js";

export default function SC({ label, value, color = C.primary, soft }) {
  return (
    <div
      style={{
        background: soft || color + "0a",
        borderRadius: 14,
        padding: "16px 18px",
        border: `1px solid ${color}15`,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, color: C.lm, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: M, letterSpacing: "-.5px" }}>{value}</div>
    </div>
  );
}
