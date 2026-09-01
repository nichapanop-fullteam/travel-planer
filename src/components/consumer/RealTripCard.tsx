"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Heart, LoaderCircle, MapPin, Shuffle, Trash2 } from "lucide-react";
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
// when that response actually has them. Nothing here is fabricated: no fake
// "verified" badge, and the price only gets a "/คน" suffix when it's a real
// total ÷ real groupSize, never just relabeled.
// The bookmark toggle is real (POST/DELETE /trips/:id/save) and
// hidden entirely for the signed-in user's own trips (isOwn) — saving your
// own trip isn't a real action. `onSavedChange` fires once the save/unsave
// call actually succeeds (not optimistically) — /saved uses it to drop a
// card the moment it's unsaved; /main just ignores it.
// The footer heart is a separate real action (POST/DELETE /trips/:id/like)
// from the bookmark — liking and saving are independent states now, each
// with its own counter. The pluno reference puts a bookmark count in that
// second footer slot, but saveCount has no backend field in any environment
// (see BackendTrip.saveCount), so the slot carries likeCount — the counter
// that is real and public — rather than a number the API can't back.
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
  topRemix = false,
}: {
  trip: BackendTripListItem;
  isOwn: boolean;
  onSavedChange?: (tripId: string, saved: boolean) => void;
  showStatus?: boolean;
  onDelete?: () => void;
  deleting?: boolean;
  /** Pushes this card's cover taller than the 4/5 default on the masonry
   *  layout (<=1024px), to seed the column stagger — masonry compounds any
   *  height difference down the column, so it doesn't take much. At 3/4 the
   *  cover is ~7% taller than its neighbours, which is enough for the two
   *  columns to read as staggered rather than as a plain grid.
   *  Ignored from 1025px up, where the feed is a uniform grid and a mismatched
   *  card would look like a mistake. */
  tall?: boolean;
  /** Opt-in cover pill reading "Top Remix" instead of "รีมิกซ์" — the caller's
   *  own real ranking (e.g. /remix's top-N-by-remixCount rail), never derived
   *  in here. Wins the one cover-pill slot over the plain isRemix pill below:
   *  a trip can be both a remix of something AND itself heavily remixed, and
   *  "top" is the more specific, more interesting fact to lead with. */
  topRemix?: boolean;
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
  //
  // `username` is read off customer opportunistically and is NOT part of
  // BackendTripCustomer: the reference's creator chip is an "@handle", and
  // the confirmed customer fields are id/name/avatarUrl/groupSize only. So
  // the chip renders "@username" when the response happens to carry one and
  // falls back to the plain display name when it doesn't — never an "@" glued
  // onto a display name to look like a handle.
  type TripDetail = {
    customer?: BackendTripCustomer & { username?: string };
    saveCount?: number;
    remixCount?: number;
  };
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
  const creatorLabel = creator ? (creator.username ? `@${creator.username}` : creator.name) : null;
  const remixCount = trip.remixCount ?? detail?.remixCount ?? null;

  // avatarUrl being present doesn't mean it loads — real rows point at URLs
  // that 404 (expired signed links, deleted objects). Left unhandled the
  // browser paints its broken-image glyph, and inside the reference's small
  // creator chip that reads as a rendering bug rather than a missing photo, so
  // a failed load falls through to the same initial-letter circle used when
  // there's no avatarUrl at all. Storing the URL that failed rather than a
  // boolean is what makes this self-correcting: a later detail response with a
  // different avatarUrl is retried on its own, with no effect resetting a flag.
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarUrl = creator?.avatarUrl && creator.avatarUrl !== failedAvatarUrl ? creator.avatarUrl : null;

  // Real per-person split (totalBudget ÷ groupSize) only when both are
  // known — never just relabels the trip's total with "/คน". totalBudget 0
  // means "nothing costed yet" (see BackendTripListItem's doc comment), not
  // "free", so that case says so instead of showing ฿0.
  const perPersonBudget =
    creator && creator.groupSize > 0 && trip.totalBudget > 0 ? Math.round(trip.totalBudget / creator.groupSize) : null;

  // The reference's dark cover pill. It reads "Top Remix" there, but no
  // endpoint exposes a remix ranking, so the pill is driven by the one real
  // remix fact a feed row carries: sourceTripId, i.e. this trip was itself
  // created through POST /trips/:sourceTripId/remix. Labelled for what that
  // actually means rather than claiming a "top" the backend can't confirm.
  const isRemix = Boolean(trip.sourceTripId);

  const durationDays = trip.schedule?.durationDays ?? null;

  return (
    // The white card panel is back: the pluno reference frames the cover in a
    // rounded, shadowed card with the title, meta line and creator/stats
    // footer inside it, rather than letting the cover sit bare on the page.
    // h-full + the footer's mt-auto pin the creator line to the bottom of
    // every card in a grid row, so a card carrying a price line doesn't push
    // its footer 20px below its neighbour's. Both are scoped to >=1025px:
    // under the masonry layout there's no equal-height row to stretch to, and
    // stretching there would defeat the stagger this is all for.
    <article className="group flex flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.08)] transition-shadow hover:shadow-[0_6px_20px_rgba(16,24,40,0.12)] min-[1025px]:h-full">
      {/* Both links go to the read-only /view-trip/[id], not the
          /generated-plan/[id] working surface — a card is a browse affordance,
          so tapping one should open the trip to look at, never to edit. */}
      <Link
        href={`/view-trip/${trip.id}`}
        className={`relative block overflow-hidden rounded-[24px] bg-[var(--color-surface)] ${
          // Landscape cover, per the reference. `tall` keeps a portrait one on
          // masonry only, to seed the column stagger.
          tall ? "aspect-[3/4] min-[1025px]:aspect-[4/5]" : "aspect-[4/5]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.coverImage?.urls.large ?? galleryCover ?? "/images/hero-mountain.jpg"}
          alt={trip.title || trip.destination}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />

        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          {/* Owner-only status badge wins the slot on /my-trips — there's
              nowhere else on the card that says whether a trip is a draft. */}
          {showStatus ? (
            <StatusBadge status={trip.status} />
          ) : topRemix ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm min-[640px]:gap-1.5 min-[640px]:px-2.5 min-[640px]:py-1.5 min-[640px]:text-[11px]">
              <Shuffle size={11} />
              Top Remix
            </span>
          ) : isRemix ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm min-[640px]:gap-1.5 min-[640px]:px-2.5 min-[640px]:py-1.5 min-[640px]:text-[11px]">
              <Shuffle size={11} />
              รีมิกซ์
            </span>
          ) : (
            <span />
          )}

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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-danger)] shadow-[0_2px_6px_rgba(16,24,40,0.18)] transition hover:bg-[var(--color-danger)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          ) : (
            !isOwn && (
              // Solid white circle with a violet glyph, per the reference —
              // it used to be a translucent black chip leaning on the cover
              // gradient, which the reference doesn't have.
              <button
                type="button"
                onClick={handleToggleSaved}
                aria-pressed={saved}
                aria-label="บันทึกทริปนี้"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-accent-violet)] shadow-[0_2px_6px_rgba(16,24,40,0.18)] transition hover:bg-white/90 disabled:opacity-60"
                disabled={saving}
              >
                <Bookmark size={16} className={saved ? "fill-[var(--color-accent-violet)]" : ""} />
              </button>
            )
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-1.5">
        <Link href={`/view-trip/${trip.id}`} className="block">
          <h2 className="line-clamp-1 text-[13px] font-bold leading-snug text-[var(--foreground)] min-[640px]:text-[14px] min-[1025px]:text-[15px]">
            {trip.title || trip.destination}
          </h2>
        </Link>

        {/* One meta line — pinned destination, duration, price — bullet
            separated, exactly the reference's row. Each segment is dropped
            when its field is missing (schedule is absent on some real GET
            /trips rows, and totalBudget 0 means "nothing costed yet"), so the
            line never shows a stray bullet or an empty value. The price's
            pending case comes first so no number shows before its unit is
            known. */}
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium text-[var(--color-muted)] min-[640px]:text-[11px] min-[1025px]:mt-1.5">
          <span className="inline-flex min-w-0 items-center gap-0.5 font-semibold text-[var(--color-accent-violet)]">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{trip.destination}</span>
          </span>

          {durationDays != null && (
            <>
              <span aria-hidden>•</span>
              <span>{durationDays} วัน</span>
            </>
          )}

          {trip.totalBudget > 0 && (
            <>
              <span aria-hidden>•</span>
              {!detailSettled ? (
                <span aria-hidden className="h-3 w-14 animate-pulse rounded bg-[var(--color-surface)]" />
              ) : (
                <span className="font-semibold text-[var(--foreground)]">
                  {formatTHB(perPersonBudget ?? trip.totalBudget)}
                  <span className="font-medium text-[var(--color-muted)]">
                    {perPersonBudget != null ? " /คน" : " รวม"}
                  </span>
                </span>
              )}
            </>
          )}
        </div>

        {/* Creator chip left, reactions right, under a hairline rule — the
            reference's footer. mt-auto (>=1025px only) is what keeps it flush
            with the bottom of the card. */}
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2 min-[640px]:mt-3 min-[640px]:pt-2.5 min-[1025px]:mt-auto">
          {creatorLabel ? (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-[var(--color-sel-bg)] py-0.5 pl-0.5 pr-1.5 min-[640px]:pr-2">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  onError={() => setFailedAvatarUrl(avatarUrl)}
                  className="h-3.5 w-3.5 shrink-0 rounded-full object-cover min-[640px]:h-4 min-[640px]:w-4"
                />
              ) : (
                <span
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[7px] font-semibold text-white min-[640px]:h-4 min-[640px]:w-4 min-[640px]:text-[8px]"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {creatorLabel.replace(/^@/, "").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate text-[9px] font-semibold text-[var(--color-deep-green)] min-[640px]:text-[10px]">
                {creatorLabel}
              </span>
            </span>
          ) : (
            <span />
          )}

          <div className="flex shrink-0 items-center gap-2 min-[640px]:gap-2.5">
            {remixCount != null && remixCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--foreground)] min-[640px]:gap-1 min-[640px]:text-[11px]">
                <Shuffle size={13} className="text-[var(--color-accent-violet)]" />
                {remixCount.toLocaleString()}
              </span>
            )}

            {/* Independent from the bookmark on the cover — this is POST/DELETE
                /trips/:id/like. Unlike the bookmark it stays on your own trips:
                liking your own trip is just a reaction. likeCount is public and
                always accurate, which is why it — not the never-implemented
                saveCount — fills the reference's second footer stat. */}
            <button
              type="button"
              onClick={handleToggleLiked}
              aria-pressed={liked}
              aria-label="ถูกใจทริปนี้"
              disabled={liking}
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--foreground)] transition-opacity disabled:opacity-60 min-[640px]:gap-1 min-[640px]:text-[11px]"
            >
              <Heart
                size={13}
                className={liked ? "fill-[var(--color-accent-violet)] text-[var(--color-accent-violet)]" : "text-[var(--color-accent-violet)]"}
              />
              {likeCount.toLocaleString()}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
