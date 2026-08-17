import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";
import { getTripDrafts } from "@/lib/trip-drafts";
import { uploadTripMedia } from "@/lib/trip-media-api";
import {
  BUDGET_KEY_TO_TIER,
  CONDITION_TO_CONSTRAINT,
  PACE_TO_INTENSITY,
  PRIVATE_CAR_CONDITION,
  STYLE_TAG_TO_ENUM,
} from "@/lib/generate-plan-mapping";
import type {
  BudgetTier,
  Constraint,
  GroupType,
  Intensity,
  TransportMode,
  TravelStyle,
} from "@/lib/generate-plan-api";
import type { Activity, GeneratedTrip, TravelType, TripCreationMode, TripDraft } from "@/types";

// POST /trips/create — the real backend endpoint behind the "บันทึก" button
// on generated-plan/[id]/page.tsx. Replaces the old mock PATCH /api/trips/[id]
// (see git history) now that a real endpoint exists. Requires a signed-in
// backend session. Ownership is derived from the access token.

export interface CreateTripActivity {
  placeId?: string;
  title: string;
  time?: string;
  endTime?: string;
  estimatedDurationMin?: number;
  travelTypeFromPrev?: TravelType;
  travelCustomTypeFromPrev?: string;
  travelTimeFromPrevMin?: number;
  travelDistanceFromPrevKm?: number;
  travelCostFromPrevAmount?: number;
  travelCostFromPrevCurrency?: string;
  travelNotesFromPrev?: string;
  cost?: number;
  costCurrency?: string;
  bookingStatus?: string;
  bookingLeadUrl?: string;
  isAiSuggested?: boolean;
  notes?: string;
  orderIndex?: number;
}

// Backend rejects extra properties on destinationPlace (validates against an
// exact whitelist) — Destination has externalRef/address/rating/imageUrl
// that this endpoint doesn't accept, so this is a deliberately narrower
// shape rather than reusing Destination directly.
export interface CreateTripDay {
  dayNumber: number;
  date?: string;
  activities: CreateTripActivity[];
}

export interface CreateTripRequest {
  title: string;
  destination: string;
  planMode: "ai" | "manual";
  startDate?: string;
  endDate?: string;
  isDateFlexible: boolean;
  durationDays: number;
  durationNights: number;
  numPeople: number;
  budgetTier: BudgetTier;
  budgetLimit?: number;
  styles: TravelStyle[];
  intensity: Intensity;
  transport: TransportMode[];
  customStyles?: string[];
  customTransport?: string[];
  constraints?: Constraint[];
  customConstraints?: string[];
  groupType?: GroupType;
  days: CreateTripDay[];
}

// Response shape is whatever the backend echoes back (its own id/ownerId/
// customer/brief/etc.) — kept loose since this app doesn't consume most of
// it yet, just needs `ok` confirmation from the fetch call.
export interface CreateTripResponse {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  days?: Array<{
    dayNumber: number;
    activities: Array<{ id: string }>;
  }>;
  [key: string]: unknown;
}

async function dataUrlToActivityFile(
  dataUrl: string,
  activityTitle: string,
  imageIndex: number
): Promise<File> {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error(`อ่านไฟล์รูปของ ${activityTitle} ไม่สำเร็จ`);
  const blob = await response.blob();
  const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return new File([blob], `activity-${imageIndex + 1}.${extension}`, {
    type: blob.type || "image/jpeg",
  });
}

async function uploadActivityImages(trip: GeneratedTrip, created: CreateTripResponse): Promise<void> {
  if (!created.days) return;

  for (const localDay of trip.days) {
    const serverDay = created.days.find((day) => day.dayNumber === localDay.dayNumber);
    if (!serverDay) continue;

    for (const [activityIndex, localActivity] of localDay.activities.entries()) {
      const serverActivity = serverDay.activities[activityIndex];
      if (!serverActivity || !localActivity.images?.length) continue;

      for (const [imageIndex, dataUrl] of localActivity.images.entries()) {
        const file = await dataUrlToActivityFile(dataUrl, localActivity.title, imageIndex);
        await uploadTripMedia(created.id, file, {
          activityId: serverActivity.id,
          altText: localActivity.title,
        });
      }
    }
  }
}

// Per-day-of-week estimated baht per person — used only to derive a rough
// budgetLimit (amount × people × days) when the draft picked a preset tier
// instead of typing a custom number. Matches BUDGET_PRESET_LABEL in
// lib/generated-trips.ts.
const BUDGET_TIER_DAILY_AMOUNT: Record<string, number> = {
  economy: 800,
  comfort: 3000,
  premium: 7500,
  luxury: 12000,
};

