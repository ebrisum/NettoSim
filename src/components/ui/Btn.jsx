import { C, F } from "../../constants/theme.js";

export default function Btn({
  children,
  onClick,
  variant = "primary",
  style: sx = {},
  disabled = false,
}) {
  const b = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 28px",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: F,
    border: "none",
    transition: "all 0.18s",
    lineHeight: 1.4,
  };
  const v = {
    primary: { background: C.primary, color: "#fff", boxShadow: "0 2px 12px rgba(0,119,204,0.2)" },
    outline: { background: "transparent", color: C.lt, border: `2px solid ${C.lb}` },
    green: { background: C.green, color: "#fff" },
    amber: { background: C.amber, color: "#fff" },
    ghost: { background: "transparent", color: C.lm, padding: "8px 16px", fontSize: 13 },
    soft: { background: C.primarySoft, color: C.primary, border: `1px solid ${C.primary}20` },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        ...b,
        ...(v[variant] || v.primary),
        ...(disabled ? { opacity: 0.6 } : {}),
        ...sx,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.opacity = ".92";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.opacity = "1";
      }}
    >
      {children}
    </button>
  );
}
