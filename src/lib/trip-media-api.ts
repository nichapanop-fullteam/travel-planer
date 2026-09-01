import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";
import type { GeneratedTrip, Media, TripGalleryResponse } from "@/types";

// Trip cover image + gallery API (endpoints #27-#32 in the media API doc).
// Same auth pattern as trips-create-api.ts: the backend's own accessToken
// (see backend-user.ts) as a Bearer header, hit BACKEND_URL directly.

async function throwOnError(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(`${action}ไม่สำเร็จ (${response.status} ${response.statusText}) ${body.slice(0, 300)}`);
}

// #27 GET /trips/:tripId/media
export async function getTripGallery(
  tripId: string,
  { page = 1, limit = 24 }: { page?: number; limit?: number } = {}
): Promise<TripGalleryResponse> {
  const url = new URL(`${BACKEND_URL}/trips/${tripId}/media`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, { headers: { "ngrok-skip-browser-warning": "1" } });
  await throwOnError(response, "โหลดรูปภาพทริป");
  return response.json();
}

// #28 POST /trips/:tripId/media — note: always 503s until the backend's GCS
// bucket is configured (see media API doc); surface that message as-is.
export async function uploadTripMedia(
  tripId: string,
  file: File,
  opts: { altText?: string; caption?: string; activityId?: string } = {}
): Promise<Media> {
  const formData = new FormData();
  formData.append("file", file);
  if (opts.altText) formData.append("altText", opts.altText);
  if (opts.caption) formData.append("caption", opts.caption);
  if (opts.activityId) formData.append("activityId", opts.activityId);

  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/media`, {
    method: "POST",
    body: formData,
  });
  await throwOnError(response, "อัปโหลดรูปภาพ");
  return response.json();
}

// #29 POST /trips/:tripId/media/from-place
export async function addTripMediaFromPlace(
  tripId: string,
  placeId: string,
  activityId?: string
): Promise<Media> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/media/from-place`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId, ...(activityId ? { activityId } : {}) }),
  });
  await throwOnError(response, "เพิ่มรูปภาพสถานที่");
  return response.json();
}

// #30 PATCH /trips/:tripId/media/:mediaId
export async function updateTripMedia(
  tripId: string,
  mediaId: string,
  patch: { altText?: string; caption?: string; focalPoint?: { x: number; y: number } }
): Promise<Media> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/media/${mediaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  await throwOnError(response, "แก้ไขรูปภาพ");
  return response.json();
}

// #31 DELETE /trips/:tripId/media/:mediaId
export async function deleteTripMedia(tripId: string, mediaId: string): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/media/${mediaId}`, {
    method: "DELETE",
  });
  await throwOnError(response, "ลบรูปภาพ");
}

// Deletes every media row still pointing at one activity (sourceActivityId)
// before that activity/item is removed. DELETE /items/:id 500s instead of
// succeeding when a media row's foreign key still references it — confirmed
// against a live item that had a photo attached — since the backend doesn't
// cascade this itself. Paginates through the whole gallery since a match
// could be on any page, not just the first.
export async function deleteTripMediaForActivity(tripId: string, activityId: string): Promise<void> {
  const firstPage = await getTripGallery(tripId, { page: 1, limit: 24 });
  const items = [...firstPage.items];
  const pageCount = Math.ceil(firstPage.total / firstPage.limit);
  for (let page = 2; page <= pageCount; page += 1) {
    const nextPage = await getTripGallery(tripId, { page, limit: firstPage.limit });
    items.push(...nextPage.items);
  }

  const matching = items.filter((media) => media.sourceActivityId === activityId);
  await Promise.all(matching.map((media) => deleteTripMedia(tripId, media.id)));
}

// #32 PUT /trips/:tripId/cover — returns the full trip, not just the media
// object (see doc); loosely typed since callers only need coverImage/
// mediaSummary out of it.
export async function setTripCover(
  tripId: string,
  mediaId: string
): Promise<{ coverImage?: Media; mediaSummary?: GeneratedTrip["mediaSummary"] } & Record<string, unknown>> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/cover`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId }),
  });
  await throwOnError(response, "ตั้งรูปปก");
  return response.json();
}

// Prefer the new coverImage shape; fall back to the legacy coverImageUrl
// column for trips/mocks created before this API existed.
export function resolveCoverImageUrl(
  trip: { coverImage?: Media; coverImageUrl?: string },
  size: "large" | "thumbnail" = "large"
): string | undefined {
  return trip.coverImage?.urls[size] ?? trip.coverImageUrl;
}
