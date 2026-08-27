"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
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

  if (isLoading || !backendUser) return null;

  return (
    <AppShell active="saved">
      <PageContainer width="feed" className="min-h-full bg-white !py-5">
        <h1 className="text-2xl font-extrabold">ทริปที่บันทึกไว้</h1>

        {trips === undefined ? (
          <p className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-muted)]">
            กำลังโหลดทริป...
          </p>
        ) : trips.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border p-12 text-center" style={{ borderColor: "#e1e9e5" }}>
            <Bookmark size={28} className="text-[var(--color-muted)]" />
            <p className="text-sm font-semibold">ยังไม่มีทริปที่บันทึกไว้</p>
            <p className="text-sm text-[var(--color-muted)]">
              กดไอคอนบุ๊กมาร์กบนการ์ดทริปที่หน้าหลักเพื่อบันทึกไว้ดูทีหลัง
            </p>
          </div>
        ) : (
          <div className={`mt-6 ${TRIP_GRID_CLASS}`}>
            {trips.map((trip) => (
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
    </AppShell>
  );
}
