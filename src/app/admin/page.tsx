"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/admin/StatCard";
import TimeseriesChart from "@/components/admin/charts/TimeseriesChart";
import DistributionChart from "@/components/admin/charts/DistributionChart";
import {
  Users,
  Activity,
  Calculator,
  Eye,
  Euro,
  Building2,
} from "lucide-react";

type OverviewStats = {
  liveUsers: number;
  todaySessions: number;
  todaySimulations: number;
  uniqueVisitors30d: number;
  avgSalary: number;
  activePartners: number;
  changeVsYesterday: { sessions: number; simulations: number };
};

type TimeseriesPoint = { date: string; sessions: number; simulations: number };
type SalaryRange = { range: string; count: number };
type ActivityEvent = {
  id: string;
  type: string;
  description: string;
  sessionId: string;
  createdAt: string;
};
type ReferrerRow = { referrer: string; count: number };

const ACCENT = "#06b6d4";

function eventTypeColor(type: string): string {
  if (type === "calculate") return "#06b6d4";
  if (type === "page_view") return "#64748b";
  return "#94a3b8";
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [salaryDist, setSalaryDist] = useState<SalaryRange[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchOverview() {
    try {
      const [s, ts, sd, act, ref] = await Promise.all([
        fetch("/api/admin/stats/overview").then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/admin/stats/timeseries?period=${period}`).then((r) =>
          r.ok ? r.json() : { dates: [] }
        ),
        fetch(`/api/admin/stats/salary-distribution?period=${period}`).then((r) =>
          r.ok ? r.json() : { ranges: [] }
        ),
        fetch("/api/admin/stats/recent-activity?limit=20").then((r) =>
          r.ok ? r.json() : { events: [] }
        ),
        fetch(`/api/admin/stats/top-referrers?period=30d`).then((r) =>
          r.ok ? r.json() : { referrers: [] }
        ),
      ]);
      if (s) setStats(s);
      if (ts?.dates) setTimeseries(ts.dates);
      if (sd?.ranges) setSalaryDist(sd.ranges);
      if (act?.events) setActivity(act.events);
      if (ref?.referrers) setReferrers(ref.referrers);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, [period]);

  useEffect(() => {
    const t = setInterval(fetchOverview, 5000);
    return () => clearInterval(t);
  }, [period]);

  if (loading && !stats) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: 120,
                borderRadius: 12,
                background: "#e2e8f0",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchOverview(); }}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: ACCENT,
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const maxReferrer = Math.max(...referrers.map((r) => r.count), 1);

  return (
    <div style={{ padding: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>
          Overview
        </h1>
        {lastUpdated && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Updated {lastUpdated.toLocaleTimeString()} — auto-refresh 5s
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          title="Live users now"
          value={stats?.liveUsers ?? 0}
          live
          icon={<Users size={18} />}
        />
        <StatCard
          title="Today's sessions"
          value={stats?.todaySessions ?? 0}
          trend={
            stats
              ? { value: stats.changeVsYesterday.sessions, label: "yesterday" }
              : undefined
          }
          icon={<Activity size={18} />}
        />
        <StatCard
          title="Today's simulations"
          value={stats?.todaySimulations ?? 0}
          trend={
            stats
              ? { value: stats.changeVsYesterday.simulations, label: "yesterday" }
              : undefined
          }
          icon={<Calculator size={18} />}
        />
        <StatCard
          title="Unique visitors (30d)"
          value={stats?.uniqueVisitors30d ?? 0}
          icon={<Eye size={18} />}
        />
        <StatCard
          title="Avg. salary searched"
          value={
            stats?.avgSalary
              ? `€${stats.avgSalary.toLocaleString()}`
              : "—"
          }
          icon={<Euro size={18} />}
        />
        <StatCard
          title="Active partners"
          value={stats?.activePartners ?? 0}
          icon={<Building2 size={18} />}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
        className="admin-overview-charts"
      >
        <TimeseriesChart
          data={timeseries}
          period={period}
          onPeriodChange={setPeriod}
        />
        <DistributionChart data={salaryDist} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
        className="admin-overview-bottom"
      >
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
            Recent activity
          </span>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {activity.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>No events yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {activity.map((e) => (
                  <li
                    key={e.id}
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        color: "#64748b",
                        marginRight: 8,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: eventTypeColor(e.type) + "22",
                        color: eventTypeColor(e.type),
                        marginRight: 8,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {e.type}
                    </span>
                    {e.description}
                    {" · "}
                    <span
                      style={{ color: "#64748b", fontFamily: "monospace" }}
                      title={e.sessionId}
                    >
                      {e.sessionId.slice(0, 8)}…
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

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
            Top referrers (30d)
          </span>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {referrers.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>No referrer data.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "#64748b", fontWeight: 600, textAlign: "left" }}>
                    <th style={{ padding: "8px 0" }}>Referrer</th>
                    <th style={{ padding: "8px 0", width: 80 }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {referrers.map((r) => (
                    <tr key={r.referrer} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 0" }}>{r.referrer}</td>
                      <td style={{ padding: "10px 0", width: 120 }}>
                        <div
                          style={{
                            background: "#06b6d422",
                            borderRadius: 4,
                            height: 8,
                            width: `${(r.count / maxReferrer) * 100}%`,
                            minWidth: 4,
                            marginBottom: 4,
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{r.count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @media (max-width: 900px) {
          .admin-overview-charts, .admin-overview-bottom { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
