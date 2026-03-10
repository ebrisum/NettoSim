import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

function describeEvent(type: string, payload: unknown): string {
  const p = payload as Record<string, unknown> | null;
  if (type === "calculate" && p && typeof p.grossSalary === "number") {
    return `Calculated net for €${p.grossSalary.toLocaleString()}`;
  }
  if (type === "page_view") return "Page view";
  if (type === "session_start") return "Session started";
  if (type === "slider_move" || type === "input_change") return "Input changed";
  if (type === "tab_switch") return "Tab switched";
  return type.replace(/_/g, " ");
}

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "20", 10)));

  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, type: true, payload: true, sessionId: true, createdAt: true },
    });

    const list = events.map((e) => ({
      id: e.id,
      type: e.type,
      description: describeEvent(e.type, e.payload),
      sessionId: e.sessionId,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ events: list });
  } catch (e) {
    console.error("[admin/stats/recent-activity]", e);
    return NextResponse.json(
      { error: "Failed to load recent activity" },
      { status: 500 }
    );
  }
}
