import type { TripDraft } from "@/types";
import type {
  Constraint,
  GeneratePlanAccommodation,
  GeneratePlanBudget,
  GeneratePlanRequest,
  Intensity,
  TransportMode,
  TravelStyle,
} from "./generate-plan-api";

// Every one of these lookup tables maps this app's Thai chip labels (see the
// STYLE_OPTIONS/PACE_OPTIONS/COND_OPTIONS etc. arrays in create-trip/page.tsx)
// onto the API's fixed enums. Anything selected that isn't in a table falls
// through to the matching customStyles/customConstraints free-text field
// instead of being silently dropped.

export const STYLE_TAG_TO_ENUM: Record<string, TravelStyle> = {
  ทะเล: "beach",
  ภูเขา: "mountain",
  ธรรมชาติ: "nature",
  วัฒนธรรม: "culture",
  อาหาร: "food",
  คาเฟ่: "cafe",
  ไนท์ไลฟ์: "nightlife",
  ช้อปปิ้ง: "shopping",
  ผจญภัย: "adventure",
};

export const PACE_TO_INTENSITY: Record<string, Intensity> = {
  "Slow Life": "slow_life",
  Chill: "chill",
  Balance: "balance",
  Active: "active",
  Hardcore: "hardcore",
};

export const BUDGET_KEY_TO_TIER: Record<string, "economy" | "comfort" | "premium" | "luxury"> = {
  Economy: "economy",
  Comfort: "comfort",
  Premium: "premium",
  Luxury: "luxury",
};

// "มีรถส่วนตัว" (has a private car) is a transport signal, not a hard
// constraint — routed to preferences.transport instead of constraints.
export const PRIVATE_CAR_CONDITION = "มีรถส่วนตัว";

export const CONDITION_TO_CONSTRAINT: Record<string, Constraint> = {
  มีผู้สูงอายุ: "seniors",
  เดินเยอะไม่ได้: "limited_walking",
  มีเด็กเล็ก: "young_children",
  ผู้ใช้รถเข็น: "wheelchair",
};

function parseDurationDaysFromLabel(label: string): number | undefined {
  const match = label.match(/(\d+)\s*วัน/);
  if (!match) return undefined;
  const days = Number(match[1]);
  return Number.isFinite(days) && days > 0 ? days : undefined;
}

