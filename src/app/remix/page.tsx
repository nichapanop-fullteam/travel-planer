"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ChevronLeft, Menu, Repeat2, Search, SearchX } from "lucide-react";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import { TRIP_GRID_CLASS } from "@/lib/feed-layout";
import { getMyTrips, listTrips, type BackendTripListItem } from "@/lib/trips-api";
import { useAuth } from "@/providers/AuthProvider";

// Standalone browse/discovery page reached from the "Remix Trip" button on a
// trip's Planner (see generated-plan/[id]/page.tsx's TripAttributionBar) —
// a separate feature from that page's existing "นำไปปรับเป็นทริปของฉัน"
// single-trip remix flow, not a replacement for it.
//
// Real data: GET /trips (see listTrips in lib/trips-api.ts) already returns
// only visibility=public trips, so this is the same feed /main reads.
//
// Category vocabulary reuses /main's (thailand/japan/nature/food/weekend,
// filtered against trip.tags) rather than the original design's
// landmark/activity/restaurant — those had no backing field on
// BackendTripListItem at all. See docs/remix-day2.md §0 decision 1.
type TagCategory = "thailand" | "japan" | "nature" | "food" | "weekend";
type TabKey = "forYou" | "topRemixes" | TagCategory | "byCreator";

const TABS: { key: TabKey; label: string }[] = [
  { key: "forYou", label: "For you" },
  { key: "topRemixes", label: "Top Remixes" },
  { key: "thailand", label: "Thailand" },
  { key: "japan", label: "Japan" },
  { key: "nature", label: "Nature" },
  { key: "food", label: "Food" },
  { key: "weekend", label: "Weekend" },
  { key: "byCreator", label: "By Creator" },
];

const TAG_CATEGORIES: TagCategory[] = ["thailand", "japan", "nature", "food", "weekend"];

// How many cards the Top Remixes rail shows, and the minimum remixCount to
// qualify — a trip nobody has remixed yet doesn't belong in a "top" rail.
// See docs/remix-day2.md §0 decision 3; easy to retune, nothing else depends
// on these two numbers.
const TOP_REMIX_RAIL_SIZE = 8;
const TOP_REMIX_MIN_COUNT = 1;

function matchesQuery(trip: BackendTripListItem, query: string): boolean {
  if (!query) return true;
  const tags = (trip.tags ?? []).map((t) => t.toLowerCase());
  return (
    trip.title.toLowerCase().includes(query) ||
    trip.destination.toLowerCase().includes(query) ||
    tags.some((t) => t.includes(query))
  );
}

