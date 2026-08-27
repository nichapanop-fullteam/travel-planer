"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Landmark, Leaf, Palmtree, SearchX, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { HomeNavbar } from "@/components/consumer/HomeNavbar";
import { FeedSearchBar, FeedSortSelect, type FeedSort } from "@/components/consumer/FeedSearchBar";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import { getMyTrips, listTrips, type BackendTripListItem } from "@/lib/trips-api";
import { useAuth } from "@/providers/AuthProvider";
import { TRIP_GRID_CLASS } from "@/lib/feed-layout";

// The app's home page — a social-travel-community "Discover your next
// journey" feed. The trip grid itself is real data from GET /trips (see
// listTrips in lib/trips-api.ts); only the trending-destinations and
// creators-to-follow rail is still mock (see CONTRIBUTING.md for what's
// real vs. visual — there's no trending/follow backend yet).
type Category = "thailand" | "japan" | "nature" | "food" | "weekend";

const CATEGORY_FILTERS: { key: "forYou" | Category; label: string; icon: typeof Sparkles }[] = [
  { key: "forYou", label: "For you", icon: Sparkles },
  { key: "thailand", label: "Thailand", icon: Palmtree },
  { key: "japan", label: "Japan", icon: Landmark },
  { key: "nature", label: "Nature", icon: Leaf },
  { key: "food", label: "Food", icon: UtensilsCrossed },
  { key: "weekend", label: "Weekend", icon: CalendarDays },
];

export default function MainPage() {
  const { backendUser, isLoading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"forYou" | Category>("forYou");
  const [sort, setSort] = useState<FeedSort>("latest");

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

  const activeCategory = CATEGORY_FILTERS.find((f) => f.key === category);
  const hasActiveFilter = category !== "forYou" || query.trim().length > 0;

  return (
    <AppShell active="home" hideTopbar hideDesktopSidebar>
      <HomeNavbar search={<FeedSearchBar query={query} onQueryChange={setQuery} />}>
        {CATEGORY_FILTERS.map((filter) => {
          const isActive = category === filter.key;
          const count = categoryCounts?.[filter.key];
          // Dimmed, not disabled: an empty category is still worth being able
          // to select (and to see is empty) rather than becoming unclickable.
          const isEmpty = count === 0 && !isActive;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setCategory(filter.key)}
              // The active chip was previously conveyed by colour alone, which
              // left screen-reader and high-contrast users with no way to tell
              // which filter was on — and the filter is the only explanation
              // for why the grid shrank.
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[var(--color-primary)] text-white shadow-[0_4px_12px_rgba(42,158,100,0.35)]"
                  : `border border-[var(--color-border)]/40 bg-white hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)] ${
                      isEmpty ? "text-[var(--color-muted)]/60" : "text-[var(--foreground)]"
                    }`
              }`}
            >
              <filter.icon size={14} />
              {filter.label}
              {count != null && (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    isActive ? "bg-white/25 text-white" : "bg-[var(--color-surface)] text-[var(--color-muted)]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </HomeNavbar>

      <div className="min-h-full bg-[#fbfdfc]">
      <PageContainer width="feed" className="!py-6">
        <div className="min-w-0">
          {/* Heading, count and the active-filter summary on one line — this is
              where the old hero's <h1> went. Showing the filters as removable
              chips means a shrunken grid always carries its own explanation,
              and a way out, right above it. */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">สำรวจทริป</h1>
              <p className="text-sm text-[var(--color-muted)]">
                {visibleTrips === undefined
                  ? "กำลังโหลด..."
                  : `${visibleTrips.length.toLocaleString()} ทริป`}
              </p>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              {hasActiveFilter && (
                <>
                  {query.trim() && (
                    <FilterChip label={`"${query.trim()}"`} onClear={() => setQuery("")} />
                  )}
                  {activeCategory && category !== "forYou" && (
                    <FilterChip label={activeCategory.label} onClear={() => setCategory("forYou")} />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCategory("forYou");
                    }}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--color-muted)] underline-offset-2 transition-colors hover:text-[var(--color-primary)] hover:underline"
                  >
                    ล้างทั้งหมด
                  </button>
                </>
              )}
              <FeedSortSelect sort={sort} onSortChange={setSort} />
            </div>
          </div>

          {visibleTrips === undefined ? (
            <div className={TRIP_GRID_CLASS}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                  <div className="aspect-[4/5] w-full animate-pulse bg-[var(--color-surface)]" />
                  {/* Mirrors the card's own footer so the skeleton keeps the
                      same height as what replaces it and the grid doesn't jump
                      when the real cards land. */}
                  <div className="flex flex-col gap-2 p-3">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--color-surface)]" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--color-surface)]" />
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
              {visibleTrips.map((trip) => (
                <RealTripCard key={trip.id} trip={trip} isOwn={Boolean(backendUserId) && myTripIds.has(trip.id)} />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
      </div>
    </AppShell>
  );
}

// One removable filter, shown above the grid so a shortened feed explains
// itself instead of just looking empty.
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--color-sel-bg)] py-1 pl-2.5 pr-1 text-xs font-semibold text-[var(--color-deep-green)]">
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`ล้างตัวกรอง ${label}`}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/70"
      >
        <X size={12} />
      </button>
    </span>
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