function toApiDateOnly(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export function buildGeneratePlanRequest(draft: TripDraft): GeneratePlanRequest {
  const styles: TravelStyle[] = [];
  const customStyles: string[] = [];
  for (const tag of draft.styles) {
    const mapped = STYLE_TAG_TO_ENUM[tag];
    if (mapped) styles.push(mapped);
    else customStyles.push(tag);
  }

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

  // Quick-pick destinations (COUNTRY_CITY_FALLBACK in DestinationSearch) have
  // coordinates but no placeId/externalRef — the API requires a non-empty
  // placeId whenever destinationPlace is sent at all, so omit the whole
  // object rather than send one with an empty placeId.
  const destinationPlaceId = draft.destinationPlace?.placeId || draft.destinationPlace?.externalRef;

  const request: GeneratePlanRequest = {
    trip: {
      destination: draft.destination,
      destinationPlace:
        draft.destinationPlace && destinationPlaceId
          ? {
              placeId: destinationPlaceId,
              name: draft.destinationPlace.name,
              country: draft.destinationPlace.country || undefined,
              countryCode: draft.destinationPlace.countryCode,
              latitude: draft.destinationPlace.latitude,
              longitude: draft.destinationPlace.longitude,
            }
          : undefined,
      guests: { adults: draft.adults, children: draft.children > 0 ? draft.children : undefined },
    },
    preferences: {
      styles: styles.length ? styles : undefined,
      customStyles: customStyles.length ? customStyles : undefined,
      intensity: draft.pace ? PACE_TO_INTENSITY[draft.pace] : undefined,
      transport: transport.length ? transport : undefined,
      constraints: constraints.length ? constraints : undefined,
      customConstraints: customConstraints.length ? customConstraints : undefined,
      budget: buildBudget(draft),
      accommodation: buildAccommodation(draft),
    },
    locale: "th",
    currency: "THB",
  };

  if (draft.startDate && draft.endDate) {
    request.trip.dates = {
      mode: "fixed",
      startDate: toApiDateOnly(draft.startDate),
      endDate: toApiDateOnly(draft.endDate),
    };
  } else {
    const durationDays = parseDurationDaysFromLabel(draft.duration);
    if (durationDays) request.trip.dates = { mode: "flexible", durationDays };
  }

  return request;
}

function buildBudget(draft: TripDraft): GeneratePlanBudget | undefined {
  if (!draft.budget) return undefined;
  if (draft.budget === "custom") {
    const amount = Number(draft.customBudget.replace(/[^\d]/g, ""));
    return Number.isFinite(amount) && amount > 0 ? { tier: "custom", amountPerPersonPerDay: amount } : undefined;
  }
  const tier = BUDGET_KEY_TO_TIER[draft.budget];
  return tier ? { tier } : undefined;
}

function buildAccommodation(draft: TripDraft): GeneratePlanAccommodation | undefined {
  const accommodation = draft.accommodation;
  if (!accommodation) return undefined;

  if (accommodation.status === "booked" && accommodation.booked) {
    return {
      status: "booked",
      name: accommodation.booked.hotelName || undefined,
      bookingUrl: accommodation.booked.bookingLink || undefined,
    };
  }

  if (accommodation.status === "unbooked" && accommodation.unbooked) {
    const { styles: hotelStyles, styleRecommend, grades, gradeRecommend, note } = accommodation.unbooked;
    // Hotel "style" (boutique/resort/etc.) has no dedicated field in this
    // endpoint's accommodation shape — folded into notes as free-text hint.
    const styleNote = !styleRecommend && hotelStyles.length ? `สไตล์ที่ต้องการ: ${hotelStyles.join(", ")}` : undefined;
    return {
      status: "not_booked",
      grade: !gradeRecommend && grades.length ? grades.join(", ") : undefined,
      notes: [styleNote, note.trim()].filter(Boolean).join(" — ") || undefined,
    };
  }

  return undefined;
}

// ─── Example: draft that lets PunGuide pick everything ("แนะนำมาให้เลย") ───
//
// Contrast with an explicit-choice draft (accommodation.unbooked.styleRecommend:
// false, gradeRecommend: false, styles/grades populated) — buildAccommodation
// above folds the chosen style/grade into notes/grade for that case. Below,
// both flags are true, so buildAccommodation ignores styles/grades entirely
// and only note (if any) survives into GeneratePlanAccommodation.notes.
//
// selectedRecommendations is included here for reference only — it is NOT a
// real TripDraft field. It lives in separate useState on create-trip/page.tsx
// and never reaches /trips/generate-plan; it's merged into the generated
// trip afterward, by withSelectedRecommendations, onto whichever day the
// traveler assigned each place to on the recommended-places step (or into
// lib/trip-places.ts as an unscheduled "save for later" place when
// dayIndex is null). Shown inline so the full request→response round trip
// is visible in one place.
//
// const draft: TripDraft = {
//   id: "draft-002",
//   createdAt: "2026-08-10T09:00:00.000Z",
//   mode: "ai",
//   destination: "เชียงใหม่, ไทย",
//   destinationPlace: {
//     placeId: "ChIJ...chiangmai",
//     name: "เชียงใหม่",
//     country: "ไทย",
//     countryCode: "TH",
//     latitude: 18.7883,
//     longitude: 98.9853,
//   },
//   duration: "3 วัน 2 คืน",
//   startDate: "2026-11-20T00:00:00.000Z",
//   endDate: "2026-11-22T00:00:00.000Z",
//   guests: "ผู้ใหญ่ 2 คน",
//   adults: 2,
//   children: 0,
//   styles: ["วัฒนธรรม", "อาหาร", "คาเฟ่"],
//   pace: "Chill",
//   budget: "Comfort",
//   customBudget: "",
//   conditions: ["มีรถส่วนตัว"],
//   accommodation: {
//     status: "unbooked",
//     unbooked: {
//       styles: [],          // ignored either way once styleRecommend is true
//       styleRecommend: true, // "แนะนำสไตล์ให้เลย"
//       grades: [],
//       gradeRecommend: true, // "แนะนำเกรดให้เลย"
//       note: "อยากได้ที่พักใกล้ถนนคนเดินนิมมานเหมิน",
//     },
//   },
//
//   // NOT a TripDraft field — see note above.
//   selectedRecommendations: [
//     {
//       dayIndex: 0, // assigned to day 1 on the recommended-places sheet
//       place: {
//         googlePlaceId: "b3f2e1a0-...-suggest-uuid",
//         name: "ร้านเข้าซอย",
//         address: "141 ถ.ราชดำเนิน ต.ศรีภูมิ อ.เมืองเชียงใหม่",
//         latitude: 18.7906,
//         longitude: 98.9868,
//         rating: 4.6,
//         imageUrl: "https://.../khao-soy.jpg",
//         rawCategory: "restaurant",
//       },
//     },
//     {
//       dayIndex: null, // "บันทึกไว้ก่อน" — no day chosen yet
//       place: {
//         googlePlaceId: "9c7d4f2b-...-suggest-uuid",
//         name: "วัดพระสิงห์วรมหาวิหาร",
//         address: "2 ถ.สามล้าน ต.พระสิงห์ อ.เมืองเชียงใหม่",
//         latitude: 18.7877,
//         longitude: 98.9825,
//         rating: 4.7,
//         rawCategory: "attraction",
//       },
//     },
//   ],
// };
//
// buildAccommodation(draft) resolves to:
//   { status: "not_booked", grade: undefined, notes: "อยากได้ที่พักใกล้ถนนคนเดินนิมมานเหมิน" }
// (styleNote is skipped because styleRecommend is true, grade is skipped
// because gradeRecommend is true — only the free-text note passes through.)
//
// draft.selectedRecommendations never reaches buildGeneratePlanRequest — once
// the API responds, withSelectedRecommendations(generatedTrip) appends the
// dayIndex: 0 entry above to generatedTrip.days[0].activities (times ticking
// up from 09:00, capped at 22:00), and hands the dayIndex: null entry to
// lib/trip-places.ts's addTripPlace(generatedTrip.id, ...) instead, since it
// has no day yet:
//
//   { id: "<uuid>", time: "09:00", title: "ร้านเข้าซอย", category: "food",
//     location: { name: "ร้านเข้าซอย", lat: 18.7906, lng: 98.9868, rating: 4.6,
//                  imageUrl: "https://.../khao-soy.jpg", googlePlaceId: "b3f2e1a0-...-suggest-uuid" },
//     cost: 0 },
