import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;
  try {
    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      campaigns: campaigns.map((c) => ({
        id: c.id,
        subject: c.subject,
        recipientCount: c.recipientCount,
        status: c.status,
        sentAt: c.sentAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[admin/emails/campaigns GET]", e);
    return NextResponse.json({ error: "Failed to list campaigns" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;
  try {
    const body = await request.json().catch(() => ({}));
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const bodyHtml = typeof body.body === "string" ? body.body : "";
    if (!subject) return NextResponse.json({ error: "Subject required" }, { status: 400 });
    const campaign = await prisma.emailCampaign.create({
      data: { subject, body: bodyHtml, recipientFilter: body.recipientFilter ?? {}, recipientCount: 0, status: "draft" },
    });
    return NextResponse.json({
      campaign: { id: campaign.id, subject: campaign.subject, status: campaign.status, createdAt: campaign.createdAt.toISOString() },
    });
  } catch (e) {
    console.error("[admin/emails/campaigns POST]", e);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
