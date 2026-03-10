"use client";

import { useEffect, useState } from "react";

type EventRow = {
  id: string;
  sessionId: string;
  type: string;
  payload: unknown;
  createdAt: string;
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const limit = 30;

  useEffect(() => {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (typeFilter) q.set("type", typeFilter);
    fetch(`/api/admin/events?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [offset, typeFilter]);

  const typeColors: Record<string, string> = {
    calculate: "#06b6d4",
    page_view: "#64748b",
    session_start: "#22c55e",
    pattern_detected: "#8b5cf6",
  };

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Event log</h1>
        <input
          type="text"
          placeholder="Filter by type"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", width: 200 }}
        />
      </div>

      {loading && <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading…</div>}

      {!loading && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                <tr style={{ color: "#64748b", fontWeight: 600, textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Time</th>
                  <th style={{ padding: "12px 16px" }}>Session</th>
                  <th style={{ padding: "12px 16px" }}>Type</th>
                  <th style={{ padding: "12px 16px" }}>Payload</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 48, textAlign: "center", color: "#64748b" }}>No events.</td></tr>
                ) : (
                  events.map((e) => (
                    <tr key={e.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#64748b" }}>{new Date(e.createdAt).toLocaleString()}</td>
                      <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 11 }}>{e.sessionId.slice(0, 8)}…</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, background: (typeColors[e.type] || "#94a3b8") + "22", color: typeColors[e.type] || "#64748b", fontWeight: 600 }}>{e.type}</span>
                      </td>
                      <td style={{ padding: "10px 16px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.payload != null ? JSON.stringify(e.payload).slice(0, 80) + "…" : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {total > limit && (
            <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>{total} total</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={offset <= 0} onClick={() => setOffset((o) => Math.max(0, o - limit))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: offset <= 0 ? "not-allowed" : "pointer" }}>Previous</button>
                <button type="button" disabled={offset + limit >= total} onClick={() => setOffset((o) => o + limit)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: offset + limit >= total ? "not-allowed" : "pointer" }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
