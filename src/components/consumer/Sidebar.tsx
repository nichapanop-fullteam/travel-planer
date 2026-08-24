"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Home, MapPin, Menu, Plus, User, Users } from "lucide-react";
import { myGroups } from "@/lib/groups";
import { onGeneratedTripsChanged } from "@/lib/generated-trips";
import { useAuth } from "@/providers/AuthProvider";
import { getMyTrips, type BackendTripListItem } from "@/lib/trips-api";

type NavKey = "home" | "my-trips" | "account";

// Sidebar nav — "หน้าหลัก" (Home) and "Account" (see app/account/page.tsx)
// link somewhere real; "Bookmark" and "Create Group" are still visual
// placeholders (see CONTRIBUTING.md for what's real vs. visual). Groups list
// links to real trip-detail pages,
// and "ทริปของฉัน" reads the signed-in user's real trips from GET /trips/mine
// (see lib/trips-api.ts) — same source as /my-trips, so a trip created/deleted
// on another device or via /my-trips shows up here correctly too.
export function Sidebar({
  active,
  activeGroupId,
  onClose,
}: {
  active?: NavKey;
  activeGroupId?: string;
  onClose?: () => void;
}) {
  const groups = myGroups;
  const { backendUser } = useAuth();
  // Discarded via the `backendUser ? ... : []` fallback below on logout,
  // rather than reset with an extra setState call, so the effect never needs
  // a synchronous setState in its body (only inside the fetch's .then/.catch).
  const [fetchedTrips, setFetchedTrips] = useState<BackendTripListItem[]>([]);
  const myTrips = backendUser ? fetchedTrips : [];

  const loadMyTrips = useCallback(() => {
    getMyTrips()
      .then(setFetchedTrips)
      .catch(() => setFetchedTrips([]));
  }, []);

  useEffect(() => {
    if (!backendUser) return;
    loadMyTrips();
    // onGeneratedTripsChanged still fires on every local trip
    // create/update/delete (create-trip, "ลบทริป" on my-trips, ...) — reused
    // here purely as a "something changed, refetch from the server" signal,
    // not as the data source itself.
    return onGeneratedTripsChanged(loadMyTrips);
  }, [backendUser, loadMyTrips]);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[var(--color-border)]/40 bg-white p-4">
      <div className="mb-5 flex items-center justify-between px-2">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-extrabold text-[var(--color-primary)]">PunGuide</span>
          <span className="text-2xl font-extrabold text-[var(--color-accent-orange)]">+</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
            aria-label="ปิดเมนู"
          >
            <Menu size={18} />
          </button>
        )}
      </div>

      <nav className="mb-6 flex flex-col gap-1">
        <NavItem item={{ label: "หน้าหลัก", icon: Home, href: "/main" }} isActive={active === "home"} />
        <NavItem item={{ label: "Account", icon: User, href: "/account" }} isActive={active === "account"} />
        <NavItem item={{ label: "Bookmark", icon: Bookmark }} />
      </nav>

      <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
        Groups Trip
      </p>
      <div className="flex flex-col gap-1">
        <span
          className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-muted)] opacity-70"
          title="ยังไม่เปิดใช้งานในเดโมนี้"
        >
          <Plus size={16} className="shrink-0" />
          Create Group
        </span>
        {groups.map((group) => (
          <Link
            key={group.tripId}
            href={`/trip-detail/${group.tripId}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              activeGroupId === group.tripId
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
            }`}
          >
            <Users size={16} className="shrink-0" />
            <span className="truncate">{group.name}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--color-border)]/60 p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-bold">ทริปของฉัน</p>
            <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted)]">
              {myTrips.length} โปรแกรม
            </span>
          </div>

          {myTrips.length > 0 && (
            <div className="mb-2 min-h-0 flex-1 overflow-y-auto flex flex-col gap-1">
              {myTrips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/generated-plan/${trip.id}`}
                  className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
                >
                  <MapPin size={16} className="shrink-0" />
                  <span className="truncate">
                    {trip.destination}
                    {trip.status !== "confirmed" && " (WIP)"}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/create-trip"
            className="flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Plus size={16} />
            New Trip
          </Link>
        </div>
      </div>

      <PromoCard />
    </aside>
  );
}

function NavItem({
  item,
  isActive,
}: {
  item: { label: string; icon: typeof Home; href?: string };
  isActive?: boolean;
}) {
  const Icon = item.icon;
  const className = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
      : "text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
  }`;

  if (!item.href) {
    return (
      <span className={className} title="ยังไม่เปิดใช้งานในเดโมนี้">
        <Icon size={18} />
        {item.label}
      </span>
    );
  }

  return (
    <Link href={item.href} className={className}>
      <Icon size={18} />
      {item.label}
    </Link>
  );
}

function PromoCard() {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-4 text-center">
      <svg width="88" height="56" viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="80" height="40" rx="6" fill="white" />
        <path d="M10 34 L28 20 L40 30 L54 16 L78 34" stroke="var(--color-primary)" strokeWidth="2" fill="none" />
        <circle cx="28" cy="20" r="4" fill="var(--color-accent-orange)" />
        <circle cx="54" cy="16" r="4" fill="var(--color-primary)" />
        <circle cx="22" cy="44" r="6" fill="var(--color-primary)" />
        <circle cx="38" cy="44" r="6" fill="var(--color-accent-orange)" />
        <circle cx="54" cy="44" r="6" fill="var(--color-primary)" />
      </svg>
      <div>
        <p className="text-sm font-bold">Plan together, travel better.</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          แชร์แผนเที่ยว บันทึกสถานที่ และทำให้ทุกคนเข้าใจแผนตรงกัน
        </p>
      </div>
    </div>
  );
}
