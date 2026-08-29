"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { getHotelBookingLinks } from "@/lib/trip-utils";

// Single "จองที่พัก" trigger instead of a row of provider pills — a per-stop
// list was taking as much vertical space as the stop's own info, when all a
// traveler needs at a glance is that booking is possible; the actual
// provider choice moves into HotelBookingDialog below. Shared by the
// itinerary's hotel-category rows (generated-plan/[id]/page.tsx) and every
// accommodation card (current + recommended) in SelfPlanBuilderTab.tsx.
export function HotelBookingButton({ name, className }: { name: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          className ??
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
        }
        // The app's secondary button, same as แชร์ on the trip header: white
        // with a warm border, next to a filled-orange primary. It used to be
        // the green selection-chip palette (--color-sel-*), which is the
        // language for "this option is picked" — not for an action, and the
        // only green thing on an otherwise warm card.
        style={{ borderColor: "var(--color-border-tag)", backgroundColor: "#fff", color: "var(--foreground)" }}
      >
        <ExternalLink size={11} />
        จองที่พัก
      </button>
      {open && <HotelBookingDialog name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

// Deep-links a hotel-category stop out to a real OTA to actually book it —
// no partner API integration exists yet, so these just hand the hotel name
// off to each site's own search box (see getHotelBookingLinks) rather than
// linking a specific listing/rate.
function HotelBookingDialog({ name, onClose }: { name: string; onClose: () => void }) {
  const links = getHotelBookingLinks(name);
  const providers = [
    { key: "agoda", label: "Agoda", href: links.agoda },
    { key: "booking", label: "Booking.com", href: links.booking },
    { key: "trip", label: "Trip.com", href: links.trip },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">จองที่พัก</h3>
              <p className="truncate text-xs text-[var(--color-muted)]">{name}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {providers.map((p) => (
              <a
                key={p.key}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold"
                style={{ borderColor: "var(--color-border)" }}
              >
                {p.label}
                <ExternalLink size={14} style={{ color: "var(--color-muted)" }} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
