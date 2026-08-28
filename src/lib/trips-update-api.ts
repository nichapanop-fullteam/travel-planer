import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";
import type { Intensity } from "@/lib/generate-plan-api";
import type { CreateTripActivity } from "@/lib/trips-create-api";
import type { TripVisibility } from "@/lib/trips-api";
import type {
  Activity,
  ActivityCategory,
  TravelSegment,
  TravelSegmentMode,
  TravelType,
} from "@/types";

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
  date?: string | null;
  fatigueLevel?: "low" | "medium" | "high" | null;
  daySummary?: string | null;
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
  orderIndex?: number;
  startTime?: string | null;
  endTime?: string | null;
  estimatedDurationMin?: number | null;
  travelTypeFromPrev?: TravelType | null;
  travelCustomTypeFromPrev?: string | null;
  travelTimeFromPrevMin?: number | null;
  travelDistanceFromPrevKm?: number | null;
  travelCostFromPrevAmount?: number | null;
  travelCostFromPrevCurrency?: string | null;
  travelNotesFromPrev?: string | null;
  category?: ActivityCategory | null;
  costAmount?: number;
  costCurrency?: string;
  bookingStatus?: "not_required" | "available" | "booked" | "sold_out" | "unknown";
  bookingLeadUrl?: string | null;
  isAiSuggested?: boolean;
  notes?: string | null;
  paidBy?: string | null;
  splitLabel?: string | null;
  placeId?: string | null;
  customName?: string | null;
}

// PATCH /items/:itemId
export async function updateTripItemOnServer(
  itemId: string,
  patch: UpdateTripItemRequest,
  calculateTravelSegments = true
): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/items/${itemId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Calculate-Travel-Segments": String(calculateTravelSegments),
    },
    body: JSON.stringify(patch),
  });
  await throwOnError(response, "แก้ไขข้อมูลสถานที่");
}

export interface CreateTripItemResponse {
  place: Activity;
  travelSegment: TravelSegment | null;
}

export function buildCreateTripItemRequest(item: CreateTripActivity) {
  const serverItem = { ...item };
  delete serverItem.id;
  const { title, time, cost, category, placeId, ...rest } = serverItem;
  return {
    ...rest,
    placeId,
    customName: placeId ? undefined : title,
    category: placeId ? undefined : category,
    startTime: time,
    costAmount: cost,
  };
}

// POST /days/:dayId/items — "เพิ่มสถานที่/กิจกรรม". Starts from
// CreateTripActivity (same shape POST /trips/create sends per-activity) since
// it's the same resource, just created one at a time instead of nested under
// the trip — but this endpoint's DTO is a stricter whitelist than that bulk
// one: title/time/cost are confirmed rejected ("property X should not
// exist"), so they're dropped here rather than sent and 400ing.
export async function createTripItemOnServer(
  dayId: string,
  item: CreateTripActivity,
  idempotencyKey?: string,
  calculateTravelSegments = true
): Promise<CreateTripItemResponse> {
  // POST /trips/create and POST /days/:dayId/items use different names for
  // the same UI fields. The bulk endpoint accepts title/time/cost while the
  // granular endpoint expects customName/startTime/costAmount. A linked place
  // supplies its own title/category, whereas a hand-typed stop needs both.
  const allowed = buildCreateTripItemRequest(item);
  const response = await authenticatedFetch(`${BACKEND_URL}/days/${dayId}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      "X-Calculate-Travel-Segments": String(calculateTravelSegments),
    },
    body: JSON.stringify(allowed),
  });
  await throwOnError(response, "เพิ่มสถานที่");
  const body = (await response.json()) as Activity | CreateTripItemResponse;
  // Keep compatibility with the currently deployed API while rolling onto
  // the Travel Segment response shape documented for the next backend build.
  return "place" in body
    ? body
    : { place: body, travelSegment: null };
}

// DELETE /items/:itemId — 204 with no response body.
export async function deleteTripItemOnServer(
  itemId: string,
  calculateTravelSegments = true
): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/items/${itemId}`, {
    method: "DELETE",
    headers: { "X-Calculate-Travel-Segments": String(calculateTravelSegments) },
  });
  await throwOnError(response, "ลบสถานที่");
}

// GET /days/:dayId/travel-segments — useful after delete/reorder/insert,
// where more than one neighbouring leg may have been reconciled.
export async function getDayTravelSegments(dayId: string): Promise<TravelSegment[]> {
  const response = await authenticatedFetch(`${BACKEND_URL}/days/${dayId}/travel-segments`);
  await throwOnError(response, "โหลดเส้นทางระหว่างสถานที่");
  return response.json();
}

// PATCH /travel-segments/:id/travel-mode. DRIVE is the only mode enabled by
// the backend today, but the union mirrors the additive API contract.
export async function updateTravelSegmentMode(
  segmentId: string,
  travelMode: TravelSegmentMode
): Promise<TravelSegment> {
  const response = await authenticatedFetch(`${BACKEND_URL}/travel-segments/${segmentId}/travel-mode`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ travelMode }),
  });
  await throwOnError(response, "เปลี่ยนโหมดการเดินทาง");
  return response.json();
}

// PATCH /days/:dayId/items/order — "เรียงกิจกรรม". itemIds is the full new
// order (top to bottom) for every item under that day; the backend 400s if
// the set doesn't match the day's items exactly (see ReorderItemsRequestDto /
// itinerary-manager.service.ts on the backend). Called from the drag-to-
// reorder activity list in generated-plan/[id]/page.tsx.
export async function reorderTripItemsOnServer(
  dayId: string,
  itemIds: string[],
  calculateTravelSegments = true
): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/days/${dayId}/items/order`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Calculate-Travel-Segments": String(calculateTravelSegments),
    },
    body: JSON.stringify({ itemIds }),
  });
  await throwOnError(response, "เรียงลำดับกิจกรรม");
}
