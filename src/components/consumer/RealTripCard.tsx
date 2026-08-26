"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, MapPin, Repeat2 } from "lucide-react";
import { saveTrip, unsaveTrip, type BackendTripListItem } from "@/lib/trips-api";
import { getTripGallery } from "@/lib/trip-media-api";
import { formatTHB } from "@/lib/trip-utils";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

// Shared feed card for real trip data from GET /trips, /trips/mine, and
// /trips/saved (see lib/trips-api.ts) — used on /main and /saved.
// BackendTripListItem has no author/likes/description fields (those only
// exist on the full BackendTrip from GET /trips/:id, or aren't tracked
// server-side at all yet), so this only shows what's actually there: cover,
// title/destination, duration, budget, and remix count. The bookmark
// toggle is real (POST/DELETE /trips/:id/save) and hidden entirely for the
// signed-in user's own trips (isOwn) — saving your own trip isn't a real
// action. `onSavedChange` fires once the save/unsave call actually
// succeeds (not optimistically) — /saved uses it to drop a card the moment
// it's unsaved; /main just ignores it.
export function RealTripCard({
  trip,
  isOwn,
  onSavedChange,
}: {
  trip: BackendTripListItem;
  isOwn: boolean;
  onSavedChange?: (tripId: string, saved: boolean) => void;
}) {
  const { backendUser } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const durationLabel = trip.schedule?.durationDays ? `${trip.schedule.durationDays} วัน` : null;

  // Seeded from the list endpoint's own isSaved (accurate only when that
  // request carried a valid token — see listTrips's doc comment); toggled
  // optimistically here and rolled back on failure.
  const [saved, setSaved] = useState(trip.isSaved);
  const [saving, setSaving] = useState(false);

  function handleToggleSaved(e: React.MouseEvent) {
    e.preventDefault();
    if (!backendUser) {
      router.push(`/login?redirect=${encodeURIComponent("/main")}`);
      return;
    }
    if (saving) return;

    const next = !saved;
    setSaved(next);
    setSaving(true);
    (next ? saveTrip(trip.id) : unsaveTrip(trip.id))
      .then(() => onSavedChange?.(trip.id, next))
      .catch(() => {
        setSaved(!next);
        showToast(next ? "บันทึกทริปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "เอาทริปออกจากรายการบันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      })
      .finally(() => setSaving(false));
  }

  // Trip.coverImage (from GET /trips) is only set once PUT /trips/:id/cover
  // has been explicitly called — most trips don't have one yet. Fall back to
  // GET /trips/:tripId/media (#27) and use whichever photo it flags as
  // isCover (or just the first one), same source the trip detail page's own
  // Hero gallery reads from. Skipped entirely once a real cover exists.
  const [galleryCover, setGalleryCover] = useState<string | null>(null);
  useEffect(() => {
    if (trip.coverImage) return;
    let cancelled = false;
    getTripGallery(trip.id, { page: 1, limit: 24 })
      .then((gallery) => {
        if (cancelled) return;
        const cover = gallery.items.find((item) => item.isCover) ?? gallery.items[0];
        if (cover) setGalleryCover(cover.urls.large);
      })
      .catch(() => {
        // No gallery yet (or the request failed) — the hero-mountain.jpg
        // placeholder below covers this silently.
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id, trip.coverImage]);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: "#e1e9e5" }}>
      <Link href={`/generated-plan/${trip.id}`} className="relative block aspect-[0.92] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.coverImage?.urls.large ?? galleryCover ?? "/images/hero-mountain.jpg"}
          alt={trip.title || trip.destination}
          className="h-full w-full object-cover"
        />

        {durationLabel && (
          <span className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            {durationLabel}
          </span>
        )}

        {!isOwn && (
          <button
            type="button"
            onClick={handleToggleSaved}
            aria-pressed={saved}
            aria-label="บันทึกทริปนี้"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white disabled:opacity-60"
            disabled={saving}
          >
            <Bookmark
              size={15}
              className={saved ? "fill-[var(--color-primary)] text-[var(--color-primary)]" : "text-[var(--foreground)]"}
            />
          </button>
        )}
      </Link>

      <div className="flex flex-col gap-2.5 p-5">
        <h2 className="text-lg font-bold leading-snug">{trip.title || trip.destination}</h2>
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
          <MapPin size={13} className="shrink-0" />
          {trip.destination}
        </p>

        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs font-medium text-[var(--color-muted)]">
            {trip.totalBudget > 0 && <span>{formatTHB(trip.totalBudget)}</span>}
            {trip.remixCount != null && trip.remixCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Repeat2 size={13} />
                {trip.remixCount}
              </span>
            )}
          </div>

          <Link
            href={`/generated-plan/${trip.id}`}
            className="shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#17895f" }}
          >
            ดูทริป
          </Link>
        </div>
      </div>
    </article>
  );
}
