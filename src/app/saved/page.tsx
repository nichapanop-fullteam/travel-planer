"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, SearchX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { HomeHero } from "@/components/consumer/HomeHero";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import { getMyTrips, getSavedTrips, type BackendTripListItem } from "@/lib/trips-api";
import { useAuth } from "@/providers/AuthProvider";
import { TRIP_GRID_CLASS } from "@/lib/feed-layout";

// "Saved" — the signed-in user's bookmarked trips (GET /trips/saved), same
// real card as /main. Route guard mirrors /account and /my-trips: redirect
// to login if there's no session once auth has finished restoring.
export default function SavedPage() {
  const router = useRouter();
  const { backendUser, isLoading } = useAuth();

  const [trips, setTrips] = useState<BackendTripListItem[] | undefined>(undefined);
  const [myTripIds, setMyTripIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!backendUser) {
      router.replace(`/login?redirect=${encodeURIComponent("/saved")}`);
      return;
    }
    let cancelled = false;
    getSavedTrips()
      .then((loaded) => {
        if (!cancelled) setTrips(loaded);
      })
      .catch(() => {
        if (!cancelled) setTrips([]);
      });
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
  }, [backendUser, isLoading, router]);

  function handleSavedChange(tripId: string, saved: boolean) {
    // Unsaving from this page removes the card immediately — staying in a
    // "Saved" list after un-bookmarking it would be confusing.
    if (!saved) setTrips((prev) => prev?.filter((t) => t.id !== tripId));
  }

  // The hero's field filters the list already on screen, same as /my-trips —
  // title, destination and tags, case-insensitive.
  const visibleTrips = useMemo(() => {
    if (!trips) return undefined;
    const q = query.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((trip) => {
      const tags = (trip.tags ?? []).map((t) => t.toLowerCase());
      return (
        trip.title.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q) ||
        tags.some((t) => t.includes(q))
      );
    });
  }, [trips, query]);

  if (isLoading || !backendUser) return null;

  return (
    <AppShell active="saved" hideDesktopSidebar hideTopbar>
      {/* /main's hero, reused whole rather than a plain heading that drifts
          from it: the frosted app bar (wordmark, menu, account avatar), the
          page's one <h1> — "ทริปที่บันทึกไว้" here, in place of /main's
          "จุดหมายที่คุณจะไป" — and the search field. Wired the same way
          /my-trips wires it: the field filters this page's own list, and
          compactSearchHref={null} keeps it live at every width, because
          /main's hand-off to /search searches *public* trips, which is not
          what a search box under "ทริปที่บันทึกไว้" means. */}
      <div className="sticky top-0 z-30">
        <HomeHero
          query={query}
          onQueryChange={setQuery}
          title="ทริปที่บันทึกไว้"
          searchPlaceholder="ค้นหาทริปที่บันทึกไว้"
          compactSearchHref={null}
          suggestPlaces={false}
        />
      </div>

      <div className="min-h-full bg-[#fbfdfc]">
        <PageContainer width="feed" className="!py-6 min-[1025px]:!pt-8">
          {trips === undefined ? (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-muted)]">
              กำลังโหลดทริป...
            </p>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border p-12 text-center" style={{ borderColor: "#e1e9e5" }}>
              <Bookmark size={28} className="text-[var(--color-muted)]" />
              <p className="text-sm font-semibold">ยังไม่มีทริปที่บันทึกไว้</p>
              <p className="text-sm text-[var(--color-muted)]">
                กดไอคอนบุ๊กมาร์กบนการ์ดทริปที่หน้าหลักเพื่อบันทึกไว้ดูทีหลัง
              </p>
            </div>
          ) : visibleTrips?.length === 0 ? (
            // Distinct from the empty list above: nothing matches what was
            // typed, which is recoverable, so offer the way out.
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: "var(--color-border)" }}>
              <SearchX size={28} className="text-[var(--color-muted)]" />
              <p className="text-sm font-semibold">ไม่พบทริปที่ตรงกับที่ค้นหา</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-sm font-semibold text-[var(--color-primary)]"
              >
                ล้างการค้นหา
              </button>
            </div>
          ) : (
            <div className={TRIP_GRID_CLASS}>
              {visibleTrips?.map((trip) => (
                <RealTripCard
                  key={trip.id}
                  trip={trip}
                  isOwn={myTripIds.has(trip.id)}
                  onSavedChange={handleSavedChange}
                />
              ))}
            </div>
          )}
        </PageContainer>
      </div>
    </AppShell>
  );
}
