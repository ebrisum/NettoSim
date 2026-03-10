"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = { sessions: "#06b6d4", simulations: "#8b5cf6" };

interface Point {
  date: string;
  sessions: number;
  simulations: number;
}

interface TimeseriesChartProps {
  data: Point[];
  period: string;
  onPeriodChange?: (p: string) => void;
}

export default function TimeseriesChart({
  data,
  period,
  onPeriodChange,
}: TimeseriesChartProps) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          Sessions & Simulations over time
        </span>
        {onPeriodChange && (
          <div style={{ display: "flex", gap: 8 }}>
            {["7d", "30d", "90d"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange(p)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: period === p ? "#06b6d4" : "#fff",
                  color: period === p ? "#fff" : "#64748b",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => (v ? v.slice(5) : "")}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={(v) => v}
            formatter={(value: number) => [value, ""]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="sessions"
            name="Sessions"
            stroke={COLORS.sessions}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="simulations"
            name="Simulations"
            stroke={COLORS.simulations}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
