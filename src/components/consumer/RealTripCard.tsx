"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Heart, LoaderCircle, Repeat2, Trash2 } from "lucide-react";
import { likeTrip, saveTrip, unlikeTrip, unsaveTrip, type BackendTripCustomer, type BackendTripListItem } from "@/lib/trips-api";
import { getTripGallery } from "@/lib/trip-media-api";
import { formatTHB } from "@/lib/trip-utils";
import { StatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

// Shared feed card for real trip data from GET /trips, /trips/mine, and
// /trips/saved (see lib/trips-api.ts) — used on /main and /saved.
// BackendTripListItem itself has no creator/save-count/groupSize fields
// (those only exist on the full BackendTrip from GET /trips/:id) — this
// card fetches that one extra time per card, same pattern as the gallery
// cover fallback below, and only renders the creator row / per-person price
// / save count when that response actually has them. Nothing here is
// fabricated: no fake "verified" badge, and the price only gets a "/คน"
// suffix when it's a real total ÷ real groupSize, never just relabeled.
// The bookmark toggle is real (POST/DELETE /trips/:id/save) and
// hidden entirely for the signed-in user's own trips (isOwn) — saving your
// own trip isn't a real action. `onSavedChange` fires once the save/unsave
// call actually succeeds (not optimistically) — /saved uses it to drop a
// card the moment it's unsaved; /main just ignores it.
// The footer heart is a separate real action (POST/DELETE /trips/:id/like)
// from the bookmark — liking and saving are independent states now, each
// with its own counter (likeCount is public and always accurate, unlike the
// never-implemented saveCount). Unlike the bookmark, the heart is NOT hidden
// for isOwn — you can like your own trip.
// `showStatus` and `onDelete` are the owner-management affordances /my-trips
// needs on top of the plain feed card (draft/published badge, delete). Both
// are opt-in so /main and /saved keep the unadorned card.
export function RealTripCard({
  trip,
  isOwn,
  onSavedChange,
  showStatus = false,
  onDelete,
  deleting = false,
  tall = false,
}: {
  trip: BackendTripListItem;
  isOwn: boolean;
  onSavedChange?: (tripId: string, saved: boolean) => void;
  showStatus?: boolean;
  onDelete?: () => void;
  deleting?: boolean;
  /** Gives this card a different cover ratio on the masonry layout (<=1024px)
   *  to seed the column stagger — masonry compounds any height difference down
   *  the column, so it doesn't take much. Ignored from 1025px up, where the
   *  feed is a uniform grid and a mismatched card would look like a mistake. */
  tall?: boolean;
}) {
  const { backendUser } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  // Seeded from the list endpoint's own isSaved (accurate only when that
  // request carried a valid token — see listTrips's doc comment); toggled
  // optimistically here and rolled back on failure.
  const [saved, setSaved] = useState(trip.isSaved ?? false);
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

  // Same seed/optimistic-toggle/rollback shape as saved/saving above, but
  // independent state — liking and saving are two separate real actions now.
  // likeCount is bumped/dropped locally alongside it so the number next to
  // the heart updates immediately instead of waiting for the next fetch.
  // `?? 0` / `?? false` because these are declared non-optional on
  // BackendTripListItem but the endpoints are typed straight off raw JSON —
  // GET /trips/mine (what /my-trips renders) omits the like fields entirely,
  // which would otherwise crash on likeCount.toLocaleString() below.
  const [liked, setLiked] = useState(trip.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(trip.likeCount ?? 0);
  const [liking, setLiking] = useState(false);

  function handleToggleLiked(e: React.MouseEvent) {
    e.preventDefault();
    if (!backendUser) {
      router.push(`/login?redirect=${encodeURIComponent("/main")}`);
      return;
    }
    if (liking) return;

    const next = !liked;
    setLiked(next);
    setLikeCount((count) => count + (next ? 1 : -1));
    setLiking(true);
    (next ? likeTrip(trip.id) : unlikeTrip(trip.id))
      .catch(() => {
        setLiked(!next);
        setLikeCount((count) => count + (next ? -1 : 1));
        showToast(next ? "กดถูกใจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "เอาถูกใจออกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      })
      .finally(() => setLiking(false));
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

  // BackendTripListItem (GET /trips) carries no creator/groupSize/saveCount —
  // those only come back on the full BackendTrip, so still fetched here.
  // remixCount (like likeCount) is now reliably on the list row itself, no
  // detail fetch needed for it. Fetched directly against the proxy route
  // (not the trips-api.ts getTrip() helper, which also pages through the
  // full media gallery for itinerary hydration this card doesn't need).
  type TripDetail = { customer?: BackendTripCustomer; saveCount?: number; remixCount?: number };
  const [detail, setDetail] = useState<TripDetail | null>(null);
  // Whether the detail request above has *settled* (succeeded or not), as
  // opposed to `detail` being non-null. The price below needs this: groupSize
  // only arrives with the detail, so before it lands the card can't yet know
  // whether it's showing a per-person or a total figure. Rendering the total
  // in the meantime made each card flip from e.g. ฿12,000 to ฿3,000 / คน
  // hundreds of ms later, and because the cards settle at different times the
  // grid showed a mix of both units at once. Failure flips this too, so a
  // failed fetch falls back to the labelled total instead of a stuck skeleton.
  const [detailSettled, setDetailSettled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trips/${trip.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TripDetail | null) => {
        if (!cancelled && data) setDetail(data);
      })
      .catch(() => {
        // No extra detail to show — the card still works with just the
        // list-item fields.
      })
      .finally(() => {
        if (!cancelled) setDetailSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const creator = detail?.customer ?? null;
  const remixCount = trip.remixCount ?? detail?.remixCount ?? null;

  // Real per-person split (totalBudget ÷ groupSize) only when both are
  // known — never just relabels the trip's total with "/คน". totalBudget 0
  // means "nothing costed yet" (see BackendTripListItem's doc comment), not
  // "free", so that case says so instead of showing ฿0.
  const perPersonBudget =
    creator && creator.groupSize > 0 && trip.totalBudget > 0 ? Math.round(trip.totalBudget / creator.groupSize) : null;

  return (
    // No card container: no white panel, border or shadow. The reference lets
    // the cover carry the shape and drops everything to the page surface, and
    // the chrome was competing with the photos for attention.
    // h-full + the meta row's mt-auto pin the creator line to the bottom of
    // every card in a grid row, so a card carrying a price line doesn't push
    // its meta 20px below its neighbour's. Both are scoped to >=1025px: under
    // the masonry layout there's no equal-height row to stretch to, and
    // stretching there would defeat the stagger this is all for.
    <article className="group flex flex-col min-[1025px]:h-full">
      <Link
        href={`/generated-plan/${trip.id}`}
        className={`relative block overflow-hidden rounded-[6px] bg-[var(--color-surface)] ${
          tall ? "aspect-[6/7] min-[1025px]:aspect-[4/5]" : "aspect-[4/5]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.coverImage?.urls.large ?? galleryCover ?? "/images/hero-mountain.jpg"}
          alt={trip.title || trip.destination}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />

        {/* The gradient only has to keep the corner controls legible now that
            the title has moved off the image, so it's a fraction of what it
            was — the photo is the point. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {/* The tag pill is gone (the reference has no chip, and the same tags
              drive the filter row above the feed). The status badge stays: it's
              owner-only and there's nowhere else on the card that says whether
              a trip is a draft. */}
          {showStatus ? <StatusBadge status={trip.status} /> : <span />}

          {onDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              aria-label={`ลบทริป ${trip.title}`}
              disabled={deleting}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          ) : (
            !isOwn && (
              <button
                type="button"
                onClick={handleToggleSaved}
                aria-pressed={saved}
                aria-label="บันทึกทริปนี้"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-60"
                disabled={saving}
              >
                <Bookmark size={14} className={saved ? "fill-white" : ""} />
              </button>
            )
          )}
        </div>
      </Link>

      {/* Title sits under the cover in dark text rather than overlaid in white.
          Reads at any cover brightness — the overlaid version had to fight
          bright photos and covers that already have their own text baked in. */}
      <Link href={`/generated-plan/${trip.id}`} className="mt-2 block">
        <h2 className="line-clamp-2 text-[13px] font-bold leading-snug text-[var(--foreground)] min-[1025px]:text-sm">
          {trip.title || trip.destination}
        </h2>
      </Link>

      {/* Destination and duration are usually already inside the title (real
          titles read "หลวงพระบาง, ลาว 4 วัน 3 คืน"), so only the price gets its
          own line — and only when there is one. Order matters: the pending case
          comes first so no number shows until its unit is known. */}
      {trip.totalBudget > 0 &&
        (!detailSettled ? (
          <span aria-hidden className="mt-1 h-3.5 w-16 animate-pulse rounded bg-[var(--color-surface)]" />
        ) : (
          <p className="mt-1 text-[11px] font-extrabold text-[var(--color-primary)] min-[1025px]:text-xs">
            {formatTHB(perPersonBudget ?? trip.totalBudget)}
            <span className="font-semibold text-[var(--color-muted)]">
              {perPersonBudget != null ? " / คน" : " รวม"}
            </span>
          </p>
        ))}

      {/* Creator left, reactions right — the reference's meta row. */}
      <div className="flex items-center justify-between gap-2 pt-1.5 min-[1025px]:mt-auto">
        <div className="flex min-w-0 items-center gap-1.5">
          {creator ? (
            <>
              {creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creator.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
              ) : (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {creator.name.charAt(0).toUpperCase()}
                </span>
              )}
              <p className="truncate text-[10px] font-medium text-[var(--color-muted)] min-[1025px]:text-[11px]">{creator.name}</p>
            </>
          ) : (
            <span />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {remixCount != null && remixCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--color-muted)] min-[1025px]:text-[11px]">
              <Repeat2 size={13} />
              {remixCount}
            </span>
          )}

          {/* Independent from the bookmark on the cover — this is POST/DELETE
              /trips/:id/like. Unlike the bookmark it stays on your own trips:
              liking your own trip is just a reaction. likeCount is public and
              always accurate. */}
          <button
            type="button"
            onClick={handleToggleLiked}
            aria-pressed={liked}
            aria-label="ถูกใจทริปนี้"
            disabled={liking}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold transition-colors disabled:opacity-60 min-[1025px]:text-[11px]"
            style={{ color: liked ? "var(--color-primary)" : "var(--color-muted)" }}
          >
            <Heart size={13} className={liked ? "fill-[var(--color-primary)]" : ""} />
            {likeCount.toLocaleString()}
          </button>
        </div>
      </div>
    </article>
  );
}
