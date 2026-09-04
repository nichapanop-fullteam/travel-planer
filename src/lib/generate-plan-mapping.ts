import type { TripDraft } from "@/types";
import type {
  AccommodationGrade,
  AccommodationStyle,
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

// HOTEL_STYLE_OPTIONS in create-trip/page.tsx. MORE_HOTEL_STYLE_OPTIONS
// ("อพาร์ทเมนท์", "แคมป์ปิ้ง / กลางแจ้ง") is deliberately absent — neither has an
// enum value, so both fall through to accommodation.customStyles like any
// chip the traveler typed themselves.
export const HOTEL_STYLE_TAG_TO_ENUM: Record<string, AccommodationStyle> = {
  บูทีค: "boutique",
  รีสอร์ท: "resort",
  โรงแรมทั่วไป: "hotel",
  โฮมสเตย์: "homestay",
  วิลล่า: "villa",
  โฮสเทล: "hostel",
};

// HOTEL_GRADE_OPTIONS is 1★–5★ but the API's grade is an enum, not a star
// count — an unmapped chip has to be dropped rather than sent through, since
// "3★" fails validation with a 400. "ไม่ระบุ" is intentionally unmapped: it
// means "no preference", same as sending no grade at all.
export const HOTEL_GRADE_TAG_TO_ENUM: Record<string, AccommodationGrade> = {
  "1★": "budget",
  "2★": "budget",
  "3★": "midscale",
  "4★": "upscale",
  "5★": "luxury",
  หรูหราพิเศษ: "luxury",
};

const GRADE_RANK: Record<AccommodationGrade, number> = {
  hostel: 0,
  budget: 1,
  midscale: 2,
  upscale: 3,
  luxury: 4,
};

// API caps, enforced here so an over-long selection is trimmed instead of
// 400-ing the whole request.
const MAX_ACCOMMODATION_STYLES = 6;
const MAX_ACCOMMODATION_CUSTOM_STYLES = 5;
const MAX_CUSTOM_STYLE_LENGTH = 60;
export const MAX_SELECTED_PLACE_IDS = 40;

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

// selectedPlaceIds are the `places` ids of the cards the traveler tapped
// "+ เพิ่มแผน" on during the recommended-places step — passed separately
// because they live in their own state on create-trip/page.tsx rather than on
// the TripDraft.
export function buildGeneratePlanRequest(
  draft: TripDraft,
  selectedPlaceIds: string[] = []
): GeneratePlanRequest {
  // Deduped before the cap so 40 slots are never spent on repeats (the API
  // dedupes too, but it counts the raw list against its own limit).
  const pickedPlaceIds = [...new Set(selectedPlaceIds)].slice(0, MAX_SELECTED_PLACE_IDS);

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
    selectedPlaceIds: pickedPlaceIds.length ? pickedPlaceIds : undefined,
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

    const styles: AccommodationStyle[] = [];
    const customStyles: string[] = [];
    if (!styleRecommend) {
      for (const tag of hotelStyles) {
        const mapped = HOTEL_STYLE_TAG_TO_ENUM[tag];
        if (mapped) {
          if (!styles.includes(mapped)) styles.push(mapped);
        } else {
          customStyles.push(tag.slice(0, MAX_CUSTOM_STYLE_LENGTH));
        }
      }
    }

    // grade takes a single value while the chip row is multi-select, so the
    // highest tier picked wins and the full selection is restated in notes —
    // otherwise picking 3★ and 4★ would tell the API strictly less than the
    // traveler said.
    const gradeTags = gradeRecommend ? [] : grades;
    const gradeNote = gradeTags.length > 1 ? `เกรดที่รับได้: ${gradeTags.join(", ")}` : undefined;

    return {
      status: "not_booked",
      grade: pickGrade(gradeTags),
      styles: styles.length ? styles.slice(0, MAX_ACCOMMODATION_STYLES) : undefined,
      customStyles: customStyles.length
        ? customStyles.slice(0, MAX_ACCOMMODATION_CUSTOM_STYLES)
        : undefined,
      notes: [gradeNote, note.trim()].filter(Boolean).join(" — ") || undefined,
    };
  }

  return undefined;
}

function pickGrade(gradeTags: string[]): AccommodationGrade | undefined {
  let picked: AccommodationGrade | undefined;
  for (const tag of gradeTags) {
    const mapped = HOTEL_GRADE_TAG_TO_ENUM[tag];
    if (mapped && (!picked || GRADE_RANK[mapped] > GRADE_RANK[picked])) picked = mapped;
  }
  return picked;
}

// ─── Example: draft that lets PunGuide pick everything ("แนะนำมาให้เลย") ───
//
// Contrast with an explicit-choice draft (accommodation.unbooked.styleRecommend:
// false, gradeRecommend: false, styles/grades populated) — buildAccommodation
// above folds the chosen style/grade into notes/grade for that case. Below,
// both flags are true, so buildAccommodation ignores styles/grades entirely
// and only note (if any) survives into GeneratePlanAccommodation.notes.
//
// selectedRecommendations is shown here for reference only — it is NOT a
// TripDraft field. It lives in its own useState on create-trip/page.tsx, and
// the page passes just the ids to buildGeneratePlanRequest's second argument,
// which sends them as selectedPlaceIds. Included inline so the whole request
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
//   // NOT a TripDraft field — see note above. ai mode's picks carry no day
//   // assignment; the API decides which day each one lands on.
//   selectedRecommendations: [
//     {
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
//   { status: "not_booked", grade: undefined, styles: undefined,
//     customStyles: undefined, notes: "อยากได้ที่พักใกล้ถนนคนเดินนิมมานเหมิน" }
// (styles/customStyles are skipped because styleRecommend is true, grade
// because gradeRecommend is true — only the free-text note passes through.)
//
// The two selectedRecommendations above reach the request as their ids:
//
//   selectedPlaceIds: ["b3f2e1a0-...-suggest-uuid", "9c7d4f2b-...-suggest-uuid"]
//
// Both places are then in the returned draft's days — placed by the API, not
// appended to day 1 afterwards, so their times and ordering are part of the
// plan the model actually reasoned about. If the plan has no room for one
// (more picks than items-per-day allows), it comes back as a
// missing_picked_place warning in generation.violations rather than silently
// vanishing.
