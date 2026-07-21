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