function toApiDateOnly(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

function dateForDay(startDate: string | undefined, dayIndex: number, fallback: string): string | undefined {
  if (!startDate) return fallback || undefined;
  const date = new Date(`${toApiDateOnly(startDate)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

// TripDraft.mode is "ai" | "self" (this app's own vocabulary); the backend's
// planMode enum is "ai" | "manual" — "self" (build-it-yourself) maps onto
// "manual" there.
const PLAN_MODE_TO_API: Record<TripCreationMode, "ai" | "manual"> = {
  ai: "ai",
  self: "manual",
};

// Backend requires intensity (same "missing == invalid" pattern as
// styles/transport/numPeople/budgetTier above) — "chill" is the closest
// enum value to "no preference given".
const DEFAULT_INTENSITY: Intensity = "chill";

// No dedicated field on TripDraft for this — best-effort guess from party
// size, since the backend wants *something* rather than nothing.
function inferGroupType(draft?: TripDraft): GroupType | undefined {
  if (!draft) return undefined;
  if (draft.children > 0) return "family";
  if (draft.adults === 1) return "solo";
  if (draft.adults === 2) return "couple";
  if (draft.adults > 2) return "friends";
  return undefined;
}

// Backend validates styles even when the field is missing (not just when
// it's present-but-wrong), so this always returns a `styles` array rather
// than omitting the key for draftless trips — falls back to the trip's own
// styles (mock trips like demo-luang-prabang set these directly, with no
// TripDraft behind them at all).
function buildStylesAndCustom(draft: TripDraft | undefined, tripStyles: string[]): { styles: TravelStyle[]; customStyles?: string[] } {
  const tags = draft?.styles ?? tripStyles;
  const styles: TravelStyle[] = [];
  const customStyles: string[] = [];
  for (const tag of tags) {
    const mapped = STYLE_TAG_TO_ENUM[tag];
    if (mapped) styles.push(mapped);
    else customStyles.push(tag);
  }
  return { styles, customStyles: customStyles.length ? customStyles : undefined };
}

// Backend requires transport as a non-empty array (max 5, enum values) even
// when the field is missing entirely — "recommend" (let the system pick) is
// a valid enum value and the closest thing to "no preference".
const DEFAULT_TRANSPORT: TransportMode[] = ["recommend"];

function buildTransportAndConstraints(draft?: TripDraft): {
  transport: TransportMode[];
  customTransport?: string[];
  constraints?: Constraint[];
  customConstraints?: string[];
} {
  if (!draft) return { transport: DEFAULT_TRANSPORT };
  const transport: TransportMode[] = [];
  const constraints: Constraint[] = [];
  const customConstraints: string[] = [];
  for (const condition of draft.conditions) {
    if (condition === PRIVATE_CAR_CONDITION) {
      transport.push("private_car");
      continue;
    }
    const mapped = CONDITION_TO_CONSTRAINT[condition];
    if (mapped) constraints.push(mapped);
    else customConstraints.push(condition);
  }
  return {
    transport: transport.length ? transport : DEFAULT_TRANSPORT,
    constraints: constraints.length ? constraints : undefined,
    customConstraints: customConstraints.length ? customConstraints : undefined,
  };
}

// Backend requires budgetTier (rejects it as missing even when the field is
// simply absent), so this always falls back to "economy" rather than
// leaving it undefined for draftless trips.
const DEFAULT_BUDGET_TIER: BudgetTier = "economy";

function buildBudget(draft: TripDraft | undefined, numPeople: number | undefined, durationDays: number) {
  if (!draft?.budget) return { budgetTier: DEFAULT_BUDGET_TIER, budgetLimit: undefined };

  if (draft.budget === "custom") {
    const perDay = Number(draft.customBudget.replace(/[^\d]/g, ""));
    const budgetLimit =
      Number.isFinite(perDay) && perDay > 0 ? perDay * (numPeople ?? 1) * durationDays : undefined;
    return { budgetTier: "custom" as BudgetTier, budgetLimit };
  }

  const tier = BUDGET_KEY_TO_TIER[draft.budget] ?? DEFAULT_BUDGET_TIER;
  const perDay = BUDGET_TIER_DAILY_AMOUNT[tier];
  const budgetLimit = perDay ? perDay * (numPeople ?? 1) * durationDays : undefined;
  return { budgetTier: tier, budgetLimit };
}

function buildActivity(activity: Activity, orderIndex: number): CreateTripActivity {
  const placeId = activity.location?.googlePlaceId;
  const travel = activity.travelFromPrevious;
  return {
    placeId,
    title: activity.title,
    time: activity.time || undefined,
    cost: activity.cost,
    costCurrency: "THB",
    notes: activity.notes,
    travelTypeFromPrev: travel?.type,
    travelCustomTypeFromPrev: travel?.customType,
    travelTimeFromPrevMin: travel?.durationMin,
    travelDistanceFromPrevKm: travel?.distanceKm,
    travelCostFromPrevAmount: travel?.costAmount,
    travelCostFromPrevCurrency: travel?.costCurrency,
    travelNotesFromPrev: travel?.notes,
    // activity.images (from AddActivityDialog's "เพิ่มรูป") are raw base64
    // data URLs held in local/browser storage only — there's no upload step
    // for them yet, and forwarding even a couple through this endpoint blows
    // past the backend's request body size limit (413). Real photo storage
    // is the trip-media API (see lib/trip-media-api.ts, POST /trips/:id/media)
    // once that has somewhere to actually upload to.
    orderIndex,
  };
}

export function buildCreateTripRequest(
  trip: GeneratedTrip,
  draft: TripDraft | undefined
): CreateTripRequest {
  const durationDays = trip.days.length;
  const durationNights = Math.max(trip.days.length - 1, 0);
  // Backend requires numPeople as an integer in [1, 50] — always present,
  // even for draftless trips (see buildBudget/buildStylesAndCustom comments
  // for the same "required, not just validated-if-present" pattern).
  const numPeople = draft ? Math.min(Math.max(draft.adults + draft.children, 1), 50) : 1;
  const { budgetTier, budgetLimit } = buildBudget(draft, numPeople, durationDays);

  return {
    title: trip.title || trip.destination,
    destination: trip.destination,
    planMode: PLAN_MODE_TO_API[draft?.mode ?? "ai"],
    startDate: draft?.startDate ? toApiDateOnly(draft.startDate) : undefined,
    endDate: draft?.endDate ? toApiDateOnly(draft.endDate) : undefined,
    isDateFlexible: !draft?.startDate,
    durationDays,
    durationNights,
    numPeople,
    budgetTier,
    budgetLimit,
    ...buildStylesAndCustom(draft, trip.styles),
    intensity: (draft?.pace && PACE_TO_INTENSITY[draft.pace]) || DEFAULT_INTENSITY,
    ...buildTransportAndConstraints(draft),
    groupType: inferGroupType(draft),
    days: trip.days.map((day, dayIndex) => ({
      dayNumber: day.dayNumber,
      date: dateForDay(draft?.startDate, dayIndex, day.date),
      activities: day.activities.map((activity, index) => buildActivity(activity, index)),
    })),
  };
}

export async function createTripOnServer(trip: GeneratedTrip): Promise<CreateTripResponse> {
  const draft = getTripDrafts().find((d) => d.id === trip.draftId);
  const body = buildCreateTripRequest(trip, draft);

  const response = await authenticatedFetch(`${BACKEND_URL}/trips/create`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `บันทึกทริปไม่สำเร็จ (${response.status} ${response.statusText}) ${errorBody.slice(0, 300)}`
    );
  }

  const created = (await response.json()) as CreateTripResponse;
  await uploadActivityImages(trip, created);
  return created;
}

// After a successful createTripOnServer, the local trip's client-generated
// UUIDs need to be swapped for the backend's real ids — otherwise a second
// "บันทึก" would blindly POST /trips/create again (see backendSynced on
// GeneratedTrip) instead of PATCHing the now-existing trip. Matched by
// dayNumber/position since that's what CreateTripResponse gives back.
//
// Note: the response only echoes each day's activities[].id, not a day id of
// its own — so backendDayIds is left unset here (PATCH /days/:dayId has
// nothing real to target yet for a trip synced this way). It's populated
// correctly for trips loaded straight from GET /trips/:id instead, see
// buildGeneratedTripFromBackendTrip in generated-trips.ts.
export function reconcileTripWithServer(trip: GeneratedTrip, created: CreateTripResponse): GeneratedTrip {
  const days = trip.days.map((day) => {
    const serverDay = created.days?.find((d) => d.dayNumber === day.dayNumber);
    if (!serverDay) return day;
    return {
      ...day,
      activities: day.activities.map((activity, i) => {
        const serverId = serverDay.activities[i]?.id;
        return serverId ? { ...activity, id: serverId } : activity;
      }),
    };
  });

  return {
    ...trip,
    id: created.id,
    days,
    backendSynced: true,
    backendItemIds: days.flatMap((d) => d.activities.map((a) => a.id)),
  };
}
