import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

const ALLOWED_STATUSES = new Set(["new", "reviewed", "contacted", "archived"]);

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function sanitizeString(value: unknown, max = 240): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function normalizeStatus(value: unknown): string | null {
  const status = sanitizeString(value, 40).toLowerCase();
  if (!status || !ALLOWED_STATUSES.has(status)) return null;
  return status;
}

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const page = Math.max(
      1,
      parsePositiveInt(request.nextUrl.searchParams.get("page"), 1)
    );
    const limit = Math.min(
      100,
      Math.max(1, parsePositiveInt(request.nextUrl.searchParams.get("limit"), 25))
    );
    const statusParam = sanitizeString(
      request.nextUrl.searchParams.get("status"),
      40
    ).toLowerCase();
    const sourceParam = sanitizeString(
      request.nextUrl.searchParams.get("source"),
      80
    ).toLowerCase();
    const status = ALLOWED_STATUSES.has(statusParam) ? statusParam : "all";
    const source = sourceParam || "all";
    const skip = (page - 1) * limit;

    const where: Prisma.ContactLeadWhereInput = {
      ...(status !== "all" ? { status } : {}),
      ...(source !== "all" ? { source } : {}),
    };

    const [total, leads, groupedStatuses, groupedSources] = await Promise.all([
      prisma.contactLead.count({ where }),
      prisma.contactLead.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          partner: { select: { id: true, slug: true, name: true } },
          appUser: { select: { id: true, email: true } },
        },
      }),
      prisma.contactLead.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.contactLead.groupBy({
        by: ["source"],
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of groupedStatuses) statusCounts[row.status] = row._count._all;

    const sourceCounts: Record<string, number> = {};
    for (const row of groupedSources) sourceCounts[row.source] = row._count._all;

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      filters: { status, source },
      counts: { byStatus: statusCounts, bySource: sourceCounts },
      leads: leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        subject: lead.subject,
        message: lead.message,
        source: lead.source,
        status: lead.status,
        sessionId: lead.sessionId,
        visitorId: lead.visitorId,
        profileType: lead.profileType,
        metadata: lead.metadata,
        partner: lead.partner,
        appUser: lead.appUser,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[admin/leads GET]", e);
    return NextResponse.json({ error: "Failed to load leads" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const body = await request.json().catch(() => ({}));
    const id = sanitizeString(body.id, 80);
    const status = normalizeStatus(body.status);
    const adminNote = sanitizeString(body.adminNote, 1000);

    if (!id || !status) {
      return NextResponse.json(
        { error: "Valid lead id and status are required." },
        { status: 400 }
      );
    }

    const updated = await prisma.contactLead.update({
      where: { id },
      data: {
        status,
        ...(adminNote
          ? {
              metadata: {
                adminNote,
                reviewedAt: new Date().toISOString(),
              },
            }
          : {}),
      },
      include: {
        partner: { select: { id: true, slug: true, name: true } },
        appUser: { select: { id: true, email: true } },
      },
    });

    return NextResponse.json({
      lead: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        subject: updated.subject,
        message: updated.message,
        source: updated.source,
        status: updated.status,
        sessionId: updated.sessionId,
        visitorId: updated.visitorId,
        profileType: updated.profileType,
        metadata: updated.metadata,
        partner: updated.partner,
        appUser: updated.appUser,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    console.error("[admin/leads PATCH]", e);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
