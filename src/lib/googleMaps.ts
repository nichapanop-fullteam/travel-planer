import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let initialized = false;

function initializeLoader() {
  if (initialized) return;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  }

  setOptions({
    key: apiKey,
    v: "weekly",
    language: "th",
  });

  initialized = true;
}

export async function loadPlacesLibrary() {
  initializeLoader();

  return importLibrary("places") as Promise<google.maps.PlacesLibrary>;
}

export async function loadMapsLibrary() {
  initializeLoader();

  return importLibrary("maps") as Promise<google.maps.MapsLibrary>;
}
