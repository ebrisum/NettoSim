import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "50", 10)));

  try {
    const sessions = await prisma.session.findMany({
      where: { fingerprintHash: { not: null } },
      select: {
        fingerprintHash: true,
        createdAt: true,
        lastActiveAt: true,
        referrer: true,
        _count: { select: { simulations: true, events: true } },
        simulations: { select: { gross: true } },
      },
      orderBy: { lastActiveAt: "desc" },
    });

    const byFp = new Map<
      string,
      {
        fingerprint: string;
        firstSeen: string;
        lastSeen: string;
        totalSessions: number;
        totalSims: number;
        grossValues: number[];
        referrers: string[];
      }
    >();

    for (const s of sessions) {
      const fp = s.fingerprintHash ?? "";
      if (!fp) continue;
      const cur = byFp.get(fp);
      const grossValues = s.simulations.map((x) => x.gross).filter((g): g is number => g != null);
      if (!cur) {
        byFp.set(fp, {
          fingerprint: fp,
          firstSeen: s.createdAt.toISOString(),
          lastSeen: s.lastActiveAt.toISOString(),
          totalSessions: 1,
          totalSims: s._count.simulations,
          grossValues,
          referrers: [s.referrer || "(direct)"],
        });
      } else {
        cur.totalSessions += 1;
        cur.totalSims += s._count.simulations;
        cur.grossValues.push(...grossValues);
        cur.referrers.push(s.referrer || "(direct)");
        if (new Date(s.createdAt) < new Date(cur.firstSeen)) cur.firstSeen = s.createdAt.toISOString();
        if (new Date(s.lastActiveAt) > new Date(cur.lastSeen)) cur.lastSeen = s.lastActiveAt.toISOString();
      }
    }

    const users = Array.from(byFp.values())
      .map((u) => {
        const avgSalary = u.grossValues.length ? u.grossValues.reduce((a, b) => a + b, 0) / u.grossValues.length : null;
        const refCounts: Record<string, number> = {};
        for (const r of u.referrers) refCounts[r] = (refCounts[r] || 0) + 1;
        const topRef = Object.entries(refCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "(direct)";
        return {
          fingerprint: u.fingerprint.length > 12 ? u.fingerprint.slice(0, 12) + "…" : u.fingerprint || "Anonymous",
          fingerprintFull: u.fingerprint,
          firstSeen: u.firstSeen,
          lastSeen: u.lastSeen,
          totalSessions: u.totalSessions,
          totalSims: u.totalSims,
          avgSalary: avgSalary != null ? Math.round(avgSalary) : null,
          topReferrer: topRef,
        };
      })
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, limit);

    return NextResponse.json({ users });
  } catch (e) {
    console.error("[admin/users GET]", e);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
