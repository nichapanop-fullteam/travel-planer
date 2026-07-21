"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import type { FeedTrip } from "@/types";
import { DayCard } from "@/components/plan/DayCard";
import { BudgetPanel } from "@/components/plan/BudgetPanel";
import { MapPanel } from "@/components/plan/MapPanel";
import { categoryIcon, categoryColorVar, categoryBgVar, categoryLabel } from "@/lib/category-styles";

const TABS = [
  { key: "itinerary", label: "Itinerary" },
  { key: "budget", label: "Budget" },
  { key: "places", label: "Places" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function TripDetailTabs({ trip }: { trip: FeedTrip }) {
  const [active, setActive] = useState<TabKey>("itinerary");

  return (
    <div>
      <div className="flex gap-2 border-b border-[var(--color-border)]/40 pb-3">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isActive ? "bg-[#1e1e1e] text-white" : "bg-white text-[var(--color-muted)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-5">
        {active === "itinerary" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">Day by Day</p>
            {trip.days.map((day) => (
              <DayCard key={day.id} day={day} />
            ))}
          </div>
        )}

        {active === "budget" && <BudgetPanel trip={trip} />}

        {active === "places" && <PlacesTab trip={trip} />}
      </div>
    </div>
  );
}

function PlacesTab({ trip }: { trip: FeedTrip }) {
  const spots = Array.from(
    new Map(
      trip.days
        .flatMap((day) => day.activities)
        .filter((a) => a.location)
        .map((a) => [a.location!.name, a])
    ).values()
  );

  return (
    <div className="flex flex-col gap-4">
      <MapPanel trip={trip} />
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">Recommended Spots</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {spots.map((spot) => {
          const Icon = categoryIcon[spot.category];
          return (
            <div
              key={spot.location!.name}
              className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)]/40 bg-white p-3"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: categoryBgVar[spot.category] }}
              >
                <Icon size={16} style={{ color: categoryColorVar[spot.category] }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{spot.location!.name}</p>
                <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  <MapPin size={10} />
                  {categoryLabel[spot.category]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
