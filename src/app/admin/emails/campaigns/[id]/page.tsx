"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const ACCENT = "#06b6d4";

type Campaign = {
  id: string;
  subject: string;
  body: string;
  recipientFilter: { tags?: string[] };
  recipientCount: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

export default function CampaignEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filterText, setFilterText] = useState("[]");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetch("/api/admin/emails/campaigns/" + id)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => {
        setCampaign(d.campaign);
        setFilterText(JSON.stringify(d.campaign?.recipientFilter?.tags ?? []));
      })
      .catch(() => setCampaign(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!campaign) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/emails/campaigns/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: campaign.subject,
          body: campaign.body,
          recipientFilter: { tags: (() => { try { return JSON.parse(filterText); } catch { return []; } })() },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage("Saved.");
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!campaign || !confirm("Mark this campaign as sent and record recipient count? (Email sending is placeholder until you plug in Resend/SendGrid.)")) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/admin/emails/campaigns/" + id + "/send", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage(`Campaign marked as sent. ${data.recipientCount ?? 0} recipients.`);
      setCampaign((c) => c ? { ...c, status: "sent", recipientCount: data.recipientCount ?? 0, sentAt: new Date().toISOString() } : null);
    } catch {
      setError("Failed to send.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div style={{ padding: 24, color: "#64748b" }}>Loading…</div>;
  if (!campaign) return <div style={{ padding: 24 }}><p style={{ color: "#ef4444" }}>Campaign not found.</p><Link href="/admin/emails">Back to Emails</Link></div>;

  return (
    <div style={{ padding: 0, maxWidth: 720 }}>
      <Link href="/admin/emails" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#64748b", textDecoration: "none", fontSize: 14, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Emails
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{campaign.subject || "Edit campaign"}</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>Status: {campaign.status} · Recipients: {campaign.recipientCount}</p>

      {message && <p style={{ color: "#22c55e", marginBottom: 16 }}>{message}</p>}
      {error && <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>}

      <form onSubmit={handleSave} style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Subject</label>
        <input
          type="text"
          value={campaign.subject}
          onChange={(e) => setCampaign((c) => c ? { ...c, subject: e.target.value } : null)}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20 }}
        />
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Body (HTML)</label>
        <textarea
          value={campaign.body}
          onChange={(e) => setCampaign((c) => c ? { ...c, body: e.target.value } : null)}
          rows={12}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20, fontFamily: "inherit" }}
        />
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Recipient filter (tags as JSON array, e.g. ["newsletter"])</label>
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20 }}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save draft"}
          </button>
          {campaign.status !== "sent" && (
            <button type="button" onClick={handleSend} disabled={sending} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #22c55e", background: "#fff", color: "#22c55e", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer" }}>
              {sending ? "Sending…" : "Mark as sent"}
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: 24, padding: 16, background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#64748b" }}>
        <strong>Preview:</strong> "Mark as sent" records the campaign and recipient count. To actually send emails, plug in Resend, SendGrid, or Postmark in the API.
      </div>
    </div>
  );
}
