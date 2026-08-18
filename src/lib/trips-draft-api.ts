import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";
import { CONDITION_TO_CONSTRAINT, PACE_TO_INTENSITY, STYLE_TAG_TO_ENUM } from "@/lib/generate-plan-mapping";
import type { Constraint, Intensity, TravelStyle } from "@/lib/generate-plan-api";
import type { BackendTrip } from "@/lib/trips-api";
import type { TripDraft } from "@/types";

// POST /trips — "เริ่มจัดทริปเอง" (self mode). Distinct from POST /trips/create
// (trips-create-api.ts, the AI-mode/full-plan endpoint) — this one always
// creates an empty `status: "draft"` row immediately, before any days/items
// exist, so the traveler gets a real backend id to build their itinerary
// against from the very first screen.

async function throwOnError(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(`${action}ไม่สำเร็จ (${response.status} ${response.statusText}) ${body.slice(0, 300)}`);
}

export interface CreateDraftTripRequest {
  title: string;
  destination: string;
  destinationPlace?: { placeId: string; name: string; country?: string; countryCode?: string };
  startDate?: string;
  endDate?: string;
  guestCount: number;
  planMode: "manual";
  travelStyles?: TravelStyle[];
  pace?: Intensity;
  constraints?: Constraint[];
}

function toApiDateOnly(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

// Enum mappings (STYLE_TAG_TO_ENUM etc.) mirror generate-plan-mapping.ts's
// AI-mode request builder — travelStyles/pace/constraints here reuse the
// exact same backend enums, just under different field names. Tags with no
// enum match (e.g. "แพ้อาหารทะเล" — not a Constraint) are dropped per the
// API's own guidance to hold custom ones client-side rather than 400ing.
export function buildCreateDraftTripRequest(draft: TripDraft): CreateDraftTripRequest {
  const destinationPlaceId = draft.destinationPlace?.placeId || draft.destinationPlace?.externalRef;
  const travelStyles = draft.styles.map((s) => STYLE_TAG_TO_ENUM[s]).filter((s): s is TravelStyle => Boolean(s));
  const constraints = draft.conditions
    .map((c) => CONDITION_TO_CONSTRAINT[c])
    .filter((c): c is Constraint => Boolean(c));

  return {
    title: [draft.destination, draft.duration].filter(Boolean).join(" ").trim() || "ทริปของฉัน",
    destination: draft.destination,
    destinationPlace:
      draft.destinationPlace && destinationPlaceId
        ? {
            placeId: destinationPlaceId,
            name: draft.destinationPlace.name,
            country: draft.destinationPlace.country,
            countryCode: draft.destinationPlace.countryCode,
          }
        : undefined,
    startDate: draft.startDate ? toApiDateOnly(draft.startDate) : undefined,
    endDate: draft.endDate ? toApiDateOnly(draft.endDate) : undefined,
    guestCount: Math.min(Math.max(draft.adults + draft.children, 1), 50),
    planMode: "manual",
    travelStyles: travelStyles.length ? travelStyles : undefined,
    pace: draft.pace ? PACE_TO_INTENSITY[draft.pace] : undefined,
    constraints: constraints.length ? constraints : undefined,
  };
}

// Never send `status` here — the backend always creates `draft`, and
// rejects the field entirely on this endpoint.
export async function createDraftTripOnServer(draft: TripDraft): Promise<BackendTrip> {
  const body = buildCreateDraftTripRequest(draft);
  const response = await authenticatedFetch(`${BACKEND_URL}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwOnError(response, "สร้างทริป");
  return response.json();
}
