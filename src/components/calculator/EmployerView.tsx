"use client";

import { C } from "@/constants/theme";

export interface EmployerCostData {
  grossSalary: number;
  totalEmployerCost: number;
  vacationPay: number;
  wia: number;
  waoUv: number;
  zw: number;
}

export function EmployerView({
  employerCost,
  visible,
  onClose,
  compact = false,
}: {
  employerCost: EmployerCostData | null;
  visible: boolean;
  onClose: () => void;
  compact?: boolean;
}) {
  if (!visible || !employerCost) return null;

  const { grossSalary, totalEmployerCost, vacationPay, wia, waoUv, zw } = employerCost;
  const fmt = (v: number) => `€${Math.round(v).toLocaleString("nl-NL")}`;

  return (
    <div
      style={{
        background: C.primarySoft,
        border: `1px solid ${C.primary}40`,
        borderRadius: 12,
        padding: compact ? 12 : 16,
        marginTop: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: compact ? 8 : 12,
        }}
      >
        <span style={{ fontSize: compact ? 13 : 14, fontWeight: 700, color: C.lt }}>
          Werkgeverslasten (employer view)
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            color: C.lm,
            padding: 4,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Row label="Bruto salaris (jaar)" value={grossSalary} fmt={fmt} />
        <Row label="Vakantiegeld (8%)" value={vacationPay} fmt={fmt} />
        <Row label="WIA premie" value={wia} fmt={fmt} />
        <Row label="WAO/UV" value={waoUv} fmt={fmt} />
        <Row label="Ziektewet" value={zw} fmt={fmt} />
        <div
          style={{
            borderTop: `1px solid ${C.primary}40`,
            marginTop: 6,
            paddingTop: 8,
            fontWeight: 800,
            fontSize: compact ? 14 : 15,
            color: C.lt,
          }}
        >
          Totaal werkgeverskosten: {fmt(totalEmployerCost)} / jaar
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  fmt,
}: {
  label: string;
  value: number;
  fmt: (v: number) => string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        color: C.lm,
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 600, color: C.lt }}>{fmt(value)}</span>
    </div>
  );
}
