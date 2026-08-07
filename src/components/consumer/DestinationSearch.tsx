"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { loadPlacesLibrary } from "@/lib/googleMaps";
import type { Destination } from "@/types";

const REQUESTED_FIELDS = ["id", "displayName", "formattedAddress", "location", "addressComponents"];

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

interface SuggestionItem {
  key: string;
  primaryText: string;
  secondaryText: string;
  resolve: () => Promise<Destination | null>;
}

function addressComponent(
  components: google.maps.places.AddressComponent[] | null | undefined,
  type: string
): google.maps.places.AddressComponent | undefined {
  return components?.find((c) => c.types.includes(type)) ?? undefined;
}

function toDestination(place: google.maps.places.Place): Destination | null {
  if (!place.id || !place.location) return null;
  const countryComponent = addressComponent(place.addressComponents, "country");
  const cityComponent =
    addressComponent(place.addressComponents, "locality") ??
    addressComponent(place.addressComponents, "administrative_area_1");

  return {
    placeId: place.id,
    name: cityComponent?.longText ?? place.displayName ?? "",
    country: countryComponent?.longText ?? "",
    countryCode: countryComponent?.shortText ?? undefined,
    latitude: place.location.lat(),
    longitude: place.location.lng(),
  };
}

// Google's Autocomplete only matches query text against place names/addresses
// literally — searching a country ("Japan") never surfaces unrelated cities
// like Tokyo, and Text Search has no notion of "top cities in a country"
// either (it resolves named entities, not open-ended/analytical queries).
// So when the top prediction is a country, we fall back to a small curated
// list of that country's well-known destinations, scoped to the markets
// Pluno's demo/mock data already covers.
const COUNTRY_CITY_FALLBACK: Record<string, Destination[]> = {
  japan: [
    { name: "โตเกียว", country: "ญี่ปุ่น", countryCode: "JP", latitude: 35.6762, longitude: 139.6503 },
    { name: "โอซาก้า", country: "ญี่ปุ่น", countryCode: "JP", latitude: 34.6937, longitude: 135.5023 },
    { name: "เกียวโต", country: "ญี่ปุ่น", countryCode: "JP", latitude: 35.0116, longitude: 135.7681 },
  ],
  ญี่ปุ่น: [
    { name: "โตเกียว", country: "ญี่ปุ่น", countryCode: "JP", latitude: 35.6762, longitude: 139.6503 },
    { name: "โอซาก้า", country: "ญี่ปุ่น", countryCode: "JP", latitude: 34.6937, longitude: 135.5023 },
    { name: "เกียวโต", country: "ญี่ปุ่น", countryCode: "JP", latitude: 35.0116, longitude: 135.7681 },
  ],
  thailand: [
    { name: "กรุงเทพฯ", country: "ไทย", countryCode: "TH", latitude: 13.7563, longitude: 100.5018 },
    { name: "เชียงใหม่", country: "ไทย", countryCode: "TH", latitude: 18.7883, longitude: 98.9853 },
    { name: "เชียงราย", country: "ไทย", countryCode: "TH", latitude: 19.9105, longitude: 99.8406 },
    { name: "ภูเก็ต", country: "ไทย", countryCode: "TH", latitude: 7.8804, longitude: 98.3923 },
  ],
  ไทย: [
    { name: "กรุงเทพฯ", country: "ไทย", countryCode: "TH", latitude: 13.7563, longitude: 100.5018 },
    { name: "เชียงใหม่", country: "ไทย", countryCode: "TH", latitude: 18.7883, longitude: 98.9853 },
    { name: "เชียงราย", country: "ไทย", countryCode: "TH", latitude: 19.9105, longitude: 99.8406 },
    { name: "ภูเก็ต", country: "ไทย", countryCode: "TH", latitude: 7.8804, longitude: 98.3923 },
  ],
  laos: [
    { name: "หลวงพระบาง", country: "ลาว", countryCode: "LA", latitude: 19.8834, longitude: 102.1347 },
    { name: "เวียงจันทน์", country: "ลาว", countryCode: "LA", latitude: 17.9757, longitude: 102.6331 },
  ],
  ลาว: [
    { name: "หลวงพระบาง", country: "ลาว", countryCode: "LA", latitude: 19.8834, longitude: 102.1347 },
    { name: "เวียงจันทน์", country: "ลาว", countryCode: "LA", latitude: 17.9757, longitude: 102.6331 },
  ],
  vietnam: [
    { name: "ดานัง", country: "เวียดนาม", countryCode: "VN", latitude: 16.0544, longitude: 108.2022 },
    { name: "ฮานอย", country: "เวียดนาม", countryCode: "VN", latitude: 21.0278, longitude: 105.8342 },
    { name: "โฮจิมินห์", country: "เวียดนาม", countryCode: "VN", latitude: 10.8231, longitude: 106.6297 },
  ],
  เวียดนาม: [
    { name: "ดานัง", country: "เวียดนาม", countryCode: "VN", latitude: 16.0544, longitude: 108.2022 },
    { name: "ฮานอย", country: "เวียดนาม", countryCode: "VN", latitude: 21.0278, longitude: 105.8342 },
    { name: "โฮจิมินห์", country: "เวียดนาม", countryCode: "VN", latitude: 10.8231, longitude: 106.6297 },
  ],
};

