"use client";

import { useState } from "react";
import { Bookmark, GitFork, Star } from "lucide-react";
import type { FeedTrip } from "@/types";
import { DayCard } from "@/components/plan/DayCard";
import { BudgetPanel } from "@/components/plan/BudgetPanel";
import { MapTab } from "@/components/consumer/MapTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "itinerary", label: "Itinerary" },
  { key: "map", label: "Map" },
  { key: "budget", label: "Budget" },
  { key: "notes", label: "Notes" },
  { key: "files", label: "Files" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function TripDetailTabs({ trip }: { trip: FeedTrip }) {
  const [active, setActive] = useState<TabKey>("map");

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b border-[var(--color-border)]/40 pb-3">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isActive ? "bg-[#1e1e1e] text-white" : "bg-white text-[var(--color-muted)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-5">
        {active === "overview" && <OverviewTab trip={trip} />}

        {active === "itinerary" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">Day by Day</p>
            {trip.days.map((day) => (
              <DayCard key={day.id} day={day} />
            ))}
          </div>
        )}

        {active === "map" && <MapTab trip={trip} />}

        {active === "budget" && <BudgetPanel trip={trip} />}

        {active === "notes" && <EmptyTab message="ยังไม่มีบันทึกสำหรับทริปนี้" />}
        {active === "files" && <EmptyTab message="ยังไม่มีไฟล์แนบสำหรับทริปนี้" />}
      </div>
    </div>
  );
}

function OverviewTab({ trip }: { trip: FeedTrip }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[21/9] overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={trip.coverImageUrl} alt={trip.title} className="h-full w-full object-cover" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {trip.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)] text-lg">
            {trip.creator.avatar}
          </span>
          <div>
            <p className="text-sm font-semibold">{trip.creator.name}</p>
            <p className="text-xs text-[var(--color-muted)]">{trip.creator.handle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-[var(--color-muted)]">
          <span className="flex items-center gap-1.5">
            <Bookmark size={14} />
            {trip.saves.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <GitFork size={14} />
            {trip.remixes.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <Star size={14} />
            {trip.rating}
          </span>
        </div>
      </div>

      <p className="text-sm leading-relaxed">{trip.description}</p>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-muted)]">
      {message}
    </div>
  );
}
