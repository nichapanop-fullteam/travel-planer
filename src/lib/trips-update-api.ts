import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";
import type { Intensity } from "@/lib/generate-plan-api";
import type { CreateTripActivity } from "@/lib/trips-create-api";
import type { TripVisibility } from "@/lib/trips-api";
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
  destination?: string;
  status?: "draft" | "shared" | "confirmed" | "completed";
  startDate?: string;
  endDate?: string;
  // Only takes effect when the trip has no startDate/endDate yet — once
  // real dates are set, the backend always recomputes duration from them
  // and silently ignores these instead (see PATCH /trips/:id docs). Safe to
  // always send both; no need to gate on the frontend.
  durationDays?: number;
  durationNights?: number;
  pace?: Intensity;
  budgetLimit?: number;
  // Must be flipped to "public" before anyone besides the owner can remix
  // this trip (see POST /trips/:sourceTripId/remix in lib/trip-remix-api.ts).
  visibility?: TripVisibility;
  // Freeform text, max 2000 chars — the "เงื่อนไข / ข้อจำกัด" box in
  // EditTripDialog. Distinct from the backend's `constraints` enum array
  // (seniors/wheelchair/limited_walking/young_children); this endpoint only
  // ever sends specialNotes, never constraints.
  specialNotes?: string;
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

export interface CreateTripDayRequest {
  dayNumber: number;
  date?: string;
}

export interface CreateTripDayResponse {
  id: string;
  dayNumber: number;
  date?: string;
  [key: string]: unknown;
}

// POST /trips/:planId/days — "เพิ่มวัน". Used once a trip already has a real
// backend row (GeneratedTrip.backendSynced); the returned id replaces the
// locally-generated one so a later PATCH /days/:dayId has something real to
// target.
export async function createTripDayOnServer(
  planId: string,
  day: CreateTripDayRequest
): Promise<CreateTripDayResponse> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${planId}/days`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(day),
  });
  await throwOnError(response, "เพิ่มวัน");
  return response.json();
}

// The backend's UpdateItemDto is a strict whitelist — sending title/time/
// notes/etc. (borrowed from CreateTripActivity's shape) 400s with "property
// X should not exist". Travel-leg-from-previous-stop fields, plus
// costAmount/paidBy/splitLabel (per the budget tab's "เพิ่มค่าใช้จ่าย" ->
// "เลือกจากแผนการเดินทาง" flow), are the confirmed accepted fields.
export interface UpdateTripItemRequest {
  travelTypeFromPrev?: TravelType | null;
  travelCustomTypeFromPrev?: string | null;
  travelTimeFromPrevMin?: number | null;
  travelDistanceFromPrevKm?: number | null;
  travelCostFromPrevAmount?: number | null;
  travelCostFromPrevCurrency?: string | null;
  travelNotesFromPrev?: string | null;
  costAmount?: number;
  paidBy?: string;
  splitLabel?: string;
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

export interface CreateTripItemResponse {
  id: string;
  [key: string]: unknown;
}

// POST /days/:dayId/items — "เพิ่มสถานที่/กิจกรรม". Starts from
// CreateTripActivity (same shape POST /trips/create sends per-activity) since
// it's the same resource, just created one at a time instead of nested under
// the trip — but this endpoint's DTO is a stricter whitelist than that bulk
// one: title/time/cost are confirmed rejected ("property X should not
// exist"), so they're dropped here rather than sent and 400ing.
export async function createTripItemOnServer(
  dayId: string,
  item: CreateTripActivity
): Promise<CreateTripItemResponse> {
  const { title: _title, time: _time, cost: _cost, ...allowed } = item;
  const response = await authenticatedFetch(`${BACKEND_URL}/days/${dayId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(allowed),
  });
  await throwOnError(response, "เพิ่มสถานที่");
  return response.json();
}

// PATCH /days/:dayId/items/order — "เรียงกิจกรรม". itemIds is the full new
// order (top to bottom) for every item under that day; the backend 400s if
// the set doesn't match the day's items exactly (see ReorderItemsRequestDto /
// itinerary-manager.service.ts on the backend). Called from the drag-to-
// reorder activity list in generated-plan/[id]/page.tsx.
export async function reorderTripItemsOnServer(dayId: string, itemIds: string[]): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/days/${dayId}/items/order`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemIds }),
  });
  await throwOnError(response, "เรียงลำดับกิจกรรม");
}
