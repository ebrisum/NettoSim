"use client";

import { useEffect, useState } from "react";

export default function AdminPatternsPage() {
  const [overview, setOverview] = useState<{ cards: { type: string; count: number; pct: number }[]; total: number } | null>(null);
  const [funnel, setFunnel] = useState<{ funnel: { step: string; count: number; rate: number }[] } | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const q = "period=" + period;
    Promise.all([
      fetch("/api/admin/patterns/overview?" + q).then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/patterns/funnel?" + q).then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/patterns/insights?" + q).then((r) => r.ok ? r.json() : null),
    ]).then(([o, f, i]) => {
      setOverview(o);
      setFunnel(f);
      setInsights(i?.insights ?? []);
    }).finally(() => setLoading(false));
  }, [period]);

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Patterns & insights</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {["7d", "30d", "90d"].map((p) => (
            <button key={p} type="button" onClick={() => setPeriod(p)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: period === p ? "#06b6d4" : "#fff", color: period === p ? "#fff" : "#64748b", fontWeight: 600, cursor: "pointer" }}>{p}</button>
          ))}
        </div>
      </div>
      {loading && <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading…</div>}
      {!loading && (
        <>
          {overview && overview.cards.filter((c) => c.count > 0).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16, marginBottom: 24 }}>
              {overview.cards.filter((c) => c.count > 0).map((c) => (
                <div key={c.type} style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{c.type}</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{c.count}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{c.pct}%</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {funnel && (
              <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Funnel</h2>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {funnel.funnel.map((s) => (
                    <li key={s.step} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}><span>{s.step}</span><span style={{ fontWeight: 600 }}>{s.count} ({s.rate}%)</span></li>
                  ))}
                </ul>
              </div>
            )}
            {insights.length > 0 && (
              <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Insights</h2>
                <ul style={{ margin: 0, paddingLeft: 20 }}>{insights.map((line, i) => <li key={i}>{line}</li>)}</ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
