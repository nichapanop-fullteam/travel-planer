"use client";

// The "+" beside a place: pick one of your own trips, then which day of it, and
// the place is copied in. A remix of a single place instead of the whole plan —
// see lib/add-place-to-trip.ts for what the copy actually consists of.
//
// Used from a stop on /view-trip/[id] and from a bookmarked place on /saved,
// which is why it takes an AddablePlace rather than an itinerary Activity.
//
// Two steps, not one: the first version of this menu appended to the trip's
// last day and reported that in a toast, which is a guess dressed as a
// decision — the last day of a trip is usually the flight home. Choosing the
// day is the point of the flow, and it mirrors the "ลงวันที่ N" menu the plan
// page uses for the same job.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { getMyTrips, type BackendTripListItem } from "@/lib/trips-api";
import {
  addPlaceToTripDay,
  getTripDayOptions,
  type AddablePlace,
  type TripDayOption,
} from "@/lib/add-place-to-trip";
import { PlaceAddedToTripDialog } from "@/components/plan/PlaceAddedToTripDialog";
import { useToast } from "@/providers/ToastProvider";

// The second step's whole state: which trip was picked, its days once they
// arrive, and whether that fetch failed. One object rather than three pieces of
// state so the step can never be half-entered.
interface DayStep {
  trip: BackendTripListItem;
  days: TripDayOption[] | null;
  failed: boolean;
}

export function AddPlaceToTripMenu({
  place,
  excludeTripId,
  signedIn,
  onRequireLogin,
  variant = "icon",
}: {
  place: AddablePlace;
  // The trip being read — offering to add a stop to the plan it is already
  // part of is never what the button means.
  excludeTripId?: string;
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
  const [dayStep, setDayStep] = useState<DayStep | null>(null);
  const [pendingDayId, setPendingDayId] = useState<string | null>(null);
  const [addedTripIds, setAddedTripIds] = useState<string[]>([]);
  const [added, setAdded] = useState<{
    tripId: string;
    tripTitle: string;
    dayNumber: number;
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
    setDayStep(null);
    // Re-fetched on every open rather than cached for the page's lifetime: a
    // trip created in another tab (or on the way back from /create-trip)
    // should be in this list, and /trips/mine is one small request.
    loadTrips();
  }

  function loadDays(trip: BackendTripListItem) {
    setDayStep({ trip, days: null, failed: false });
    getTripDayOptions(trip.id)
      .then((days) => setDayStep({ trip, days, failed: false }))
      .catch((err) => {
        console.warn("โหลดวันในแพลนไม่สำเร็จ", err);
        setDayStep({ trip, days: null, failed: true });
      });
  }

  function handlePickDay(trip: BackendTripListItem, day: TripDayOption) {
    if (pendingDayId) return;
    setPendingDayId(day.id);
    addPlaceToTripDay(day, place)
      .then(({ dayNumber, linkedToPlace }) => {
        setAddedTripIds((prev) => [...prev, trip.id]);
        setOpen(false);
        setDayStep(null);
        setAdded({
          tripId: trip.id,
          tripTitle: trip.title || trip.destination,
          dayNumber,
          linkedToPlace,
        });
      })
      .catch((err: unknown) => {
        console.warn("เพิ่มสถานที่ลงทริปไม่สำเร็จ", err);
        showToast(
          err instanceof Error ? err.message : "เพิ่มสถานที่ลงทริปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
          "error"
        );
      })
      .finally(() => setPendingDayId(null));
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
            {dayStep ? (
              <>
                {/* The header doubles as the way back to the trip list — a
                    separate back row would cost a line for nothing. */}
                <button
                  type="button"
                  onClick={() => setDayStep(null)}
                  className="flex w-full items-center gap-1.5 px-4 pb-2 text-left text-sm font-bold"
                >
                  <ChevronLeft size={14} className="shrink-0 text-[var(--color-muted)]" />
                  <span className="truncate">{dayStep.trip.title || dayStep.trip.destination}</span>
                </button>
                <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />

                {!dayStep.days && !dayStep.failed && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-muted)]">
                    <Loader2 size={14} className="animate-spin" />
                    กำลังโหลดวันในแพลน
                  </div>
                )}

                {dayStep.failed && (
                  <div className="px-4 py-3">
                    <p className="text-sm text-[var(--color-muted)]">โหลดวันในแพลนไม่สำเร็จ</p>
                    <button
                      type="button"
                      onClick={() => loadDays(dayStep.trip)}
                      className="mt-1 text-sm font-semibold"
                      style={{ color: "var(--color-accent-violet)" }}
                    >
                      ลองอีกครั้ง
                    </button>
                  </div>
                )}

                {/* A trip with no days cannot take a stop at all — POST
                    /days/:dayId/items needs one — so say so here instead of
                    letting the write fail. */}
                {dayStep.days?.length === 0 && (
                  <div className="px-4 py-3">
                    <p className="text-sm text-[var(--color-muted)]">ทริปนี้ยังไม่มีวันในแผน</p>
                    <Link
                      href={`/generated-plan/${dayStep.trip.id}`}
                      className="mt-1 inline-block text-sm font-semibold"
                      style={{ color: "var(--color-accent-violet)" }}
                    >
                      ไปเพิ่มวัน
                    </Link>
                  </div>
                )}

                {dayStep.days?.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    role="menuitem"
                    disabled={pendingDayId !== null}
                    onClick={() => handlePickDay(dayStep.trip, day)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface)] disabled:opacity-60"
                  >
                    {pendingDayId === day.id ? (
                      <Loader2
                        size={15}
                        className="shrink-0 animate-spin"
                        style={{ color: "var(--color-accent-violet)" }}
                      />
                    ) : (
                      <Plus size={15} className="shrink-0" style={{ color: "var(--color-accent-violet)" }} />
                    )}
                    <span className="truncate">ลงวันที่ {day.dayNumber}</span>
                    {/* How full that day already is — the only thing there is
                        to judge "which day" on from inside this menu. */}
                    <span className="ml-auto shrink-0 text-xs text-[var(--color-muted)]">
                      {day.activityCount} ที่
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <>
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
                  <div className="px-4 py-3">
                    <p className="text-sm text-[var(--color-muted)]">ยังไม่มีทริปของคุณ</p>
                    <Link
                      href="/create-trip"
                      className="mt-1 inline-block text-sm font-semibold"
                      style={{ color: "var(--color-accent-violet)" }}
                    >
                      สร้างทริปใหม่
                    </Link>
                  </div>
                )}

                {!loading &&
                  !loadFailed &&
                  trips?.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      role="menuitem"
                      onClick={() => loadDays(trip)}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface)]"
                    >
                      {/* A tick on a trip this place already went into during
                          this visit — it can still be added again, deliberately. */}
                      {addedTripIds.includes(trip.id) ? (
                        <Check size={15} className="shrink-0" style={{ color: "var(--color-brand-green)" }} />
                      ) : (
                        <Plus size={15} className="shrink-0" style={{ color: "var(--color-accent-violet)" }} />
                      )}
                      <span className="truncate">{trip.title || trip.destination}</span>
                      <ChevronRight size={14} className="ml-auto shrink-0 text-[var(--color-muted)]" />
                    </button>
                  ))}
              </>
            )}
          </div>
        </>
      )}

      {added && (
        <PlaceAddedToTripDialog
          placeTitle={place.title}
          tripTitle={added.tripTitle}
          dayNumber={added.dayNumber}
          linkedToPlace={added.linkedToPlace}
          onStay={() => setAdded(null)}
          onViewTrip={() => router.push(`/generated-plan/${added.tripId}`)}
        />
      )}
    </div>
  );
}
