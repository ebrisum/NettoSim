"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const ACCENT = "#06b6d4";

export default function NewCampaignPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/emails/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          recipientFilter: {},
          status: "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      if (data.campaign?.id) router.replace("/admin/emails/campaigns/" + data.campaign.id);
      else setError("No campaign ID returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 0, maxWidth: 640 }}>
      <Link href="/admin/emails" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#64748b", textDecoration: "none", fontSize: 14, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Emails
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>New campaign</h1>
      <form onSubmit={handleSubmit} style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0" }}>
        {error && <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>}
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Subject *</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20 }} />
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Body (HTML)</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20, fontFamily: "inherit" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={submitting} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}>{submitting ? "Creating…" : "Create campaign"}</button>
          <Link href="/admin/emails" style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, textDecoration: "none", alignSelf: "center" }}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
