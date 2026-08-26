import type { TripPlace } from "@/types";

function storageKey(tripSlug: string): string {
  return `punguide.tripPlaces.${tripSlug}`;
}

// No backend yet — places picked in the "สร้างด้วยตัวเอง" flow are persisted
// client-side only, keyed per trip slug (e.g. "luang-prabang").
export function getTripPlaces(tripSlug: string): TripPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(tripSlug));
    return raw ? (JSON.parse(raw) as TripPlace[]) : [];
  } catch {
    return [];
  }
}

export function saveTripPlaces(tripSlug: string, places: TripPlace[]): void {
  window.localStorage.setItem(storageKey(tripSlug), JSON.stringify(places));
}

export function addTripPlace(tripSlug: string, place: TripPlace): TripPlace[] {
  const current = getTripPlaces(tripSlug);
  const alreadyAdded = current.some((item) => item.googlePlaceId === place.googlePlaceId);
  const next = alreadyAdded ? current : [...current, place];
  saveTripPlaces(tripSlug, next);
  return next;
}
