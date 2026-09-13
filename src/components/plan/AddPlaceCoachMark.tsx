"use client";

// The black bar across the bottom of /view-trip/[id]: "กดปุ่ม + เพื่อเพิ่ม
// สถานที่ลงแผนของคุณ". The "+" on a stop is a small violet circle among three
// buttons, and nothing about it says it copies the place into a trip of your
// own — which is the one action this page exists to invite.
//
// Renders as a plain block, positioned by the caller: /view-trip already has a
// fixed bottom wrapper holding the like/share bar, and this sits inside it so
// the two can never overlap or drift apart.
//
// Shown once per person, not once per trip: it teaches a control, and someone
// who has learned it does not need teaching on the next trip they open.
// Dismissal lives in localStorage rather than on the account, because getting
// it wrong costs one extra glance at a bar they can close, and a per-device
// answer needs no endpoint.
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

const KEY = "punguide.addPlaceCoachMarkDismissed";

export function AddPlaceCoachMark() {
  // Starts hidden and is turned on in an effect: localStorage does not exist
  // during the server render, and showing the bar first would flash it at
  // everyone who had already dismissed it.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) !== "1") setVisible(true);
    } catch {
      // Private browsing, or site data blocked. A coach mark every visit is a
      // better outcome than a crash, so it shows.
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // Nothing to do — it will be back next visit, which is harmless.
    }
  }

  if (!visible) return null;

  return (
    <div className="px-3 pb-2 pt-3 sm:px-4">
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-[#1A1A1A] px-4 py-3 text-white shadow-[0_12px_32px_-8px_rgba(16,24,40,0.45)]">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--color-accent-violet)" }}
          aria-hidden="true"
        >
          <Plus size={16} />
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold">
          กดปุ่ม + เพื่อเพิ่มสถานที่ลงแผนของคุณ
        </p>
        <button
          type="button"
          aria-label="ปิดคำแนะนำ"
          onClick={dismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
