import type { Intensity } from "@/lib/generate-plan-api";

// ─── Account (login / create profile) ───
// No real backend yet — persisted client-side only, same localStorage
// pattern as everything else in this app (see lib/auth.ts).
export type UserRole = "traveler" | "creator" | "admin";

export interface User {
  id: string; // UUID / Firebase UID
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt: string; // datetime
  updatedAt: string; // datetime
}

export type ActivityCategory =
  | "transport"
  | "food"
  | "hotel"
  | "sightseeing"
  | "activity"
  | "other";

export interface Location {
  name: string;
  lat?: number;
  lng?: number;
  rating?: number; // shown on the map pin's detail popup
  imageUrl?: string; // shown on the map pin's detail popup
  googlePlaceId?: string; // reference for re-fetching live details/photos from Google Places
}

// How the traveler gets from the previous stop to this one — matches the
// `travelTypeFromPrev`/etc. fields accepted by POST /days/:dayId/items,
// PATCH /items/:itemId, and each activity in POST /trips/create.
export type TravelType =
  | "walk"
  | "bicycle"
  | "tuk_tuk"
  | "private_transfer"
  | "rental_car"
  | "boat"
  | "train"
  | "airplane"
  | "other";

export interface TravelFromPrevious {
  type: TravelType;
  customType?: string; // free-text label entered via "เพิ่มเติม" when type is "other"
  durationMin?: number;
  distanceKm?: number;
  costAmount?: number;
  costCurrency?: string;
  notes?: string;
}

export interface Activity {
  id: string;
  order?: number; // backend itinerary order, zero-based
  name?: string; // alias of title on POST /days/:dayId/items responses
  time: string; // "09:00"
  title: string;
  category: ActivityCategory;
  location?: Location;
  notes?: string;
  cost: number; // THB, per group
  travelNote?: string; // e.g. "เดิน ~8 นาที" — free-text fallback, kept for backward compat
  travelFromPrevious?: TravelFromPrevious; // structured version of travelNote — the leg from the previous stop
  // A provider estimate can be dismissed without deleting the backend's
  // structural segment (segments must continue to match adjacent stops).
  // Kept client-side so the row returns to "+ เพิ่มการเดินทาง" for this plan.
  dismissedTravelSegmentId?: string;
  icon?: string; // key into ACTIVITY_ICON_OVERRIDE (generated-plan) — overrides the category default icon
  images?: string[]; // user-uploaded photos for this stop, as data URLs
}

export type TravelSegmentMode = "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";
export type TravelSegmentStatus = "CALCULATED" | "FAILED";

// Provider-computed route between two adjacent itinerary items. This is kept
// separate from Activity.travelFromPrevious, which is traveler-entered data
// and must never be overwritten by automatic recalculation.
export interface TravelSegment {
  id: string;
  dayId: string;
  fromPlaceId: string; // Activity.id, not places.id / Google Place id
  toPlaceId: string; // Activity.id, not places.id / Google Place id
  order: number;
  travelMode: TravelSegmentMode;
  routeStatus: TravelSegmentStatus;
  durationSeconds: number | null;
  durationMinutes: number | null;
  distanceMeters: number | null;
  distanceKilometers: number | null;
  calculatedAt: string | null;
}

export interface Day {
  id: string;
  dayNumber: number;
  date: string; // ISO date, e.g. "2026-08-10"
  activities: Activity[];
  travelSegments?: TravelSegment[];
}

export interface Customer {
  id: string;
  name: string;
  avatarUrl?: string;
  contact: string; // LINE id / phone
  groupSize: number;
}

export type TripStatus = "draft" | "shared" | "confirmed" | "completed";

export interface Trip {
  id: string;
  title: string;
  destination: string;
  coverImageUrl?: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  customer: Customer;
  days: Day[];
  budgetLimit?: number; // optional cap set by organizer
}

// ─── Consumer / public feed (Home + Trip Detail) ───
// A separate shape from Trip (organizer): a FeedTrip has no assigned customer,
// it's a public itinerary published by a creator that other travelers browse,
// save, and remix. Reuses Day/Activity so the same Itinerary/Budget UI works for both.

export type FeedCategory =
  | "beach"
  | "mountain"
  | "city"
  | "culture"
  | "nature"
  | "food"
  | "adventure";

export interface Creator {
  name: string;
  handle: string;
  avatar: string; // emoji avatar
}

export interface Member {
  name: string;
  avatar: string; // emoji avatar
}

