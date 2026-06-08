"use client";

import { CalendarCheck, HelpCircle, MapPin, UtensilsCrossed } from "lucide-react";

interface Props {
  isDark: boolean;
  disabled?: boolean;
  onAction: (message: string) => void;
}

const ACTIONS = [
  { icon: CalendarCheck, label: "Book a room", message: "I'd like to book a room — what do you have available?" },
  { icon: MapPin, label: "Directions", message: "How do I get to the hotel and where can I park?" },
  { icon: UtensilsCrossed, label: "Dining", message: "What dining options do you have and what are the hours?" },
  { icon: HelpCircle, label: "My booking", message: "I need help with my booking." },
] as const;

export function QuickActionsBar({ isDark, disabled, onAction }: Props) {
  return (
    <div
      className={`sticky bottom-0 z-10 -mx-4 sm:-mx-5 px-4 sm:px-5 py-2 border-t backdrop-blur-md ${
        isDark ? "border-iron-border bg-void-canvas/85" : "border-neutral-200 bg-white/90"
      }`}
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-premium pb-0.5">
        {ACTIONS.map(({ icon: Icon, label, message }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onAction(message)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40 ${
              isDark
                ? "border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-sky-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5 opacity-70" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
