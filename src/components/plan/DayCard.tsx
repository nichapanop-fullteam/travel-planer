import type { Day } from "@/types";
import { Card } from "@/components/ui/Card";
import { ActivityTimeline } from "@/components/plan/ActivityTimeline";
import { getDayTotalCost, formatTHB } from "@/lib/trip-utils";

// Day header style adapted from the Pluno App UI design (TripDetailView.ItineraryTab)
export function DayCard({ day, showCost = false }: { day: Day; showCost?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)]/40 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary-green))" }}
        >
          {day.dayNumber}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Day {day.dayNumber}
          </p>
          <p className="text-sm font-semibold">{day.date}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
            {day.activities.length} stops
          </span>
          {showCost && (
            <span className="text-xs text-[var(--color-muted)]">{formatTHB(getDayTotalCost(day))}</span>
          )}
        </div>
      </div>
      <div className="p-4">
        <ActivityTimeline day={day} showCost={showCost} />
        {showCost && (
          <button className="mt-1 self-start text-xs text-[var(--color-primary)] hover:underline">
            + เพิ่มกิจกรรม
          </button>
        )}
      </div>
    </Card>
  );
}
