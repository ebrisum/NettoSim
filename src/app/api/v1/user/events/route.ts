import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "lib/db";
import { requireAppUser } from "lib/auth-user";

function sanitizeString(value: unknown, max = 240): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(request: NextRequest) {
  const { error, user } = await requireAppUser(request);
  if (error || !user) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limit") || "50", 10) || 50)
  );

  const events = await prisma.userLifeEvent.findMany({
    where: { appUserId: user.id },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      eventDate: e.eventDate.toISOString().slice(0, 10),
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAppUser(request);
  if (error || !user) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = sanitizeString(body.title, 140);
  const description = sanitizeString(body.description, 2000);
  const category = sanitizeString(body.category, 80);
  const eventDate = parseDate(body.eventDate) || new Date();
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;
  const metadataJson = metadata
    ? (metadata as unknown as Prisma.InputJsonValue)
    : undefined;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const event = await prisma.userLifeEvent.create({
    data: {
      appUserId: user.id,
      title,
      description: description || null,
      category: category || null,
      eventDate,
      metadata: metadataJson,
    },
  });

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      eventDate: event.eventDate.toISOString().slice(0, 10),
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    },
  });
}
