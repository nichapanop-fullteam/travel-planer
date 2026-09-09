"use client";

// The confirmation after a single place is remixed into one of your trips.
// A modal rather than the toast this used to show, because the useful next
// action — going to the trip that just changed — is not something a toast that
// disappears in four seconds can offer.
//
// Same overlay convention as RemixSetupDialog: conditionally mounted by the
// caller, fixed inset-0 backdrop, click-outside and X both close.
import { Check, X } from "lucide-react";

export function PlaceAddedToTripDialog({
  placeTitle,
  tripTitle,
  dayNumber,
  // False when the place could not be resolved to a `places` row and the stop
  // was saved from its name alone — worth admitting here rather than letting
  // the traveler discover a stop with no photo later.
  linkedToPlace = true,
  onStay,
  onViewTrip,
}: {
  placeTitle: string;
  tripTitle: string;
  dayNumber: number;
  linkedToPlace?: boolean;
  onStay: () => void;
  onViewTrip: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Remix สถานที่ลงทริปแล้ว"
      onClick={onStay}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl bg-white px-6 pb-6 pt-10 text-center shadow-[0_24px_64px_-16px_rgba(16,24,40,0.35)]"
      >
        <button
          type="button"
          aria-label="ปิด"
          onClick={onStay}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)]"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <X size={16} />
        </button>

        {/* The mockup's lime disc. Written as a literal, like the other
            one-off warm/lime surfaces on the plan pages (#D7FF3D on /remix's
            tab bar, #FDF0E7 on ตารางแพลน) — globals.css has no lime token, and
            inventing one for a single dialog would imply a system it isn't
            part of. */}
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "#C8F169" }}
        >
          <Check size={32} strokeWidth={3} style={{ color: "var(--color-brand-green)" }} />
        </div>

        <h2 className="mt-5 text-xl font-bold">Remix สถานที่ลงทริปแล้ว</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          เพิ่ม &ldquo;{placeTitle}&rdquo; ลงในทริป {tripTitle} วันที่ {dayNumber} สำเร็จแล้ว
        </p>
        {!linkedToPlace && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            ไม่พบข้อมูลสถานที่ในระบบ จึงบันทึกไว้เป็นชื่อก่อน — แก้ไขรายละเอียดได้ในแพลน
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onStay}
            className="flex-1 rounded-full border px-4 py-3 text-sm font-bold"
            style={{ borderColor: "var(--color-border)" }}
          >
            อยู่ต่อ
          </button>
          <button
            type="button"
            onClick={onViewTrip}
            className="flex-1 rounded-full px-4 py-3 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-accent-violet)" }}
          >
            ไปดูทริป
          </button>
        </div>
      </div>
    </div>
  );
}
