import type { Destination } from "@/types";

const STORAGE_KEY = "pluno.createTripSearch";

// The last Destination/Date/Guest search entered on Create Trip — persisted
// client-side so reopening the page (or coming back later) prefills it
// instead of starting from a blank form every time.
export interface CreateTripSearch {
  destination: string;
  destinationPlace?: Destination;
  duration: string;
  guests: string;
  adults: number;
  children: number;
}

export function getLastCreateTripSearch(): CreateTripSearch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CreateTripSearch) : null;
  } catch {
    return null;
  }
}

export function saveLastCreateTripSearch(search: CreateTripSearch): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(search));
}
