"use client";

// The Remix Trip button and the two-choice menu under it. Before this, the
// button opened RemixSetupDialog directly and the chevron beside it pointed
// at nothing.
//
// A component rather than markup inlined in the page because /view-trip/[id]
// renders the button twice — once in the action row under the hero, once in
// the fixed bottom bar — and the two need the same menu with a different
// trigger and a different direction to open in.
import { useState } from "react";
import { ChevronDown, Shuffle } from "lucide-react";
import { RemixIcon } from "@/components/common/RemixIcon";

export function RemixTripMenu({
  variant,
  onWholeTrip,
  // "เลือกใช้บางส่วน" has no endpoint behind it yet (see the backend doc's
  // "ยังไม่ได้ทำ" section). Passing nothing renders it disabled with a
  // เร็ว ๆ นี้ tag rather than hiding it — the design's menu has two items,
  // and a one-item dropdown would read as a bug.
  onPartial,
}: {
  variant: "inline" | "bar";
  onWholeTrip: () => void;
  onPartial?: () => void;
}) {
  const [open, setOpen] = useState(false);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className={variant === "bar" ? "relative flex-1" : "relative"}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={
          variant === "bar"
            ? "flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            : "flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white"
        }
        style={{ backgroundColor: "var(--color-accent-violet)" }}
      >
        <RemixIcon className="h-4 w-5 shrink-0" />
        Remix Trip
        <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <>
          {/* Same outside-click catcher as AddPlaceToTripMenu's dropdown. */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className={`absolute z-40 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(16,24,40,0.28)] ring-1 ring-black/5 ${
              variant === "bar" ? "bottom-full left-0 mb-2" : "left-0 top-full mt-2"
            }`}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(onWholeTrip)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold hover:bg-[var(--color-surface)]"
            >
              <Shuffle size={15} className="shrink-0" style={{ color: "var(--color-accent-violet)" }} />
              ใช้แผนในทริปทั้งหมด
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!onPartial}
              onClick={onPartial ? () => choose(onPartial) : undefined}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
            >
              <Shuffle size={15} className="shrink-0" style={{ color: "var(--color-accent-violet)" }} />
              เลือกใช้บางส่วน
              {!onPartial && (
                <span className="ml-auto shrink-0 text-[10px] font-medium text-[var(--color-muted)]">
                  เร็ว ๆ นี้
                </span>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
