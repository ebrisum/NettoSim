import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  try {
    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        orderBy: { subscribedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.subscriber.count(),
    ]);

    return NextResponse.json({
      subscribers: subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        source: s.source,
        tags: s.tags,
        isActive: s.isActive,
        subscribedAt: s.subscribedAt.toISOString(),
      })),
      total,
      page,
      limit,
    });
  } catch (e) {
    console.error("[admin/emails/subscribers GET]", e);
    return NextResponse.json({ error: "Failed to list subscribers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const source = typeof body.source === "string" ? body.source : "manual";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.upsert({
      where: { email },
      create: { email, source, isActive: true },
      update: { isActive: true },
    });

    return NextResponse.json({
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        source: subscriber.source,
        isActive: subscriber.isActive,
        subscribedAt: subscriber.subscribedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[admin/emails/subscribers POST]", e);
    return NextResponse.json({ error: "Failed to add subscriber" }, { status: 500 });
  }
}
