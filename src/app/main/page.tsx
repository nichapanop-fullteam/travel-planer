"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, SearchX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { HomeHero } from "@/components/consumer/HomeHero";
import { HomeQuickActions } from "@/components/consumer/HomeQuickActions";
import { TopDestinationRow } from "@/components/consumer/TopDestinationRow";
import { FeedSortSelect, type FeedSort } from "@/components/consumer/FeedSortSelect";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import { deriveTopDestinations } from "@/lib/top-destinations";
import { getMyTrips, listTrips, type BackendTripListItem } from "@/lib/trips-api";
import { useAuth } from "@/providers/AuthProvider";
import { TRIP_GRID_CLASS } from "@/lib/feed-layout";

// The app's home page. The trip grid is real data from GET /trips (see
// listTrips in lib/trips-api.ts), and so is the Top Destination rail — it's
// derived from those same rows rather than a hardcoded country list, because
// there's no trending/destinations backend (see lib/top-destinations.ts).
type Category = "thailand" | "japan" | "nature" | "food" | "weekend";

// The feed's tag filters. They sit in the row the reference gives to
// ALL / Top Destination / Top Plan and wear that row's design — a near-black
// pill with a lime label when active, an outlined white one otherwise. Plain
// text pills, like that row: the per-chip lucide icons went with the old
// design. What they filter on is unchanged (trip.tags, case-insensitive).
const CATEGORY_FILTERS: { key: "forYou" | Category; label: string }[] = [
  { key: "forYou", label: "For you" },
  { key: "thailand", label: "Thailand" },
  { key: "japan", label: "Japan" },
  { key: "nature", label: "Nature" },
  { key: "food", label: "Food" },
  { key: "weekend", label: "Weekend" },
];

// How many destinations the rail shows before "ดูทั้งหมด" reveals the rest.
// The rail used to be capped at four with no way past it, which was fine while
// a section switcher owned that pill — with the switcher gone, expanding here
// is what "ดูทั้งหมด" actually means.
const DESTINATION_PREVIEW_COUNT = 4;

