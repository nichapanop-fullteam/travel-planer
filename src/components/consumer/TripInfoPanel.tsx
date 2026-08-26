import type { ReactNode } from "react";
import { BadgeCheck, GitFork } from "lucide-react";
import type { FeedTrip } from "@/types";
import { getTripDateRange, getTripTotalCost, formatTHB } from "@/lib/trip-utils";

export function TripInfoPanel({
  trip,
  isJoined,
  onEditTrip,
}: {
  trip: FeedTrip;
  isJoined: boolean;
  onEditTrip?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)]/40 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">Trip Info</h3>
        <span
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
          style={{ backgroundColor: "var(--color-brand-green)" }}
        >
          <BadgeCheck size={11} />
          ทริปจริง
        </span>
      </div>

      <div className="flex flex-col gap-3 text-sm">
        <Row
          label="Shared by"
          value={
            <span className="flex items-center gap-1.5">
              <span className="text-sm leading-none">{trip.creator.avatar}</span>
              {trip.creator.name}
            </span>
          }
        />
        <Row label="Destination" value={trip.destination} />
        <Row label="Travel dates" value={getTripDateRange(trip)} />
        {isJoined && (
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
        )}
        <Row label="Budget" value={formatTHB(getTripTotalCost(trip))} />
      </div>

      {isJoined ? (
        <button
          type="button"
          onClick={onEditTrip}
          className="mt-4 w-full rounded-full border border-[var(--color-border)]/60 py-2 text-xs font-semibold text-[var(--color-muted)]"
        >
          Edit Trip Info
        </button>
      ) : (
        <button className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--color-border)]/60 py-2 text-xs font-semibold text-[var(--color-muted)]">
          <GitFork size={13} />
          Remix this trip
        </button>
      )}
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
