"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, MapPin, Search, X } from "lucide-react";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "@/lib/recent-searches";
import { type AutocompleteSuggestion } from "@/lib/external-places-api";
import { usePlaceAutocomplete } from "@/hooks/usePlaceAutocomplete";
import { deriveTrendingPlaces, type TrendingPlace } from "@/lib/top-destinations";
import { listTrips, type BackendTripListItem } from "@/lib/trips-api";
import { useAuth } from "@/providers/AuthProvider";

// The full-screen search surface for phones and tablets. A route rather than an
// overlay on the home feed: it gets real back-button behaviour for free, and the mock's
// own back chevron then means the same thing as the system gesture.
//
// Nothing here is a mock. "ค้นหาล่าสุด" is this browser's own history
// (lib/recent-searches.ts — localStorage, since there is no search-history
// endpoint), and "Search Trend" ranks the destinations that real published
// trips actually go to (deriveTrendingPlaces over GET /trips), the same way
// the home feed's Top Destination rail does. A destination only appears once somebody
// has published a trip to it.
//
// Running a search hands the term to "/", which is where the feed and all its
// filtering already live — duplicating the grid here would mean two places to
// keep in step.
const TREND_LIMIT = 6;

export default function SearchPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  const [term, setTerm] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [trips, setTrips] = useState<BackendTripListItem[] | undefined>(undefined);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // localStorage can't be read during render (no window on the server, and
  // seeding useState from it would hydrate a mismatched tree), so the first
  // paint shows no history and this fills it in.
  /* eslint-disable react-hooks/set-state-in-effect -- localStorage is client-only; see above */
  useEffect(() => {
    setRecents(getRecentSearches());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Arriving here means the keyboard should already be up — that is the whole
  // point of the screen.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Same auth gate as the home feed's fetch: listTrips attaches the backend token
  // when there is one, and that token only exists after restoreBackendSession
  // settles (see lib/backend-user.ts). Firing on mount would send it
  // unauthenticated for no reason.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    listTrips()
      .then((loaded) => {
        if (!cancelled) setTrips(loaded);
      })
      .catch(() => {
        if (!cancelled) setTrips([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  const trends = useMemo(() => deriveTrendingPlaces(trips ?? [], TREND_LIMIT), [trips]);

  const trimmedTerm = term.trim();
  const places = usePlaceAutocomplete(trimmedTerm);

  function runSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed);
    router.push(`/?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* The search row is the header — back chevron beside the field, as in
          the reference. Sticky so the field stays reachable while the trend
          list scrolls. */}
      <div
        className="sticky top-0 z-10 bg-white px-4 pb-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="ย้อนกลับ"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--foreground)] transition hover:bg-[var(--color-surface)]"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>

          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              runSearch(term);
            }}
            className="min-w-0 flex-1"
          >
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white p-1">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-accent-orange)]">
                <Search size={15} strokeWidth={2.5} />
              </span>
              <input
                ref={inputRef}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="ค้นหาชื่อที่ ย่าน หรือประเภท"
                aria-label="ค้นหาทริป จุดหมาย หรือสไตล์การเที่ยว"
                className="min-w-0 flex-1 bg-transparent text-base text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted)]"
              />
              <button
                type="submit"
                aria-label="ค้นหา"
                disabled={!term.trim()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white transition hover:bg-[#2b2b2b] disabled:opacity-40"
              >
                <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="px-4 pb-16">
        {trimmedTerm ? (
          <section className="pt-1">
            <h2 className="mb-1 text-sm font-bold">จุดหมาย</h2>

            {places === undefined ? (
              <ul className="mt-3 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-[var(--color-surface)]" />
                    <span className="h-3.5 w-40 animate-pulse rounded bg-[var(--color-surface)]" />
                  </li>
                ))}
              </ul>
            ) : places.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--color-muted)]">
                ไม่พบจุดหมายที่ตรงกับ “{trimmedTerm}”
              </p>
            ) : (
              <ul>
                {places.map((place) => (
                  <PlaceRow key={place.externalRef} place={place} onSelect={() => runSearch(place.description)} />
                ))}
              </ul>
            )}
          </section>
        ) : (
          <>
        {recents.length > 0 && (
          <section className="border-b border-[var(--color-border)] pb-4 pt-1">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">ค้นหาล่าสุด</h2>
              <button
                type="button"
                onClick={() => setRecents(clearRecentSearches())}
                className="shrink-0 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--foreground)]"
              >
                ล้าง
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {recents.map((entry) => (
                // The chip searches; the X removes. Two sibling controls rather
                // than one nested in the other — a button inside a button is
                // invalid markup, and it would make "remove" ambiguous.
                <span
                  key={entry}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--color-border)] py-1 pl-3 pr-1 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => runSearch(entry)}
                    className="min-w-0 truncate font-medium text-[var(--foreground)]"
                  >
                    {entry}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecents(removeRecentSearch(entry))}
                    aria-label={`ลบ ${entry} ออกจากประวัติการค้นหา`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--foreground)]"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="pt-4">
          <h2 className="mb-1 text-sm font-bold">Search Trend มาแรง</h2>

          {trips === undefined ? (
            <ul className="mt-3 space-y-4">
              {Array.from({ length: TREND_LIMIT }).map((_, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-[var(--color-surface)]" />
                  <span className="h-3.5 w-32 animate-pulse rounded bg-[var(--color-surface)]" />
                </li>
              ))}
            </ul>
          ) : trends.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-muted)]">
              ยังไม่มีจุดหมายยอดนิยม — จะขึ้นมาเมื่อมีคนเผยแพร่ทริป
            </p>
          ) : (
            <ul>
              {trends.map((trend) => (
                <TrendRow key={trend.destination} trend={trend} onSelect={() => runSearch(trend.destination)} />
              ))}
            </ul>
          )}
        </section>
          </>
        )}
      </div>
    </div>
  );
}

// One suggestion from GET /api/places/autocomplete, laid out like Create Trip's
// destination list: the place on top, what disambiguates it underneath.
//
// Tapping it searches the feed for that destination — `description` is the full
// free-text form the API returns (and the same string POST /trips stores as a
// trip's destination), so it matches the way trips are named. The app has no
// standalone place page to open instead.
function PlaceRow({ place, onSelect }: { place: AutocompleteSuggestion; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 rounded-xl py-2.5 text-left transition-colors hover:bg-[var(--color-surface)]"
      >
        <MapPin size={18} className="shrink-0 text-[var(--color-primary)]" strokeWidth={2} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{place.mainText}</span>
          {place.secondaryText && (
            <span className="block truncate text-xs text-[var(--color-muted)]">{place.secondaryText}</span>
          )}
        </span>
      </button>
    </li>
  );
}

function TrendRow({ trend, onSelect }: { trend: TrendingPlace; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 rounded-xl py-2.5 text-left transition-colors hover:bg-[var(--color-surface)]"
      >
        <MapPin size={18} className="shrink-0 text-[var(--color-primary)]" strokeWidth={2} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{trend.place}</span>
          {trend.country && (
            <span className="block truncate text-xs text-[var(--color-muted)]">{trend.country}</span>
          )}
        </span>
      </button>
    </li>
  );
}