export default function MainPage() {
  const { backendUser, isLoading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"forYou" | Category>("forYou");
  const [sort, setSort] = useState<FeedSort>("latest");
  const [destinationsExpanded, setDestinationsExpanded] = useState(false);

  // Both fetches below key off the user's *id*, not the backendUser object:
  // setBackendSession re-broadcasts a fresh object on every token refresh
  // (see lib/backend-user.ts), so depending on the object itself re-ran them
  // on refreshes that hadn't actually changed who was signed in.
  const backendUserId = backendUser?.id ?? null;

  // Real public trips from GET /trips (see listTrips's doc comment) —
  // undefined while loading, [] once loaded with nothing to show (backend
  // unreachable or no public trips yet).
  const [trips, setTrips] = useState<BackendTripListItem[] | undefined>(undefined);

  // Deliberately gated on the auth restore finishing. listTrips() attaches
  // the backend access token when there is one, and that token lives only in
  // memory (lib/backend-user.ts keeps it in a module variable and actively
  // purges the old localStorage copy), so it is still null for the first
  // moment of every page load until restoreBackendSession() settles. Firing
  // this on mount instead sent the request unauthenticated, and GET /trips is
  // optional-auth: it answered isSaved/isLiked false for every row. A
  // signed-in user reloading the page then saw every bookmark hollow and
  // every heart empty, and RealTripCard seeds its state from these rows once,
  // so it never corrected itself — liking again pushed the local count to
  // N+1 while the server stayed at N.
  //
  // Waiting for !authLoading (false only after restoreBackendSession has
  // settled, signed in or not — see AuthProvider) means one request that
  // already carries the right auth state, rather than fetching twice or
  // letting bookmarks pop in after the fact.
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
  }, [authLoading, backendUserId]);

  // The public GET /trips feed has no ownerId to check against, so figure
  // out which of the feed's trips are the signed-in user's own via a
  // separate GET /trips/mine (same real source /my-trips and Sidebar's old
  // trip list used) — saving your own trip makes no sense, so its card
  // hides the bookmark toggle entirely instead of just disabling it.
  const [myTripIds, setMyTripIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // No need to clear myTripIds when signing out — the isOwn check at
    // render time is gated on backendUserId too, so a leftover set can't
    // mark anything as the user's own.
    if (!backendUserId) return;
    let cancelled = false;
    getMyTrips()
      .then((myTrips) => {
        if (!cancelled) setMyTripIds(new Set(myTrips.map((t) => t.id)));
      })
      .catch(() => {
        if (!cancelled) setMyTripIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [backendUserId]);

  // Off the unfiltered feed on purpose: the rail is a way *into* the feed, so
  // narrowing it by the search box it fills in would make a tile vanish the
  // moment it was used.
  const allDestinations = useMemo(() => deriveTopDestinations(trips ?? []), [trips]);
  const visibleDestinations = destinationsExpanded
    ? allDestinations
    : allDestinations.slice(0, DESTINATION_PREVIEW_COUNT);

  // Per-category totals for the chip badges, computed off the search-filtered
  // set so a chip's number matches what clicking it would actually show. The
  // point is that a category with nothing in it now says so up front, instead
  // of looking identical to a populated one until you tap it and get an empty
  // grid.
  const categoryCounts = useMemo(() => {
    if (!trips) return undefined;
    const q = query.trim().toLowerCase();
    const matchesQuery = (trip: BackendTripListItem) => {
      if (!q) return true;
      const tags = (trip.tags ?? []).map((t) => t.toLowerCase());
      return (
        trip.title.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q) ||
        tags.some((t) => t.includes(q))
      );
    };

    const searched = trips.filter(matchesQuery);
    const counts: Record<string, number> = { forYou: searched.length };
    for (const filter of CATEGORY_FILTERS) {
      if (filter.key === "forYou") continue;
      counts[filter.key] = searched.filter((trip) =>
        (trip.tags ?? []).some((t) => t.toLowerCase() === filter.key)
      ).length;
    }
    return counts;
  }, [trips, query]);

  const visibleTrips = useMemo(() => {
    if (!trips) return undefined;
    const q = query.trim().toLowerCase();
    const filtered = trips.filter((trip) => {
      const tags = (trip.tags ?? []).map((t) => t.toLowerCase());
      if (category !== "forYou" && !tags.includes(category)) return false;
      if (!q) return true;
      return (
        trip.title.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q) ||
        tags.some((t) => t.includes(q))
      );
    });

    // Both keys are on every GET /trips row (see BackendTripListItem), so
    // neither sort can silently fall back to arbitrary order. Sorting a copy —
    // `filtered` is already a new array from .filter, but being explicit keeps
    // this safe if the filter is ever dropped.
    return [...filtered].sort((a, b) =>
      sort === "popular"
        ? b.likeCount - a.likeCount
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [trips, query, category, sort]);

  const hasActiveFilter = category !== "forYou" || query.trim().length > 0;

  return (
    <AppShell active="home" hideTopbar hideDesktopSidebar>
      <HomeHero query={query} onQueryChange={setQuery} />

      <div className="min-h-full bg-[#fbfdfc]">
        <PageContainer width="feed" className="!py-6">
          <HomeQuickActions />

          {/* The feed's tag filters, in the row the reference gives to
              ALL / Top Destination / Top Plan and wearing that row's design.
              aria-pressed rather than colour alone: the active chip is the only
              explanation for why the grid below shrank. */}
          {/* No top margin below 1025px — HomeQuickActions is hidden there, so
              this row is the first thing under the hero and the container's own
              padding is already the gap. */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 min-[1025px]:mt-6">
            {CATEGORY_FILTERS.map((filter) => {
              const isActive = category === filter.key;
              const count = categoryCounts?.[filter.key];
              // Dimmed, not disabled: an empty category is still worth being
              // able to select (and to see is empty) rather than becoming
              // unclickable.
              const isEmpty = count === 0 && !isActive;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setCategory(filter.key)}
                  aria-pressed={isActive}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-[#111111] text-[var(--color-accent-lime)]"
                      : `border border-[var(--color-border)]/40 bg-white hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] ${
                          isEmpty ? "text-[var(--color-muted)]/60" : "text-[var(--foreground)]"
                        }`
                  }`}
                >
                  {filter.label}
                  {count != null && (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                        isActive
                          ? "bg-[var(--color-accent-lime)]/20 text-[var(--color-accent-lime)]"
                          : "bg-[var(--color-surface)] text-[var(--color-muted)]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">Top Destination</h2>
              {/* Reveals the destinations past the preview slice — the honest
                  version of "ดูทั้งหมด" while there's no per-destination page
                  to route to. Absent when there is nothing more to show. */}
              {allDestinations.length > DESTINATION_PREVIEW_COUNT && (
                <button
                  type="button"
                  onClick={() => setDestinationsExpanded((expanded) => !expanded)}
                  aria-expanded={destinationsExpanded}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--color-accent-lime)] px-2.5 py-1 text-xs font-bold text-[#1c2b12] transition-opacity hover:opacity-85"
                >
                  {destinationsExpanded ? "ย่อลง" : "ดูทั้งหมด"}
                  <ChevronRight size={13} strokeWidth={2.5} />
                </button>
              )}
            </div>
            <TopDestinationRow
              destinations={visibleDestinations}
              loading={trips === undefined}
              // Fills in the feed's own search box. No section to switch to any
              // more, so the grid below just narrows in place.
              onSelect={(label) => {
                setQuery(label);
                setCategory("forYou");
              }}
            />
          </section>

          <section className="mt-8">
            {/* Sort sits on this heading rather than on the filter row above:
                it describes this grid's order, and the filter row is now the
                page-level control at the top. */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">Top Plan From Creators</h2>
              <FeedSortSelect sort={sort} onSortChange={setSort} />
            </div>

            {visibleTrips === undefined ? (
              <div className={TRIP_GRID_CLASS}>
                {Array.from({ length: 8 }).map((_, i) => (
                  // Mirrors RealTripCard exactly — white card panel, cover,
                  // then the title and meta lines — so the grid keeps its
                  // shape and height when the real cards replace it.
                  <div key={i} className="overflow-hidden rounded-[16px] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.08)]">
                    <div className="aspect-[5/4] w-full animate-pulse bg-[var(--color-surface)]" />
                    <div className="p-3">
                      <div className="h-3.5 w-4/5 animate-pulse rounded bg-[var(--color-surface)]" />
                      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[var(--color-surface)]" />
                      <div className="mt-4 h-5 w-24 animate-pulse rounded-full bg-[var(--color-surface)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleTrips.length === 0 ? (
              <EmptyFeed
                hasActiveFilter={hasActiveFilter}
                onClear={() => {
                  setQuery("");
                  setCategory("forYou");
                }}
              />
            ) : (
              <div className={TRIP_GRID_CLASS}>
                {/* The first card gets the taller cover, which is what starts
                    the masonry columns off at different heights — without a
                    mismatch somewhere the two columns stay level and the
                    layout reads as a plain grid. */}
                {visibleTrips.map((trip, index) => (
                  <RealTripCard
                    key={trip.id}
                    trip={trip}
                    isOwn={Boolean(backendUserId) && myTripIds.has(trip.id)}
                    tall={index === 0}
                  />
                ))}
              </div>
            )}
          </section>
        </PageContainer>
      </div>
    </AppShell>
  );
}

// Two genuinely different empty states: nothing matches the filters the user
// set (recoverable, so offer the way out), versus the feed itself having
// nothing in it.
function EmptyFeed({ hasActiveFilter, onClear }: { hasActiveFilter: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-muted)]">
        <SearchX size={26} />
      </div>
      <p className="text-base font-bold">{hasActiveFilter ? "ไม่พบทริปที่ตรงกับที่ค้นหา" : "ยังไม่มีทริปในฟีด"}</p>
      <p className="max-w-xs text-sm text-[var(--color-muted)]">
        {hasActiveFilter
          ? "ลองเปลี่ยนคำค้นหา หรือเลือกหมวดอื่นดู"
          : "เมื่อมีคนเผยแพร่ทริป จะขึ้นมาแสดงที่นี่"}
      </p>
      {hasActiveFilter && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-deep-green)]"
        >
          ล้างตัวกรอง
        </button>
      )}
    </div>
  );
}
