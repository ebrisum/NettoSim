"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Plus } from "lucide-react";

type Subscriber = {
  id: string;
  email: string;
  source: string;
  tags: string[];
  isActive: boolean;
  subscribedAt: string;
};

type Campaign = {
  id: string;
  subject: string;
  recipientCount: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

const ACCENT = "#06b6d4";

export default function AdminEmailsPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/emails/subscribers?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        setSubscribers(d.subscribers ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    fetch("/api/admin/emails/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? []));
  }, []);

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Emails</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/admin/emails/campaigns/new"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8,
              border: "none", background: ACCENT, color: "#fff", fontWeight: 600, textDecoration: "none",
            }}
          >
            <Plus size={18} /> New campaign
          </Link>
          <a
            href="/api/admin/emails/subscribers/export"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, textDecoration: "none",
            }}
          >
            <Download size={18} /> Export CSV
          </a>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9", fontSize: 14, color: "#64748b" }}>
          {total} subscriber{total !== 1 ? "s" : ""}
        </div>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b", fontWeight: 600, textAlign: "left" }}>
                <th style={{ padding: "12px 16px" }}>Email</th>
                <th style={{ padding: "12px 16px" }}>Source</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 48, textAlign: "center", color: "#64748b" }}>No subscribers yet.</td></tr>
              ) : (
                subscribers.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>{s.email}</td>
                    <td style={{ padding: "12px 16px" }}>{s.source}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 6, background: s.isActive ? "#22c55e22" : "#94a3b822", color: s.isActive ? "#22c55e" : "#64748b", fontSize: 12 }}>{s.isActive ? "Active" : "Unsubscribed"}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{new Date(s.subscribedAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        {total > 20 && (
          <div style={{ padding: 12, display: "flex", justifyContent: "center", gap: 8 }}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer" }}>Previous</button>
            <span style={{ alignSelf: "center", fontSize: 13 }}>Page {page}</span>
            <button type="button" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: page * 20 >= total ? "not-allowed" : "pointer" }}>Next</button>
          </div>
        )}
      </div>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Campaigns</h2>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b", fontWeight: 600, textAlign: "left" }}>
                <th style={{ padding: "12px 16px" }}>Subject</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Recipients</th>
                <th style={{ padding: "12px 16px" }}>Sent</th>
                <th style={{ padding: "12px 16px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>No campaigns yet. Create one to get started.</td></tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>{c.subject}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 6, background: c.status === "sent" ? "#22c55e22" : "#94a3b822", color: c.status === "sent" ? "#22c55e" : "#64748b", fontSize: 12 }}>{c.status}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{c.recipientCount}</td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{c.sentAt ? new Date(c.sentAt).toLocaleString() : "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/admin/emails/campaigns/${c.id}`} style={{ color: ACCENT, fontWeight: 600 }}>Edit</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
