"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, MapPin, Plus } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ConsumerShell } from "@/components/consumer/ConsumerShell";
import LogoutButton from "@/components/LogoutButton";
import { getMyTrips, type BackendTripListItem } from "@/lib/trips-api";
import { BackendAuthenticationError } from "@/lib/authenticated-fetch";

// Client-side route guard only — good enough for this prototype, but not
// real server-side protection. The backend still verifies its access token
// on every request that returns user-specific data (see lib/trips-api.ts).
export default function MyTripsPage() {
  const router = useRouter();
  const { user, backendUser, isLoading } = useAuth();
  const [trips, setTrips] = useState<BackendTripListItem[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!isLoading && !backendUser) {
      router.replace("/login");
    }
  }, [isLoading, backendUser, router]);

  useEffect(() => {
    if (!backendUser) return;
    let cancelled = false;
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
    return () => {
      cancelled = true;
    };
  }, [backendUser, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle size={20} className="animate-spin text-[var(--color-muted)]" />
      </div>
    );
  }

  if (!backendUser) return null;

  return (
    <ConsumerShell active="my-trips">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backendUser.avatarUrl || user?.photoURL || "/images/profile-avatar.jpg"}
              alt={backendUser.name || user?.displayName || "โปรไฟล์ผู้ใช้"}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
            <div>
              <h1 className="text-xl font-bold">{backendUser.name || "ผู้ใช้ PunGuide"}</h1>
              <p className="text-sm text-[var(--color-muted)]">{backendUser.email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">ทริปของฉัน</h2>
            <Link
              href="/create-trip"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-brand-green)" }}
            >
              <Plus size={14} />
              สร้างทริปใหม่
            </Link>
          </div>

          {loadError ? (
            <div className="rounded-2xl bg-[var(--color-danger-bg)] px-5 py-4 text-sm font-semibold text-[var(--color-danger)]">
              {loadError}
            </div>
          ) : trips === null ? (
            <div className="flex justify-center py-16">
              <LoaderCircle size={20} className="animate-spin text-[var(--color-muted)]" />
            </div>
          ) : trips.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p className="text-sm font-semibold">ยังไม่มีทริป</p>
              <p className="text-xs text-[var(--color-muted)]">เริ่มวางแผนทริปแรกของคุณได้เลย</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/generated-plan/${trip.id}`}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="relative h-32 w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={trip.coverImage?.urls.thumbnail ?? "/images/hero-mountain.jpg"} alt="" className="h-full w-full object-cover" />
                    <span
                      className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                      style={{
                        backgroundColor:
                          trip.status === "confirmed" ? "var(--color-brand-green)" : "var(--color-accent-orange)",
                      }}
                    >
                      {trip.status === "confirmed" ? "ยืนยันแล้ว" : "ร่างแผน"}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="truncate font-bold">{trip.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">
                        {trip.destination} · {trip.schedule.durationDays ?? "–"} วัน
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ConsumerShell>
  );
}
