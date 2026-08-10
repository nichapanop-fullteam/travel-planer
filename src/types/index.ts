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

export interface Activity {
  id: string;
  time: string; // "09:00"
  title: string;
  category: ActivityCategory;
  location?: Location;
  notes?: string;
  cost: number; // THB, per group
  travelNote?: string; // e.g. "เดิน ~8 นาที" — how to get here from the previous stop
  icon?: string; // key into ACTIVITY_ICON_OVERRIDE (generated-plan) — overrides the category default icon
}

export interface Day {
  id: string;
  dayNumber: number;
  date: string; // ISO date, e.g. "2026-08-10"
  activities: Activity[];
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
  duration: string; // free text for now, e.g. "3 วัน 2 คืน" — no date picker yet
  guests: string; // free text for now, e.g. "ผู้ใหญ่, 1 คน"
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
      styleRecommend: boolean; // "แนะนำให้เลย" — let Pluno pick the style
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
// The itinerary Pluno generates from a TripDraft, shown on /generated-plan/[id]
// for review before the traveler confirms it. Saved to localStorage for now
// (see lib/generated-trips.ts); no backend/API yet.

export type GeneratedTripStatus = "generated" | "confirmed";

export interface GeneratedTrip {
  id: string;
  draftId: string; // links back to the TripDraft it was generated from
  createdAt: string; // ISO timestamp
  destination: string;
  destinationPlace?: Destination; // structured place data, for Nearby/Text Search on the trip detail page
  coverImageUrl: string;
  durationLabel: string; // "3 วัน 2 คืน"
  paceLabel: string; // "Chill เที่ยวสบาย"
  budgetLabel: string; // "฿3,000 / วัน"
  conditionsLabel: string; // "มีรถส่วนตัว, เดินเยอะไม่ได้"
  styles: string[];
  status: GeneratedTripStatus;
  days: Day[];
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

// A place the user picked via Places Autocomplete, before Pluno-specific
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

// SelectedPlace + the scheduling info Pluno adds when the user builds their
// own trip (Create Trip → "สร้างด้วยตัวเอง"). Saved client-side for now via
// lib/trip-places.ts; no backend yet.
export interface TripPlace extends SelectedPlace {
  startTime: string; // "09:00"
  durationMinutes: number;
  estimatedCost: number; // THB
  category: PlaceCategory;
}
