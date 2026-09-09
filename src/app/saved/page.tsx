"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, SearchX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { HomeHero } from "@/components/consumer/HomeHero";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import { SavedPlaceCard } from "@/components/place/SavedPlaceCard";
import { getMyTrips, getSavedTrips, type BackendTripListItem } from "@/lib/trips-api";
import { getSavedPlaces, type SavedPlace } from "@/lib/saved-places-api";
import { useAuth } from "@/providers/AuthProvider";
import { TRIP_GRID_CLASS } from "@/lib/feed-layout";

// "Saved" — everything the signed-in user has bookmarked, in two tabs:
// whole trips (GET /trips/saved, the bookmark on a trip card) and single places
// (GET /places/saved, the bookmark on a stop). Route guard mirrors /account and
// /my-trips: redirect to login if there's no session once auth has finished
// restoring.
type TabKey = "trips" | "places";

const TABS: { key: TabKey; label: string }[] = [
  { key: "trips", label: "ทริปที่คุณบันทึกไว้" },
  { key: "places", label: "สถานที่ที่คุณบันทึกไว้" },
];

export default function SavedPage() {
  // useSearchParams (the ?tab= handoff below) bails out of static prerendering
  // unless it sits under a Suspense boundary — the build fails outright without
  // this. Same wrapper, same reasoning as HomePage and CreateTripPage.
  return (
    <Suspense fallback={null}>
      <SavedLists />
    </Suspense>
  );
}

function SavedLists() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { backendUser, isLoading } = useAuth();

  const [trips, setTrips] = useState<BackendTripListItem[] | undefined>(undefined);
  const [places, setPlaces] = useState<SavedPlace[] | undefined>(undefined);
  const [myTripIds, setMyTripIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  // Read from the URL rather than kept only in state, so the toast a place
  // bookmark shows ("ดูรายการที่บันทึกไว้") can link straight to the right tab.
  const activeTab: TabKey = searchParams.get("tab") === "places" ? "places" : "trips";

  function selectTab(tab: TabKey) {
    // replace, not push: flipping a tab back and forth should not fill the back
    // button with steps the user has to unwind to leave the page.
    router.replace(tab === "trips" ? "/saved" : `/saved?tab=${tab}`, { scroll: false });
  }

  useEffect(() => {
    if (isLoading) return;
    if (!backendUser) {
      router.replace(`/login?redirect=${encodeURIComponent("/saved")}`);
      return;
    }
    let cancelled = false;
    // Both lists load up front, not per tab: the tab labels carry counts, and a
    // count that only appears after you click the tab is not a count.
    getSavedTrips()
      .then((loaded) => {
        if (!cancelled) setTrips(loaded);
      })
      .catch(() => {
        if (!cancelled) setTrips([]);
      });
    getSavedPlaces()
      .then((loaded) => {
        if (!cancelled) setPlaces(loaded);
      })
      .catch((err) => {
        console.warn("โหลดสถานที่ที่บันทึกไว้ไม่สำเร็จ", err);
        if (!cancelled) setPlaces([]);
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

  function handlePlaceSavedChange(placeId: string, saved: boolean) {
    if (!saved) setPlaces((prev) => prev?.filter((p) => p.id !== placeId));
  }

  function requireLogin() {
    router.push(`/login?redirect=${encodeURIComponent("/saved")}`);
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

  // A place has no tags or destination — its name and Google's formatted
  // address are what there is to match on, and the address is the field that
  // tells two "ตลาดเช้า" apart.
  const visiblePlaces = useMemo(() => {
    if (!places) return undefined;
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter(
      (place) =>
        place.name.toLowerCase().includes(q) || (place.address ?? "").toLowerCase().includes(q)
    );
  }, [places, query]);

  if (isLoading || !backendUser) return null;

  const loading = activeTab === "trips" ? trips === undefined : places === undefined;
  const savedCount = activeTab === "trips" ? trips?.length ?? 0 : places?.length ?? 0;
  const visibleCount = activeTab === "trips" ? visibleTrips?.length ?? 0 : visiblePlaces?.length ?? 0;

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
          title="รายการที่บันทึกไว้"
          searchPlaceholder={activeTab === "trips" ? "ค้นหาทริปที่บันทึกไว้" : "ค้นหาสถานที่ที่บันทึกไว้"}
          compactSearchHref={null}
          suggestPlaces={false}
        />
      </div>

      <div className="min-h-full bg-[#fbfdfc]">
        <PageContainer width="feed" className="!py-6 min-[1025px]:!pt-8">
          {/* Same pill tab bar as /remix — counts included, so an empty tab
              says so before it's opened. */}
          <div className="no-scrollbar mb-5 overflow-x-auto">
            <div className="flex min-w-max items-center gap-2">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const count = tab.key === "trips" ? trips?.length : places?.length;
                const isTabEmpty = count === 0 && !isActive;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => selectTab(tab.key)}
                    aria-pressed={isActive}
                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                    style={{
                      backgroundColor: isActive ? "var(--color-brand-green)" : "transparent",
                      borderColor: isActive ? "var(--color-brand-green)" : "var(--color-border)",
                      color: isActive ? "#fff" : isTabEmpty ? "var(--color-muted)" : "var(--foreground)",
                    }}
                  >
                    {tab.label}
                    {count != null && (
                      <span
                        className="rounded-full px-1.5 text-[10px] font-bold tabular-nums"
                        style={{
                          backgroundColor: isActive ? "rgba(255,255,255,0.24)" : "var(--color-surface)",
                          color: isActive ? "#fff" : "var(--color-muted)",
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

          {loading ? (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-muted)]">
              {activeTab === "trips" ? "กำลังโหลดทริป..." : "กำลังโหลดสถานที่..."}
            </p>
          ) : savedCount === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border p-12 text-center" style={{ borderColor: "#e1e9e5" }}>
              <Bookmark size={28} className="text-[var(--color-muted)]" />
              <p className="text-sm font-semibold">
                {activeTab === "trips" ? "ยังไม่มีทริปที่บันทึกไว้" : "ยังไม่มีสถานที่ที่บันทึกไว้"}
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                {activeTab === "trips"
                  ? "กดไอคอนบุ๊กมาร์กบนการ์ดทริปที่หน้าหลักเพื่อบันทึกไว้ดูทีหลัง"
                  : "กดไอคอนบุ๊กมาร์กบนสถานที่ในแผนเที่ยวเพื่อเก็บไว้ใช้กับทริปอื่น"}
              </p>
            </div>
          ) : visibleCount === 0 ? (
            // Distinct from the empty list above: nothing matches what was
            // typed, which is recoverable, so offer the way out.
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: "var(--color-border)" }}>
              <SearchX size={28} className="text-[var(--color-muted)]" />
              <p className="text-sm font-semibold">
                {activeTab === "trips" ? "ไม่พบทริปที่ตรงกับที่ค้นหา" : "ไม่พบสถานที่ที่ตรงกับที่ค้นหา"}
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-sm font-semibold text-[var(--color-primary)]"
              >
                ล้างการค้นหา
              </button>
            </div>
          ) : activeTab === "trips" ? (
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
          ) : (
            <div className={TRIP_GRID_CLASS}>
              {visiblePlaces?.map((place) => (
                <SavedPlaceCard
                  key={place.id}
                  place={place}
                  onSavedChange={handlePlaceSavedChange}
                  onRequireLogin={requireLogin}
                />
              ))}
            </div>
          )}
        </PageContainer>
      </div>
    </AppShell>
  );
}
