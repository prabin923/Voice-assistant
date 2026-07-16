"use client";

import { Award } from "lucide-react";
import { getLoyaltyPerks, TIER_COLORS, TIER_ICONS } from "@/lib/loyalty";

interface Props {
  bookingCount: number;
}

export function LoyaltyBadge({ bookingCount }: Props) {
  const perks = getLoyaltyPerks(bookingCount);
  const color = TIER_COLORS[perks.tier] || "#cd7f32";
  const icon = TIER_ICONS[perks.tier] || "🥉";

  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl p-3 text-left border transition-all duration-300 hover:scale-[1.01]"
      style={{
        borderColor: `${color}40`,
        background: `${color}08`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <div>
          <span className="text-xs font-black uppercase tracking-wider" style={{ color }}>
            {perks.label} Member
          </span>
          <p className="text-[11px] text-neutral-400 font-medium">
            {bookingCount} completed stay{bookingCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      
      <div className="mt-1 space-y-1">
        <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Perks</p>
        <ul className="grid grid-cols-1 gap-0.5 pl-3 list-disc">
          {perks.perks.map((p, idx) => (
            <li key={idx} className="text-[11px] text-neutral-300">
              {p}
            </li>
          ))}
        </ul>
      </div>

      {perks.nextTier && (
        <p className="mt-2 text-[10px] font-semibold text-neutral-500 border-t border-neutral-800/50 pt-1.5">
          💡 Book {perks.nextTier.bookingsNeeded} more stay{perks.nextTier.bookingsNeeded === 1 ? "" : "s"} to reach {perks.nextTier.name}!
        </p>
      )}
    </div>
  );
}
