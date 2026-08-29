// The external API's own DB taxonomy — distinct from this app's
// PlaceCategory ("hotel" | "attraction" | "restaurant"); kept as a separate
// type since the two aren't interchangeable.
export type ExternalPlaceCategory =
  | "attraction"
  | "restaurant"
  | "hotel"
  | "cafe"
  | "activity"
  | "transport"
  | "shopping";

// Verified against the live API: GET /places/details always returns a single
// object (not an array), with { name, address, lat, lng, externalRef }
// guaranteed — category/rating/imageUrl aren't populated for region-level
// places (cities/countries), only for POI-level ones, so they're optional here.
export interface ExternalPlaceDetails {
  name: string;
  address: string;
  lat: number;
  lng: number;
  externalRef: string;
  category?: ExternalPlaceCategory;
  rating?: number;
  imageUrl?: string;
}

// Hydrates a place's full details (address/rating/image/coordinates) from
// the external Places API, given its externalRef id (a Google Place ID) and
// a per-search sessionToken (a UUID). Routed through our own
// /api/places/details proxy (see src/app/api/places/details/route.ts)
// rather than calling the ngrok tunnel directly from the browser.
export async function fetchExternalPlaceDetails(
  externalRef: string,
  sessionToken: string
): Promise<ExternalPlaceDetails | null> {
  const params = new URLSearchParams({ externalRef, sessionToken });
  const response = await fetch(`/api/places/details?${params.toString()}`);
  if (!response.ok) return null;

  return (await response.json()) as ExternalPlaceDetails;
}

// A row from the external API's `places` table, as returned by
// GET /places/search — already fully resolved (no further /places/details
// call needed). `id` is that table's own UUID, not a Google place id, so
// it's not usable as `externalRef` for fetchExternalPlaceDetails.
export interface ExternalSearchPlace {
  id: string;
  name: string;
  address: string;
  category: ExternalPlaceCategory;
  lat: number;
  lng: number;
  rating?: number;
  imageUrl?: string;
}

export interface PlaceOpeningHours {
  openNow: boolean | null;
  weekdayDescriptions: string[];
  nextOpenTime: string | null;
  nextCloseTime: string | null;
}

export interface PlaceAccessibilityOptions {
  wheelchairAccessibleParking: boolean | null;
  wheelchairAccessibleEntrance: boolean | null;
  wheelchairAccessibleRestroom: boolean | null;
  wheelchairAccessibleSeating: boolean | null;
}

export interface PlaceReview {
  authorName: string;
  authorUri: string | null;
  authorPhotoUri: string | null;
  rating: number;
  text: string | null;
  relativePublishTimeDescription: string | null;
  publishTime: string | null;
}

export interface PlaceFullDetails {
  externalRef: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  primaryType: string | null;
  primaryTypeDisplayName: string | null;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  nationalPhoneNumber: string | null;
  internationalPhoneNumber: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  editorialSummary: string | null;
  regularOpeningHours: PlaceOpeningHours | null;
  currentOpeningHours: PlaceOpeningHours | null;
  accessibilityOptions: PlaceAccessibilityOptions | null;
  photos: string[];
  reviews: PlaceReview[];
}

// Loads the expensive, Google-backed place payload only when a detail surface
// opens. `id` must be the external service's own places-table UUID returned by
// search/suggest — never a Google Place ID / externalRef.
export async function fetchPlaceFullDetails(id: string, signal?: AbortSignal): Promise<PlaceFullDetails> {
  const response = await fetch(`/api/places/${encodeURIComponent(id)}`, { signal });

  if (response.status === 404) throw new Error("PLACE_NOT_FOUND");
  if (!response.ok) throw new Error("PLACE_DETAILS_UNAVAILABLE");

  return response.json() as Promise<PlaceFullDetails>;
}

// Free-text POI search (attractions/restaurants/hotels/cafes/etc) for
// itinerary building — e.g. "add a stop" flows that need a real `placeId`
// for POST /days/:dayId/items. NOT for the destination field: it upserts
// into the `places` table on every call (costs more, by design) and
// doesn't filter out non-city results. Routed through our own
// /api/places/search proxy (see src/app/api/places/search/route.ts).
// Returns [] on no matches or on any upstream error (400/502/503) — errors
// are logged server-side by the proxy itself; callers don't need to
// distinguish "no results" from "search failed" for a typeahead UI.
export async function searchExternalPlaces(query: string, limit?: number): Promise<ExternalSearchPlace[]> {
  const params = new URLSearchParams({ q: query });
  if (limit) params.set("limit", String(limit));

  const response = await fetch(`/api/places/search?${params.toString()}`);
  if (!response.ok) return [];

  return (await response.json()) as ExternalSearchPlace[];
}