export interface FeedTrip {
  id: string;
  title: string;
  destination: string;
  coverImageUrl: string;
  category: FeedCategory;
  tags: string[];
  rating: number;
  creator: Creator;
  members: Member[]; // co-travelers on this trip, shown on the group Trip Detail page
  saves: number;
  remixes: number;
  description: string;
  days: Day[]; // price/duration/date-range are derived from this — see lib/trip-utils.ts
}

// ─── Create Trip (Step 1 form) ───
// Captured before any itinerary exists — just the traveler's request/preferences.
// Saved to localStorage for now (see lib/trip-drafts.ts); no backend/API yet.

export type TripCreationMode = "ai" | "self";

export interface TripDraft {
  id: string;
  createdAt: string; // ISO timestamp
  mode: TripCreationMode;
  destination: string;
  destinationPlace?: Destination; // structured place data when picked via Places Autocomplete — needed later for map/routes/nearby search, not just display
  duration: string; // display label, e.g. "3 วัน 2 คืน" — always set, regardless of which DatePickerDialog tab was used
  startDate?: string; // ISO date — only set when the user picked an explicit date range (DatePickerDialog's "ระบุวันที่" tab); absent for the "จำนวนคืน" flexible-duration tab
  endDate?: string;
  guests: string; // display label, e.g. "ผู้ใหญ่ 2 คน"
  adults: number;
  children: number;
  styles: string[];
  pace: string | null;
  budget: string | null; // preset key ("Economy" | "Comfort" | "Premium" | "Luxury" | "custom")
  customBudget: string; // only meaningful when budget === "custom"
  conditions: string[];
  accommodation?: {
    status: "booked" | "unbooked";
    booked?: {
      attachmentName?: string; // display name only — file bytes aren't persisted (client-side storage)
      bookingLink: string;
      hotelName: string;
    };
    unbooked?: {
      styles: string[];
      styleRecommend: boolean; // "แนะนำให้เลย" — let PunGuide pick the style
      grades: string[];
      gradeRecommend: boolean;
      note: string;
    };
  };
}

// A city/region picked as a trip's destination (Create Trip → Destination
// field, restricted to Places Autocomplete's "(regions)" type). Kept
// separate from the free-text destination label so later steps (map,
// Nearby/Text Search for in-city recommendations, Routes API) can use the
// placeId/coordinates instead of re-geocoding a display string.
export interface Destination {
  placeId?: string; // absent for quick-pick popular-destination entries that weren't geocoded live
  externalRef?: string; // id passed to the external Places API (/places/details) to hydrate the fields below
  name: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  address?: string; // hydrated from /places/details once a destination is picked
  rating?: number;
  imageUrl?: string;
}

// ─── Generated Plan (Step 2 — AI output) ───
// The itinerary PunGuide generates from a TripDraft, shown on /generated-plan/[id]
// for review before the traveler confirms it. Saved to localStorage for now
// (see lib/generated-trips.ts); no backend/API yet.

export type GeneratedTripStatus = "generated" | "confirmed";

