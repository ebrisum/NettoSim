"use client";

import { useEffect, useState } from "react";

const ACCENT = "#06b6d4";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purgeFingerprint, setPurgeFingerprint] = useState("");
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings ?? {}))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) setPurgeResult("Settings saved.");
      else setPurgeResult("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/settings/export", { method: "POST" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nettosim-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setPurgeResult("Export downloaded.");
    } catch {
      setPurgeResult("Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function handlePurge() {
    if (!purgeFingerprint || !confirm("Permanently delete all data for this fingerprint?")) return;
    try {
      const res = await fetch("/api/admin/settings/purge-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: purgeFingerprint }),
      });
      const data = await res.json();
      if (res.ok) setPurgeResult(`Purged ${data.deletedSessions ?? 0} sessions.`);
      else setPurgeResult(data.error || "Failed.");
    } catch {
      setPurgeResult("Failed.");
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>Settings</h1>

      {loading && <div style={{ padding: 48, color: "#64748b" }}>Loading…</div>}

      {!loading && (
        <>
          <section style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>General</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Store app config in AdminSetting (key/value). Save to persist.</p>
            <button type="button" onClick={handleSave} disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving…" : "Save settings"}</button>
          </section>

          <section style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Export</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>Download all data (sessions, events, simulations, tenants, subscribers, campaigns, settings) as JSON.</p>
            <button type="button" onClick={handleExport} disabled={exporting} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 600, cursor: exporting ? "not-allowed" : "pointer" }}>{exporting ? "Exporting…" : "Export all data"}</button>
          </section>

          <section style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Data management</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>Purge all sessions and events for a fingerprint (GDPR).</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Fingerprint hash"
                value={purgeFingerprint}
                onChange={(e) => setPurgeFingerprint(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", width: 320 }}
              />
              <button type="button" onClick={handlePurge} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #ef4444", background: "#fff", color: "#ef4444", fontWeight: 600, cursor: "pointer" }}>Purge user</button>
            </div>
            {purgeResult && <p style={{ marginTop: 12, fontSize: 14 }}>{purgeResult}</p>}
          </section>
        </>
      )}
    </div>
  );
}