function countryCityFallback(countryName: string): SuggestionItem[] {
  const cities = COUNTRY_CITY_FALLBACK[countryName.trim().toLowerCase()] ?? [];
  return cities.map((city) => ({
    key: `fallback:${city.name}`,
    primaryText: city.name,
    secondaryText: city.country,
    resolve: async () => city,
  }));
}

export function DestinationSearch({
  onSelect,
  placeholder,
  includedPrimaryTypes,
}: {
  onSelect: (destination: Destination) => void;
  placeholder?: string;
  // Restrict autocomplete predictions to a Places "type collection", e.g.
  // ["(regions)"] for cities/provinces/countries.
  includedPrimaryTypes?: string[];
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const placesLibraryRef = useRef<google.maps.PlacesLibrary | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPlacesLibrary().then((lib) => {
      if (cancelled) return;
      placesLibraryRef.current = lib;
      sessionTokenRef.current = new lib.AutocompleteSessionToken();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      const placesLibrary = placesLibraryRef.current;
      if (!placesLibrary) return;

      const { suggestions: rawSuggestions } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        includedPrimaryTypes,
        language: "th",
        sessionToken: sessionTokenRef.current ?? undefined,
      });

      const predictionItems: SuggestionItem[] = rawSuggestions
        .map((s) => s.placePrediction)
        .filter((p): p is google.maps.places.PlacePrediction => p !== null)
        .map((prediction) => ({
          key: `prediction:${prediction.placeId}`,
          primaryText: prediction.mainText?.text ?? prediction.text.text,
          secondaryText: prediction.secondaryText?.text ?? "",
          resolve: async () => {
            const { place } = await prediction.toPlace().fetchFields({ fields: REQUESTED_FIELDS });
            return toDestination(place);
          },
        }));

      const topPrediction = rawSuggestions[0]?.placePrediction;
      const cityFallback = topPrediction?.types.includes("country")
        ? countryCityFallback(topPrediction.mainText?.text ?? topPrediction.text.text)
        : [];

      if (requestId !== requestIdRef.current) return; // superseded by a newer keystroke

      setSuggestions([...predictionItems, ...cityFallback]);
      setIsLoading(false);
      setIsOpen(true);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, includedPrimaryTypes]);

  async function handleSelect(item: SuggestionItem) {
    const destination = await item.resolve();
    if (!destination) return;

    onSelect(destination);
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);

    // A session concludes once fetchFields is called for a selection —
    // start a fresh token for the next search.
    const placesLibrary = placesLibraryRef.current;
    if (placesLibrary) sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
        <Search size={18} style={{ color: "var(--color-muted)" }} />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--color-muted)] focus:outline-none"
        />
      </div>

      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div
          className="absolute inset-x-0 top-[calc(100%+8px)] z-10 max-h-72 overflow-y-auto rounded-2xl border bg-white py-2 shadow-lg"
          style={{ borderColor: "var(--color-border)" }}
        >
          {isLoading && suggestions.length === 0 && (
            <p className="px-4 py-2 text-sm text-[var(--color-muted)]">กำลังค้นหา...</p>
          )}
          {suggestions.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSelect(item)}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-sel-bg)]"
            >
              <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: "var(--color-muted)" }} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{item.primaryText}</span>
                {item.secondaryText && (
                  <span className="block truncate text-xs text-[var(--color-muted)]">{item.secondaryText}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
