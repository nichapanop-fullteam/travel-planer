import { BACKEND_URL } from "@/lib/backend-url";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

// Public share links — POST/GET/PATCH/DELETE /trips/:tripId/share for the
// owner, plus GET /shared-trips/:shareToken for anyone with the link.
//
// Unlike listTrips/getTrip (which go through the /api/trips proxy because the
// backend sends no Access-Control-Allow-Origin on those routes), the share
// routes do send CORS headers — verified against a preflight, which answers
// 204 with Access-Control-Allow-Origin and PATCH/DELETE among the allowed
// methods. So these call BACKEND_URL directly via authenticatedFetch, the
// same as saveTrip/likeTrip/getMyTrips.

export interface TripShare {
  id: string;
  /** Use verbatim — never rebuild it from shareToken. The base comes from the
   *  backend's SHARE_BASE_URL env, so the domain can change without a
   *  frontend release. */
  shareUrl: string;
  shareToken: string;
  accessLevel: "view";
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripSharePatch {
  /** false revokes the link but keeps the token, so `true` later restores the
   *  same URL — anyone still holding it regains access. Use `regenerate` (or
   *  delete + create) to actually cut off previous recipients. */
  isActive?: boolean;
  /** ISO 8601, or null for no expiry. */
  expiresAt?: string | null;
  /** Issues a brand-new token; the previous link dies immediately. */
  regenerate?: boolean;
}

// POST is idempotent for a link that's currently active — it answers with the
// existing token, so a URL already pasted into a group chat keeps working.
// The one exception is a link that was revoked or expired: that returns a NEW
// token rather than reviving the old one, since reviving it would silently
// hand access back to everyone still holding the link the owner took away.
export async function createShareLink(tripId: string): Promise<TripShare> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/share`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`เปิดแชร์ทริปไม่สำเร็จ (${response.status} ${response.statusText})`);
  }
  return response.json();
}

// Resolves to null when the trip has never been shared — the backend answers
// 404 for that, which is a normal state (the share dialog uses it to decide
// between "เปิดแชร์" and showing the existing link), not an error worth
// throwing. A non-owner also gets 404 here rather than 403, deliberately: the
// API won't confirm whether the id belongs to a real trip.
export async function getShareLink(tripId: string): Promise<TripShare | null> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/share`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`โหลดสถานะการแชร์ไม่สำเร็จ (${response.status} ${response.statusText})`);
  }
  return response.json();
}

// PATCH only edits an existing share — a trip that was never shared answers
// 404 here, so create it with createShareLink first.
export async function updateShareLink(tripId: string, patch: TripSharePatch): Promise<TripShare> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/share`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error(`แก้ไขการแชร์ไม่สำเร็จ (${response.status} ${response.statusText})`);
  }
  return response.json();
}

// 204, no body. Idempotent — deleting a link that was already revoked, or one
// that never existed, still answers 204. The row is only soft-deleted, so the
// trip can be shared again later (with a new token, per createShareLink).
export async function deleteShareLink(tripId: string): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/share`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`ยกเลิกลิงก์แชร์ไม่สำเร็จ (${response.status} ${response.statusText})`);
  }
}

// ---------------------------------------------------------------------------
// The public read side
// ---------------------------------------------------------------------------

// Deliberately narrower than BackendTrip: no ids anywhere (not the trip's, nor
// any day/activity/place/media id), no money, no free-text notes, no booking
// fields, no accommodations/expenses, no owner identifiers beyond a display
// name, and no workflow status. Days are addressed by `dayNumber` and
// activities by `order` — those are the React keys here.
//
// Don't try to recover a trip id from this to call GET /trips/:id: the whole
// point of the feature is that `shareToken` is the only key, and the only one
// the owner can revoke. A trip id can't be revoked.
export interface SharedTripActivity {
  /** 0-based within its day. */
  order: number;
  time?: string;
  title: string;
  category: string;
  /** `imageUrl` isn't in the API doc's example but the live payload sends it
   *  (a Google place photo), and it's what the activity thumbnails use. */
  place?: { name: string; lat?: number; lng?: number; rating?: number; imageUrl?: string };
  travelNote?: string;
  travelFromPrevious?: { type: string; durationMin?: number; distanceKm?: number };
}

export interface SharedTripDay {
  dayNumber: number;
  date?: string;
  activities: SharedTripActivity[];
}

export interface SharedTrip {
  title: string;
  destination: string;
  schedule?: {
    startDate?: string;
    endDate?: string;
    durationDays?: number;
    durationNights?: number;
    isDateFlexible?: boolean;
  };
  tags?: string[];
  /** Absent entirely when the owner never set a display name — there's no
   *  username fallback by design. */
  owner?: { name: string; avatarUrl?: string | null };
  /** Note the flat shape: this is NOT BackendTrip's `coverImage.urls.large`. */
  coverImage?: { original?: string; large?: string; thumbnail?: string; altText?: string };
  days?: SharedTripDay[];
  likeCount?: number;
  remixCount?: number;
  updatedAt?: string;
}

// Server-side only: called from the /shared-trips/[shareToken] server
// component, so it talks to the backend directly (no CORS involved off the
// browser) and no proxy route is needed. Takes no token of any kind — the
// shareToken in the path IS the credential.
//
// Returns null for every failure the backend folds into one 404: unknown
// token, revoked link, expired link, deleted trip. They're indistinguishable
// on purpose — telling them apart would leak to an ex-recipient whether the
// trip still exists and whether they were specifically cut off. So the caller
// must render one neutral "this link no longer works" page and must not guess
// a reason.
export async function getSharedTrip(shareToken: string): Promise<SharedTrip | null> {
  const base = process.env.EXTERNAL_API_BASE_URL ?? BACKEND_URL;
  const response = await fetch(`${base}/shared-trips/${encodeURIComponent(shareToken)}`, {
    headers: { "ngrok-skip-browser-warning": "true" },
    // The page is rendered per request; a shared plan the owner just edited
    // shouldn't serve a stale copy, and a revoked link must stop working.
    cache: "no-store",
  });

  if (!response.ok) return null;
  return response.json();
}
