import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/db";
import { requireAppUser } from "lib/auth-user";

function sanitizeString(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, max);
  return v || null;
}

export async function GET(request: NextRequest) {
  const { error, user } = await requireAppUser(request);
  if (error || !user) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scenarioCount, eventCount] = await Promise.all([
    prisma.savedScenario.count({ where: { appUserId: user.id } }),
    prisma.userLifeEvent.count({ where: { appUserId: user.id } }),
  ]);

  return NextResponse.json({
    profile: {
      id: user.id,
      supabaseUserId: user.supabaseUserId,
      email: user.email,
      displayName: user.displayName,
      visitorId: user.visitorId,
    },
    stats: {
      savedScenarios: scenarioCount,
      lifeEvents: eventCount,
    },
  });
}

export async function PUT(request: NextRequest) {
  const { error, user } = await requireAppUser(request);
  if (error || !user) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const displayName = sanitizeString(body.displayName, 120);

  const updated = await prisma.appUser.update({
    where: { id: user.id },
    data: {
      displayName,
    },
    select: {
      id: true,
      supabaseUserId: true,
      email: true,
      displayName: true,
      visitorId: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ profile: updated });
}
