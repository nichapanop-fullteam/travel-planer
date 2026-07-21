import type { ActivityCategory, Day } from "@/types";

// Accepts anything with a `days` list (Trip or FeedTrip) — price/duration are
// always derived from the itinerary itself, never stored as separate fields.
type HasDays = { days: Day[] };

export function getDayTotalCost(day: Day): number {
  return day.activities.reduce((sum, a) => sum + a.cost, 0);
}

export function getTripTotalCost(trip: HasDays): number {
  return trip.days.reduce((sum, day) => sum + getDayTotalCost(day), 0);
}

export function getTripDurationLabel(trip: HasDays): string {
  return `${trip.days.length} วัน`;
}

export function getTripCostByCategory(trip: HasDays): Partial<Record<ActivityCategory, number>> {
  const totals: Partial<Record<ActivityCategory, number>> = {};
  for (const day of trip.days) {
    for (const activity of day.activities) {
      totals[activity.category] = (totals[activity.category] ?? 0) + activity.cost;
    }
  }
  return totals;
}

export function formatTHB(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const fmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
