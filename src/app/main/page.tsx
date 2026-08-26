"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Landmark, Leaf, Palmtree, Search, SlidersHorizontal, Sparkles, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import { getMyTrips, listTrips, type BackendTripListItem } from "@/lib/trips-api";
import { useAuth } from "@/providers/AuthProvider";

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

const TRENDING_DESTINATIONS = [
  { name: "Bali, Indonesia", posts: "12.4K", image: "/images/plan-osaka.jpg" },
  { name: "Tokyo, Japan", posts: "9.8K", image: "/images/tokyo.jpg" },
  { name: "Sapa, Vietnam", posts: "7.2K", image: "/images/luang-prabang.jpg" },
  { name: "Kuala Lumpur, Malaysia", posts: "5.6K", image: "/images/chengdu.jpg" },
  { name: "Lisbon, Portugal", posts: "4.1K", image: "/images/plan-london.jpg" },
];

const CREATORS = [
  { name: "May", handle: "may.travels", avatar: "/images/profile-avatar.jpg" },
  { name: "Taro", handle: "taro.discovers", avatar: "/images/profile-v2.jpg" },
  { name: "Fern", handle: "fern.wanderlust" },
];

export default function MainPage() {
  const { backendUser } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"forYou" | Category>("forYou");

  // Real public trips from GET /trips (see listTrips's doc comment) —
  // undefined while loading, [] once loaded with nothing to show (backend
  // unreachable or no public trips yet).
  const [trips, setTrips] = useState<BackendTripListItem[] | undefined>(undefined);

  useEffect(() => {
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
  }, []);

  // The public GET /trips feed has no ownerId to check against, so figure
  // out which of the feed's trips are the signed-in user's own via a
  // separate GET /trips/mine (same real source /my-trips and Sidebar's old
  // trip list used) — saving your own trip makes no sense, so its card
  // hides the bookmark toggle entirely instead of just disabling it.
  const [myTripIds, setMyTripIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!backendUser) {
      setMyTripIds(new Set());
      return;
    }
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
  }, [backendUser]);

  const visibleTrips = useMemo(() => {
    if (!trips) return undefined;
    const q = query.trim().toLowerCase();
    return trips.filter((trip) => {
      const tags = (trip.tags ?? []).map((t) => t.toLowerCase());
      if (category !== "forYou" && !tags.includes(category)) return false;
      if (!q) return true;
      return (
        trip.title.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q) ||
        tags.some((t) => t.includes(q))
      );
    });
  }, [trips, query, category]);

  return (
    <AppShell active="home" hideDesktopTopbar>
      <PageContainer className="main-page-container min-h-full bg-white !py-5 sm:!pl-10 sm:!pr-3">
        <div className="main-page-layout grid grid-cols-1 gap-10 xl:grid-cols-3">
          <div className="main-feed min-w-0 xl:col-span-2">
            <div className="flex items-center gap-3 rounded-full border border-[var(--color-border)]/40 bg-white px-5 py-2.5 shadow-sm">
              <Search size={18} className="shrink-0 text-[var(--color-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search destinations, trips, or creators"
                className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--color-muted)] focus:outline-none"
              />
              <button
                type="button"
                title="ยังไม่เปิดใช้งานในเดโมนี้"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {CATEGORY_FILTERS.map((filter) => {
                const isActive = category === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setCategory(filter.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white"
                        : "border border-[var(--color-border)]/60 bg-white text-[var(--foreground)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <filter.icon size={14} />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {visibleTrips === undefined ? (
              <p className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-muted)]">
                กำลังโหลดทริป...
              </p>
            ) : visibleTrips.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-muted)]">
                ยังไม่มีทริปในหมวดนี้ ลองเลือกหมวดอื่นดูสิ
              </p>
            ) : (
              <div className="main-guide-grid mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {visibleTrips.map((trip) => (
                  <RealTripCard key={trip.id} trip={trip} isOwn={myTripIds.has(trip.id)} />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 self-start">
            <TrendingDestinationsCard />
            <CreatorsToFollowCard />
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

function TrendingDestinationsCard() {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "#e1e9e5" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Trending destinations</h2>
        <button
          type="button"
          title="ยังไม่เปิดใช้งานในเดโมนี้"
          className="text-sm font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          See all
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {TRENDING_DESTINATIONS.map((dest) => (
          <div key={dest.name} className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dest.image} alt="" className="h-16 w-[88px] shrink-0 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">{dest.name}</p>
              <p className="truncate text-xs text-[var(--color-muted)]">{dest.posts} posts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreatorsToFollowCard() {
  // Visual-only follow toggle — there's no follow-a-creator endpoint yet
  // (see CONTRIBUTING.md for what's real vs. visual).
  const [following, setFollowing] = useState<Set<string>>(new Set());

  function toggleFollow(handle: string) {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "#e1e9e5" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Creators to follow</h2>
        <button
          type="button"
          title="ยังไม่เปิดใช้งานในเดโมนี้"
          className="text-sm font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          See all
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {CREATORS.map((creator) => {
          const isFollowing = following.has(creator.handle);
          return (
            <div key={creator.handle} className="flex items-center gap-3">
              {creator.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creator.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {creator.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight">{creator.name}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">@{creator.handle}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleFollow(creator.handle)}
                aria-pressed={isFollowing}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  isFollowing
                    ? "border-[var(--color-primary)] bg-[var(--color-sel-bg)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)]/60 text-[var(--foreground)] hover:bg-[var(--color-surface)]"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
