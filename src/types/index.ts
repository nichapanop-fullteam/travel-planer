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
}

export interface Activity {
  id: string;
  time: string; // "09:00"
  title: string;
  category: ActivityCategory;
  location?: Location;
  notes?: string;
  cost: number; // THB, per group
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
  duration: string; // free text for now, e.g. "3 วัน 2 คืน" — no date picker yet
  guests: string; // free text for now, e.g. "ผู้ใหญ่, 1 คน"
  styles: string[];
  pace: string | null;
  budget: string | null; // preset key ("Economy" | "Comfort" | "Premium" | "Luxury" | "custom")
  customBudget: string; // only meaningful when budget === "custom"
  conditions: string[];
}
