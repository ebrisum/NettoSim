"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Building2,
  Mail,
  MessageSquare,
  UserCircle,
  GitBranch,
  Key,
  ListOrdered,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/live", label: "Live", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/partners", label: "Partners", icon: Building2 },
  { href: "/admin/emails", label: "Emails", icon: Mail },
  { href: "/admin/leads", label: "Leads", icon: MessageSquare },
  { href: "/admin/users", label: "Users", icon: UserCircle },
  { href: "/admin/patterns", label: "Patterns", icon: GitBranch },
  { href: "/admin/api", label: "API", icon: Key },
  { href: "/admin/events", label: "Events", icon: ListOrdered },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const SIDEBAR_BG = "#1a1a2e";
const ACCENT = "#06b6d4";

export default function AdminSidebar() {
  const pathname = usePathname() || "";
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        style={{
          display: "none",
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 50,
          width: 40,
          height: 40,
          borderRadius: 8,
          border: "none",
          background: SIDEBAR_BG,
          color: "#fff",
          cursor: "pointer",
        }}
        className="admin-mobile-menu-btn"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 30,
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: collapsed ? 60 : 260,
          background: SIDEBAR_BG,
          borderRight: "1px solid #2d2d44",
          display: "flex",
          flexDirection: "column",
          zIndex: 40,
          transition: "width 0.2s ease",
        }}
        className={`admin-sidebar ${mobileOpen ? "mobile-open" : ""}`}
      >
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid #2d2d44",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {!collapsed && (
            <Link
              href="/admin"
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#fff",
                textDecoration: "none",
              }}
            >
              NettoSim
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand" : "Collapse"}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft
              size={18}
              style={{ transform: collapsed ? "rotate(180deg)" : undefined }}
            />
          </button>
        </div>

        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 0",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  margin: "2px 8px",
                  borderRadius: 8,
                  color: isActive ? ACCENT : "#94a3b8",
                  background: isActive ? ACCENT + "18" : "transparent",
                  borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  transition: "all 0.15s",
                }}
              >
                <Icon size={20} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #2d2d44",
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <LogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            transform: translateX(-100%);
            transition: transform 0.2s ease;
          }
          .admin-sidebar.mobile-open {
            transform: translateX(0);
          }
          .admin-mobile-menu-btn { display: flex !important; align-items: center; justify-content: center; }
        }
        @media (min-width: 769px) {
          .admin-mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </>
  );
}
