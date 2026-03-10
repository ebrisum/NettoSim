"use client";

import { useEffect, useState } from "react";
import DateRangePicker from "@/components/admin/DateRangePicker";
import TimeseriesChart from "@/components/admin/charts/TimeseriesChart";
import DistributionChart from "@/components/admin/charts/DistributionChart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = ["#06b6d4", "#8b5cf6", "#22c55e", "#eab308", "#ef4444"];

function useAnalyticsDateRange() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000));
  const [to, setTo] = useState(() => new Date());
  return { from, to, setFrom, setTo };
}

function formatRange(from: Date, to: Date): string {
  return `from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
}

export default function AdminAnalyticsPage() {
  const { from, to, setFrom, setTo } = useAnalyticsDateRange();
  const [traffic, setTraffic] = useState<{
    daily: { date: string; sessions: number; simulations: number }[];
    summary: {
      totalSessions: number;
      totalSimulations: number;
      uniqueVisitors: number;
      avgSessionsPerDay: number;
      avgSimulationsPerDay: number;
      peakDay: { date: string; sessions: number } | null;
    };
  } | null>(null);
  const [behavior, setBehavior] = useState<{
    avgSimulationsPerSession: number;
    simsPerSessionDistribution: Record<string, number>;
    mostUsedFeatures: { type: string; count: number }[];
    employerViewToggleRate: number;
  } | null>(null);
  const [salary, setSalary] = useState<{
    distribution: { range: string; count: number }[];
    medianSalary: number | null;
    salaryByReferrer: { referrer: string; avgSalary: number; count: number }[];
  } | null>(null);
  const [patterns, setPatterns] = useState<{
    breakdown: { type: string; count: number; pct: number }[];
    total: number;
  } | null>(null);
  const [funnel, setFunnel] = useState<{
    funnel: { step: string; count: number; rate: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = formatRange(from, to);
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/analytics/traffic?${q}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/analytics/behavior?${q}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/analytics/salary?${q}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/analytics/patterns?${q}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/analytics/funnel?${q}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([t, b, s, p, f]) => {
        if (t) setTraffic(t);
        if (b) setBehavior(b);
        if (s) setSalary(s);
        if (p) setPatterns(p);
        if (f) setFunnel(f);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Analytics</h1>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      {loading && (
        <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading…</div>
      )}

      {!loading && (
        <>
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Traffic & usage</h2>
            {traffic && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Total sessions</div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{traffic.summary.totalSessions}</div>
                  </div>
                  <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Total simulations</div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{traffic.summary.totalSimulations}</div>
                  </div>
                  <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Unique visitors</div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{traffic.summary.uniqueVisitors}</div>
                  </div>
                  <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Avg/day (sessions)</div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{traffic.summary.avgSessionsPerDay}</div>
                  </div>
                  {traffic.summary.peakDay && (
                    <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Peak day</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{traffic.summary.peakDay.sessions} on {traffic.summary.peakDay.date}</div>
                    </div>
                  )}
                </div>
                <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e2e8f0" }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={traffic.daily} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => (v ? String(v).slice(5) : "")} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="sessions" name="Sessions" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="simulations" name="Simulations" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>User behavior</h2>
            {behavior && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="admin-analytics-behavior">
                <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Avg simulations per session</div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{behavior.avgSimulationsPerSession}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 12 }}>Employer view toggle rate</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{behavior.employerViewToggleRate}%</div>
                </div>
                <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Simulations per session</div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {Object.entries(behavior.simsPerSessionDistribution).map(([k, v]) => (
                      <li key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                        <span>{k}</span>
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {behavior?.mostUsedFeatures && behavior.mostUsedFeatures.length > 0 && (
              <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", marginTop: 16 }}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Most used features (event types)</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {behavior.mostUsedFeatures.slice(0, 10).map((f) => (
                    <li key={f.type} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                      <span>{f.type}</span>
                      <span style={{ fontWeight: 600 }}>{f.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Salary intelligence</h2>
            {salary && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="admin-analytics-salary">
                <DistributionChart data={salary.distribution} title="Salary distribution" />
                <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Median salary searched</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>
                    {salary.medianSalary != null ? `€${Math.round(salary.medianSalary).toLocaleString()}` : "—"}
                  </div>
                  {salary.salaryByReferrer.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 16, marginBottom: 8 }}>Avg salary by referrer</div>
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 12 }}>
                        {salary.salaryByReferrer.slice(0, 5).map((r) => (
                          <li key={r.referrer} style={{ padding: "4px 0" }}>
                            {r.referrer}: €{Math.round(r.avgSalary).toLocaleString()} ({r.count})
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Conversion & patterns</h2>
            {patterns && patterns.breakdown.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="admin-analytics-patterns">
                <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Pattern breakdown (total: {patterns.total})</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={patterns.breakdown.filter((b) => b.count > 0)}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ type, pct }) => `${type} ${pct}%`}
                      >
                        {patterns.breakdown.filter((b) => b.count > 0).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Funnel</div>
                  {funnel?.funnel && (
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {funnel.funnel.map((step, i) => (
                        <li
                          key={step.step}
                          style={{
                            padding: "10px 0",
                            borderBottom: i < funnel.funnel.length - 1 ? "1px solid #f1f5f9" : "none",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 13,
                          }}
                        >
                          <span>{step.step}</span>
                          <span style={{ fontWeight: 700 }}>{step.count} ({step.rate}%)</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            {patterns && patterns.breakdown.length === 0 && (
              <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", color: "#64748b" }}>
                No pattern data in this range.
              </div>
            )}
          </section>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .admin-analytics-behavior, .admin-analytics-salary, .admin-analytics-patterns { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
