import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const period = request.nextUrl.searchParams.get("period") || "30d";
  const days = period === "90d" ? 90 : period === "7d" ? 7 : 30;
  const from = new Date(Date.now() - days * 86400000);

  try {
    const events = await prisma.event.findMany({
      where: { type: "pattern_detected", createdAt: { gte: from } },
      select: { payload: true, createdAt: true },
    });

    const byDay: Record<number, number> = {};
    for (let d = 0; d <= 6; d++) byDay[d] = 0;
    const byHour: Record<number, number> = {};
    for (let h = 0; h < 24; h++) byHour[h] = 0;
    for (const e of events) {
      const d = new Date(e.createdAt);
      byDay[d.getDay()] = (byDay[d.getDay()] ?? 0) + 1;
      byHour[d.getHours()] = (byHour[d.getHours()] ?? 0) + 1;
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const peakDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

    const insights: string[] = [];
    if (peakDay && peakDay[1] > 0) {
      insights.push(`Peak pattern activity: ${dayNames[parseInt(peakDay[0], 10)]}s`);
    }
    if (peakHour && peakHour[1] > 0) {
      insights.push(`Peak hour: ${peakHour[0]}:00`);
    }
    if (events.length > 0) {
      insights.push(`${events.length} pattern(s) detected in the last ${days} days`);
    }

    return NextResponse.json({ insights: insights.length ? insights : ["No pattern data in this period."] });
  } catch (e) {
    console.error("[admin/patterns/insights]", e);
    return NextResponse.json({ error: "Failed to load insights" }, { status: 500 });
  }
}
