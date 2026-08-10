"use client";

import { MapPin } from "lucide-react";
import { DestinationSearch } from "@/components/consumer/DestinationSearch";
import type { Destination } from "@/types";

export interface DestinationPickerResult {
  label: string;
  destination?: Destination;
}

// Shown before the user types anything. Coordinates/country are hand-entered
// since these are well-known cities — no live geocode call needed just to
// render a quick-pick list (Trip Detail is what hits the Places API for
// in-city recommendations, once a destination is actually chosen).
const POPULAR_DESTINATIONS: Destination[] = [
  { name: "หลวงพระบาง", country: "ลาว", countryCode: "LA", latitude: 19.8834, longitude: 102.1347 },
  { name: "เชียงใหม่", country: "ไทย", countryCode: "TH", latitude: 18.7883, longitude: 98.9853 },
  { name: "เชียงราย", country: "ไทย", countryCode: "TH", latitude: 19.9105, longitude: 99.8406 },
  { name: "กรุงเทพฯ", country: "ไทย", countryCode: "TH", latitude: 13.7563, longitude: 100.5018 },
  { name: "ดานัง", country: "เวียดนาม", countryCode: "VN", latitude: 16.0544, longitude: 108.2022 },
  { name: "โตเกียว", country: "ญี่ปุ่น", countryCode: "JP", latitude: 35.6762, longitude: 139.6503 },
];

function destinationLabel(d: Destination): string {
  return `${d.name}, ${d.country}`;
}

export function DestinationPickerDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: DestinationPickerResult) => void;
}) {
  if (!isOpen) return null;

  function handlePlaceSelect(destination: Destination) {
    onConfirm({
      label: destination.country ? destinationLabel(destination) : destination.name,
      destination,
    });
  }

  function handleQuickPick(destination: Destination) {
    onConfirm({ label: destinationLabel(destination), destination });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-bold">ปลายทางที่อยากไป</p>

        <DestinationSearch onSelect={handlePlaceSelect} placeholder="ค้นหาเมือง หรือประเทศ" />

        <p className="mb-2 mt-5 text-xs font-semibold text-[var(--color-muted)]">ปลายทางยอดนิยม</p>
        <div className="flex flex-wrap gap-2.5">
          {POPULAR_DESTINATIONS.map((d) => (
            <button
              key={d.name}
              type="button"
              onClick={() => handleQuickPick(d)}
              className="inline-flex items-center gap-1.5 rounded-[20px] border px-4 py-2.5 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
              style={{ borderColor: "var(--color-border-chip)", color: "var(--foreground)" }}
            >
              <MapPin size={14} style={{ color: "var(--color-muted)" }} />
              {destinationLabel(d)}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border py-2.5 text-sm font-bold"
            style={{ borderColor: "var(--color-border)", color: "var(--foreground)" }}
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
