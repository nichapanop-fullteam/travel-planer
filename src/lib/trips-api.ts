import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";
import { getTripGallery } from "@/lib/trip-media-api";
import type { Day, Media, MediaSummary } from "@/types";

// Shape confirmed against a real GET /trips response (see the curl example
// this was built from) — loose on the nested bits (brief) that vary a lot
// between entries, but the top-level fields are real.
export interface BackendTripCustomer {
  id: string;
  name: string;
  avatarUrl?: string;
  groupSize: number;
}

// days/activities mirror the frontend's own Day/Activity types field for
// field (see itinerary.response.dto.ts on the backend, which is built to
// match them) — reused directly rather than re-declared.
export type BackendTripDay = Day;

export interface BackendTripSchedule {
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  durationNights?: number;
  isDateFlexible: boolean;
}

export type BackendBudgetTier = "economy" | "comfort" | "premium" | "luxury" | "custom";

// Compact shape returned by GET /trips. It intentionally does not contain
// days, customer, brief, or mediaSummary; cards must not treat it as a full
// BackendTrip and should fetch GET /trips/:id after navigation.
export interface BackendTripListItem {
  id: string;
  title: string;
  destination: string;
  status: "draft" | "shared" | "confirmed" | "completed";
  schedule: BackendTripSchedule;
  budgetLimit?: number;
  budgetTier?: BackendBudgetTier;
  tags: string[];
  coverImage?: Media;
  createdAt: string;
  updatedAt: string;
}

// Chips under the trip title ("Active · รถสาธารณะท้องถิ่น · เงื่อนไข") — as
// submitted by the create-trip wizard, not translated to a display taxonomy.
// See TripPlanBrief on the backend (src/utils/trip-plan-brief.ts).
export interface BackendTripBrief {
  styles?: string[];
  customStyles?: string[];
  intensity?: string;
  transport?: string[];
  customTransport?: string[];
  constraints?: string[];
  customConstraints?: string[];
  groupType?: string;
}

export interface BackendTrip {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  status: string; // "draft" | "confirmed" | "shared" | ... — kept as string, backend's enum isn't finalized yet
  schedule: BackendTripSchedule;
  budgetLimit?: number;
  budgetTier?: string;
  planMode?: string;
  brief?: BackendTripBrief;
  coverImage?: Media; // absent until PUT /trips/:tripId/cover has been called — see lib/trip-media-api.ts
  mediaSummary?: MediaSummary;
  customer?: BackendTripCustomer; // absent if the trip's owner row is gone
  days: BackendTripDay[];
  createdAt: string;
  updatedAt: string;
}

// GET /trips is the public, cross-owner feed and intentionally sends no
// authentication. It goes through
// /api/trips (see that route) rather than EXTERNAL_API_BASE_URL directly —
// some environments don't send Access-Control-Allow-Origin on this route,
// which blocks a direct browser fetch with CORS. Used on the public /main
// page; getMyTrips() below is the strict, auth-required variant for
// /my-trips.
export async function listTrips(): Promise<BackendTripListItem[]> {
  const response = await fetch("/api/trips");

  if (!response.ok) {
    throw new Error(`โหลดทริปไม่สำเร็จ (${response.status} ${response.statusText})`);
  }

  return response.json();
}

// GET /trips/:id is also public and goes through /api/trips/[id] for the
// same CORS reason. Used by
// generated-plan/[id]/page.tsx to render a trip that was created on the
// backend (e.g. via createTripOnServer) but never saved to this browser's
// localStorage, so lib/generated-trips.ts's getGeneratedTrip() can't find it.
export async function getTrip(id: string): Promise<BackendTrip | null> {
  const response = await fetch(`/api/trips/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`โหลดทริปไม่สำเร็จ (${response.status} ${response.statusText})`);
  }

  const trip = (await response.json()) as BackendTrip;

  // Trip details and media are intentionally separate APIs. Hydrate each
  // activity's `images` array from gallery rows linked by sourceActivityId,
  // so the existing detail UI can render uploaded photos automatically.
  try {
    const firstPage = await getTripGallery(id, { page: 1, limit: 24 });
    const mediaItems = [...firstPage.items];
    const pageCount = Math.ceil(firstPage.total / firstPage.limit);
    for (let page = 2; page <= pageCount; page += 1) {
      const nextPage = await getTripGallery(id, { page, limit: firstPage.limit });
      mediaItems.push(...nextPage.items);
    }

    const imagesByActivity = new Map<string, string[]>();
    for (const media of mediaItems) {
      if (!media.sourceActivityId) continue;
      const images = imagesByActivity.get(media.sourceActivityId) ?? [];
      images.push(media.urls.large);
      imagesByActivity.set(media.sourceActivityId, images);
    }

    trip.days = trip.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => ({
        ...activity,
        images: imagesByActivity.get(activity.id) ?? activity.images,
      })),
    }));
  } catch (error) {
    // The itinerary remains usable if media storage is unavailable. Place
    // images from activity.location.imageUrl continue to act as fallback.
    console.warn("โหลดรูปภาพของกิจกรรมไม่สำเร็จ", error);
  }

  return trip;
}

// Pattern for any backend call that's scoped to the signed-in user (My
// Trips, Create Trip, ...): attach the backend's own accessToken and retry
// once after refreshing an expired token.
export async function getMyTrips(): Promise<BackendTripListItem[]> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/mine`);

  if (!response.ok) {
    throw new Error("Failed to load trips");
  }

  return response.json();
}

// DELETE /trips/:tripId — not yet confirmed against the real backend (no
// delete-trip endpoint has been documented for this app so far, see the
// comment on createTripOnServer's error handling in trips-create-api.ts);
// this follows the same REST shape as every other single-trip mutation here
// (PATCH /trips/:tripId, DELETE /trips/:tripId/media/:mediaId, ...).
export async function deleteTrip(tripId: string): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`ลบทริปไม่สำเร็จ (${response.status} ${response.statusText}) ${body.slice(0, 300)}`);
  }
}