export interface GeneratedTrip {
  id: string;
  draftId: string; // links back to the TripDraft it was generated from
  createdAt: string; // ISO timestamp
  title?: string; // custom trip name set via "แก้ไขทริป" — falls back to destination when unset
  destination: string;
  destinationPlace?: Destination; // structured place data, for Nearby/Text Search on the trip detail page
  coverImageUrl: string; // legacy fallback — prefer coverImage.urls.* once the trip has one (see lib/trip-media-api.ts)
  coverImage?: Media; // set once PUT /trips/:tripId/cover has been called for this trip; absent for mock/local-only trips
  mediaSummary?: MediaSummary;
  durationLabel: string; // "3 วัน 2 คืน"
  paceLabel: string; // "Chill เที่ยวสบาย"
  pace?: Intensity; // raw enum behind paceLabel — the actual value PATCH /trips/:id sends, since paceLabel is display text and can't be parsed back reliably
  budgetLabel: string; // "฿3,000 / วัน"
  conditionsLabel: string; // "มีรถส่วนตัว, เดินเยอะไม่ได้" — also doubles as the raw specialNotes text sent to PATCH /trips/:id (see "แก้ไขทริป"'s "เงื่อนไข / ข้อจำกัด" field); unrelated to the backend's separate `constraints` enum array
  styles: string[];
  status: GeneratedTripStatus;
  days: Day[];
  // Client-side preference for automatic, preliminary travel estimates.
  // Deliberately defaults to off: itinerary mutations only ask the backend
  // to reconcile Google Routes segments after the traveller opts in.
  autoTravelCalculationEnabled?: boolean;
  accommodation?: TripAccommodation;
  // Budget management (สรุปงบ tab) — expenses is the ledger shown/edited
  // there; undefined until the tab is first opened, at which point it's
  // seeded from the itinerary's existing costs (see lib/trip-expenses.ts).
  expenses?: TripExpense[];
  budgetGoal?: number; // THB, set via "ตั้งงบประมาณ"
  // Server-computed real total spend (activity + travel costs × travelers,
  // plus accommodation and standalone expenses — see BackendTrip.totalBudget
  // in lib/trips-api.ts). Undefined only for a local-only draft that's never
  // been synced to the backend, since there's nothing to compute it from yet.
  totalBudget?: number;
  // Set only for trips generated via POST /trips/generate-plan (real AI
  // generation) — absent for the older mocked-template trips. Surfaced as a
  // "this plan may need a look" banner when resolvedWithoutErrors is false;
  // see generation.violations in the API docs for what each code means.
  generationNotice?: {
    resolvedWithoutErrors: boolean;
    modelWarnings: string[];
    violations: {
      severity: "error" | "warning";
      code: string;
      message: string;
      dayNumber?: number;
      itemIndex?: number;
    }[];
  };
  // Set once this trip has a real row on the backend — either loaded via
  // GET /trips/:id, or after POST /trips/create has succeeded once. Until
  // then, "บันทึก" has to POST /trips/create (nothing to PATCH yet);
  // afterward it PATCHes the trip/day/item endpoints instead, to avoid
  // creating a duplicate trip on every save. backendDayIds/backendItemIds
  // are the ids confirmed to exist server-side at sync time — a day or
  // activity added locally afterward (handleAddDay/handleAddActivity, both
  // client-generated UUIDs) isn't in these sets and is skipped by the PATCH
  // sync, since the backend hasn't offered a create-day/create-item
  // endpoint yet, only PATCH ones for entities that already exist.
  backendSynced?: boolean;
  backendDayIds?: string[];
  backendItemIds?: string[];
  // Ownership/social metadata threaded from BackendTrip (see
  // buildGeneratedTripFromBackendTrip in lib/generated-trips.ts) — absent for
  // local-only/never-synced trips, which are always the current browser's own.
  ownerId?: string;
  creator?: { id: string; name: string; avatarUrl?: string };
  planMode?: string;
  saveCount?: number;
  remixCount?: number;
  // Public cumulative like counter from GET /trips/:id, and whether the
  // signed-in user is one of those likes. Optional here (unlike BackendTrip,
  // where likeCount is required) because a local-only draft that has never
  // been synced has no server-side count to carry — UI hides the figure
  // rather than showing a made-up 0 for those.
  likeCount?: number;
  isLiked?: boolean;
  // Set when this trip was created via POST /trips/:sourceTripId/remix — see
  // lib/trip-remix-api.ts. Only ever points at the immediate source (never a
  // chain), so attribution UI never has to render nested "remix of a remix".
  // sourceTitle/sourceCreatorName start populated (from the remix response's
  // rich `sourceTrip` attribution) right after remixing in this browser, but
  // a later GET/PATCH /trips/:id only ever echoes the flat `sourceTripId` —
  // see generated-plan/[id]/page.tsx's mount effect, which backfills them
  // with a one-shot GET /trips/:sourceTripId when they're missing.
  remixedFrom?: {
    sourceTripId: string;
    sourceTitle?: string;
    sourceCreatorName?: string;
  };
  // "private" unless the owner has explicitly published via PATCH /trips/:id
  // { visibility: "public" } — a trip must be public before anyone besides
  // its owner can remix it (see lib/trip-remix-api.ts).
  visibility?: "private" | "public";
  publishedAt?: string;
}

// Accommodation details editable via "แก้ไขทริป" → "เปลี่ยนที่พัก" on the trip
// detail page. Separate from Activity/Location since a trip's stay has
// fields (price/amenities/check-in-out) no itinerary stop needs.
export interface TripAccommodation {
  name: string;
  imageUrl?: string;
  pricePerNight?: number; // THB
  amenities: string[];
  checkIn?: string; // "14:00"
  checkOut?: string; // "12:00"
  description?: string;
  // Trip-detail's own "โรงแรม หรือที่พักของคุณ" setup form (AccommodationAccordion)
  // — client-only like the rest of this object, never PATCHed to the backend.
  bookingStatus?: "booked" | "unbooked";
  address?: string;
  checkInDate?: string; // ISO date, e.g. "2026-08-20"
  checkOutDate?: string; // ISO date
  desiredStyles?: string[]; // "บูทีค" / "รีสอร์ท" / etc. — only set in "ยังไม่จอง" mode
  desiredGrade?: string; // "1"–"5" (star count) or "แนะนำมาให้เลย"
  preferredHotelName?: string; // "ถ้ามีที่พักในใจแล้ว บอกเราได้"
}

