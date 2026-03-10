"use client";

const PRESETS = [
  { label: "Today", getRange: () => ({ from: new Date(new Date().setHours(0, 0, 0, 0)), to: new Date() }) },
  { label: "7d", getRange: () => ({ from: new Date(Date.now() - 7 * 86400000), to: new Date() }) },
  { label: "30d", getRange: () => ({ from: new Date(Date.now() - 30 * 86400000), to: new Date() }) },
  { label: "90d", getRange: () => ({ from: new Date(Date.now() - 90 * 86400000), to: new Date() }) },
  { label: "YTD", getRange: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date() }) },
];

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
}

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {PRESETS.map((p) => {
        const r = p.getRange();
        const isActive =
          from.getTime() === r.from.getTime() && to.getTime() === r.to.getTime();
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(r.from, r.to)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: isActive ? "#06b6d4" : "#fff",
              color: isActive ? "#fff" : "#64748b",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        );
      })}
      <input
        type="date"
        value={from.toISOString().slice(0, 10)}
        onChange={(e) => onChange(new Date(e.target.value), to)}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          fontSize: 12,
        }}
      />
      <span style={{ color: "#64748b" }}>–</span>
      <input
        type="date"
        value={to.toISOString().slice(0, 10)}
        onChange={(e) => onChange(from, new Date(e.target.value))}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          fontSize: 12,
        }}
      />
    </div>
  );
}
