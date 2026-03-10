"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "lib/supabase/client";
import Link from "next/link";

export default function DashboardClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setChecked(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (checked && !user) {
      router.replace("/login");
    }
  }, [checked, user, router]);

  if (!checked) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        Laden…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <header
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ fontWeight: 700, color: "#0f172a" }}>
            NettoSim
          </Link>
          <span style={{ color: "#64748b" }}>/ Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#64748b" }}>{user.email}</span>
          <button
            type="button"
            onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Uitloggen
          </button>
        </div>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
