"use client";

// The violet "+" on a place sitting on the trip's staging shelf: "ลงวันที่ 1 /
// 2 / 3". The counterpart to dragging the card into a day, and the primary of
// the two — on a phone, dragging a card from the shelf at the top of the plan
// past two day cards to reach Day 3 is a long, scrolling gesture, while this
// is one tap.
//
// Day numbers and how full each day already is, because that is what the
// decision actually turns on. Unlike the old day-picker inside
// AddPlaceToTripMenu, this one sits ON the plan — the days it names are right
// underneath it, so the count is a reminder rather than the only evidence.
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { Day } from "@/types";

export function AssignToDayMenu({
  days,
  pending,
  onAssign,
  label,
}: {
  days: Day[];
  // The place is being written to a day right now — the trigger spins and the
  // menu stops accepting a second choice.
  pending?: boolean;
  onAssign: (dayId: string) => void;
  // For the trigger's accessible name: "เพิ่ม ร้านมาลองเต๊อะ ลงวัน".
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`เลือกวันให้ ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--color-accent-violet)" }}
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
      </button>

      {open && (
        <>
          {/* Same outside-click catcher AddPlaceToTripMenu uses. */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-44 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white py-2 shadow-[0_12px_32px_-8px_rgba(16,24,40,0.28)] ring-1 ring-black/5"
          >
            {days.length === 0 ? (
              // A trip made from the "+" menu on someone else's plan starts
              // with no days at all, so this is a real state, not an edge case.
              <p className="px-4 py-2 text-sm text-[var(--color-muted)]">
                ยังไม่มีวันในแผน — กด &ldquo;เพิ่มวัน&rdquo; ก่อน
              </p>
            ) : (
              days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onAssign(day.id);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface)]"
                >
                  <Plus size={15} className="shrink-0" style={{ color: "var(--color-accent-violet)" }} />
                  <span className="truncate">ลงวันที่ {day.dayNumber}</span>
                  <span className="ml-auto shrink-0 text-xs text-[var(--color-muted)]">
                    {day.activities.length} ที่
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
