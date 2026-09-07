"use client";

import { useState } from "react";
import { Clock, Coins, MapPin, Navigation, Star } from "lucide-react";
import { categoryIcon, categoryLabel } from "@/lib/category-styles";
import type { SharedTripActivity, SharedTripDay, SharedTripOpeningHours } from "@/lib/share-api";
import { formatTHB } from "@/lib/trip-utils";
import { travelTypeIcon, travelTypeLabel } from "@/lib/travel-styles";
import type { ActivityCategory, TravelType } from "@/types";

// The day selector + itinerary list, borrowed wholesale from ActivityCard on
// view/trip/[id] (the Remix Trip page) so a shared plan reads like the real
// trip page rather than a separate, plainer thing — minus every button that
// adds, removes, or otherwise writes anything (Remix, follow, bookmark): this
// page has no owner-scoped actions to offer, only the plan itself. "นำทาง"
// stays because it's a plain outbound Google Maps link, not a write.
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

const KNOWN_TRAVEL_TYPES: TravelType[] = ["walk", "bicycle", "tuk_tuk", "private_transfer", "rental_car", "boat", "train", "airplane", "other"];

// Same guard as asCategory, for the same reason: the shared payload types
// travelFromPrevious.type as a plain string.
function asTravelType(value: string): TravelType {
  return (KNOWN_TRAVEL_TYPES as string[]).includes(value) ? (value as TravelType) : "other";
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
      {/* Same pill-in-a-tray day switcher as PlanTab's, copied verbatim
          (down to the class names) rather than reinvented — this is the one
          day-switcher style the app actually uses, not view/trip/[id]'s
          separate underline tabs. */}
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

      <div className="flex flex-col gap-5">
        {day.activities.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">ยังไม่มีกิจกรรมในวันนี้</p>
        ) : (
          day.activities.map((activity, i) => (
            // Keyed by `order` — this payload carries no ids at all, by
            // design (see SharedTrip in lib/share-api.ts).
            <SharedActivityCard key={activity.order} activity={activity} index={i + 1} />
          ))
        )}
      </div>
    </div>
  );
}

// Google orders weekdayDescriptions Monday-first; JS Date#getDay is
// Sunday-first (0-6). Returns undefined rather than guessing when the array
// is shorter than expected — a live third-party payload, not a fixed shape
// we control.
function todaysHours(openingHours?: SharedTripOpeningHours): string | undefined {
  const days = openingHours?.weekdayDescriptions;
  if (!days?.length) return undefined;
  const mondayFirstIndex = (new Date().getDay() + 6) % 7;
  return days[mondayFirstIndex];
}

// Google's Thai weekday descriptions come as "วันจันทร์: 08:00–17:00" — the
// day name is redundant next to an explicit "เปิด/ปิด" label, so this drops
// everything up to and including the first ": ". Falls back to the whole
// string if that separator isn't there, rather than guessing at a format a
// live third-party payload doesn't guarantee.
function stripWeekdayPrefix(line: string): string {
  const separatorIndex = line.indexOf(": ");
  return separatorIndex === -1 ? line : line.slice(separatorIndex + 2);
}

function SharedActivityCard({ activity, index }: { activity: SharedTripActivity; index: number }) {
  const category = asCategory(activity.category);
  const CategoryIcon = categoryIcon[category];

  const travelType = activity.travelFromPrevious?.type ? asTravelType(activity.travelFromPrevious.type) : undefined;
  const TravelIcon = travelType ? travelTypeIcon[travelType] : undefined;
  // travelNote is a real authored tip from the backend — only that goes in
  // the "Trip hack" callout below. This is plain "how you got here" context,
  // not a tip, so it sits in the ordinary meta row instead.
  const travelSummary = travelType
    ? [
        travelTypeLabel[travelType],
        activity.travelFromPrevious?.durationMin != null ? `${activity.travelFromPrevious.durationMin} นาที` : null,
        activity.travelFromPrevious?.distanceKm != null ? `${activity.travelFromPrevious.distanceKm} กม.` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  const imageUrl = activity.place?.imageUrl ?? "/images/luang-prabang.jpg";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place?.name || activity.title)}`;
  const openingHours = activity.place?.openingHours;
  const hoursLine = todaysHours(openingHours);
  const hasMetaRow = Boolean(activity.time || travelSummary || activity.cost > 0);
  const hasDetailBlock = Boolean(openingHours || activity.place?.address || activity.place?.description);

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--color-border)" }}>
      <div className="relative h-40 w-full sm:h-48">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white">
          {index}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold sm:text-lg">{activity.title}</h3>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
          >
            <CategoryIcon size={12} />
            {categoryLabel[category]}
          </span>
        </div>

        {hasMetaRow && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--color-muted)]">
            {/* The live payload sends time: "" for stops with no set time, so
                this needs a truthiness check rather than a null check. */}
            {activity.time && <span style={{ color: "var(--color-accent-orange)" }}>{activity.time}</span>}
            {activity.time && travelSummary && <span>·</span>}
            {travelSummary && (
              <span className="inline-flex items-center gap-1">
                {TravelIcon && <TravelIcon size={13} />}
                {travelSummary}
              </span>
            )}
            {travelSummary && activity.cost > 0 && <span>·</span>}
            {activity.cost > 0 && (
              <span className="inline-flex items-center gap-1">
                <Coins size={13} />
                {formatTHB(activity.cost)}
              </span>
            )}
          </div>
        )}

        {/* One hairline rule between "how to get here / what it costs" and
            "what this place actually is" — mirrors the reference layout and
            keeps the two kinds of meta from blurring into one block. */}
        {hasMetaRow && hasDetailBlock && <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />}

        {/* Opening hours, address and description come from a live Google
            lookup, not from anything the trip owner wrote — see
            SharedTripActivity's doc comment in lib/share-api.ts. Absent for a
            hand-typed stop or when that lookup failed, so each renders only
            when present. */}
        {openingHours && (
          <div
            className="flex flex-wrap items-center gap-1.5 text-xs font-semibold"
            style={{ color: openingHours.openNow ? "var(--color-brand-green)" : "var(--color-muted)" }}
          >
            <Clock size={13} className="shrink-0" />
            <span>เปิด/ปิด</span>
            {hoursLine && <span className="font-normal text-[var(--color-muted)]">· {stripWeekdayPrefix(hoursLine)}</span>}
          </div>
        )}

        {activity.place?.address && (
          <div className="flex items-start gap-1.5 text-sm text-[var(--color-muted)]">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">
              {activity.place.address}
              {activity.place.rating != null && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 whitespace-nowrap">
                  <Star size={12} className="inline" />
                  {activity.place.rating}
                </span>
              )}
            </span>
          </div>
        )}

        {activity.place?.description && (
          <p className="text-sm leading-relaxed text-[var(--foreground)]">{activity.place.description}</p>
        )}

        {activity.travelNote && (
          <div
            className="rounded-xl px-3 py-2 text-xs font-medium"
            style={{ backgroundColor: "var(--color-cat-sightseeing-bg, #EAF6EE)", color: "var(--color-brand-green)" }}
          >
            <span className="font-bold">Trip hack </span>
            {activity.travelNote}
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-[#1F2A24] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Navigation size={13} />
            นำทาง
          </a>
        </div>
      </div>
    </div>
  );
}
