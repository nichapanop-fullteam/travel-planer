import type { BackendTripListItem } from "@/lib/trips-api";

// The /main "Top Destination" rail. There is no trending/destinations endpoint
// (and no per-country image library), so the rail is derived from the feed rows
// the page already has: group the public trips by the country half of their
// `destination`, rank by how many trips each has, and let the busiest trip in
// each group supply the photo. Nothing here is invented — a destination only
// appears once there are real published trips behind it, and the count shown is
// that real number.
export interface TopDestination {
  /** Grouping key and display label — the country segment of `destination`. */
  label: string;
  tripCount: number;
  /** Trip whose cover represents the group: most-liked, then most-recent. Its
   *  photo is resolved the same way a feed card resolves its own (cover image
   *  first, gallery fallback second), so a group is never image-less just
   *  because PUT /trips/:id/cover was never called. */
  coverTripId: string;
  coverImage?: string;
}

// Real destinations read "Tokyo, Japan" / "หลวงพระบาง, ลาว" — the last
// comma-separated segment is the country, which is the granularity the design's
// rail works at (ญี่ปุ่น, เกาหลีใต้, จีน). A single-segment value is used
// whole rather than dropped: "Bangkok" is still a destination.
export function destinationGroupLabel(destination: string): string {
  const segments = destination
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return segments.length > 1 ? segments[segments.length - 1] : (segments[0] ?? destination.trim());
}

// `limit` left off returns every destination, ranked. The rail shows a slice
// of that and its "ดูทั้งหมด" reveals the rest, so the cap belongs to the view
// rather than in here.
export function deriveTopDestinations(trips: BackendTripListItem[], limit?: number): TopDestination[] {
  const groups = new Map<string, BackendTripListItem[]>();
  for (const trip of trips) {
    const label = destinationGroupLabel(trip.destination);
    if (!label) continue;
    const existing = groups.get(label);
    if (existing) existing.push(trip);
    else groups.set(label, [trip]);
  }

  return [...groups.entries()]
    .map(([label, groupTrips]) => {
      // Sorting a copy: `groupTrips` is the map's own array, and mutating it
      // would reorder the group on every recompute.
      const [cover] = [...groupTrips].sort(
        (a, b) =>
          (b.likeCount ?? 0) - (a.likeCount ?? 0) ||
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return {
        label,
        tripCount: groupTrips.length,
        coverTripId: cover.id,
        coverImage: cover.coverImage?.urls.large,
      };
    })
    // Ties broken by label so the rail doesn't reshuffle between renders —
    // with one trip per country (the common case early on) every count is 1.
    .sort((a, b) => b.tripCount - a.tripCount || a.label.localeCompare(b.label, "th"))
    .slice(0, limit ?? undefined);
}
