"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Luggage, MapPinned, Menu, Search } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useAppShell } from "@/components/layout/AppShell";

// App header, restyled from the TRAVELOG reference: a nav row (menu/logo,
// centered section tabs, account or login CTA) above a segmented
// destination/date search bar. Recoloured to PunGuide's green rather than
// the reference's orange, per the platform theme.
//
// The logo only appears below md — on desktop the Sidebar already shows it,
// and two logos side by side reads as a mistake. The centered tabs point at
// the same real routes the Sidebar lists; see the note in the handover about
// that duplication.
const NAV_TABS: { href: string; label: string; icon: typeof Luggage }[] = [
  { href: "/", label: "แพ็กเกจทริป", icon: Luggage },
  { href: "/my-trips", label: "ทริปของฉัน", icon: MapPinned },
];

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const appShell = useAppShell();
  const { backendUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const name = backendUser?.name || "ผู้ใช้ PunGuide";

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");

  // Both fields feed the real create-trip wizard, which already reads
  // `destination` (and now `startDate`) off the query string — nothing is
  // silently dropped.
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set("destination", destination.trim());
    if (startDate) params.set("startDate", startDate);
    router.push(`/create-trip${params.size ? `?${params}` : ""}`);
  }

  return (
    <>
    <header className="border-b border-[var(--color-border)]/40 bg-white">
      <div className="flex items-center justify-between gap-4 px-4 pt-3 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface)] md:hidden"
            aria-label="เปิดเมนู"
          >
            <Menu size={18} />
          </button>
          <Link href="/" className="text-xl font-extrabold tracking-[-0.03em] text-[var(--color-primary)] md:hidden">
            PunGuide
          </Link>
        </div>

        <nav className="flex items-center gap-1 sm:gap-6">
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center gap-2 border-b-2 px-1 pb-2.5 pt-1 text-sm font-semibold transition-colors sm:text-base"
                style={{
                  borderColor: isActive ? "var(--color-primary)" : "transparent",
                  color: isActive ? "var(--color-primary)" : "var(--foreground)",
                }}
              >
                <tab.icon size={20} className="shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {backendUser ? (
            <>
              <button
                type="button"
                title="ยังไม่เปิดใช้งานในเดโมนี้"
                className="relative rounded-full p-2 hover:bg-[var(--color-surface)]"
                aria-label="การแจ้งเตือน"
              >
                <Bell size={18} className="text-[var(--color-muted)]" />
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--color-accent-orange)" }}
                />
              </button>
              <button
                type="button"
                onClick={appShell?.openAccount}
                aria-label="บัญชีผู้ใช้"
                className="flex items-center gap-2 rounded-full hover:opacity-80"
              >
                {backendUser.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={backendUser.avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden text-sm font-semibold lg:inline">{name}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={appShell?.openAccount}
              className="rounded-lg px-4 py-2.5 text-sm font-bold text-white sm:px-6"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </div>

      {/* Light gray band behind the search pill, same as the reference's
          header — visually separates it from the white nav row above and
          whatever the page renders below. */}
      <div className="bg-[var(--color-surface)] px-4 pb-6 pt-5 sm:px-6">
        <form
          onSubmit={handleSearch}
          className="mx-auto flex w-full max-w-3xl items-center rounded-full bg-white p-1.5 shadow-[0_4px_24px_rgba(15,36,25,0.12)] ring-1 ring-[var(--color-border)]/40"
        >
          <label className="min-w-0 flex-1 cursor-text px-4 py-1.5 sm:px-6">
            <span className="block text-sm font-bold">ปลายทาง</span>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="ที่ไหนก็ได้"
              className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--color-muted)] focus:outline-none"
            />
          </label>

          <div className="h-9 w-px shrink-0 bg-[var(--color-border)]/60" />

          <label className="min-w-0 flex-1 cursor-text px-4 py-1.5 sm:px-6">
            <span className="block text-sm font-bold">เมื่อไหร่</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--color-muted)] focus:outline-none"
            />
          </label>

          <button
            type="submit"
            aria-label="ค้นหา"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Search size={19} />
          </button>
        </form>
      </div>
    </header>
    </>
  );
}