// A single ledger entry on the budget-management tab. Broader than
// ActivityCategory (covers costs with no itinerary stop of their own, like
// flights or fuel) — created either by linking an existing itinerary item
// or by picking a category directly in the "เลือกรายการ" dialog.
export type ExpenseCategory =
  | "flight"
  | "hotel"
  | "car_rental"
  | "transport"
  | "food"
  | "drinks"
  | "sightseeing"
  | "activity"
  | "shopping"
  | "fuel"
  | "groceries"
  | "other";

export interface TripExpense {
  id: string;
  title: string;
  amount: number; // THB
  category: ExpenseCategory;
  date?: string; // ISO date; unset means "ไม่บังคับ" (no date)
  paidBy: string; // display name — no multi-user accounts in this demo, always "คุณ"
  splitLabel: string; // e.g. "ไม่แบ่ง" — no companion list to split across yet
  linkedActivityId?: string; // set when created from an existing itinerary stop
}

// ─── Trip media (cover image + gallery) ───
// See docs for POST/PATCH/DELETE /trips/:tripId/media* and PUT
// /trips/:tripId/cover. `Trip.coverImageUrl`/`GeneratedTrip.coverImageUrl`
// above are the old (now-unused) column — new code should prefer
// `coverImage.urls.*` and fall back to `coverImageUrl` only for
// trips/mocks that predate this API (see lib/trip-media-api.ts's
// resolveCoverImageUrl helper).

export type MediaSource = "user_upload" | "place" | "activity" | "destination" | "system_default";

export interface Media {
  mediaId: string;
  source: MediaSource;
  sourcePlaceId?: string;
  sourceActivityId?: string;
  storageKey?: string;
  urls: {
    original: string;
    large: string;
    thumbnail: string;
  };
  altText?: string;
  caption?: string;
  focalPoint?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  attribution?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface MediaSummary {
  totalImages: number;
  hasMore: boolean;
  galleryEndpoint: string;
}

// Lighter-weight shape returned by GET /trips/:tripId/media's `items` — see
// #27 in the media API doc for why this differs from `Media` above.
export interface GalleryMediaItem {
  id: string;
  source: MediaSource;
  sourcePlaceId: string | null;
  sourceActivityId: string | null;
  dayNumber: number | null;
  urls: {
    large: string;
    thumbnail: string;
  };
  altText: string | null;
  caption: string | null;
  isCover: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface TripGalleryResponse {
  tripId: string;
  coverMediaId?: string;
  total: number;
  page: number;
  limit: number;
  items: GalleryMediaItem[];
}

// ─── Place recommendations (Google Places / OpenTripMap) ───
// Candidate places surfaced while generating a trip. We only ever store the
// googlePlaceId as the durable reference — Google's Places policy forbids
// caching photo bytes or review text long-term, so photos/ratings should be
// re-fetched live using photoName/googlePlaceId when a page opens.

export type PlaceCategory = "hotel" | "attraction" | "restaurant";
export type PlaceSource = "google" | "opentripmap" | "creator";

export interface PlaceRecommendation {
  googlePlaceId: string;
  name: string;
  category: PlaceCategory;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  userRatingCount?: number;
  photoName?: string; // Google Photo reference name, not the image itself
  source: PlaceSource;
  score?: number; // recommendationScore() result at generation time
}

// A place the user picked via Places Autocomplete, before PunGuide-specific
// scheduling info (time/cost/category) is attached.
export interface SelectedPlace {
  googlePlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  addressComponents?: { longText: string | null; shortText: string | null; types: string[] }[];
}

// SelectedPlace + the scheduling info PunGuide adds when the user builds their
// own trip (Create Trip → "สร้างด้วยตัวเอง"). Saved client-side for now via
// lib/trip-places.ts; no backend yet.
export interface TripPlace extends SelectedPlace {
  startTime: string; // "09:00"
  durationMinutes: number;
  estimatedCost: number; // THB
  category: PlaceCategory;
}