const INTERNAL_PLACE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Generated/legacy itinerary items may contain a Google externalRef (or no
// place id) even though the full-details endpoint accepts only our internal
// UUID. Resolve those rows through search at popup-open time, then load the
// full payload. An exact name wins; the first search result is the fallback.
export async function fetchResolvedPlaceFullDetails(
  placeId: string | undefined,
  placeName: string,
  signal?: AbortSignal
): Promise<PlaceFullDetails> {
  let internalPlaceId = placeId && INTERNAL_PLACE_UUID_PATTERN.test(placeId) ? placeId : undefined;

  if (!internalPlaceId) {
    const matches = await searchExternalPlaces(placeName, 5);
    const normalizedName = placeName.trim().toLocaleLowerCase();
    const match = matches.find((place) => place.name.trim().toLocaleLowerCase() === normalizedName) ?? matches[0];
    if (!match) throw new Error("PLACE_NOT_FOUND");
    internalPlaceId = match.id;
  }

  return fetchPlaceFullDetails(internalPlaceId, signal);
}

// A suggestion from GET /places/autocomplete — cities/provinces/countries
// only (no POIs), doesn't write to the `places` table, and is cheap enough
// to call on every keystroke. This is the right endpoint for the Create
// Trip destination field; /places/search is not (see above).
export interface AutocompleteSuggestion {
  description: string; // exactly what POST /trips wants for `destination` (free text)
  mainText: string;
  secondaryText?: string; // absent for well-known/unambiguous places
  externalRef: string; // Google place id — valid input to fetchExternalPlaceDetails
}

// Routed through our own /api/places/autocomplete proxy (see
// src/app/api/places/autocomplete/route.ts). `sessionToken` should be the
// same UUID across all keystrokes of one search, and reused for the
// eventual fetchExternalPlaceDetails call when the user picks a result —
// that's what makes the session pricing model work.
export async function fetchAutocompleteSuggestions(
  query: string,
  sessionToken: string
): Promise<AutocompleteSuggestion[]> {
  const params = new URLSearchParams({ q: query, sessionToken });
  const response = await fetch(`/api/places/autocomplete?${params.toString()}`);
  if (!response.ok) return [];

  return (await response.json()) as AutocompleteSuggestion[];
}

// "What's popular near this destination" — same response shape and
// DB-upsert cost as GET /places/search (see searchExternalPlaces above),
// just keyed by coordinates rather than free text. Used for the
// recommended-places step once a Destination has coordinates (from
// fetchExternalPlaceDetails). Routed through our own /api/places/suggest
// proxy (see src/app/api/places/suggest/route.ts).
export async function fetchExternalPlaceSuggestions(
  lat: number,
  lng: number,
  options?: { radius?: number; limit?: number }
): Promise<ExternalSearchPlace[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (options?.radius) params.set("radius", String(options.radius));
  if (options?.limit) params.set("limit", String(options.limit));

  const response = await fetch(`/api/places/suggest?${params.toString()}`);
  if (!response.ok) return [];

  return (await response.json()) as ExternalSearchPlace[];
}

// GET /places/suggest/sections — same data as fetchExternalPlaceSuggestions
// above, pre-split into three quota-guaranteed buckets instead of one
// popularity-ranked list that can leave a category empty. `restaurants`
// includes cafe places too (no separate cafe section). `limit` here is
// per-section (API default 5), not overall (API default 10 for the plain
// suggest endpoint) — see docs for why. ~2-3x slower than plain suggest on
// an uncached center (three Google calls instead of one), so callers should
// show per-section skeletons rather than blocking on the whole response.
export interface ExternalPlaceSuggestionSections {
  attractions: ExternalSearchPlace[];
  restaurants: ExternalSearchPlace[];
  accommodations: ExternalSearchPlace[];
}

export async function fetchExternalPlaceSuggestionSections(
  lat: number,
  lng: number,
  options?: { radius?: number; limit?: number }
): Promise<ExternalPlaceSuggestionSections> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (options?.radius) params.set("radius", String(options.radius));
  if (options?.limit) params.set("limit", String(options.limit));

  const response = await fetch(`/api/places/suggest/sections?${params.toString()}`);
  if (!response.ok) return { attractions: [], restaurants: [], accommodations: [] };

  return (await response.json()) as ExternalPlaceSuggestionSections;
}
