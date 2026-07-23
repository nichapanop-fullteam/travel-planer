import type { ActivityCategory, Day, Location } from "@/types";

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

// "N วัน M คืน" — days/nights, both derived from the same days list.
export function getTripDaysNightsLabel(trip: HasDays): string {
  const days = trip.days.length;
  const nights = Math.max(days - 1, 0);
  return `${days} วัน ${nights} คืน`;
}

export function getTripDateRange(trip: HasDays): string {
  if (trip.days.length === 0) return "";
  return formatDateRange(trip.days[0].date, trip.days[trip.days.length - 1].date);
}

// Rough per-day distance/time placeholders — NOT real routing data, just a
// stand-in until an actual map/directions provider is wired up (see MapPanel).
export function getDayRouteEstimate(day: Day): { distanceKm: number; minutes: number } {
  const stops = Math.max(day.activities.length - 1, 0);
  return { distanceKm: Math.round(stops * 3.1 * 10) / 10, minutes: stops * 55 };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
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

// Prefers coordinates when a location has them; falls back to a name search
// query otherwise (all mock locations today are name-only).
export function getGoogleMapsUrl(location: Location): string {
  const query = location.lat != null && location.lng != null
    ? `${location.lat},${location.lng}`
    : location.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const fmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
