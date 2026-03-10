"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const FILL = "#06b6d4";

interface Bucket {
  range: string;
  count: number;
}

interface DistributionChartProps {
  data: Bucket[];
  title?: string;
}

export default function DistributionChart({
  data,
  title = "Salary distribution",
}: DistributionChartProps) {
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
      <span
        style={{
          display: "block",
          fontSize: 16,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 16,
        }}
      >
        {title}
      </span>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="range" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" name="Count" fill={FILL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
