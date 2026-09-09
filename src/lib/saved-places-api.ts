// Bookmarking a single place ("บันทึกสถานที่นี้"), the place-level counterpart
// to saveTrip/unsaveTrip/getSavedTrips in lib/trips-api.ts — same endpoints
// shape, same idempotency, one table down.
//
// A bookmark is per user, not per trip: saving วัดเชียงทอง while reading two
// different trips is one entry in "สถานที่ที่คุณบันทึกไว้".
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";

// A row of the backend's own `places` table (PlaceResponseDto) — the same
// shape GET /places/search returns, so `id` is what POST /days/:dayId/items
// takes as `placeId`.
export interface SavedPlace {
  id: string;
  name: string;
  address?: string;
  // The DB taxonomy ("attraction" | "restaurant" | "hotel" | "cafe" |
  // "activity" | "transport" | "shopping"), not the frontend's
  // ActivityCategory — see lib/external-places-api.ts's ExternalPlaceCategory,
  // which is the same set.
  category: string;
  lat?: number;
  lng?: number;
  rating?: number;
  // Direct googleusercontent link with no key in it — can expire, so anything
  // rendering it needs a fallback.
  imageUrl?: string;
  // Always true on rows from GET /places/saved; the field exists because the
  // same DTO is used elsewhere.
  isSaved?: boolean;
}

// POST /places/:id/save — idempotent server-side (saving an already-saved
// place re-answers 204), so callers don't need to guard double-clicks.
export async function savePlace(placeId: string): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/places/${placeId}/save`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`บันทึกสถานที่ไม่สำเร็จ (${response.status} ${response.statusText})`);
  }
}

// DELETE /places/:id/save — also idempotent (removing a bookmark that was
// never there answers 204).
export async function unsavePlace(placeId: string): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/places/${placeId}/save`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`เอาสถานที่ออกจากรายการบันทึกไม่สำเร็จ (${response.status} ${response.statusText})`);
  }
}

// GET /places/saved — newest bookmark first (the backend orders by when it was
// saved, not by the place row's own age).
export async function getSavedPlaces(): Promise<SavedPlace[]> {
  const response = await authenticatedFetch(`${BACKEND_URL}/places/saved`);
  if (!response.ok) {
    throw new Error("โหลดสถานที่ที่บันทึกไว้ไม่สำเร็จ");
  }
  return response.json();
}
