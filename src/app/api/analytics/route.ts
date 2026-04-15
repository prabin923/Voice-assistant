import { NextResponse } from "next/server";
import { interactions } from "@/lib/db";

export async function GET() {
  try {
    const total = interactions.totalCount();
    const today = interactions.todayCount();
    const avgDaily = interactions.avgPerDay(30);
    const dailyCounts = interactions.dailyCounts(30);
    const languageDistribution = interactions.languageDistribution();
    const peakHours = interactions.peakHours();
    const recent = interactions.recent(20);

    return NextResponse.json({
      total,
      today,
      avgDaily,
      dailyCounts,
      languageDistribution,
      peakHours,
      recent,
    });
  } catch (error: any) {
    console.error("Analytics API Error:", error);
    return NextResponse.json({ error: "Failed to load analytics", details: error.message }, { status: 500 });
  }
}
