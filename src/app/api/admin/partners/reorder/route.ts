import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function PUT(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const body = await request.json().catch(() => ({}));
    const order = Array.isArray(body.order) ? body.order : [];
    if (!order.length) {
      return NextResponse.json({ error: "order array required" }, { status: 400 });
    }

    for (let i = 0; i < order.length; i++) {
      const slug = order[i];
      if (typeof slug !== "string") continue;
      await prisma.tenant.updateMany({
        where: { slug },
        data: { partnerPageOrder: i },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/partners/reorder]", e);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}
