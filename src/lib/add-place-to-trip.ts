// "เพิ่มสถานที่นี้เข้าทริปของฉัน" — copying one place into a trip you own,
// without remixing a whole plan. Reached from a stop on /view-trip and from a
// bookmarked place on /saved, which is why it speaks AddablePlace rather than
// Activity: the two callers hold different shapes of the same idea.
//
// The only write is POST /days/:dayId/items, which needs a day of the TARGET
// trip and, for the copy to arrive as a real place (photo, category,
// coordinates for its travel leg) rather than a hand-typed label, a `places`
// row uuid. So the menu asks in two steps — which trip (getMyTrips), then
// which day (getTripDayOptions) — and addPlaceToTripDay makes sure a place id
// is in hand before it posts the stop.
import type { Activity, ActivityCategory } from "@/types";
import { searchExternalPlaces, type ExternalSearchPlace } from "@/lib/external-places-api";
import { getTrip } from "@/lib/trips-api";
import { createTripItemOnServer } from "@/lib/trips-update-api";
import type { CreateTripActivity } from "@/lib/trips-create-api";

// Everything this module needs about the place being copied. Kept minimal on
// purpose: a caller with only a bookmarked place (name + id) can fill it as
// easily as one holding a full itinerary stop.
export interface AddablePlace {
  // The `places` row. When present, nothing is guessed — this is the whole
  // reason GET /trips/:id now reports location.placeId.
  placeId?: string;
  title: string;
  category?: ActivityCategory;
  time?: string;
  cost?: number;
  notes?: string;
  // Only used to sanity-check a place resolved by name — see
  // SAME_PLACE_RADIUS_KM.
  lat?: number;
  lng?: number;
}

export interface AddPlaceToTripResult {
  // Which day the stop landed on, for the confirmation dialog.
  dayNumber: number;
  // False when no place id was available and none could be resolved, so the
  // stop was created from its name alone. It still saves; it just has no place
  // behind it, so no photo and no automatic travel leg.
  linkedToPlace: boolean;
}

// One row of the "ลงวันที่ N" step in the add menu. `activityCount` is what
// lets that step say how full a day already is, which is the only thing the
// traveler has to go on when choosing.
export interface TripDayOption {
  id: string;
  dayNumber: number;
  date?: string;
  activityCount: number;
}

// The days of a trip the traveler owns, for the day step of the add menu.
// Reuses getTrip rather than a leaner endpoint because GET /trips/:id is the
// only read that returns days at all.
export async function getTripDayOptions(tripId: string): Promise<TripDayOption[]> {
  const trip = await getTrip(tripId);
  if (!trip) throw new Error("ไม่พบทริปที่เลือก อาจถูกลบไปแล้ว");
  return trip.days.map((day) => ({
    id: day.id,
    dayNumber: day.dayNumber,
    date: day.date,
    activityCount: day.activities.length,
  }));
}

// An itinerary stop, as the read-only trip pages hold it, in the shape this
// module wants. `location.placeId` is the real id (present on any stop that
// resolved to a place); `googlePlaceId` is deliberately NOT used as a fallback
// — on a trip loaded from the backend it holds Google's externalRef, which
// POST /days/:dayId/items rejects.
export function addablePlaceFromActivity(activity: Activity): AddablePlace {
  return {
    placeId: activity.location?.placeId,
    title: activity.title,
    category: activity.category,
    time: activity.time || undefined,
    cost: activity.cost,
    notes: activity.notes,
    lat: activity.location?.lat,
    lng: activity.location?.lng,
  };
}

// How far a search hit may sit from the place's own coordinates and still be
// believed to be the same place. /places/search is free-text with no location
// bias, so "Formula B Café" can legitimately come back as a café of that name
// on another continent, and linking that one would put a stranger's photo and
// coordinates in the traveler's plan. 25 km is wide enough to absorb a place
// whose stored coordinates are a city centroid rather than the venue.
const SAME_PLACE_RADIUS_KM = 25;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// The fallback for a place with no id of its own — a legacy stop saved before
// the backend reported location.placeId, or a hand-typed one that never had a
// place row. Same "exact name wins, first hit is the fallback" resolution as
// fetchResolvedPlaceFullDetails, plus the coordinate check above. Returns
// undefined when nothing trustworthy comes back, and the caller then creates
// the stop from its name.
async function resolvePlaceId(place: AddablePlace): Promise<string | undefined> {
  const name = place.title.trim();
  if (!name) return undefined;

  // Returns [] on no matches and on any upstream error, so a search outage
  // degrades to a hand-typed stop instead of failing the add.
  const matches = await searchExternalPlaces(name, 5);
  if (matches.length === 0) return undefined;

  const { lat, lng } = place;
  const nearby: ExternalSearchPlace[] =
    lat != null && lng != null
      ? matches.filter((match) => distanceKm({ lat, lng }, match) <= SAME_PLACE_RADIUS_KM)
      : matches;
  if (nearby.length === 0) return undefined;

  const normalized = name.toLocaleLowerCase();
  const exact = nearby.find((match) => match.name.trim().toLocaleLowerCase() === normalized);
  return (exact ?? nearby[0]).id;
}

/**
 * Copies one place onto a specific day of a trip the signed-in user owns,
 * appended after that day's existing stops. The day comes from the menu's
 * "ลงวันที่ N" step (see getTripDayOptions), so nothing here guesses.
 *
 * Throws when the write fails; the message is user-facing Thai, same
 * convention as the rest of lib/trips-*.
 */
export async function addPlaceToTripDay(
  day: TripDayOption,
  place: AddablePlace
): Promise<AddPlaceToTripResult> {
  const placeId = place.placeId ?? (await resolvePlaceId(place));

  const item: CreateTripActivity = {
    placeId,
    // Only used when placeId is absent (buildCreateTripItemRequest sends it as
    // customName) — a linked place takes its own name and category.
    title: place.title,
    category: place.category,
    time: place.time,
    cost: place.cost,
    costCurrency: "THB",
    notes: place.notes,
    // The traveler picked this stop by hand, whatever the source plan was.
    isAiSuggested: false,
    // Deliberately NOT copied from a source stop: travelNote /
    // travelFromPrevious describe the leg from the PREVIOUS stop in the source
    // trip — a different sequence entirely — and on a backend-rendered trip
    // travelNote is often just the derived "~45 นาที · 30 กม." string
    // (ActivityResponseDto.buildTravelNote). Carrying either over would assert
    // a travel time this trip never had. The real leg gets calculated below.
    // orderIndex is left off too: the backend appends to the day by default.
  };

  // crypto.randomUUID(), not a key derived from the place: the backend's
  // ledger row for (day, key) is permanent, so a derived key would make a
  // deliberate second copy of the same place impossible forever. A fresh key
  // per click still covers the double-tap it exists for.
  await createTripItemOnServer(day.id, item, crypto.randomUUID());

  return { dayNumber: day.dayNumber, linkedToPlace: Boolean(placeId) };
}
