import { C, M } from "../../constants/theme.js";
import Tip from "./Tip.jsx";

export default function Sl({ label, value, onChange, min = 0, max = 150000, step = 500, pre = "€", suf = "", info }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.lm }}>
          {label}
          {info && <Tip id={info} />}
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: M,
            color: C.lt,
            background: C.primarySoft,
            padding: "2px 10px",
            borderRadius: 6,
          }}
        >
          {pre}
          {typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value.toLocaleString("nl-NL")}
          {suf}
        </span>
      </div>
      <div style={{ position: "relative", height: 6, background: C.lb, borderRadius: 3 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg,${C.primary},${C.primary}cc)`,
            borderRadius: 3,
            transition: "width 0.1s",
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{
          width: "100%",
          height: 24,
          marginTop: -15,
          opacity: 0,
          cursor: "pointer",
          position: "relative",
          zIndex: 2,
        }}
      />
    </div>
  );
}
