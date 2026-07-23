import Link from "next/link";
import { ChevronLeft, Luggage, UserPlus } from "lucide-react";
import type { FeedTrip } from "@/types";
import { getTripDaysNightsLabel, getTripDateRange } from "@/lib/trip-utils";

export function TripDetailHeader({ trip }: { trip: FeedTrip }) {
  const overflowCount = Math.max(trip.members.length - 4, 0);
  const visibleMembers = trip.members.slice(0, 4);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link
          href="/main"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)]/50 bg-white"
        >
          <ChevronLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold">{trip.title}</h1>
          <p className="text-xs text-[var(--color-muted)]">
            {getTripDaysNightsLabel(trip)} · {getTripDateRange(trip)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--color-accent-orange)" }}
        >
          <Luggage size={16} className="text-white" />
        </span>
        <div className="flex -space-x-2">
          {visibleMembers.map((m) => (
            <span
              key={m.name}
              title={m.name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[var(--color-surface)] text-sm"
            >
              {m.avatar}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[var(--color-border)]/40 text-[11px] font-semibold">
              +{overflowCount}
            </span>
          )}
        </div>
        <button className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)]/60 px-3.5 py-2 text-xs font-semibold">
          <UserPlus size={14} />
          Invite
        </button>
      </div>
    </div>
  );
}
