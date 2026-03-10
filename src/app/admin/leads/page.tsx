"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Users } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  source: string;
  status: string;
  sessionId: string | null;
  visitorId: string | null;
  profileType: string | null;
  metadata: unknown;
  partner: { id: string; slug: string; name: string } | null;
  appUser: { id: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
};

type LeadResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts?: {
    byStatus?: Record<string, number>;
    bySource?: Record<string, number>;
  };
  leads: Lead[];
  error?: string;
};

const STATUSES = ["all", "new", "reviewed", "contacted", "archived"] as const;

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: "#22c55e22", color: "#16a34a" },
  reviewed: { bg: "#06b6d422", color: "#0891b2" },
  contacted: { bg: "#8b5cf622", color: "#7c3aed" },
  archived: { bg: "#94a3b822", color: "#64748b" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function compactText(value: string, max = 80): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "...";
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [countsByStatus, setCountsByStatus] = useState<Record<string, number>>({});
  const [countsBySource, setCountsBySource] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchLeads() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status,
        source,
      });
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      const data = (await res.json()) as LeadResponse;
      if (!res.ok) throw new Error(data.error || "Failed to load leads");
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setCountsByStatus(data.counts?.byStatus ?? {});
      setCountsBySource(data.counts?.bySource ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads();
  }, [page, status, source]);

  async function updateLeadStatus(id: string, nextStatus: string) {
    setSavingId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update lead");
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === id ? { ...lead, status: data.lead.status } : lead
        )
      );
      setCountsByStatus((prev) => {
        const next = { ...prev };
        const old = leads.find((l) => l.id === id)?.status;
        if (old && next[old] != null) next[old] = Math.max(0, next[old] - 1);
        next[nextStatus] = (next[nextStatus] || 0) + 1;
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update lead");
    } finally {
      setSavingId(null);
    }
  }

  const sourceOptions = useMemo(() => {
    const sorted = Object.keys(countsBySource).sort((a, b) => a.localeCompare(b));
    return ["all", ...sorted];
  }, [countsBySource]);

  return (
    <div style={{ padding: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Leads
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0 0" }}>
            Contact aanvragen uit de website en partner-matches.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "8px 12px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Users size={16} />
            {total} totaal
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "8px 12px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Mail size={16} />
            {(countsByStatus.new || 0) + " nieuw"}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: 12,
          marginBottom: 16,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Status</span>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setPage(1);
              setStatus(s);
            }}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 999,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              background: status === s ? "#06b6d4" : "#fff",
              color: status === s ? "#fff" : "#334155",
            }}
          >
            {s} {s !== "all" ? `(${countsByStatus[s] || 0})` : ""}
          </button>
        ))}
        <div style={{ width: 16 }} />
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Source</span>
        <select
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value);
          }}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
          }}
        >
          {sourceOptions.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fee2e2",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "#64748b",
            }}
          >
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            Laden...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: 36, textAlign: "center", color: "#64748b", fontSize: 14 }}>
            Geen leads gevonden voor deze filters.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  color: "#64748b",
                  textAlign: "left",
                  fontWeight: 600,
                }}
              >
                <th style={{ padding: "10px 12px" }}>Naam / Email</th>
                <th style={{ padding: "10px 12px" }}>Onderwerp</th>
                <th style={{ padding: "10px 12px" }}>Bron</th>
                <th style={{ padding: "10px 12px" }}>Partner</th>
                <th style={{ padding: "10px 12px" }}>Profiel</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
                <th style={{ padding: "10px 12px" }}>Aangemaakt</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const expanded = expandedId === lead.id;
                const color = STATUS_COLORS[lead.status] || STATUS_COLORS.archived;
                return (
                  <Fragment key={lead.id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : lead.id)}
                      style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{lead.name}</div>
                        <div style={{ color: "#64748b" }}>{lead.email}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }} title={lead.subject}>
                        {compactText(lead.subject, 36)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>{lead.source}</td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>
                        {lead.partner?.name || "-"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>
                        {lead.profileType || "-"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <select
                          value={lead.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          disabled={savingId === lead.id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 6,
                            padding: "4px 8px",
                            background: color.bg,
                            color: color.color,
                            fontWeight: 600,
                          }}
                        >
                          {STATUSES.filter((s) => s !== "all").map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>
                        {fmtDate(lead.createdAt)}
                      </td>
                    </tr>
                    {expanded && (
                      <tr style={{ background: "#f8fafc" }}>
                        <td colSpan={7} style={{ padding: 12, borderTop: "1px dashed #e2e8f0" }}>
                          <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                            <strong>Bericht:</strong>
                          </div>
                          <div style={{ fontSize: 13, color: "#0f172a", whiteSpace: "pre-wrap" }}>
                            {lead.message}
                          </div>
                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 11,
                              color: "#64748b",
                              display: "flex",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <span>visitor: {lead.visitorId || "-"}</span>
                            <span>session: {lead.sessionId || "-"}</span>
                            <span>user: {lead.appUser?.email || "-"}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8 }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "6px 12px",
            background: "#fff",
            cursor: page <= 1 ? "not-allowed" : "pointer",
          }}
        >
          Vorige
        </button>
        <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>
          Pagina {page} van {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "6px 12px",
            background: "#fff",
            cursor: page >= totalPages ? "not-allowed" : "pointer",
          }}
        >
          Volgende
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
