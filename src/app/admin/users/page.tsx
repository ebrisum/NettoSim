"use client";

import { useEffect, useState } from "react";
import SlideDrawer from "@/components/admin/SlideDrawer";

type User = {
  fingerprint: string;
  fingerprintFull: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  totalSims: number;
  avgSalary: number | null;
  topReferrer: string;
};

type UserDetail = {
  fingerprint: string;
  totalSessions: number;
  totalSimulations: number;
  totalEvents: number;
  firstSeen: string;
  lastSeen: string;
  eventTypeCounts: Record<string, number>;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/users?limit=50").then((r) => r.json()).then((d) => setUsers(d.users ?? [])).finally(() => setLoading(false));
  }, []);

  async function openDetail(fp: string) {
    setDetailId(fp);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch("/api/admin/users/" + encodeURIComponent(fp));
      if (res.ok) setDetail(await res.json());
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>Users</h1>
      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading…</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b", fontWeight: 600, textAlign: "left" }}>
                <th style={{ padding: "12px 16px" }}>Fingerprint</th>
                <th style={{ padding: "12px 16px" }}>First</th>
                <th style={{ padding: "12px 16px" }}>Last</th>
                <th style={{ padding: "12px 16px" }}>Sessions</th>
                <th style={{ padding: "12px 16px" }}>Sims</th>
                <th style={{ padding: "12px 16px" }}>Avg salary</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#64748b" }}>No users yet.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.fingerprintFull} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => openDetail(u.fingerprintFull)}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12 }}>{u.fingerprint}</td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{new Date(u.firstSeen).toLocaleDateString()}</td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{new Date(u.lastSeen).toLocaleDateString()}</td>
                    <td style={{ padding: "12px 16px" }}>{u.totalSessions}</td>
                    <td style={{ padding: "12px 16px" }}>{u.totalSims}</td>
                    <td style={{ padding: "12px 16px" }}>{u.avgSalary != null ? "€" + u.avgSalary.toLocaleString() : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <SlideDrawer open={!!detailId} onClose={() => setDetailId(null)} title="User profile" width={400}>
        {detailLoading && <p style={{ color: "#64748b" }}>Loading…</p>}
        {!detailLoading && detail && (
          <div>
            <p><strong>{detail.totalSessions}</strong> sessions, <strong>{detail.totalSimulations}</strong> sims, <strong>{detail.totalEvents}</strong> events</p>
            <p style={{ fontSize: 12, color: "#64748b" }}>First: {new Date(detail.firstSeen).toLocaleString()}</p>
            <p style={{ fontSize: 12, color: "#64748b" }}>Last: {new Date(detail.lastSeen).toLocaleString()}</p>
            {Object.keys(detail.eventTypeCounts).length > 0 && (
              <ul style={{ marginTop: 16, paddingLeft: 20 }}>{Object.entries(detail.eventTypeCounts).map(([t, c]) => <li key={t}>{t}: {c}</li>)}</ul>
            )}
          </div>
        )}
      </SlideDrawer>
    </div>
  );
}
