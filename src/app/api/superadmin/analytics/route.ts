import { NextResponse } from "next/server";
import { requireSAAuth } from "@/lib/superAdminAuth";
import prisma from "@/lib/prisma";

export async function GET() {
  const auth = await requireSAAuth();
  if (!auth.ok) return auth.error;

  // Aggregate analytics across all hotels
  const [
    totalHotels,
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    totalInteractions,
    totalGuests,
    totalTickets,
    openTickets,
    totalReviews,
    totalServiceRequests,
    openServiceRequests,
  ] = await Promise.all([
    prisma.hotel.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.booking.count({ where: { status: "cancelled" } }),
    prisma.interaction.count(),
    prisma.guest.count(),
    prisma.supportTicket.count(),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.review.count(),
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({ where: { status: { in: ["open", "in_progress"] } } }),
  ]);

  // Bookings created in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentBookings = await prisma.booking.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  // Interactions per day (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentInteractions = await prisma.interaction.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true },
  });
  const dailyInteractions: Record<string, number> = {};
  for (const row of recentInteractions) {
    const day = row.createdAt.toISOString().slice(0, 10);
    dailyInteractions[day] = (dailyInteractions[day] ?? 0) + 1;
  }

  // Review stats
  const reviewRows = await prisma.review.findMany({
    where: { status: "approved" },
    select: { rating: true },
  });
  const avgRating = reviewRows.length > 0
    ? Math.round(reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length * 10) / 10
    : 0;

  // Language distribution
  const langRows = await prisma.interaction.findMany({
    select: { language: true },
    take: 1000,
    orderBy: { createdAt: "desc" },
  });
  const langCounts: Record<string, number> = {};
  for (const row of langRows) {
    langCounts[row.language] = (langCounts[row.language] ?? 0) + 1;
  }
  const languageDistribution = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, count]) => ({ language, count }));

  return NextResponse.json({
    totalHotels,
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    recentBookings,
    totalInteractions,
    totalGuests,
    totalTickets,
    openTickets,
    totalReviews,
    avgRating,
    totalServiceRequests,
    openServiceRequests,
    dailyInteractions,
    languageDistribution,
    escalationRate: totalInteractions > 0
      ? Math.round((totalTickets / totalInteractions) * 100 * 10) / 10
      : 0,
  });
}
