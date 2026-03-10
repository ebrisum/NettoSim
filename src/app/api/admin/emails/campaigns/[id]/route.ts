import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const unauth = await verifyAdmin(_request);
  if (unauth) return unauth;

  const { id } = await context.params;
  try {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        subject: campaign.subject,
        body: campaign.body,
        recipientFilter: campaign.recipientFilter,
        recipientCount: campaign.recipientCount,
        status: campaign.status,
        scheduledFor: campaign.scheduledFor?.toISOString() ?? null,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[admin/emails/campaigns/[id] GET]", e);
    return NextResponse.json({ error: "Failed to load campaign" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const { id } = await context.params;
  try {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const updates: Prisma.EmailCampaignUpdateInput = {};
    if (typeof body.subject === "string") updates.subject = body.subject.trim();
    if (typeof body.body === "string") updates.body = body.body;
    if (body.recipientFilter !== undefined) {
      updates.recipientFilter =
        body.recipientFilter === null
          ? Prisma.JsonNull
          : (body.recipientFilter as Prisma.InputJsonValue);
    }
    if (typeof body.status === "string") updates.status = body.status;
    if (body.scheduledFor !== undefined) updates.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      campaign: {
        id: updated.id,
        subject: updated.subject,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[admin/emails/campaigns/[id] PUT]", e);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
