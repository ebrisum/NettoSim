"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, Key, Loader2 } from "lucide-react";

type Partner = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  contactEmail: string | null;
  simCount: number;
  simCount30: number;
  createdAt: string;
};

const ACCENT = "#06b6d4";

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"add" | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTier, setNewTier] = useState("standard");
  const [showOnPartnerPage, setShowOnPartnerPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function fetchPartners() {
    try {
      const res = await fetch("/api/admin/partners");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPartners(data.partners ?? []);
      setError(null);
    } catch {
      setError("Failed to load partners.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPartners();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCreatedKey(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          contactEmail: newEmail.trim() || undefined,
          slug: newSlug.trim() || undefined,
          partnerDescription: newDescription.trim() || undefined,
          partnerTier: newTier,
          showOnPartnerPage,
          customConfig: { targetProfiles: ["all"] },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create");
        return;
      }
      setCreatedKey(data.apiKey);
      await fetchPartners();
      setNewName("");
      setNewEmail("");
      setNewSlug("");
      setNewDescription("");
      setNewTier("standard");
      setShowOnPartnerPage(true);
      if (!data.apiKey) setModal(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function regenerateKey(slug: string) {
    if (!confirm("Regenerate API key? The old key will stop working.")) return;
    try {
      const res = await fetch(`/api/admin/partners/${slug}/key`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.apiKey) {
        window.prompt("New API key (copy and save):", data.apiKey);
      }
    } catch {
      setError("Failed to regenerate key.");
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Partners</h1>
        <button
          type="button"
          onClick={() => setModal("add")}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8,
            border: "none", background: ACCENT, color: "#fff", fontWeight: 600, cursor: "pointer",
          }}
        >
          <Plus size={18} /> Add partner
        </button>
      </div>

      {error && <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b" }}>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Loading…
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b", fontWeight: 600, textAlign: "left" }}>
                <th style={{ padding: "12px 16px" }}>Company</th>
                <th style={{ padding: "12px 16px" }}>Slug</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Simulations</th>
                <th style={{ padding: "12px 16px" }}>Created</th>
                <th style={{ padding: "12px 16px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#64748b" }}>No partners yet.</td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Building2 size={18} style={{ color: "#94a3b8" }} /> {p.name}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12 }}>{p.slug}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 6,
                        background: p.isActive ? "#22c55e22" : "#94a3b822",
                        color: p.isActive ? "#22c55e" : "#64748b", fontSize: 12, fontWeight: 600,
                      }}>{p.isActive ? "Active" : "Inactive"}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{p.simCount} total · {p.simCount30} (30d)</td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/admin/partners/${p.slug}`} style={{ color: ACCENT, fontWeight: 600, marginRight: 12 }}>View</Link>
                      <button type="button" onClick={() => regenerateKey(p.slug)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12 }}>
                        <Key size={14} /> Regenerate key
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal === "add" && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50 }} onClick={() => { if (!createdKey) setModal(null); }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%", zIndex: 51, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
            {createdKey ? (
              <div>
                <h3 style={{ marginTop: 0 }}>API key created</h3>
                <p style={{ fontSize: 13, color: "#64748b" }}>Copy this key; it will not be shown again.</p>
                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>{createdKey}</div>
                <button type="button" onClick={() => navigator.clipboard.writeText(createdKey)} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", cursor: "pointer" }}>Copy</button>
                <button type="button" onClick={() => { setCreatedKey(null); setModal(null); }} style={{ marginLeft: 8, padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleAdd}>
                <h3 style={{ marginTop: 0 }}>Add partner</h3>
                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Company name *</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16 }} />
                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Contact email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16 }} />
                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Slug (optional)</label>
                <input type="text" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="acme-corp" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20 }} />
                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Type</label>
                <select value={newTier} onChange={(e) => setNewTier(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16 }}>
                  <option value="standard">Standard</option>
                  <option value="featured">Featured</option>
                  <option value="hidden">Hidden</option>
                </select>
                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Beschrijving (website)</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} placeholder="Korte partneromschrijving" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16, fontFamily: "inherit" }} />
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "#334155" }}>
                  <input type="checkbox" checked={showOnPartnerPage} onChange={(e) => setShowOnPartnerPage(e.target.checked)} />
                  Direct tonen op partnerpagina
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={submitting} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}>{submitting ? "Creating…" : "Create"}</button>
                  <button type="button" onClick={() => setModal(null)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
