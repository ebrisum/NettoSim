"use client";

import { useEffect, useState } from "react";

export default function AdminAPIPage() {
  const [stats, setStats] = useState<{ callsToday: number; callsThisWeek: number; callsThisMonth: number; errorRate: number; avgResponseMs: number } | null>(null);
  const [byEndpoint, setByEndpoint] = useState<{ endpoint: string; calls: number; avgResponseMs: number; errorRate: number }[]>([]);
  const [byTenant, setByTenant] = useState<{ tenantName: string; calls: number; lastUsed: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/api/stats").then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/api/usage-by-endpoint?period=24h").then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/api/usage-by-tenant?period=24h").then((r) => r.ok ? r.json() : null),
    ]).then(([s, e, t]) => {
      setStats(s);
      setByEndpoint(e?.usage ?? []);
      setByTenant(t?.usage ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 0 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>API management</h1>

      {loading && <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading…</div>}

      {!loading && stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Calls today</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.callsToday}</div>
            </div>
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>This week</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.callsThisWeek}</div>
            </div>
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>This month</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.callsThisMonth}</div>
            </div>
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Error rate (today)</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.errorRate}%</div>
            </div>
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Avg response (today)</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{Math.round(stats.avgResponseMs)}ms</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="admin-api-grid">
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Usage by endpoint (24h)</h2>
              {byEndpoint.length === 0 ? <p style={{ color: "#64748b" }}>No API logs yet.</p> : (
                <table style={{ width: "100%", fontSize: 13 }}>
                  <thead><tr style={{ color: "#64748b", textAlign: "left" }}><th>Endpoint</th><th>Calls</th><th>Avg ms</th><th>Error %</th></tr></thead>
                  <tbody>
                    {byEndpoint.slice(0, 10).map((r) => (
                      <tr key={r.endpoint} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 0" }}>{r.endpoint}</td>
                        <td>{r.calls}</td>
                        <td>{r.avgResponseMs}</td>
                        <td>{r.errorRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Usage by tenant (24h)</h2>
              {byTenant.length === 0 ? <p style={{ color: "#64748b" }}>No tenant usage yet.</p> : (
                <table style={{ width: "100%", fontSize: 13 }}>
                  <thead><tr style={{ color: "#64748b", textAlign: "left" }}><th>Tenant</th><th>Calls</th><th>Last used</th></tr></thead>
                  <tbody>
                    {byTenant.slice(0, 10).map((r) => (
                      <tr key={r.tenantName} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 0" }}>{r.tenantName}</td>
                        <td>{r.calls}</td>
                        <td>{new Date(r.lastUsed).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`@media (max-width: 768px) { .admin-api-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}
