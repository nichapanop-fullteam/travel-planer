import {
  fetchExternalPlaceSuggestionSections,
  type ExternalPlaceCategory,
  type ExternalPlaceSuggestionSections,
} from "./external-places-api";
import type { PlaceCategory } from "@/types";

// /places/suggest/sections returns three quota-guaranteed buckets per
// coordinate (attractions/restaurants/accommodations) instead of one
// popularity-ranked list split client-side — see docs for why the plain
// /places/suggest endpoint can leave a category empty. The three
// CategorySection calls in RecommendedPlacesStep (one per PlaceCategory)
// share a single fetch per center rather than each firing their own — this
// cache is what makes that happen without changing that component.
const sectionsCache = new Map<string, Promise<ExternalPlaceSuggestionSections>>();
const SECTION_LIMIT = 10; // per section (API default is 5) — within the 1-20 max

function cacheKey(center: { lat: number; lng: number }): string {
  return `${center.lat},${center.lng}`;
}

function fetchSectionsForCenter(center: { lat: number; lng: number }): Promise<ExternalPlaceSuggestionSections> {
  const key = cacheKey(center);
  let promise = sectionsCache.get(key);
  if (!promise) {
    promise = fetchExternalPlaceSuggestionSections(center.lat, center.lng, { limit: SECTION_LIMIT });
    sectionsCache.set(key, promise);
  }
  return promise;
}

// This app's PlaceCategory maps 1:1 onto the sections endpoint's bucket
// keys — "restaurant" already includes cafe places server-side (see docs).
const PLACE_CATEGORY_TO_SECTION: Record<PlaceCategory, keyof ExternalPlaceSuggestionSections> = {
  attraction: "attractions",
  restaurant: "restaurants",
  hotel: "accommodations",
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
  const sections = await fetchSectionsForCenter(center);
  const results = sections[PLACE_CATEGORY_TO_SECTION[category]];

  return results.map((place) => ({
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
