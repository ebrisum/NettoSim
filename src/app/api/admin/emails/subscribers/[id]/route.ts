import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;
  const { id } = await context.params;
  try {
    const body = await request.json().catch(() => ({}));
    const updates: { tags?: string[]; isActive?: boolean } = {};
    if (Array.isArray(body.tags)) updates.tags = body.tags.filter((t: unknown): t is string => typeof t === "string");
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
    const subscriber = await prisma.subscriber.update({ where: { id }, data: updates });
    return NextResponse.json({
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        source: subscriber.source,
        tags: subscriber.tags,
        isActive: subscriber.isActive,
        subscribedAt: subscriber.subscribedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[admin/emails/subscribers/[id] PUT]", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauth = await verifyAdmin(_request);
  if (unauth) return unauth;
  const { id } = await context.params;
  try {
    await prisma.subscriber.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/emails/subscribers/[id] DELETE]", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
