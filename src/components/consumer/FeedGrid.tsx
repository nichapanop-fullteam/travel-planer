"use client";

import { useState } from "react";
import type { FeedCategory, FeedTrip } from "@/types";
import { FEED_CATEGORIES } from "@/lib/feed-categories";
import { TripCard } from "@/components/consumer/TripCard";

// The only client-side interactivity on the Home page: filter the grid by category pill.
export function FeedGrid({ trips }: { trips: FeedTrip[] }) {
  const [active, setActive] = useState<FeedCategory | "all">("all");
  const filtered = active === "all" ? trips : trips.filter((t) => t.category === active);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {FEED_CATEGORIES.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(isActive ? "all" : key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "text-white"
                  : "bg-white text-[var(--color-muted)] hover:bg-[var(--color-border)]/10"
              }`}
              style={isActive ? { backgroundColor: "var(--color-primary)" } : undefined}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--foreground)]">แผนเที่ยวแนะนำ</h2>
        <span className="text-xs text-[var(--color-muted)]">{filtered.length} แผน</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  );
}
