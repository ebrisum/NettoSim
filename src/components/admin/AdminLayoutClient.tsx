"use client";

import { SidebarProvider, useSidebar } from "./SidebarContext";
import Sidebar from "./Sidebar";

function AdminMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <main
      style={{
        marginLeft: collapsed ? 60 : 260,
        minHeight: "100vh",
        padding: 24,
        transition: "margin-left 0.2s ease",
      }}
      className="admin-main"
    >
      {children}
    </main>
  );
}

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div
        style={{
          minHeight: "100vh",
          background: "#f1f5f9",
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        }}
      >
        <Sidebar />
        <AdminMain>{children}</AdminMain>
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @media (max-width: 768px) {
          .admin-main { margin-left: 0 !important; padding-top: 56px; }
        }
      `}</style>
    </SidebarProvider>
  );
}
