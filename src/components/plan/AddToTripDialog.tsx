"use client";

// "Add to trip" — the modal behind Remix Trip ▾ → ใช้แผนในทริปทั้งหมด. Pick one
// of your own trips and the whole plan is appended to it (POST
// /trips/:sourceTripId/remix/into/:targetTripId), or take "+ สร้างทริปใหม่" and
// fall through to RemixSetupDialog's create-a-new-trip flow instead.
//
// A card grid rather than the compact dropdown AddPlaceToTripMenu uses for a
// single place: this decision permanently lengthens whichever trip is picked,
// so the cover, the dates and the day count all have to be visible before
// committing — a list of titles is not enough to tell two "ญี่ปุ่น" trips
// apart.
//
// No day picker, unlike AddPlaceToTripMenu: the plan lands as whole new days
// appended after the target's last one, so there is nothing to choose.
import { useEffect, useState } from "react";
import { Calendar, Check, Loader2, MapPin, Plus, X } from "lucide-react";
import { getMyTrips, type BackendTripListItem } from "@/lib/trips-api";
import { resolveCoverImageUrl } from "@/lib/trip-media-api";
import { formatDateRange } from "@/lib/trip-utils";
import { HERO_ILLUSTRATION } from "@/lib/hero-image";

function dateBadge(trip: BackendTripListItem): string {
  const { startDate, endDate } = trip.schedule ?? {};
  if (startDate && endDate) return formatDateRange(startDate, endDate);
  if (startDate) return formatDateRange(startDate, startDate);
  return "ยังไม่ได้กำหนดวัน";
}

export function AddToTripDialog({
  // The trip being read. Excluded from the grid because remixing a trip into
  // itself is a 400 on the backend, and offering it would be offering a
  // guaranteed failure.
  excludeTripId,
  submitting,
  errorMessage,
  onClose,
  onCreateNew,
  onConfirm,
}: {
  excludeTripId: string;
  submitting: boolean;
  errorMessage?: string;
  onClose: () => void;
  onCreateNew: () => void;
  onConfirm: (trip: BackendTripListItem) => void;
}) {
  const [trips, setTrips] = useState<BackendTripListItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyTrips()
      .then((list) => {
        if (cancelled) return;
        setTrips(list.filter((trip) => trip.id !== excludeTripId));
      })
      .catch((err) => {
        console.warn("โหลดทริปของฉันไม่สำเร็จ", err);
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [excludeTripId, reloadToken]);

  // The spinner state is cleared here rather than at the top of the effect
  // above — a synchronous setState in an effect body is a cascading render
  // (and what react-hooks/set-state-in-effect flags), and the first load
  // already starts from these initial values.
  function retryLoad() {
    setTrips(null);
    setLoadFailed(false);
    setReloadToken((token) => token + 1);
  }

  const selected = trips?.find((trip) => trip.id === selectedId);

  function handleConfirm() {
    if (submitting || !selected) return;
    onConfirm(selected);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-trip-title"
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 px-6 pt-6">
          <h2 id="add-to-trip-title" className="text-center text-xl font-bold">
            Add to trip
          </h2>
          <button
            type="button"
            aria-label="ปิด"
            disabled={submitting}
            onClick={onClose}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 pt-5">
          <p className="pb-3 text-sm font-bold">ทริปของฉัน</p>

          {!trips && !loadFailed && (
            <div className="flex items-center gap-2 py-8 text-sm text-[var(--color-muted)]">
              <Loader2 size={15} className="animate-spin" />
              กำลังโหลดทริปของคุณ
            </div>
          )}

          {loadFailed && (
            <div className="py-8">
              <p className="text-sm text-[var(--color-muted)]">โหลดทริปของคุณไม่สำเร็จ</p>
              <button
                type="button"
                onClick={retryLoad}
                className="mt-1 text-sm font-semibold"
                style={{ color: "var(--color-accent-violet)" }}
              >
                ลองอีกครั้ง
              </button>
            </div>
          )}

          {/* No trips yet is not an error state here — "+ สร้างทริปใหม่" below
              is exactly the way out of it, so the grid just says so and the
              button stays where it always is. */}
          {trips?.length === 0 && (
            <p className="py-6 text-sm text-[var(--color-muted)]">
              ยังไม่มีทริปของคุณ — สร้างทริปใหม่จากแผนนี้ได้เลย
            </p>
          )}

          {trips && trips.length > 0 && (
            /* radiogroup, not a plain list: the cards below are role="radio",
               and a radio outside a group is not announced as one-of-many.
               Each li drops its listitem role for the same reason. */
            <ul
              role="radiogroup"
              aria-label="ทริปของฉัน"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            >
              {trips.map((trip) => {
                const isSelected = trip.id === selectedId;
                const cover = resolveCoverImageUrl(trip, "thumbnail") ?? HERO_ILLUSTRATION;
                return (
                  <li key={trip.id} role="none">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={submitting}
                      onClick={() => setSelectedId(trip.id)}
                      className="flex w-full flex-col overflow-hidden rounded-2xl border-2 text-left transition-colors disabled:opacity-60"
                      style={{
                        borderColor: isSelected
                          ? "var(--color-accent-violet)"
                          : "var(--color-border)",
                      }}
                    >
                      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-[var(--color-surface)]">
                        <img src={cover} alt="" className="h-full w-full object-cover" />
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
                          <Calendar size={11} className="shrink-0" />
                          {dateBadge(trip)}
                        </span>
                        {isSelected && (
                          <span
                            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: "var(--color-accent-violet)" }}
                          >
                            <Check size={14} />
                          </span>
                        )}
                      </span>
                      <span className="block px-3 py-2.5">
                        <span className="block truncate text-sm font-bold">
                          {trip.title || trip.destination}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{trip.destination}</span>
                          {trip.schedule?.durationDays != null && (
                            <span className="shrink-0">· {trip.schedule.durationDays} วัน</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={onCreateNew}
            className="mt-4 inline-flex items-center gap-2 rounded-full py-2.5 pl-2.5 pr-5 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25">
              <Plus size={14} />
            </span>
            สร้างทริปใหม่
          </button>

          {errorMessage && (
            <p className="mt-4 text-sm font-medium" style={{ color: "var(--color-danger)" }}>
              {errorMessage}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t px-6 py-4" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="flex-1 rounded-full border py-3 text-sm font-bold disabled:opacity-60"
              style={{ borderColor: "var(--color-border)" }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              // Nothing picked means there is no trip to append to — the
              // create-new button above is the path for that, not this one.
              disabled={submitting || !selected}
              onClick={handleConfirm}
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-accent-violet)" }}
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              ตกลง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
