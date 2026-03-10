import { C } from "../../constants/theme.js";
import Tip from "./Tip.jsx";

export default function Tg({ label, checked, onChange, info }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        gap: 12,
        cursor: "pointer",
        marginBottom: 10,
        alignItems: "center",
        padding: "10px 14px",
        borderRadius: 10,
        background: checked ? C.primarySoft : "#f8f9fb",
        border: `1.5px solid ${checked ? C.primary + "40" : "#e8eaee"}`,
        transition: "all 0.2s",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          flexShrink: 0,
          background: checked ? C.primary : "#cbd5e1",
          transition: "0.2s",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: "#fff",
            position: "absolute",
            top: 2,
            left: checked ? 20 : 2,
            transition: "0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: checked ? C.lt : C.lm }}>
        {label}
        {info && <Tip id={info} />}
      </span>
    </div>
  );
}
