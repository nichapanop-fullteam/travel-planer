"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Route, Wallet } from "lucide-react";
import type { Day, FeedTrip } from "@/types";
import { ActivityTimeline } from "@/components/plan/ActivityTimeline";
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
    const x = 12 + (i * 76) / Math.max(stops.length - 1, 1);
    const y = i % 2 === 0 ? 30 : 65;
    return { x, y };
  });

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ background: "linear-gradient(140deg, #c8dfca 0%, #b4cec4 45%, #c2d5ce 100%)", minHeight: 260 }}
    >
      <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.25 }}>
        <defs>
          <pattern id="pluno-route-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0L0 0 0 22" fill="none" stroke="#2a7d50" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pluno-route-grid)" />
      </svg>

      <svg className="absolute inset-0 h-full w-full">
        <polyline
          points={positions.map((p) => `${p.x}%,${p.y}%`).join(" ")}
          fill="none"
          stroke="#1f5b45"
          strokeWidth="2"
          strokeDasharray="6 5"
          opacity="0.6"
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
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: categoryColorVar[activity.category] }}
              >
                {i + 1}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/95 py-1 pl-1 pr-3 shadow">
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
    </div>
  );
}
