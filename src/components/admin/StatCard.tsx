"use client";

import { type ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  live?: boolean;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  live,
}: StatCardProps) {
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
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#64748b",
          }}
        >
          {title}
        </span>
        {icon && <span style={{ color: "#94a3b8" }}>{icon}</span>}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          {value}
        </span>
        {live && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "#22c55e",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
            title="Live"
          />
        )}
      </div>
      {(subtitle || trend) && (
        <div
          style={{
            fontSize: 12,
            color: "#64748b",
            marginTop: 4,
          }}
        >
          {subtitle}
          {trend && (
            <span
              style={{
                color: trend.value >= 0 ? "#22c55e" : "#ef4444",
                marginLeft: subtitle ? 8 : 0,
              }}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% vs {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
