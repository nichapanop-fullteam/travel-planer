"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import {
  fetchAutocompleteSuggestions,
  fetchExternalPlaceDetails,
  type AutocompleteSuggestion,
} from "@/lib/external-places-api";
import type { Destination } from "@/types";

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 1; // the API itself accepts 1-2 chars

interface SuggestionItem {
  key: string;
  primaryText: string;
  secondaryText: string;
  resolve: () => Promise<Destination | null>;
}

// /places/autocomplete only returns description/mainText/externalRef — no
// coordinates — so resolving a real suggestion means a follow-up
// /places/details call using the same session token, mirroring Google's
// own Autocomplete-session + Place Details billing pattern.
function toResolver(suggestion: AutocompleteSuggestion, sessionToken: string): () => Promise<Destination | null> {
  return async () => {
    const details = await fetchExternalPlaceDetails(suggestion.externalRef, sessionToken);
    if (!details) return null;

    return {
      placeId: suggestion.externalRef,
      externalRef: suggestion.externalRef,
      // `description` is what POST /trips wants for `destination` — using
      // it as `name` (with `country` left blank) makes the picker dialog's
      // own label logic fall back to showing it verbatim.
      name: suggestion.description,
      country: "",
      latitude: details.lat,
      longitude: details.lng,
      address: details.address,
      rating: details.rating,
      imageUrl: details.imageUrl,
    };
  };
}

// The autocomplete API matches query text against place names literally —
// searching a country ("Japan") returns the country itself as one result,
// never its well-known cities. So when the query itself names a country we
// already know, we append a small curated list of that country's
// destinations, scoped to the markets Pluno's demo/mock data covers.
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

function countryCityFallback(query: string): SuggestionItem[] {
  const cities = COUNTRY_CITY_FALLBACK[query.trim().toLowerCase()] ?? [];
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
}: {
  onSelect: (destination: Destination) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);

  // One UUID per search session — reused across every keystroke's
  // autocomplete call and the eventual details call on selection, then
  // rotated for the next search. Mirrors Google's own session-token model,
  // which is what makes the pricing on the API side work as intended.
  const sessionTokenRef = useRef(crypto.randomUUID());
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
      setNoResults(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      const results = await fetchAutocompleteSuggestions(trimmed, sessionTokenRef.current);

      if (requestId !== requestIdRef.current) return; // superseded by a newer keystroke

      const resultItems: SuggestionItem[] = results.map((suggestion) => ({
        key: `place:${suggestion.externalRef}`,
        primaryText: suggestion.mainText,
        secondaryText: suggestion.secondaryText ?? "",
        resolve: toResolver(suggestion, sessionTokenRef.current),
      }));
      const fallbackItems = countryCityFallback(trimmed);

      setSuggestions([...resultItems, ...fallbackItems]);
      setIsLoading(false);
      setNoResults(resultItems.length === 0 && fallbackItems.length === 0);
      setIsOpen(true);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleSelect(item: SuggestionItem) {
    const destination = await item.resolve();
    if (!destination) return;

    onSelect(destination);
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);

    // The session concludes once a details call is made for a selection —
    // start a fresh token for the next search.
    sessionTokenRef.current = crypto.randomUUID();
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

      {isOpen && (suggestions.length > 0 || isLoading || noResults) && (
        <div
          className="absolute inset-x-0 top-[calc(100%+8px)] z-10 max-h-72 overflow-y-auto rounded-2xl border bg-white py-2 shadow-lg"
          style={{ borderColor: "var(--color-border)" }}
        >
          {isLoading && suggestions.length === 0 && (
            <p className="px-4 py-2 text-sm text-[var(--color-muted)]">กำลังค้นหา...</p>
          )}
          {!isLoading && noResults && (
            <p className="px-4 py-2 text-sm text-[var(--color-muted)]">ไม่พบสถานที่ที่ค้นหา</p>
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
