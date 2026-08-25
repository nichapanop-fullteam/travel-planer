"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/Badge";
import LogoutButton from "@/components/LogoutButton";
import { deleteTrip, getMyTrips, type BackendTripListItem } from "@/lib/trips-api";
import { deleteGeneratedTrip, onGeneratedTripsChanged } from "@/lib/generated-trips";
import { BackendAuthenticationError } from "@/lib/authenticated-fetch";

// Client-side route guard only — good enough for this prototype, but not
// real server-side protection. The backend still verifies its access token
// on every request that returns user-specific data (see lib/trips-api.ts).
export default function MyTripsPage() {
  const router = useRouter();
  const { user, backendUser, isLoading } = useAuth();
  const [trips, setTrips] = useState<BackendTripListItem[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

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

  return (
    <AppShell>
      <PageContainer>
        <SectionContainer>
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
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Pencil size={14} />
                แก้ไขโปรไฟล์
              </Link>
              <LogoutButton />
            </div>
          </div>

          <div>
            <PageHeader
              title="ทริปของฉัน"
              actions={
                <Link
                  href="/create-trip"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--color-brand-green)" }}
                >
                  <Plus size={14} />
                  สร้างทริปใหม่
                </Link>
              }
            />

            {deleteError && (
              <div className="mt-4 rounded-2xl bg-[var(--color-danger-bg)] px-5 py-4 text-sm font-semibold text-[var(--color-danger)]">
                {deleteError}
              </div>
            )}

            <div className="mt-4">
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
                        <div className="absolute left-2 top-2">
                          <StatusBadge status={trip.status} />
                        </div>
                        <button
                          type="button"
                          aria-label={`ลบทริป ${trip.title}`}
                          disabled={deletingId === trip.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(trip);
                          }}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[var(--color-danger)] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === trip.id ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="truncate font-bold">{trip.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">
                            {trip.destination} · {trip.schedule?.durationDays ?? "–"} วัน
                          </span>
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionContainer>
      </PageContainer>
    </AppShell>
  );
}
