import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";
import type { TravelType } from "@/types";

// Partial-update endpoints for a trip that already has a real row on the
// backend (see GeneratedTrip.backendSynced in types/index.ts) — used by
// "บันทึก" once a trip has been created via POST /trips/create (see
// trips-create-api.ts), instead of re-POSTing the whole thing every time.

async function throwOnError(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(`${action}ไม่สำเร็จ (${response.status} ${response.statusText}) ${body.slice(0, 300)}`);
}

export interface UpdateTripRequest {
  title?: string;
  status?: "draft" | "shared" | "confirmed" | "completed";
  startDate?: string;
  endDate?: string;
  budgetLimit?: number;
}

// PATCH /trips/:tripId
export async function updateTripOnServer(tripId: string, patch: UpdateTripRequest): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  await throwOnError(response, "แก้ไขข้อมูลทริป");
}

export interface UpdateTripDayRequest {
  dayNumber?: number;
  date?: string;
}

// PATCH /days/:dayId
export async function updateTripDayOnServer(dayId: string, patch: UpdateTripDayRequest): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/days/${dayId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  await throwOnError(response, "แก้ไขข้อมูลวัน");
}

// The backend's UpdateItemDto is a strict whitelist — sending title/time/
// cost/notes/etc. (borrowed from CreateTripActivity's shape) 400s with
// "property X should not exist". Only the travel-leg-from-previous-stop
// fields are confirmed accepted here (same vocabulary as POST
// /days/:dayId/items and each activity in POST /trips/create).
export interface UpdateTripItemRequest {
  travelTypeFromPrev?: TravelType;
  travelCustomTypeFromPrev?: string;
  travelTimeFromPrevMin?: number;
  travelDistanceFromPrevKm?: number;
  travelCostFromPrevAmount?: number;
  travelCostFromPrevCurrency?: string;
  travelNotesFromPrev?: string;
}

// PATCH /items/:itemId
export async function updateTripItemOnServer(itemId: string, patch: UpdateTripItemRequest): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  await throwOnError(response, "แก้ไขข้อมูลสถานที่");
}
