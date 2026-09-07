"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, SearchX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { HomeHero } from "@/components/consumer/HomeHero";
import { HomeQuickActions } from "@/components/consumer/HomeQuickActions";
import { TopDestinationRow } from "@/components/consumer/TopDestinationRow";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import { deriveTopDestinations } from "@/lib/top-destinations";
import { getMyTrips, listTrips, type BackendTripListItem } from "@/lib/trips-api";
import { useAuth } from "@/providers/AuthProvider";
import { TRIP_GRID_CLASS } from "@/lib/feed-layout";

// The app's home page, and the site's root — "/" renders this feed directly
// rather than redirecting to /main, so the landing URL is the feed itself.
// (/main is kept as a redirect here for links that still point at the old
// path.) The trip grid is real data from GET /trips (see
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

export default function HomePage() {
  // useSearchParams (read below for /search's ?q= handoff) bails out of static
  // prerendering unless it is under a Suspense boundary. Wrapping here keeps
  // "/" a static route — the alternative, force-dynamic, would make every
  // visit server-rendered for one optional query parameter.
  return (
    <Suspense fallback={null}>
      <MainFeed />
    </Suspense>
  );
}

function MainFeed() {
  const { backendUser, isLoading: authLoading } = useAuth();
  // /search hands its term over as ?q= rather than duplicating the feed grid.
  // Read once as the initial value, not synced on every change: the feed's own
  // search box writes to this state directly, and mirroring it back into the
  // URL would fight the field on every keystroke.
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

  // Clearing the field has to clear the URL too. `q` is read once, as the
  // initial value, so the field and the address bar drift apart the moment
  // anyone edits it — harmless while typing, but if the search is cleared and
  // ?q= stays behind, the next reload (or the installed app relaunching on its
  // last URL) restores a search the user just dismissed. Only the empty case is
  // mirrored back: writing on every keystroke would fight the field and spam
  // history.
  useEffect(() => {
    if (query.trim() || !searchParams.get("q")) return;
    router.replace("/", { scroll: false });
  }, [query, searchParams, router]);
  const [category, setCategory] = useState<"forYou" | Category>("forYou");
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

    // Newest first, fixed — the sort control that used to offer "ยอดนิยม"
    // (likeCount desc) alongside this is gone. `updatedAt` is on every GET
    // /trips row (see BackendTripListItem), so this can't silently fall back to
    // arbitrary order. Sorting a copy — `filtered` is already a new array from
    // .filter, but being explicit keeps this safe if the filter is ever dropped.
    return [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [trips, query, category]);

  const hasActiveFilter = category !== "forYou" || query.trim().length > 0;

  // The chips band pins directly under the hero, so its `top` is the hero's
  // height — which is not one number: the hero is the bare app bar on a phone
  // (heading hidden, search collapsed), grows when that search is opened, and
  // is the full bar + heading + search from 640px up. Measuring it is what
  // keeps the two stuck edges flush at every width and in both search states;
  // a hardcoded offset would gap or overlap in most of them.
  //
  // Written straight to a CSS variable rather than through state: this fires on
  // every resize and on the search open/close transition, and re-rendering the
  // whole feed for a number only CSS consumes is waste.
  const heroRef = useRef<HTMLDivElement | null>(null);
  const stickyScopeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const hero = heroRef.current;
    const scope = stickyScopeRef.current;
    if (!hero || !scope) return;
    const apply = () => scope.style.setProperty("--home-hero-h", `${hero.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <AppShell active="home" hideTopbar hideDesktopSidebar>
      <div ref={stickyScopeRef}>
        {/* Pinned for the whole page. On a phone this is just the app bar —
            the heading is hidden and the search is collapsed there, so the
            hero is the bar's own height. From 640px up the heading and the
            search field come with it, which is what makes search reachable
            without scrolling back to the top. */}
        <div ref={heroRef} className="sticky top-0 z-30">
          <HomeHero query={query} onQueryChange={setQuery} />
        </div>

        <div className="min-h-full bg-[#fbfdfc]">
          <PageContainer width="feed" className="!pb-0 !pt-0 min-[1025px]:!pt-6">
            <HomeQuickActions />
          </PageContainer>

          {/* The feed's tag filters, in the row the reference gives to
              ALL / Top Destination / Top Plan and wearing that row's design.
              aria-pressed rather than colour alone: the active chip is the only
              explanation for why the grid below shrank.

              Its own full-bleed band rather than a row inside PageContainer:
              once it pins, the feed scrolls underneath it and a transparent
              row would let cards show through. The band paints the page colour
              and spans the width; the inner wrapper keeps the chips on the
              feed's own left edge. */}
          <div
            className="sticky z-20 bg-[#fbfdfc]"
            style={{ top: "var(--home-hero-h, 0px)" }}
          >
            <div className="mx-auto w-full max-w-[var(--container-feed)] px-4 pb-2.5 pt-4 sm:px-6 lg:px-10 xl:px-14 min-[640px]:pb-3 min-[640px]:pt-5 min-[1025px]:pt-6">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
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
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors min-[640px]:px-3.5 min-[640px]:py-2 min-[640px]:text-sm ${
                    isActive
                      ? "bg-[#111111] text-[var(--color-accent-lime)]"
                      : `border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] ${
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
            </div>
          </div>

          <PageContainer width="feed" className="!pb-6 !pt-0">
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
            <h2 className="mb-3 text-lg font-extrabold">Top Plan From Creators</h2>

            {visibleTrips === undefined ? (
              <div className={TRIP_GRID_CLASS}>
                {Array.from({ length: 8 }).map((_, i) => (
                  // Mirrors RealTripCard exactly — white card panel, cover,
                  // then the title and meta lines — so the grid keeps its
                  // shape and height when the real cards replace it.
                  <div key={i} className="overflow-hidden rounded-t-[24px] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.08)]">
                    <div className="aspect-[4/5] w-full animate-pulse rounded-[24px] bg-[var(--color-surface)]" />
                    <div className="p-1.5">
                      <div className="h-3.5 w-4/5 animate-pulse rounded bg-[var(--color-surface)]" />
                      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[var(--color-surface)]" />
                      <div className="mt-4 h-4 w-20 animate-pulse rounded-full bg-[var(--color-surface)]" />
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
