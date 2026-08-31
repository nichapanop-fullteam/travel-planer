"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Maximize2, Navigation, Star } from "lucide-react";
import { categoryColorVar, categoryIcon, categoryLabel } from "@/lib/category-styles";
import type { SharedTripActivity, SharedTripDay } from "@/lib/share-api";
import type { ActivityCategory } from "@/types";

// The day selector + "ลำดับแพลน" panel, styled to match PlanTab's own day
// tabs and PlanActivityRow in generated-plan/[id] so a shared plan reads like
// the real trip page rather than a separate, plainer thing.
//
// Client-side only for the day switcher; everything it renders comes from the
// server-fetched payload, so no request happens here (GET
// /shared-trips/:token is rate-limited to 30/min/IP and must stay at one call
// per page load).

const KNOWN_CATEGORIES: ActivityCategory[] = ["transport", "food", "hotel", "sightseeing", "activity", "other"];

// The shared payload types `category` as a plain string, so anything the
// backend adds later lands on "other" instead of crashing the icon lookup.
function asCategory(value: string): ActivityCategory {
  return (KNOWN_CATEGORIES as string[]).includes(value) ? (value as ActivityCategory) : "other";
}

export function SharedTripPlan({ days }: { days: SharedTripDay[] }) {
  const [dayIndex, setDayIndex] = useState(0);
  const day = days[dayIndex];

  if (!day) {
    return (
      <p className="rounded-2xl bg-[var(--color-surface)] p-10 text-center text-sm text-[var(--color-muted)]">
        แผนนี้ยังไม่มีรายละเอียดกิจกรรม
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <h2 className="text-xl font-bold sm:text-2xl">แพลนเที่ยวของคุณ</h2>
      <div className="flex flex-col gap-4 rounded-2xl p-2.5 sm:gap-5 sm:rounded-3xl sm:p-5" style={{ backgroundColor: "#FAF8F5" }}>
      {/* Same pill-in-a-tray treatment as PlanTab's day switcher. */}
      {days.length > 1 && (
        <div
          className="flex items-center gap-1.5 overflow-x-auto rounded-xl border bg-white p-1.5 [scrollbar-width:none] sm:gap-2 sm:rounded-2xl sm:p-2 [&::-webkit-scrollbar]:hidden"
          style={{ borderColor: "var(--color-border)" }}
        >
          {days.map((d, i) => (
            <button
              key={d.dayNumber}
              type="button"
              onClick={() => setDayIndex(i)}
              aria-pressed={i === dayIndex}
              className="min-w-[88px] flex-none whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-bold sm:min-w-0 sm:flex-1 sm:rounded-xl sm:px-5"
              style={
                i === dayIndex
                  ? { backgroundColor: "var(--color-brand-green)", color: "#fff" }
                  : { color: "var(--color-muted)" }
              }
            >
              วันที่ {d.dayNumber}
            </button>
          ))}
        </div>
      )}

      <div className="min-w-0 overflow-hidden rounded-2xl" style={{ backgroundColor: "#FAF8F5" }}>
        <div
          className="flex items-center justify-between gap-3 rounded-t-2xl px-4 py-3"
          style={{ backgroundColor: "var(--color-sel-bg)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--color-brand-green)" }}>
            ลำดับแพลน
          </h2>
          {day.date && <span className="text-xs font-semibold text-[var(--color-muted)]">{formatThaiDate(day.date)}</span>}
        </div>

        <div className="flex flex-col gap-3 px-2 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
          {day.activities.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--color-muted)]">ยังไม่มีกิจกรรมในวันนี้</p>
          ) : (
            day.activities.map((activity, i) => (
              // Keyed by `order` — this payload carries no ids at all, by
              // design (see SharedTrip in lib/share-api.ts).
              <SharedActivityRow key={activity.order} activity={activity} index={i + 1} />
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function SharedActivityRow({ activity, index }: { activity: SharedTripActivity; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const category = asCategory(activity.category);
  const Icon = categoryIcon[category];
  const color = categoryColorVar[category];

  // Same "how did we get here" line PlanActivityRow shows, rebuilt from
  // travelFromPrevious when the backend didn't send a ready-made travelNote.
  const travelText =
    activity.travelNote ||
    [
      activity.travelFromPrevious?.durationMin != null ? `~${activity.travelFromPrevious.durationMin} นาที` : null,
      activity.travelFromPrevious?.distanceKm != null ? `${activity.travelFromPrevious.distanceKm} กม.` : null,
    ]
      .filter(Boolean)
      .join(" · ") ||
    null;

  const isHighlight = category === "sightseeing";
  const showPlaceName = activity.place?.name && activity.place.name !== activity.title;
  const imageUrl = activity.place?.imageUrl ?? "/images/luang-prabang.jpg";
  const hasDetails = Boolean(travelText || showPlaceName || activity.place?.rating != null);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place?.name || activity.title)}`;

  return (
    <div className="rounded-2xl border bg-white p-2.5 sm:p-3" style={{ borderColor: "var(--color-border-tag)" }}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--foreground)] text-[9px] font-bold text-white sm:h-5 sm:w-5 sm:text-[10px]">
            {index}
          </span>
          <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/90 sm:h-5 sm:w-5">
            <Maximize2 size={10} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="min-w-0 break-words text-sm font-bold sm:text-[15px]">{activity.title}</p>
              {isHighlight && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--color-accent-orange)" }}
                >
                  สถานที่ห้ามพลาด
                </span>
              )}
              </div>
            </div>
            {hasDetails && (
              <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs" style={{ backgroundColor: "#FAF8F5" }}>
                <span className="hidden sm:inline">{expanded ? "ย่อละเอียด" : "ดูละเอียด"}</span>
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {/* The live payload sends time: "" for stops with no set time, so
                  this needs a truthiness check rather than a null check. */}
              {activity.time && (
                <span className="shrink-0" style={{ color: "var(--color-accent-orange)" }}>
                  {activity.time}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs" style={{ color, borderColor: "var(--color-border-tag)" }}>
                <Icon size={12} />
                {categoryLabel[category]}
              </span>
            </div>

            {expanded && travelText && <p className="mt-1.5 break-words text-xs leading-relaxed text-[var(--color-muted)] sm:text-sm">{travelText}</p>}
            {expanded && (showPlaceName || activity.place?.rating != null) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[var(--color-muted)]">
                {showPlaceName && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin size={11} className="shrink-0" />
                    <span className="min-w-0 break-words">{activity.place?.name}</span>
                  </span>
                )}
                {activity.place?.rating != null && (
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <Star size={11} />
                    {activity.place.rating}
                  </span>
                )}
              </div>
            )}
            {expanded && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-orange)] px-2.5 py-1 text-[11px] font-bold text-white">
                <Navigation size={11} />
                นำทาง
              </a>
            )}
          </div>
        </div>
    </div>
  );
}

function formatThaiDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}
