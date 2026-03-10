"use client";

import { useEffect, useState } from "react";
import SlideDrawer from "@/components/admin/SlideDrawer";
import { Circle, Loader2 } from "lucide-react";

type LiveSession = {
  id: string;
  fingerprint: string;
  startedAt: string;
  lastActiveAt: string;
  simulationCount: number;
  lastSalary: number | null;
  pattern: unknown;
  tenantName: string;
  tenantSlug: string | null;
};

type SessionDetail = {
  session: {
    id: string;
    fingerprintHash: string | null;
    referrer: string | null;
    userAgent: string | null;
    tenantName: string | null;
    createdAt: string;
    lastActiveAt: string;
  };
  events: { id: string; type: string; payload: unknown; createdAt: string }[];
  simulations: { id: string; gross: number | null; net: number | null; effectiveRate: number | null; createdAt: string }[];
  pattern: Record<string, unknown> | null;
};

const ACCENT = "#06b6d4";

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return d.toLocaleDateString();
}

function statusDot(lastActiveAt: string): "active" | "idle" {
  const min = (Date.now() - new Date(lastActiveAt).getTime()) / 60000;
  return min < 1 ? "active" : "idle";
}

export default function AdminLivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [drawerSessionId, setDrawerSessionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function fetchLive() {
    try {
      const res = await fetch("/api/admin/sessions/live");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError("Failed to load live sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLive();
  }, []);

  useEffect(() => {
    const t = setInterval(fetchLive, 5000);
    return () => clearInterval(t);
  }, []);

  async function openDrawer(id: string) {
    setDrawerSessionId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading && sessions.length === 0) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 12, color: "#64748b" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Loading live sessions…
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Live sessions</h1>
        {lastUpdated && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Updated {lastUpdated.toLocaleTimeString()} — refreshes every 5s
          </span>
        )}
      </div>

      {error && (
        <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b", fontWeight: 600, textAlign: "left" }}>
                <th style={{ padding: "12px 16px", width: 40 }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Session ID</th>
                <th style={{ padding: "12px 16px" }}>Fingerprint</th>
                <th style={{ padding: "12px 16px" }}>Started</th>
                <th style={{ padding: "12px 16px" }}>Current salary</th>
                <th style={{ padding: "12px 16px" }}>Simulations</th>
                <th style={{ padding: "12px 16px" }}>Pattern</th>
                <th style={{ padding: "12px 16px" }}>Tenant</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
                    No active sessions in the last 5 minutes.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => {
                  const status = statusDot(s.lastActiveAt);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => openDrawer(s.id)}
                      style={{
                        borderTop: "1px solid #f1f5f9",
                        cursor: "pointer",
                      }}
                      className="admin-live-row"
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <Circle
                          size={10}
                          fill={status === "active" ? "#22c55e" : "#eab308"}
                          color={status === "active" ? "#22c55e" : "#eab308"}
                        />
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12 }}>
                        {s.id.slice(0, 8)}…
                      </td>
                      <td style={{ padding: "12px 16px" }}>{s.fingerprint}</td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {relativeTime(s.startedAt)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {s.lastSalary != null ? `€${s.lastSalary.toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>{s.simulationCount}</td>
                      <td style={{ padding: "12px 16px" }}>
                        {s.pattern && typeof s.pattern === "object" && "type" in s.pattern ? (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: "#06b6d422",
                              color: "#06b6d4",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {(s.pattern as { type: string }).type}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>{s.tenantName}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SlideDrawer
        open={!!drawerSessionId}
        onClose={() => { setDrawerSessionId(null); setDetail(null); }}
        title={drawerSessionId ? `Session ${drawerSessionId.slice(0, 8)}…` : "Session"}
        width={480}
      >
        {detailLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            Loading…
          </div>
        ) : detail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Session</h3>
              <div style={{ fontSize: 13, color: "#0f172a" }}>
                <p>Started: {new Date(detail.session.createdAt).toLocaleString()}</p>
                <p>Last active: {new Date(detail.session.lastActiveAt).toLocaleString()}</p>
                {detail.session.referrer && <p>Referrer: {detail.session.referrer}</p>}
                {detail.session.tenantName && <p>Tenant: {detail.session.tenantName}</p>}
                {detail.session.userAgent && (
                  <p style={{ wordBreak: "break-word" }}>User-Agent: {detail.session.userAgent}</p>
                )}
              </div>
            </section>
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
                Simulations ({detail.simulations.length})
              </h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {detail.simulations.map((sim) => (
                  <li
                    key={sim.id}
                    style={{
                      padding: "8px 0",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: 13,
                    }}
                  >
                    {sim.gross != null && `€${sim.gross.toLocaleString()}`}
                    {sim.net != null && ` → €${sim.net.toLocaleString()} net`}
                    {sim.effectiveRate != null && ` (${(sim.effectiveRate * 100).toFixed(1)}%)`}
                    {" · "}
                    {new Date(sim.createdAt).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
                Timeline ({detail.events.length} events)
              </h3>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {detail.events.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      padding: "6px 0",
                      borderLeft: "3px solid #06b6d4",
                      paddingLeft: 10,
                      marginBottom: 4,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{e.type}</span>
                    {" · "}
                    {new Date(e.createdAt).toLocaleTimeString()}
                    {!!e.payload &&
                      typeof e.payload === "object" &&
                      Object.keys(e.payload as Record<string, unknown>).length > 0 && (
                      <pre style={{ margin: "4px 0 0", fontSize: 11, overflow: "auto", color: "#64748b" }}>
                        {JSON.stringify(e.payload as Record<string, unknown>, null, 0).slice(0, 120)}…
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </section>
            {detail.pattern && Object.keys(detail.pattern).length > 0 && (
              <section>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Pattern</h3>
                <pre style={{ fontSize: 12, background: "#f8fafc", padding: 12, borderRadius: 8, overflow: "auto" }}>
                  {JSON.stringify(detail.pattern, null, 2)}
                </pre>
              </section>
            )}
          </div>
        ) : drawerSessionId ? (
          <p style={{ color: "#64748b" }}>Could not load session details.</p>
        ) : null}
      </SlideDrawer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .admin-live-row:hover { background: #f8fafc; }
      `}</style>
    </div>
  );
}
