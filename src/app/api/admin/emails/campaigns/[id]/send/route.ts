import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const unauth = await verifyAdmin(_request);
  if (unauth) return unauth;

  const { id } = await context.params;
  try {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const filter = campaign.recipientFilter as { tags?: string[] } | null;
    const where: { isActive?: boolean; tags?: { hasSome?: string[] } } = { isActive: true };
    if (filter?.tags?.length) where.tags = { hasSome: filter.tags };

    const count = await prisma.subscriber.count({ where });

    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "sent",
        recipientCount: count,
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      recipientCount: count,
      message: "Campaign marked as sent. Plug in Resend/SendGrid to send emails.",
    });
  } catch (e) {
    console.error("[admin/emails/campaigns/[id]/send]", e);
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}
