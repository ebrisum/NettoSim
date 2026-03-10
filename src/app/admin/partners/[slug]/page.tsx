"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PartnerDetail = {
  partner: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    contactEmail: string | null;
    primaryColor: string | null;
    logoUrl: string | null;
    showOnPartnerPage: boolean;
    partnerPageOrder: number;
    partnerDescription: string | null;
    partnerTier: string;
    createdAt: string;
  };
  stats: { simCount: number; simCount30: number; uniqueVisitors30: number };
  sessionsOverTime: { date: string; count: number }[];
};

const ACCENT = "#06b6d4";

export default function AdminPartnerDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [data, setData] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    fetch(`/api/admin/partners/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading || !data) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 8, color: "#64748b" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Loading…
      </div>
    );
  }

  const { partner, stats, sessionsOverTime } = data;

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/admin/partners"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#64748b",
            textDecoration: "none",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={16} /> Back to partners
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>{partner.name}</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Slug: {partner.slug}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Total simulations</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.simCount}</div>
        </div>
        <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Simulations (30d)</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.simCount30}</div>
        </div>
        <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Unique visitors (30d)</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.uniqueVisitors30}</div>
        </div>
      </div>

      <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sessions over time (30d)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={sessionsOverTime} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => (v ? String(v).slice(5) : "")} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" name="Sessions" stroke={ACCENT} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Details</h2>
        <dl style={{ margin: 0, fontSize: 14 }}>
          <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
            <dt style={{ color: "#64748b", minWidth: 120 }}>Status</dt>
            <dd style={{ margin: 0 }}>{partner.isActive ? "Active" : "Inactive"}</dd>
          </div>
          {partner.contactEmail && (
            <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
              <dt style={{ color: "#64748b", minWidth: 120 }}>Contact</dt>
              <dd style={{ margin: 0 }}>{partner.contactEmail}</dd>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
            <dt style={{ color: "#64748b", minWidth: 120 }}>Show on partner page</dt>
            <dd style={{ margin: 0 }}>{partner.showOnPartnerPage ? "Yes" : "No"}</dd>
          </div>
          <div style={{ display: "flex", gap: 12, padding: "8px 0" }}>
            <dt style={{ color: "#64748b", minWidth: 120 }}>Tier</dt>
            <dd style={{ margin: 0 }}>{partner.partnerTier}</dd>
          </div>
        </dl>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
