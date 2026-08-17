"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, LocateFixed, Minus, Plus, Route, SlidersHorizontal, Wallet } from "lucide-react";
import type { Day, FeedTrip } from "@/types";
import { ActivityTimeline } from "@/components/plan/ActivityTimeline";
import { FakeMapBackground } from "@/components/plan/FakeMapBackground";
import { categoryBgVar, categoryColorVar, categoryIcon } from "@/lib/category-styles";
import { getDayRouteEstimate, getDayTotalCost, formatDuration, formatTHB } from "@/lib/trip-utils";

// Day-by-day map view — adapted from the group Trip Detail design (map on top,
// day pager below it, that day's stops listed underneath). Pins are laid out
// on a decorative illustration, not a real map — see MapPanel for the same caveat.
export function MapTab({ trip }: { trip: FeedTrip }) {
  const [dayIndex, setDayIndex] = useState(0);
  const day = trip.days[dayIndex];
  const route = getDayRouteEstimate(day);

  return (
    <div className="flex flex-col gap-4">
      <DayPager
        day={day}
        dayIndex={dayIndex}
        total={trip.days.length}
        onPrev={() => setDayIndex((i) => Math.max(i - 1, 0))}
        onNext={() => setDayIndex((i) => Math.min(i + 1, trip.days.length - 1))}
      />

      <DecorativeRouteMap day={day} />

      <div className="grid grid-cols-3 gap-3">
        <StatChip icon={Route} value={`${route.distanceKm} km`} label="Total Distance" />
        <StatChip icon={Clock} value={formatDuration(route.minutes)} label="Total Time" />
        <StatChip icon={Wallet} value={formatTHB(getDayTotalCost(day))} label="Est. Cost" />
      </div>

      <ActivityTimeline day={day} />
    </div>
  );
}

function DayPager({
  day,
  dayIndex,
  total,
  onPrev,
  onNext,
}: {
  day: Day;
  dayIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)]/40 bg-white px-3 py-2.5">
      <button
        onClick={onPrev}
        disabled={dayIndex === 0}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="flex-1 text-center">
        <span className="text-sm font-bold">Day {day.dayNumber}</span>
        <span className="ml-2 text-xs text-[var(--color-muted)]">{day.date}</span>
      </div>
      <button
        onClick={onNext}
        disabled={dayIndex === total - 1}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function StatChip({ icon: Icon, value, label }: { icon: typeof Clock; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--color-border)]/40 bg-white py-3">
      <Icon size={15} style={{ color: "var(--color-primary)" }} />
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function DecorativeRouteMap({ day }: { day: Day }) {
  const stops = day.activities;
  const positions = stops.map((_, i) => {
    // Clamped well inside the edges — each marker is a whitespace-nowrap
    // label centered on its point, so a pin placed too close to 0%/100%
    // would get its label clipped by the map panel's overflow-hidden edge.
    const x = Math.min(80, Math.max(20, 12 + (i * 76) / Math.max(stops.length - 1, 1)));
    const y = i % 2 === 0 ? 30 : 65;
    return { x, y };
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/40" style={{ minHeight: 280 }}>
      <FakeMapBackground />

      <button className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow">
        <SlidersHorizontal size={12} style={{ color: "var(--color-primary)" }} />
        All Places
      </button>

      <svg className="absolute inset-0 h-full w-full">
        <polyline
          points={positions.map((p) => `${p.x}%,${p.y}%`).join(" ")}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeDasharray="7 6"
          strokeLinecap="round"
        />
      </svg>

      {stops.map((activity, i) => {
        const Icon = categoryIcon[activity.category];
        const pos = positions[i];
        return (
          <div
            key={activity.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-4"
                style={{ backgroundColor: "var(--color-primary)", ["--tw-ring-color" as string]: "rgba(42,158,100,0.2)" }}
              >
                {i + 1}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 shadow">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: categoryBgVar[activity.category] }}
                >
                  <Icon size={12} style={{ color: categoryColorVar[activity.category] }} />
                </div>
                <div className="whitespace-nowrap">
                  <p className="text-[11px] font-semibold leading-tight text-[#1a1a1a]">{activity.title}</p>
                  <p className="text-[10px] leading-tight text-[var(--color-muted)]">{activity.time}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl bg-white shadow">
        <button className="flex h-8 w-8 items-center justify-center hover:bg-[var(--color-surface)]">
          <Plus size={14} />
        </button>
        <div className="h-px bg-[var(--color-border)]/40" />
        <button className="flex h-8 w-8 items-center justify-center hover:bg-[var(--color-surface)]">
          <Minus size={14} />
        </button>
        <div className="h-px bg-[var(--color-border)]/40" />
        <button className="flex h-8 w-8 items-center justify-center hover:bg-[var(--color-surface)]">
          <LocateFixed size={13} style={{ color: "var(--color-primary)" }} />
        </button>
      </div>
    </div>
  );
}
