import type { TripDraft } from "@/types";

const STORAGE_KEY = "punguide.tripDrafts";

// No backend yet — Create Trip (step 1) drafts are persisted client-side only.
export function getTripDrafts(): TripDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TripDraft[]) : [];
  } catch {
    return [];
  }
}

export function saveTripDraft(draft: TripDraft): void {
  const drafts = getTripDrafts();
  drafts.unshift(draft);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}
