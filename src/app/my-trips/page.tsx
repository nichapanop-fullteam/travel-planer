"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { HomeHero } from "@/components/consumer/HomeHero";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import { CreateTripButton } from "@/components/ui/CreateTripButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { deleteTrip, getMyTrips, type BackendTripListItem } from "@/lib/trips-api";
import { deleteGeneratedTrip, onGeneratedTripsChanged } from "@/lib/generated-trips";
import { BackendAuthenticationError } from "@/lib/authenticated-fetch";
import { TRIP_GRID_CLASS } from "@/lib/feed-layout";

// Client-side route guard only — good enough for this prototype, but not
// real server-side protection. The backend still verifies its access token
// on every request that returns user-specific data (see lib/trips-api.ts).
export default function MyTripsPage() {
  const router = useRouter();
  const { backendUser, isLoading } = useAuth();
  const [trips, setTrips] = useState<BackendTripListItem[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [tripQuery, setTripQuery] = useState("");
  const [tripFilter, setTripFilter] = useState<"all" | "draft" | "published">("all");

  useEffect(() => {
    if (!isLoading && !backendUser) {
      router.replace("/login");
    }
  }, [isLoading, backendUser, router]);

  useEffect(() => {
    if (!backendUser) return;
    let cancelled = false;

    function refetch() {
      getMyTrips()
        .then((items) => {
          if (!cancelled) setTrips(items);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          if (error instanceof BackendAuthenticationError) {
            router.replace("/login");
            return;
          }
          setLoadError("โหลดทริปของคุณไม่สำเร็จ กรุณาลองอีกครั้ง");
        });
    }

    refetch();
    // A successful Remix (or any other local trip create/update/delete)
    // fires this event — re-run the fetch so a trip created elsewhere shows
    // up here without a hard page refresh.
    const unsubscribe = onGeneratedTripsChanged(refetch);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [backendUser, router]);

  function handleDelete(trip: BackendTripListItem) {
    if (!window.confirm(`ลบทริป "${trip.title}"? การลบนี้ไม่สามารถย้อนกลับได้`)) return;
    setDeleteError("");
    setDeletingId(trip.id);
    deleteTrip(trip.id)
      .then(() => {
        setTrips((prev) => prev?.filter((t) => t.id !== trip.id) ?? prev);
        // Self-mode trips are also saved locally under this same backend id
        // (see create-trip/page.tsx) — clear that copy too, otherwise it
        // lingers in the "ทริปของฉัน" sidebar list after the real trip is gone.
        deleteGeneratedTrip(trip.id);
      })
      .catch((error: unknown) => {
        if (error instanceof BackendAuthenticationError) {
          router.replace("/login");
          return;
        }
        setDeleteError(`ลบทริป "${trip.title}" ไม่สำเร็จ กรุณาลองอีกครั้ง`);
      })
      .finally(() => setDeletingId(null));
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle size={20} className="animate-spin text-[var(--color-muted)]" />
      </div>
    );
  }

  if (!backendUser) return null;

  const filteredTrips = trips?.filter((trip) => {
    const q = tripQuery.trim().toLowerCase();
    const matchesQuery = !q || trip.title.toLowerCase().includes(q) || trip.destination.toLowerCase().includes(q);
    const matchesFilter = tripFilter === "all" || trip.status.toLowerCase() === tripFilter;
    return matchesQuery && matchesFilter;
  });

  return (
    <AppShell active="myTrips" hideDesktopSidebar hideTopbar>
      {/* /main's hero, reused whole rather than a second header that drifts
          from it: the frosted app bar (wordmark, menu, account avatar), the
          page's one <h1>, and the search field. Two of its options matter here:
          the field is wired to this page's own tripQuery, and
          compactSearchHref={null} keeps it live at every width — /main's
          hand-off to /search searches *public* trips, which is not what a
          search box under "ทริปของฉัน" means. */}
      <div className="sticky top-0 z-30">
        <HomeHero
          query={tripQuery}
          onQueryChange={setTripQuery}
          eyebrow="ยินดีต้อนรับกลับมา"
          title="ทริปของฉัน"
          searchPlaceholder="ค้นหาทริปของคุณ"
          compactSearchHref={null}
          suggestPlaces={false}
        />
      </div>

      <div className="min-h-full bg-[#f7faf8]">
        <main className="mx-auto w-full max-w-[var(--container-feed)] px-4 py-8 sm:px-6 sm:py-12 lg:px-10 xl:px-14">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#dcebe3] bg-white p-5"><p className="text-sm text-[var(--color-muted)]">ทริปทั้งหมด</p><p className="mt-2 text-3xl font-extrabold">{trips?.length ?? "–"}</p></div>
            <div className="rounded-2xl border border-[#dcebe3] bg-white p-5"><p className="text-sm text-[var(--color-muted)]">กำลังวางแผน</p><p className="mt-2 text-3xl font-extrabold text-[var(--color-primary)]">{trips?.filter((trip) => trip.status.toLowerCase() !== "completed").length ?? "–"}</p></div>
            <div className="rounded-2xl border border-[#dcebe3] bg-white p-5"><p className="text-sm text-[var(--color-muted)]">จุดหมาย</p><p className="mt-2 text-3xl font-extrabold">{trips ? new Set(trips.map((trip) => trip.destination)).size : "–"}</p></div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-extrabold">รายการทริป</h2><p className="mt-1 text-sm text-[var(--color-muted)]">เปิดดู แก้ไข หรือลบทริปของคุณ</p></div>
            {/* No search box of its own any more — the hero's field writes to
                this same tripQuery, and two inputs showing the same text was
                all that was left of it. CreateTripButton moved down here from
                the old header: FrostedTopNav has no slot for it, and this is
                the row the trip list actually starts at. */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex rounded-xl border border-[#dcebe3] bg-white p-1">
                {([["all", "ทั้งหมด"], ["draft", "ร่าง"], ["published", "เผยแพร่"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTripFilter(value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tripFilter === value ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)] hover:bg-[#eef7f2]"}`}>{label}</button>)}
              </div>
              {/* Desktop only, same 1025px boundary the rest of this page
                  splits on: below it MobileBottomNav's raised centre button is
                  already the create action, and this one collapses to a bare
                  "+" under 640px — two identical plus buttons on one screen. */}
              <span className="hidden min-[1025px]:block">
                <CreateTripButton />
              </span>
            </div>
          </div>

            {deleteError && (
              <div className="mt-4 rounded-2xl bg-[var(--color-danger-bg)] px-5 py-4 text-sm font-semibold text-[var(--color-danger)]">
                {deleteError}
              </div>
            )}

            <div className="mt-5">
              {loadError ? (
                <div className="rounded-2xl bg-[var(--color-danger-bg)] px-5 py-4 text-sm font-semibold text-[var(--color-danger)]">
                  {loadError}
                </div>
              ) : trips === null ? (
                <div className="py-16">
                  <Spinner />
                </div>
              ) : trips.length === 0 ? (
                <EmptyState title="ยังไม่มีทริป" description="เริ่มวางแผนทริปแรกของคุณได้เลย" />
              ) : filteredTrips?.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#c9ddd3] bg-white p-12 text-center"><CheckCircle2 className="mx-auto text-[var(--color-muted)]" /><p className="mt-3 text-sm font-semibold">ไม่พบทริปที่ตรงกับการค้นหา</p><button type="button" onClick={() => { setTripQuery(""); setTripFilter("all"); }} className="mt-3 text-sm font-semibold text-[var(--color-primary)]">ล้างตัวกรอง</button></div>
              ) : (
                <div className={TRIP_GRID_CLASS}>
                  {filteredTrips?.map((trip) => (
                    <RealTripCard
                      key={trip.id}
                      trip={trip}
                      isOwn
                      showStatus
                      onDelete={() => handleDelete(trip)}
                      deleting={deletingId === trip.id}
                    />
                  ))}
                </div>
              )}
            </div>
        </main>
      </div>
    </AppShell>
  );
}
