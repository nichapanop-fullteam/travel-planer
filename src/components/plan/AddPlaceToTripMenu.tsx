"use client";

// The "+" beside a place: pick one of your own trips and the place is copied
// in. A remix of a single place instead of the whole plan — see
// lib/add-place-to-trip.ts for what the copy actually consists of.
//
// Used from a stop on /view-trip/[id] and from a bookmarked place on /saved,
// which is why it takes an AddablePlace rather than an itinerary Activity.
//
// One step, not two. This menu used to ask which trip and then which day, on
// the grounds that appending to the last day was a guess dressed as a decision
// — which it was. But choosing the day HERE is the same guess one step later:
// the menu is attached to somebody else's itinerary and can offer nothing to
// choose on but a stop count. So the place goes onto the target trip's staging
// shelf, and the day is chosen in the plan builder, where the whole plan is on
// screen and the place can be dragged into it.
//
// The saving is not only in taps: the day step had to read the entire target
// trip (GET /trips/:id) just to count its days, on every trip the traveller
// browsed through.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import { getMyTrips, type BackendTripListItem } from "@/lib/trips-api";
import { addPlaceToTripShelf, type AddablePlace } from "@/lib/add-place-to-trip";
import { createEmptyTripForPlace } from "@/lib/trips-draft-api";
import { PlaceAddedToTripDialog } from "@/components/plan/PlaceAddedToTripDialog";
import { useToast } from "@/providers/ToastProvider";

// The id used for the "สร้างทริปใหม่" row's pending spinner — it has no trip
// id of its own until the create resolves.
const NEW_TRIP = "__new__";

