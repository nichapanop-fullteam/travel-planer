import type { ReactNode } from "react";
import type { FeedTrip } from "@/types";
import { getTripDateRange, getTripTotalCost, formatTHB } from "@/lib/trip-utils";

export function TripInfoPanel({ trip }: { trip: FeedTrip }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)]/40 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">Trip Info</h3>
      </div>

      <div className="flex flex-col gap-3 text-sm">
        <Row label="Destination" value={trip.destination} />
        <Row label="Date" value={getTripDateRange(trip)} />
        <Row
          label="Members"
          value={
            <div className="flex -space-x-1.5">
              {trip.members.map((m) => (
                <span
                  key={m.name}
                  title={m.name}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[var(--color-surface)] text-xs"
                >
                  {m.avatar}
                </span>
              ))}
            </div>
          }
        />
        <Row label="Budget" value={formatTHB(getTripTotalCost(trip))} />
      </div>

      <button className="mt-4 w-full rounded-full border border-[var(--color-border)]/60 py-2 text-xs font-semibold text-[var(--color-muted)]">
        Edit Trip Info
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}
