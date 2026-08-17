import type { Activity } from "@/types";

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
  grade?: string;
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
}

export interface GeneratePlanDraftItem {
  placeId?: string;
  customName?: string;
  orderIndex?: number;
  startTime?: string;
  endTime?: string;
  estimatedDurationMin?: number;
  travelTimeFromPrevMin?: number;
  travelDistanceFromPrevKm?: number;
  costAmount?: number;
  costCurrency?: string;
  bookingStatus?: string;
  bookingLeadUrl?: string;
  isAiSuggested?: boolean;
  notes?: string;
  // Some deployments include hydrated display data in the draft. These
  // fields are optional because the documented contract only guarantees ids.
  title?: string;
  category?: Activity["category"];
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
    date?: string;
    fatigueLevel?: string;
    daySummary?: string;
    items: GeneratePlanDraftItem[];
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
