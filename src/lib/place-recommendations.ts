import { fetchExternalPlaceSuggestions, type ExternalPlaceCategory, type ExternalSearchPlace } from "./external-places-api";
import type { PlaceCategory } from "@/types";

// /places/suggest has no category filter — it returns one popularity-
// ranked list per coordinate, upserted into the external API's own `places`
// table on every call (same cost as /places/search). So the three
// CategorySection calls in RecommendedPlacesStep (one per PlaceCategory)
// must share a single fetch per center rather than each firing their own —
// this cache is what makes that happen without changing that component.
const suggestCache = new Map<string, Promise<ExternalSearchPlace[]>>();
const SUGGEST_LIMIT = 20; // max allowed — one shared list split three ways needs the headroom

function cacheKey(center: { lat: number; lng: number }): string {
  return `${center.lat},${center.lng}`;
}

function fetchSuggestionsForCenter(center: { lat: number; lng: number }): Promise<ExternalSearchPlace[]> {
  const key = cacheKey(center);
  let promise = suggestCache.get(key);
  if (!promise) {
    promise = fetchExternalPlaceSuggestions(center.lat, center.lng, { limit: SUGGEST_LIMIT });
    suggestCache.set(key, promise);
  }
  return promise;
}

// Maps the external API's DB taxonomy onto this app's PlaceCategory.
// "transport" has no reasonable home in a "places to visit" list, so it's
// dropped rather than force-mapped.
const EXTERNAL_TO_PLACE_CATEGORY: Partial<Record<ExternalPlaceCategory, PlaceCategory>> = {
  attraction: "attraction",
  activity: "attraction",
  shopping: "attraction",
  restaurant: "restaurant",
  cafe: "restaurant",
  hotel: "hotel",
};

// The hardcoded Luang Prabang demo trip (and any older draft saved before
// Destination search existed) has no destinationPlace coordinates — fall
// back to the demo's own city center so recommendations still work.
export const DEFAULT_RECOMMENDATION_CENTER = { lat: 19.8834, lng: 102.1347 };

export interface RecommendedPlace {
  // Historically a real Google place id (see git history); now the
  // external API's own `places` table UUID — kept under this name since
  // downstream code (RecommendedPlacesStep, create-trip) only ever uses it
  // as an opaque dedup/selection key, not to re-query Google directly.
  googlePlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  imageUrl?: string;
  // The external API's raw taxonomy, kept alongside the collapsed
  // PlaceCategory bucket — e.g. an "attraction" bucket can hold raw
  // attraction/activity/shopping places, and this is what lets the
  // "ดูทั้งหมด" view offer a real sub-filter instead of a fake one.
  rawCategory: ExternalPlaceCategory;
}

export async function fetchPlaceRecommendations(
  category: PlaceCategory,
  center: { lat: number; lng: number }
): Promise<RecommendedPlace[]> {
  const results = await fetchSuggestionsForCenter(center);

  return results
    .filter((place) => EXTERNAL_TO_PLACE_CATEGORY[place.category] === category)
    .map((place) => ({
      googlePlaceId: place.id,
      name: place.name,
      address: place.address,
      latitude: place.lat,
      longitude: place.lng,
      rating: place.rating,
      imageUrl: place.imageUrl,
      rawCategory: place.category,
    }));
}
