import { loadPlacesLibrary } from "./googleMaps";
import type { PlaceCategory } from "@/types";

const CATEGORY_TYPES: Record<PlaceCategory, string[]> = {
  hotel: ["lodging"],
  restaurant: ["restaurant"],
  attraction: ["tourist_attraction"],
};

const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "photos",
  "nationalPhoneNumber",
  "websiteURI",
  "googleMapsURI",
  "regularOpeningHours",
];
const SEARCH_RADIUS_METERS = 15_000;
const MAX_RESULTS = 10;

// The hardcoded Luang Prabang demo trip (and any older draft saved before
// Destination search existed) has no destinationPlace coordinates — fall
// back to the demo's own city center so recommendations still work.
export const DEFAULT_RECOMMENDATION_CENTER = { lat: 19.8834, lng: 102.1347 };

export interface RecommendedPlace {
  googlePlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  userRatingCount?: number;
  imageUrl?: string;
  phoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  // Formatted "Weekday: opening hours" strings, Sunday first — already
  // localized by Google, e.g. "Friday: 9:00 AM – 5:00 PM".
  openingHours?: string[];
}

export async function fetchPlaceRecommendations(
  category: PlaceCategory,
  center: { lat: number; lng: number }
): Promise<RecommendedPlace[]> {
  const placesLibrary = await loadPlacesLibrary();
  const { places } = await placesLibrary.Place.searchNearby({
    fields: FIELDS,
    includedTypes: CATEGORY_TYPES[category],
    maxResultCount: MAX_RESULTS,
    locationRestriction: { center, radius: SEARCH_RADIUS_METERS },
  });

  return places
    .filter((place): place is typeof place & { id: string; location: google.maps.LatLng } =>
      Boolean(place.id && place.location)
    )
    .map((place) => ({
      googlePlaceId: place.id,
      name: place.displayName ?? "",
      address: place.formattedAddress ?? "",
      latitude: place.location.lat(),
      longitude: place.location.lng(),
      rating: place.rating ?? undefined,
      userRatingCount: place.userRatingCount ?? undefined,
      imageUrl: place.photos?.[0]?.getURI({ maxWidth: 160 }),
      phoneNumber: place.nationalPhoneNumber ?? undefined,
      websiteUri: place.websiteURI ?? undefined,
      googleMapsUri: place.googleMapsURI ?? undefined,
      openingHours: place.regularOpeningHours?.weekdayDescriptions,
    }));
}
