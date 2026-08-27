"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Menu, Pencil, Search, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { AppShell, useAppShell } from "@/components/layout/AppShell";
import { UserAccountDialog } from "@/components/layout/UserAccountDialog";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import { CreateTripButton } from "@/components/ui/CreateTripButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
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
  const [tripQuery, setTripQuery] = useState("");
  const [tripFilter, setTripFilter] = useState<"all" | "draft" | "published">("all");
  const [accountOpen, setAccountOpen] = useState(false);

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
    <AppShell hideDesktopSidebar hideTopbar>
      <div className="min-h-full bg-[#f7faf8]">
        <header className="sticky top-0 z-20 border-b border-[#e5eee9] bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-[72px] w-full max-w-[var(--container-feed)] items-center justify-between gap-4 px-6 sm:px-8 lg:px-12 xl:px-16">
            <div className="flex min-w-0 items-center gap-1.5">
              <MyTripsMenuButton />
              <Link href="/main" className="text-xl font-extrabold tracking-[-0.04em] text-[var(--color-brand-green)]">PUNGUIDE</Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/main" className="hidden text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--foreground)] sm:block">สำรวจทริป</Link>
              <CreateTripButton />
              <button type="button" onClick={() => setAccountOpen(true)} aria-label="บัญชีผู้ใช้" className="rounded-full hover:opacity-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={backendUser.avatarUrl || user?.photoURL || "/images/profile-avatar.jpg"} alt="" className="h-9 w-9 rounded-full object-cover" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[var(--container-feed)] px-6 py-8 sm:px-8 sm:py-12 lg:px-12 xl:px-16">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[var(--color-primary)]">ยินดีต้อนรับกลับมา</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">ทริปของฉัน</h1>
              <p className="mt-2 text-sm text-[var(--color-muted)]">จัดการแพลนทั้งหมดของคุณในที่เดียว</p>
            </div>
            <button type="button" onClick={() => setAccountOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#d6e4dd] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#eef7f2]"><Pencil size={15} /> แก้ไขโปรไฟล์</button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#dcebe3] bg-white p-5"><p className="text-sm text-[var(--color-muted)]">ทริปทั้งหมด</p><p className="mt-2 text-3xl font-extrabold">{trips?.length ?? "–"}</p></div>
            <div className="rounded-2xl border border-[#dcebe3] bg-white p-5"><p className="text-sm text-[var(--color-muted)]">กำลังวางแผน</p><p className="mt-2 text-3xl font-extrabold text-[var(--color-primary)]">{trips?.filter((trip) => trip.status.toLowerCase() !== "completed").length ?? "–"}</p></div>
            <div className="rounded-2xl border border-[#dcebe3] bg-white p-5"><p className="text-sm text-[var(--color-muted)]">จุดหมาย</p><p className="mt-2 text-3xl font-extrabold">{trips ? new Set(trips.map((trip) => trip.destination)).size : "–"}</p></div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-extrabold">รายการทริป</h2><p className="mt-1 text-sm text-[var(--color-muted)]">เปิดดู แก้ไข หรือลบทริปของคุณ</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex items-center gap-2 rounded-xl border border-[#dcebe3] bg-white px-3.5 py-2.5 sm:w-64"><Search size={16} className="text-[var(--color-muted)]" /><input value={tripQuery} onChange={(event) => setTripQuery(event.target.value)} placeholder="ค้นหาทริป..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />{tripQuery && <button type="button" onClick={() => setTripQuery("")} aria-label="ล้างการค้นหา"><X size={14} /></button>}</label>
              <div className="flex rounded-xl border border-[#dcebe3] bg-white p-1">
                {([["all", "ทั้งหมด"], ["draft", "ร่าง"], ["published", "เผยแพร่"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTripFilter(value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tripFilter === value ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)] hover:bg-[#eef7f2]"}`}>{label}</button>)}
              </div>
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
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
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
      {accountOpen && <UserAccountDialog onClose={() => setAccountOpen(false)} />}
    </AppShell>
  );
}

// The shell's Topbar is hidden on this page (it duplicated this header), so
// this is the only way into the nav drawer at any width.
function MyTripsMenuButton() {
  const appShell = useAppShell();
  if (!appShell) return null;
  return (
    <button
      type="button"
      onClick={appShell.openSidebar}
      aria-label="เปิดเมนู"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[var(--color-surface)]"
    >
      <Menu size={20} />
    </button>
  );
}
