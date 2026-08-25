import type { Activity, ActivityCategory, Day, Location, TripAccommodation } from "@/types";

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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Minutes from a "HH:MM" label, or NaN when it isn't one.
function parseClock(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

// How long the day actually runs — first stop's time to the last one's, so a
// day that ends after midnight (a late bar/bowling stop) still measures
// forward instead of going negative. NaN when the day has fewer than two
// timed stops to measure between.
function getDaySpanMinutes(day: Day): number {
  const times = day.activities.map((a) => parseClock(a.time)).filter((m) => Number.isFinite(m));
  if (times.length < 2) return NaN;
  const first = times[0];
  const last = times[times.length - 1];
  return last >= first ? last - first : last + 1440 - first;
}

// Real per-day distance/time whenever the itinerary carries structured travel
// legs (travelFromPrevious — filled in by "เพิ่มการเดินทาง" and by the
// seeded demo itineraries); distance falls back to the old stops × 3.1 km
// guess only for days that have nothing but free-text travelNotes, since
// there's still no routing provider wired up (see MapPanel).
export function getDayRouteEstimate(day: Day): { distanceKm: number; minutes: number } {
  let travelledKm = 0;
  let legs = 0;
  for (const activity of day.activities) {
    const travel = activity.travelFromPrevious;
    if (!travel) continue;
    legs += 1;
    travelledKm += travel.distanceKm ?? 0;
  }

  const stops = Math.max(day.activities.length - 1, 0);
  const spanMinutes = getDaySpanMinutes(day);
  return {
    distanceKm: legs > 0 ? round1(travelledKm) : round1(stops * 3.1),
    minutes: Number.isFinite(spanMinutes) ? spanMinutes : stops * 55,
  };
}

// Trip-wide distance — the sum of each day's figure, so it uses real travel
// legs where they exist and the per-day estimate everywhere else.
export function getTripDistanceKm(trip: HasDays): number {
  return round1(trip.days.reduce((sum, day) => sum + getDayRouteEstimate(day).distanceKm, 0));
}

// Average spend per day, THB. Days with no stops yet (a freshly added day, or
// the empty shell of a self-mode trip) aren't counted — otherwise adding an
// empty day quietly drags the per-day figure down.
export function getAverageDailyCost(trip: HasDays): number {
  const plannedDays = trip.days.filter((d) => d.activities.length > 0).length;
  if (plannedDays === 0) return 0;
  return Math.round(getTripTotalCost(trip) / plannedDays);
}

// The overview stats card counts food stops as ร้านอาหาร / คาเฟ่ / บาร์
// separately, but ActivityCategory has no such split — all three are "food".
// Until the data model grows a subtype, the venue kind is read off the stop's
// own name, which every itinerary here labels explicitly ("คาเฟ่ริมโขง",
// "บาร์ค็อกเทล Icon Klub").
export type FoodVenueKind = "restaurant" | "cafe" | "bar";

const CAFE_NAME = /คาเฟ่|กาแฟ|เบเกอรี่|cafe|café|coffee|bakery|roaster/i;
// Latin words are bounded so "barbecue" isn't a bar; บาร์บีคิว likewise.
const BAR_NAME = /บาร์(?!บีคิว)|ผับ|ค็อกเทล|\bbars?\b|\bpubs?\b|\bclub\b|\bklub\b|cocktail|rooftop/i;

export function getFoodVenueKind(activity: Activity): FoodVenueKind {
  const name = `${activity.title} ${activity.location?.name ?? ""}`;
  if (CAFE_NAME.test(name)) return "cafe";
  if (BAR_NAME.test(name)) return "bar";
  return "restaurant";
}

export interface TripPlaceStats {
  attractions: number;
  restaurants: number;
  cafes: number;
  bars: number;
}

// Counts distinct places rather than stops: one hotel visited twice (check-in
// and check-out), or a market passed through on two different days, only
// counts once. Hotel/transport stops aren't places to visit, so they're
// counted in none of the four buckets.
export function getTripPlaceStats(trip: HasDays): TripPlaceStats {
  const stats: TripPlaceStats = { attractions: 0, restaurants: 0, cafes: 0, bars: 0 };
  const seen = new Set<string>();
  for (const day of trip.days) {
    for (const activity of day.activities) {
      const key = (activity.location?.name || activity.title).trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (activity.category === "sightseeing" || activity.category === "activity") {
        stats.attractions += 1;
      } else if (activity.category === "food") {
        const kind = getFoodVenueKind(activity);
        if (kind === "cafe") stats.cafes += 1;
        else if (kind === "bar") stats.bars += 1;
        else stats.restaurants += 1;
      }
    }
  }
  return stats;
}

// Nightly rate for the accommodation card. Prefers the rate entered via
// "เปลี่ยนที่พัก" (TripAccommodation.pricePerNight); otherwise splits
// whatever the hotel check-in stop itself costs across the trip's nights,
// which is where the room charge sits on generated itineraries. Undefined
// when neither is known — the card then says so instead of showing a figure
// it made up.
export function resolveNightlyRate(
  trip: HasDays,
  accommodation: TripAccommodation | undefined,
  hotel: Activity | undefined
): { pricePerNight?: number; nights: number } {
  const nights = Math.max(trip.days.length - 1, 1);
  if (accommodation?.pricePerNight) return { pricePerNight: accommodation.pricePerNight, nights };
  const stayCost = hotel?.cost ?? 0;
  return { pricePerNight: stayCost > 0 ? Math.round(stayCost / nights) : undefined, nights };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Real totals derived from each activity's own cost plus whatever travel leg
// (travelFromPrevious) was attached to it — unlike getDayRouteEstimate above,
// this only counts distance/time actually entered by the traveler, so it
// starts at 0 until "เพิ่มการเดินทาง" has been filled in.
export function getTripRouteSummary(trip: HasDays): { distanceKm: number; minutes: number; costAmount: number } {
  let distanceKm = 0;
  let minutes = 0;
  let costAmount = 0;
  for (const day of trip.days) {
    for (const activity of day.activities) {
      costAmount += activity.cost;
      const travel = activity.travelFromPrevious;
      if (travel) {
        distanceKm += travel.distanceKm ?? 0;
        minutes += travel.durationMin ?? 0;
        costAmount += travel.costAmount ?? 0;
      }
    }
  }
  return { distanceKm: Math.round(distanceKm * 10) / 10, minutes, costAmount };
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

// Generic hotel-search deep links — no partner/affiliate API integration
// exists yet, so these just hand the hotel name off to each site's own
// search box rather than linking a specific listing.
export function getHotelBookingLinks(name: string): { agoda: string; booking: string; trip: string } {
  const query = encodeURIComponent(name);
  return {
    agoda: `https://www.agoda.com/search?q=${query}`,
    booking: `https://www.booking.com/searchresults.html?ss=${query}`,
    trip: `https://www.trip.com/hotels/list?keyword=${query}`,
  };
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const fmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
