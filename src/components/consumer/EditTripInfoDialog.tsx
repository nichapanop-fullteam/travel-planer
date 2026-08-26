"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { FeedTrip } from "@/types";

// Same centered-modal shell/edit-field look as generated-plan's "แก้ไขทริป"
// dialog (EditDialogShell/EditField) — kept as a local, simpler copy here
// since FeedTrip only exposes title/destination as directly-editable fields
// (dates and budget are derived from the itinerary, see lib/trip-utils.ts).
export function EditTripInfoDialog({
  trip,
  onClose,
  onSave,
}: {
  trip: FeedTrip;
  onClose: () => void;
  onSave: (patch: Partial<FeedTrip>) => void;
}) {
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination);

  function handleSave() {
    onSave({
      title: title.trim() || trip.title,
      destination: destination.trim() || trip.destination,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit Trip Info</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ชื่อทริป</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ตั้งชื่อทริปของคุณ"
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ปลายทาง</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="เลือกปลายทาง"
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border py-2.5 text-sm font-bold"
            style={{ borderColor: "var(--color-border)" }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-full py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
