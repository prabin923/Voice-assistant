import { NextResponse } from "next/server";
import { interactions, supportTickets, feedback, bookings, ensureDbReady } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// SECURITY: Analytics contain private guest data — require authentication
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await ensureDbReady();

    const total = await interactions.totalCount();
    const today = await interactions.todayCount();
    const avgDaily = await interactions.avgPerDay(30);
    const dailyCounts = await interactions.dailyCounts(30);
    const languageDistribution = await interactions.languageDistribution();
    const peakHours = await interactions.peakHours();
    const recent = await interactions.recent(20);
    const topQuestions = await interactions.topGuestMessages(8);

    // Support & escalation metrics
    const openTickets = await supportTickets.openCount();
    const allTickets = await supportTickets.list();
    const totalTickets = allTickets.length;
    const resolvedTickets = allTickets.filter((t) => t.status === "resolved").length;
    const escalationRate = total > 0 ? Math.round((totalTickets / total) * 100 * 10) / 10 : 0;
    const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

    // Average resolution time (hours)
    let avgResolutionHours = 0;
    const resolved = allTickets.filter((t) => t.resolved_at);
    if (resolved.length > 0) {
      const totalMs = resolved.reduce((sum, t) => {
        return sum + (new Date(t.resolved_at + "Z").getTime() - new Date(t.created_at + "Z").getTime());
      }, 0);
      avgResolutionHours = Math.round((totalMs / resolved.length / 1000 / 60 / 60) * 10) / 10;
    }

    const feedbackStats = await feedback.stats();
    const bookingStats = await bookings.stats();

    return NextResponse.json({
      total,
      today,
      avgDaily,
      dailyCounts,
      languageDistribution,
      peakHours,
      recent,
      topQuestions,
      openTickets,
      totalTickets,
      resolvedTickets,
      escalationRate,
      resolutionRate,
      avgResolutionHours,
      feedbackStats,
      bookingStats,
    });
  } catch (error: unknown) {
    console.error("Analytics API Error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
