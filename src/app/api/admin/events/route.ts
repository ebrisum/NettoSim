import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "50", 10)));
  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0", 10) || 0;
  const type = request.nextUrl.searchParams.get("type") || undefined;
  const sessionId = request.nextUrl.searchParams.get("sessionId") || undefined;
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const where: { type?: string; sessionId?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
  if (type) where.type = type;
  if (sessionId) where.sessionId = sessionId;
  if (fromParam || toParam) {
    where.createdAt = {};
    if (fromParam) where.createdAt.gte = new Date(fromParam);
    if (toParam) where.createdAt.lte = new Date(toParam);
  }

  try {
    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });
    const total = await prisma.event.count({ where });

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        sessionId: e.sessionId,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      offset,
      limit,
    });
  } catch (e) {
    console.error("[admin/events]", e);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}