export function AddPlaceToTripMenu({
  place,
  excludeTripId,
  destinationHint,
  signedIn,
  onRequireLogin,
  variant = "icon",
}: {
  place: AddablePlace;
  // The trip being read — offering to add a stop to the plan it is already
  // part of is never what the button means.
  excludeTripId?: string;
  // Where a trip made from this menu would go ("Luang Prabang, Laos"), taken
  // from the trip the place is being read out of. Without one there is nothing
  // honest to name a new trip after — a café is not a destination — so the
  // menu links out to the full /create-trip wizard instead of inventing one.
  destinationHint?: string;
  signedIn: boolean;
  onRequireLogin: () => void;
  // "icon" is the round violet + in a trip card's button cluster; "label" is
  // the wider text button a place card has room for (/saved). Only the trigger
  // differs — the menu below it is the same.
  variant?: "icon" | "label";
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [trips, setTrips] = useState<BackendTripListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  const [addedTripIds, setAddedTripIds] = useState<string[]>([]);
  const [added, setAdded] = useState<{
    tripId: string;
    tripTitle: string;
    linkedToPlace: boolean;
  } | null>(null);

  function loadTrips() {
    setLoading(true);
    setLoadFailed(false);
    getMyTrips()
      .then((list) => setTrips(list.filter((t) => t.id !== excludeTripId)))
      .catch((err) => {
        console.warn("โหลดทริปของฉันไม่สำเร็จ", err);
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }

  function handleToggle() {
    if (!signedIn) {
      onRequireLogin();
      return;
    }
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    // Re-fetched on every open rather than cached for the page's lifetime: a
    // trip created in another tab (or on the way back from /create-trip)
    // should be in this list, and /trips/mine is one small request.
    loadTrips();
  }

  // Shared by both rows: an existing trip, and the one this menu just made.
  function shelvePlace(tripId: string, tripTitle: string, pendingId: string) {
    if (pendingTripId) return;
    setPendingTripId(pendingId);
    addPlaceToTripShelf(tripId, place)
      .then(({ linkedToPlace }) => {
        setAddedTripIds((prev) => [...prev, tripId]);
        setOpen(false);
        setAdded({ tripId, tripTitle, linkedToPlace });
      })
      .catch((err: unknown) => {
        console.warn("เพิ่มสถานที่ลงทริปไม่สำเร็จ", err);
        showToast(
          err instanceof Error ? err.message : "เพิ่มสถานที่ลงทริปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
          "error"
        );
      })
      .finally(() => setPendingTripId(null));
  }

  // Create, then shelve into what was created. A failure to create never
  // reaches shelvePlace, so there is no trip left behind with nothing in it.
  function handleCreateTrip() {
    if (pendingTripId || !destinationHint) return;
    setPendingTripId(NEW_TRIP);
    createEmptyTripForPlace(destinationHint)
      .then((trip) => {
        setPendingTripId(null);
        shelvePlace(trip.id, trip.title || trip.destination, trip.id);
      })
      .catch((err: unknown) => {
        console.warn("สร้างทริปใหม่ไม่สำเร็จ", err);
        showToast(
          err instanceof Error ? err.message : "สร้างทริปใหม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
          "error"
        );
        setPendingTripId(null);
      });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="เพิ่มสถานที่นี้เข้าทริปของฉัน"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggle}
        className={
          variant === "label"
            ? "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
            : "flex h-9 w-9 items-center justify-center rounded-full text-white"
        }
        style={{ backgroundColor: "var(--color-accent-violet)" }}
      >
        <Plus size={variant === "label" ? 13 : 16} />
        {variant === "label" && "เพิ่มลงทริป"}
      </button>

      {open && (
        <>
          {/* Same outside-click catcher the dropdowns in
              BudgetManagementPanel/AddExpenseDialog use. */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white py-2 shadow-[0_12px_32px_-8px_rgba(16,24,40,0.28)] ring-1 ring-black/5"
          >
            <p className="px-4 pb-2 text-sm font-bold">เพิ่มสถานที่ลงทริป</p>
            <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />

            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-muted)]">
                <Loader2 size={14} className="animate-spin" />
                กำลังโหลดทริปของคุณ
              </div>
            )}

            {!loading && loadFailed && (
              <div className="px-4 py-3">
                <p className="text-sm text-[var(--color-muted)]">โหลดทริปของคุณไม่สำเร็จ</p>
                <button
                  type="button"
                  onClick={loadTrips}
                  className="mt-1 text-sm font-semibold"
                  style={{ color: "var(--color-accent-violet)" }}
                >
                  ลองอีกครั้ง
                </button>
              </div>
            )}

            {!loading && !loadFailed && trips?.length === 0 && (
              <p className="px-4 pb-1 pt-3 text-sm text-[var(--color-muted)]">ยังไม่มีทริปของคุณ</p>
            )}

            {!loading &&
              !loadFailed &&
              trips?.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  role="menuitem"
                  disabled={pendingTripId !== null}
                  onClick={() => shelvePlace(trip.id, trip.title || trip.destination, trip.id)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface)] disabled:opacity-60"
                >
                  {pendingTripId === trip.id ? (
                    <Loader2
                      size={15}
                      className="shrink-0 animate-spin"
                      style={{ color: "var(--color-accent-violet)" }}
                    />
                  ) : addedTripIds.includes(trip.id) ? (
                    /* A tick on a trip this place already went into during this
                       visit — pressing it again is a no-op server-side, since
                       the shelf holds a place once. */
                    <Check size={15} className="shrink-0" style={{ color: "var(--color-brand-green)" }} />
                  ) : (
                    <Plus size={15} className="shrink-0" style={{ color: "var(--color-accent-violet)" }} />
                  )}
                  <span className="truncate">{trip.title || trip.destination}</span>
                </button>
              ))}

            {/* Last row, always — a place worth keeping is often the reason a
                trip gets started at all, and that is just as true for someone
                who already has five. */}
            {!loading && !loadFailed && destinationHint && (
              <button
                type="button"
                role="menuitem"
                disabled={pendingTripId !== null}
                onClick={handleCreateTrip}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface)] disabled:opacity-60"
              >
                {pendingTripId === NEW_TRIP ? (
                  <Loader2
                    size={15}
                    className="shrink-0 animate-spin"
                    style={{ color: "var(--color-accent-violet)" }}
                  />
                ) : (
                  <Plus size={15} className="shrink-0" style={{ color: "var(--color-accent-violet)" }} />
                )}
                <span className="truncate">สร้างทริปใหม่</span>
              </button>
            )}

            {/* No destination to name a trip after — the wizard asks for one. */}
            {!loading && !loadFailed && !destinationHint && (
              <Link
                href="/create-trip"
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-surface)]"
              >
                <Plus size={15} className="shrink-0" style={{ color: "var(--color-accent-violet)" }} />
                <span className="truncate">สร้างทริปใหม่</span>
              </Link>
            )}
          </div>
        </>
      )}

      {added && (
        <PlaceAddedToTripDialog
          placeTitle={place.title}
          tripTitle={added.tripTitle}
          linkedToPlace={added.linkedToPlace}
          onStay={() => setAdded(null)}
          onViewTrip={() => router.push(`/generated-plan/${added.tripId}`)}
        />
      )}
    </div>
  );
}
