import Link from "next/link";
import { Bookmark, Star } from "lucide-react";
import type { FeedTrip } from "@/types";
import { feedCategoryLabel } from "@/lib/feed-categories";
import { getTripDurationLabel, getTripTotalCost, formatTHB } from "@/lib/trip-utils";

export function TripCard({ trip }: { trip: FeedTrip }) {
  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)]/40 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.coverImageUrl}
          alt={trip.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <span
          className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {feedCategoryLabel[trip.category]}
        </span>
        <button
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90"
          aria-label="บันทึก"
        >
          <Bookmark size={14} className="text-[var(--foreground)]" />
        </button>
      </div>

      <div className="flex flex-col gap-1 p-3">
        <p className="text-sm font-semibold">{trip.title}</p>
        <p className="truncate text-xs text-[var(--color-muted)]">{trip.destination}</p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="font-semibold">{formatTHB(getTripTotalCost(trip))}</span>
          <span className="text-[var(--color-muted)]">{getTripDurationLabel(trip)}</span>
          <span className="flex items-center gap-0.5 font-medium text-[var(--color-accent-orange)]">
            <Star size={12} fill="currentColor" />
            {trip.rating}
          </span>
        </div>
      </div>
    </Link>
  );
}
