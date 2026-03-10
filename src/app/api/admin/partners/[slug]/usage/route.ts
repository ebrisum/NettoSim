import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const { slug } = await params;
  const limit = Math.min(100, parseInt(request.nextUrl.searchParams.get("limit") || "20", 10) || 20);

  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const logs = await prisma.apiLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const list = logs.map((l) => ({
      id: l.id,
      endpoint: l.endpoint,
      method: l.method,
      statusCode: l.statusCode,
      responseMs: l.responseMs,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({ usage: list });
  } catch (e) {
    console.error("[admin/partners/[slug]/usage GET]", e);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }
}
