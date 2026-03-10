"use client";

import { useTenant } from "@/hooks/useTenant";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface TenantData {
  dailySimulations?: { date: string; count: number }[];
  salaryDistribution?: { range: string; count: number }[];
  uniqueVisitors?: number;
  topReferrers?: { referrer: string; count: number }[];
}

function exportCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) => Object.values(row).join(","));
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useTenant();

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        Dashboard laden…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#dc2626" }}>
        <p>Niet geautoriseerd of geen tenant-toegang.</p>
        <button
          type="button"
          onClick={() => refetch()}
          style={{
            marginTop: 12,
            padding: "8px 16px",
            border: "1px solid #dc2626",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { dailySimulations, salaryDistribution, uniqueVisitors, topReferrers } = data as TenantData;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>
        Tenant Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            Unieke bezoekers (sessies)
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>
            {uniqueVisitors?.toLocaleString("nl-NL") ?? 0}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          Simulaties per dag (laatste 30 dagen)
        </h2>
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            height: 280,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySimulations ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#0077CC"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <button
          type="button"
          onClick={() => exportCSV((dailySimulations ?? []) as Record<string, unknown>[], "daily-simulations.csv")}
          style={{
            marginTop: 8,
            padding: "6px 12px",
            fontSize: 13,
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          Bruto-salarisverdeling
        </h2>
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            height: 280,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salaryDistribution ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0077CC" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <button
          type="button"
          onClick={() =>
            exportCSV((salaryDistribution ?? []) as Record<string, unknown>[], "salary-distribution.csv")
          }
          style={{
            marginTop: 8,
            padding: "6px 12px",
            fontSize: 13,
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
      </div>

      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          Top referrers
        </h2>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#64748b",
                  }}
                >
                  Referrer
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#64748b",
                  }}
                >
                  Aantal
                </th>
              </tr>
            </thead>
            <tbody>
              {(topReferrers ?? []).map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 14,
                      color: "#0f172a",
                      maxWidth: 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.referrer}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 14,
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() =>
            exportCSV(
              (topReferrers ?? []).map((r) => ({ referrer: r.referrer, count: r.count })),
              "top-referrers.csv"
            )
          }
          style={{
            marginTop: 8,
            padding: "6px 12px",
            fontSize: 13,
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