export default function RemixDiscoveryPage() {
  const router = useRouter();
  const { backendUser, isLoading: authLoading } = useAuth();
  const backendUserId = backendUser?.id ?? null;

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("forYou");

  // undefined while loading, [] once loaded with nothing to show — same
  // contract as /main's own trips state.
  const [trips, setTrips] = useState<BackendTripListItem[] | undefined>(undefined);

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

  // GET /trips carries no ownerId to check against — same gap /main hit, and
  // the same fix: cross-reference GET /trips/mine's ids so a signed-in user's
  // own public trips don't render a bookmark toggle on their own card.
  const [myTripIds, setMyTripIds] = useState<Set<string>>(new Set());

  useEffect(() => {
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

  const query = search.trim().toLowerCase();

  // Off the unfiltered feed on purpose, same reasoning as /main's destination
  // rail: it's a way *into* the grid below, so narrowing it by the search box
  // it fills in would make a tile vanish the moment it was used.
  const topRemixRail = useMemo(() => {
    if (!trips) return undefined;
    return [...trips]
      .filter((t) => (t.remixCount ?? 0) >= TOP_REMIX_MIN_COUNT)
      .sort((a, b) => (b.remixCount ?? 0) - (a.remixCount ?? 0))
      .slice(0, TOP_REMIX_RAIL_SIZE);
  }, [trips]);

  // Per-tab totals for the chip badges, off the search-filtered set so a
  // chip's number matches what selecting it would actually show.
  const tabCounts = useMemo(() => {
    if (!trips) return undefined;
    const searched = trips.filter((t) => matchesQuery(t, query));
    const counts: Partial<Record<TabKey, number>> = { forYou: searched.length };
    counts.topRemixes = searched.filter((t) => (t.remixCount ?? 0) >= TOP_REMIX_MIN_COUNT).length;
    for (const category of TAG_CATEGORIES) {
      counts[category] = searched.filter((t) => (t.tags ?? []).some((tag) => tag.toLowerCase() === category)).length;
    }
    counts.byCreator = new Set(searched.filter((t) => t.creator).map((t) => t.creator!.id)).size;
    return counts;
  }, [trips, query]);

  const visibleTrips = useMemo(() => {
    if (!trips || activeTab === "byCreator") return undefined;
    let list = trips.filter((t) => matchesQuery(t, query));
    if (activeTab === "topRemixes") {
      return list
        .filter((t) => (t.remixCount ?? 0) >= TOP_REMIX_MIN_COUNT)
        .sort((a, b) => (b.remixCount ?? 0) - (a.remixCount ?? 0));
    }
    if (activeTab !== "forYou") {
      list = list.filter((t) => (t.tags ?? []).some((tag) => tag.toLowerCase() === activeTab));
    }
    return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [trips, query, activeTab]);

  // Trips grouped under the creator that made them — the one tab whose view
  // isn't a flat grid. Skips any trip whose owner row is gone (creator is
  // absent then, see TripListItemResponseDto), same as a card with no
  // creator chip just renders without one rather than crashing.
  const creatorGroups = useMemo(() => {
    if (!trips || activeTab !== "byCreator") return undefined;
    const searched = trips.filter((t) => matchesQuery(t, query) && t.creator);
    const groups = new Map<string, { creator: NonNullable<BackendTripListItem["creator"]>; trips: BackendTripListItem[] }>();
    for (const trip of searched) {
      const creator = trip.creator!;
      if (!groups.has(creator.id)) groups.set(creator.id, { creator, trips: [] });
      groups.get(creator.id)!.trips.push(trip);
    }
    return [...groups.values()].sort((a, b) => b.trips.length - a.trips.length);
  }, [trips, query, activeTab]);

  const isLoading = trips === undefined;
  const isEmpty =
    activeTab === "byCreator" ? creatorGroups?.length === 0 : visibleTrips?.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="ย้อนกลับ"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)]/50 bg-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="เปิดเมนู"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)]/50 bg-white"
          >
            <Menu size={16} />
          </button>
        </div>
        <Link href="/main" className="text-lg font-extrabold text-[var(--foreground)]">
          PunGuide
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/saved"
            aria-label="ทริปที่บันทึกไว้"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)]/50 bg-white"
          >
            <Bookmark size={16} />
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/profile-avatar.jpg" alt="โปรไฟล์ผู้ใช้" className="h-10 w-10 rounded-full object-cover" />
        </div>
      </header>

      <div className="bg-black px-4 pb-8 pt-6 sm:px-6">
        <h1 className="text-center text-3xl font-extrabold text-white">Remix ทริป</h1>
        <div className="mx-auto mt-5 flex max-w-xl items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5">
          <Search size={16} className="shrink-0 text-[var(--color-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อที่ ย่าน หรือประเภท"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted)]"
          />
        </div>
      </div>

      <div className="no-scrollbar overflow-x-auto px-4 py-4 sm:px-6">
        <div className="flex min-w-max items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts?.[tab.key];
            // Dimmed, not disabled: an empty tab is still worth being able to
            // select (and to see is empty) rather than becoming unclickable.
            const isTabEmpty = count === 0 && !isActive;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={isActive}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: isActive ? "#D7FF3D" : "transparent",
                  borderColor: isActive ? "#D7FF3D" : "var(--color-border)",
                  color: isActive ? "#1a1a1a" : isTabEmpty ? "var(--color-muted)" : "var(--foreground)",
                }}
              >
                {tab.label}
                {count != null && (
                  <span
                    className="rounded-full px-1.5 text-[10px] font-bold tabular-nums"
                    style={{
                      backgroundColor: isActive ? "rgba(26,26,26,0.12)" : "var(--color-surface)",
                      color: isActive ? "#1a1a1a" : "var(--color-muted)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {topRemixRail && topRemixRail.length > 0 && (
        <section className="px-4 pt-2 sm:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[var(--foreground)]">Top Remixes</h2>
            <button
              type="button"
              onClick={() => setActiveTab("topRemixes")}
              className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold text-white"
              style={{ backgroundColor: "#6C4DFF" }}
            >
              <Repeat2 size={12} />
              ดูทั้งหมด
            </button>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {topRemixRail.map((trip) => (
              <div key={trip.id} className="w-[220px] shrink-0 sm:w-[260px]">
                <RealTripCard trip={trip} isOwn={Boolean(backendUserId) && myTripIds.has(trip.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-8 sm:px-6">
        <h2 className="mb-3 text-lg font-extrabold text-[var(--foreground)]">
          {activeTab === "byCreator" ? "สร้างสรรค์โดย" : "สำรวจทริปทั้งหมด"}
        </h2>
        {isLoading ? (
          <div className={TRIP_GRID_CLASS}>
            {Array.from({ length: 8 }).map((_, i) => (
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
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-muted)]">
              <SearchX size={26} />
            </div>
            <p className="text-base font-bold">ไม่พบทริปที่ตรงกับการค้นหา</p>
          </div>
        ) : activeTab === "byCreator" ? (
          <div className="flex flex-col gap-8">
            {creatorGroups!.map((group) => (
              <div key={group.creator.id}>
                <div className="mb-3 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={group.creator.avatarUrl || "/images/profile-avatar.jpg"}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">{group.creator.name}</h3>
                  <span className="text-xs font-semibold text-[var(--color-muted)]">
                    {group.trips.length} ทริป
                  </span>
                </div>
                <div className={TRIP_GRID_CLASS}>
                  {group.trips.map((trip) => (
                    <RealTripCard
                      key={trip.id}
                      trip={trip}
                      isOwn={Boolean(backendUserId) && myTripIds.has(trip.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={TRIP_GRID_CLASS}>
            {visibleTrips!.map((trip, index) => (
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
    </div>
  );
}
