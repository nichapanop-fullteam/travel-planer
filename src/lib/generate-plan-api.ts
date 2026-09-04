import type { Activity } from "@/types";
import type { ExternalPlaceCategory } from "./external-places-api";

export type GroupType = "solo" | "couple" | "family" | "friends" | "business";
export type TravelStyle =
  | "beach"
  | "mountain"
  | "nature"
  | "local"
  | "culture"
  | "food"
  | "cafe"
  | "nightlife"
  | "shopping"
  | "adventure";
export type Intensity = "slow_life" | "chill" | "balance" | "active" | "hardcore";
export type TransportMode = "private_car" | "rental_car" | "motorbike" | "public_transit" | "recommend";
export type BudgetTier = "economy" | "comfort" | "premium" | "luxury" | "custom";
export type AccommodationStatus = "booked" | "not_booked";
// Hotel tier. NOT a star count — the wizard's 1★–5★ chips have to be mapped
// onto this before they're sent (see HOTEL_GRADE_TAG_TO_ENUM in
// generate-plan-mapping.ts); sending "3★" through is a 400.
export type AccommodationGrade = "hostel" | "budget" | "midscale" | "upscale" | "luxury";
// Hotel style — a separate axis from AccommodationGrade, not a finer version
// of it ("hostel" is the one value that appears in both).
export type AccommodationStyle = "boutique" | "resort" | "hotel" | "homestay" | "villa" | "hostel";
export type Constraint = "seniors" | "wheelchair" | "limited_walking" | "young_children";

export interface GeneratePlanDestinationPlace {
  placeId?: string;
  name: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
}

export type GeneratePlanDates =
  | { mode: "fixed"; startDate: string; endDate: string }
  | { mode: "flexible"; durationDays?: number; durationNights?: number };

export interface GeneratePlanBudget {
  tier: BudgetTier;
  amountPerPersonPerDay?: number;
}

export interface GeneratePlanAccommodation {
  status: AccommodationStatus;
  placeId?: string;
  name?: string;
  bookingUrl?: string;
  attachmentIds?: string[];
  checkIn?: string;
  checkOut?: string;
  grade?: AccommodationGrade;
  // Max 6. Free-text entries from the style row's "+ เพิ่มเติม" go to
  // customStyles instead (max 5, 60 characters each).
  styles?: AccommodationStyle[];
  customStyles?: string[];
  preferredArea?: string;
  notes?: string;
}

export interface GeneratePlanRequest {
  trip: {
    destination: string;
    destinationPlace?: GeneratePlanDestinationPlace;
    dates?: GeneratePlanDates;
    guests?: { groupType?: GroupType; adults: number; children?: number; infants?: number };
  };
  preferences?: {
    styles?: TravelStyle[];
    customStyles?: string[];
    intensity?: Intensity;
    transport?: TransportMode[];
    customTransport?: string[];
    budget?: GeneratePlanBudget;
    accommodation?: GeneratePlanAccommodation;
    constraints?: Constraint[];
    customConstraints?: string[];
  };
  locale?: "th" | "en";
  currency?: string;
  // `places` table ids (the `id` from GET /places/suggest/sections) of the
  // cards the traveler tapped "+ เพิ่มแผน" on. Not a plan lock: the AI has to
  // include every one of them and then fills the rest of the plan itself.
  // Max 40, and an id with no row in `places` is a 400 that names the id —
  // ours come straight from the suggest response, so they always exist.
  //
  // Picking more than the plan has room for is a warning, not an error: the
  // response still resolves, and generation.violations carries a
  // missing_picked_place entry per place that didn't make it in.
  selectedPlaceIds?: string[];
}

// Two field namings are in play across deployments — `startTime`/`costAmount`
// (the documented contract) and `time`/`cost` (what the live service actually
// returns). Both are optional and both are read, newest-observed first, so
// whichever one a deployment sends comes through. See normalizeDraftItems in
// lib/generated-trips.ts.
export interface GeneratePlanDraftItem {
  placeId?: string;
  customName?: string;
  orderIndex?: number;
  startTime?: string;
  time?: string;
  endTime?: string;
  estimatedDurationMin?: number;
  travelTimeFromPrevMin?: number;
  travelDistanceFromPrevKm?: number;
  costAmount?: number;
  cost?: number;
  costCurrency?: string;
  bookingStatus?: string;
  bookingLeadUrl?: string;
  isAiSuggested?: boolean;
  notes?: string;
  // Some deployments include hydrated display data in the draft. These
  // fields are optional because the documented contract only guarantees ids.
  title?: string;
  // Either taxonomy is accepted: the `places` table's own 7 values (what the
  // rest of the external API returns — see ExternalPlaceCategory) or this
  // app's 6 ActivityCategory values. normalizeCategory in lib/generated-trips.ts
  // folds the former into the latter, so the service can send whichever it
  // already has without a client change.
  category?: ExternalPlaceCategory | Activity["category"];
  location?: Activity["location"];
}

export interface GeneratePlanDraft {
  title: string;
  destination: string;
  planMode: "ai";
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  durationNights?: number;
  isDateFlexible?: boolean;
  numPeople: number;
  budgetTier: BudgetTier;
  budgetLimit?: number;
  styles: TravelStyle[];
  intensity?: Intensity;
  transport: TransportMode[];
  constraints?: Constraint[];
  groupType?: GroupType;
  days: {
    dayNumber: number;
    // Explicitly nullable: a flexible-date trip comes back with `date: null`
    // on every day rather than with the key omitted.
    date?: string | null;
    fatigueLevel?: string;
    daySummary?: string;
    // Same story as the item field names above — `items` is the documented
    // key, `activities` is what the live service sends. Exactly one of the two
    // is present on any given response.
    items?: GeneratePlanDraftItem[];
    activities?: GeneratePlanDraftItem[];
  }[];
}

export interface GeneratePlanViolation {
  severity: "error" | "warning";
  code: string;
  message: string;
  dayNumber?: number;
  itemIndex?: number;
}

export interface GeneratePlanResponse {
  draft: GeneratePlanDraft;
  resolvedBrief: {
    durationDays: number;
    numPeople: number;
    itemsPerDay: { min: number; max: number };
    budgetPerPersonPerDayCap: number | null;
    budgetCapTotal: number | null;
    defaultsApplied: string[];
    warnings: string[];
  };
  generation: {
    attempts: number;
    resolvedWithoutErrors: boolean;
    modelWarnings: string[];
    violations: GeneratePlanViolation[];
  };
}

export class GeneratePlanError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// POST /trips/plan/generate searches real places, builds and validates a
// draft, but deliberately does not write anything to the database.
// Not streaming: this is a plain POST that blocks for 10–30s+ depending on
// trip length and repair attempts, with no app-side timeout. Routed through
// our own /api/trips/generate-plan proxy (see that route for why).
//
// A failed request is safe to retry because this endpoint never persists.
export async function generatePlan(request: GeneratePlanRequest): Promise<GeneratePlanResponse> {
  const response = await fetch("/api/trips/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new GeneratePlanError(response.status, "Unexpected response from the plan generation service.");
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : "Failed to generate plan.";
    throw new GeneratePlanError(response.status, message);
  }

  return data as GeneratePlanResponse;
}
