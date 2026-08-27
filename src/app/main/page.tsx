"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Landmark, Leaf, Palmtree, Search, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { Sidebar } from "@/components/layout/Sidebar";
import { HomeNavbar } from "@/components/consumer/HomeNavbar";
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

export default function MainPage() {
  const { backendUser } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"forYou" | Category>("forYou");

  // Same off-canvas Sidebar drawer pattern as /generated-plan/[id]'s Hero
  // menu button — not gated to md:hidden like AppShell's own
  // MobileNavigation, since /main hides AppShell's desktop sidebar entirely
  // and needs its own way back into Explore/My Trips/Saved/Messages.
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <AppShell active="home" hideDesktopTopbar hideDesktopSidebar>
      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
        <div
          className={`relative z-10 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar active="home" onClose={() => setSidebarOpen(false)} />
        </div>
      </div>

      <HomeNavbar onMenuClick={() => setSidebarOpen(true)}>
        {CATEGORY_FILTERS.map((filter) => {
          const isActive = category === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setCategory(filter.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[var(--color-primary)] text-white shadow-[0_4px_12px_rgba(42,158,100,0.35)]"
                  : "border border-[var(--color-border)]/40 bg-white text-[var(--foreground)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
              }`}
            >
              <filter.icon size={14} />
              {filter.label}
            </button>
          );
        })}
      </HomeNavbar>
      <section className="relative overflow-hidden border-b border-[#ededed] bg-gradient-to-b from-[var(--color-surface)] to-white px-4 py-10 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-70"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
            สำรวจทริปของคุณ
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">ค้นพบแผนการเดินทางจากนักเดินทางและครีเอเตอร์</p>

          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-[#e5e5e5] bg-white px-5 py-2.5 text-left shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition-shadow focus-within:shadow-[0_8px_22px_rgba(42,158,100,0.16)]">
            <Search size={20} className="shrink-0 text-[var(--color-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาทริป จุดหมาย หรือสไตล์การเที่ยว..."
              aria-label="ค้นหาทริป จุดหมาย หรือสไตล์การเที่ยว"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted)]"
            />
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="ล้างการค้นหา"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--foreground)]"
              >
                <X size={15} />
              </button>
            )}
            <button type="button" aria-label="ค้นหาทริป" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-deep-green)]">
              <Search size={17} />
            </button>
          </label>
        </div>
      </section>
      <PageContainer className="main-page-container min-h-full bg-white !py-7 !px-6 sm:!px-10 lg:!px-14">
        <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {visibleTrips === undefined ? "กำลังโหลดทริป..." : `พบ ${visibleTrips.length.toLocaleString()} ทริป`}
              </p>
            </div>
            {visibleTrips === undefined ? (
              <div className="main-guide-grid grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                    <div className="aspect-[4/5] w-full bg-[var(--color-surface)]" />
                  </div>
                ))}
              </div>
            ) : visibleTrips.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-12 text-center">
                <Search size={28} className="text-[var(--color-muted)]" />
                <p className="text-sm font-medium text-[var(--color-muted)]">
                  ยังไม่มีทริปในหมวดนี้ ลองเลือกหมวดอื่นหรือค้นหาคำอื่นดูสิ
                </p>
              </div>
            ) : (
              <div className="main-guide-grid grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
                {visibleTrips.map((trip) => (
                  <RealTripCard key={trip.id} trip={trip} isOwn={Boolean(backendUser) && myTripIds.has(trip.id)} />
                ))}
              </div>
            )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
