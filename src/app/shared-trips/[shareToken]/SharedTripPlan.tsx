"use client";

import { useState } from "react";
import { MapPin, Star } from "lucide-react";
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
    <div className="flex flex-col gap-5">
      {/* Same pill-in-a-tray treatment as PlanTab's day switcher. */}
      {days.length > 1 && (
        <div
          className="flex items-center gap-1 overflow-x-auto rounded-2xl p-1.5"
          style={{ backgroundColor: "#FAF8F5" }}
        >
          {days.map((d, i) => (
            <button
              key={d.dayNumber}
              type="button"
              onClick={() => setDayIndex(i)}
              aria-pressed={i === dayIndex}
              className="flex-1 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition-colors"
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

        <div className="flex flex-col gap-3 px-4 pb-4 pt-4">
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
  );
}

function SharedActivityRow({ activity, index }: { activity: SharedTripActivity; index: number }) {
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

  return (
    <div className="flex items-start gap-3 rounded-xl bg-white p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            {index}
          </span>
          <Icon size={15} style={{ color }} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="min-w-0 break-words text-sm font-semibold">{activity.title}</p>
              {isHighlight && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--color-accent-orange)" }}
                >
                  สถานที่ห้ามพลาด
                </span>
              )}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-semibold">
              {/* The live payload sends time: "" for stops with no set time, so
                  this needs a truthiness check rather than a null check. */}
              {activity.time && (
                <span className="shrink-0" style={{ color: "var(--color-accent-orange)" }}>
                  {activity.time}
                </span>
              )}
              <span className="font-semibold" style={{ color }}>
                {activity.time && "· "}
                {categoryLabel[category]}
              </span>
              {travelText && (
                <span className="font-semibold text-[var(--color-muted)]">· {travelText}</span>
              )}
            </div>

            {(showPlaceName || activity.place?.rating != null) && (
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
          </div>
        </div>
      </div>

      {/* Not a lightbox button like PlanActivityRow's — there's no gallery
          behind a share link (media sits behind ownership), so this is a
          plain thumbnail and only appears when the place actually has one. */}
      {activity.place?.imageUrl && (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activity.place.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}

function formatThaiDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}
