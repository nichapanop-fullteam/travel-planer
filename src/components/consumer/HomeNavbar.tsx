"use client";

import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useAppShell } from "@/components/layout/AppShell";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { CreateTripButton } from "@/components/ui/CreateTripButton";

// Top navbar for the redesigned Home page only — other pages (trip-detail, plan,
// share) still use the shared Sidebar + Topbar via ConsumerShell.
export function HomeNavbar({ children, search }: { children?: ReactNode; search?: ReactNode }) {
  // Opens AppShell's single drawer rather than a second one owned by the page
  // — see the note on AppShellContext.
  const appShell = useAppShell();
  // 1024px inclusive, because that's iPad landscape: Tailwind's lg starts at
  // exactly 1024, so gating on lg would treat the larger iPad orientation as a
  // desktop. Hence the 1025px CSS overrides below rather than lg:.
  //
  // Needed in JS and not just CSS because `aria-hidden` on the collapsed
  // search can't come from a Tailwind variant, and leaving it set at desktop
  // widths would hide a visible field from screen readers.
  const compactLayout = useMediaQuery("(max-width: 1024px)");
  const { user: firebaseUser, backendUser } = useAuth();
  const isLoggedIn = Boolean(backendUser);
  const avatarUrl = backendUser?.avatarUrl || firebaseUser?.photoURL || "/images/profile-avatar.jpg";
  const displayName = backendUser?.name || firebaseUser?.displayName || "โปรไฟล์ผู้ใช้";

  // On phones and tablets the search field is collapsed behind an icon in the
  // app bar: a permanently expanded field cost a whole row of a small screen,
  // while the thing people actually arrive to do is browse the feed. Desktop
  // is wide enough to just show it, so this state only gates the compact
  // layout — the CSS override below keeps the field open from 1025px up
  // regardless of what this says.
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  // Opening from an icon should land the caret in the field; otherwise the tap
  // reveals an input and then asks for a second tap to use it.
  useEffect(() => {
    if (!searchOpen) return;
    searchWrapRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [searchOpen]);

  return (
    <>
    <div className="sticky top-0 z-30 shrink-0 bg-white shadow-[0_4px_14px_-2px_rgba(15,36,25,0.10)]">
      {/* Same width cap and padding scale as PageContainer/FeedControls, so
          the wordmark, the filter chips, the search field and the cards all
          share one left edge. This row used to be uncapped with lg:px-[7.5vw],
          which put it on a different grid from the feed — three different left
          edges at 1280px, drifting further apart the wider the screen got. */}
      {/* Always on screen. This row used to collapse while scrolling down, but
          it's the app bar: it holds the wordmark and — on compact layouts — the
          only route into search, so taking it away mid-feed cost more than the
          height it returned. */}
      <header className="border-b border-[#eeeeee]">
        <div className="mx-auto flex h-14 w-full max-w-[var(--container-feed)] items-center justify-between gap-4 px-4 sm:px-6 md:h-[92px] lg:px-10 xl:px-14">
        <div className="flex shrink-0 items-center gap-2">
          {appShell && (
            <button
              type="button"
              onClick={appShell.openSidebar}
              aria-label="เปิดเมนู"
              // Desktop only. Below 1025px MobileBottomNav already reaches
              // every destination the drawer holds (Home, My Trips, Saved,
              // create, profile — Messages is hidden either way), so the
              // hamburger was a second route to the same places.
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[var(--color-surface)] min-[1025px]:flex"
            >
              <Menu size={20} />
            </button>
          )}
          <Link
            href="/main"
            className="text-[19px] font-extrabold tracking-[-0.045em] text-[var(--color-brand-green)] min-[1025px]:text-[26px]"
          >
            PUNGUIDE
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {/* The compact-layout entry point to search. Desktop shows the field
              itself, so this button would be a duplicate control there. */}
          {search && (
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? "ปิดการค้นหา" : "ค้นหาทริป"}
              aria-expanded={searchOpen}
              aria-controls="home-search"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[var(--color-surface)] min-[1025px]:hidden"
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
          )}
          {/* Hidden wherever MobileBottomNav shows (<=1024px): it already
              carries the create action as its raised centre button, and having
              both put two identical "+" targets on the same screen. */}
          <span className="hidden min-[1025px]:inline-flex">
            <CreateTripButton />
          </span>
          {/* Also desktop only: the bottom bar's โปรไฟล์ tab opens the same
              account dialog, and two entry points to it on one small screen is
              one too many. */}
          {isLoggedIn ? (
            <button type="button" onClick={appShell?.openAccount} className="hidden items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--color-surface)] min-[1025px]:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={displayName}
                title={displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="hidden text-sm font-semibold sm:block">{displayName}</span>
            </button>
          ) : (
            // Ghost rather than a second solid green block — สร้างทริป is the
            // page's primary action, and two filled buttons side by side left
            // neither of them reading as the one to press.
            <button
              type="button"
              onClick={appShell?.openAccount}
              className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--color-surface)] min-[1025px]:block"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
        </div>
      </header>
      {/* Inside the sticky wrapper so the field stays put once open. Collapsed
          by default below 1025px and toggled from the app-bar icon;
          min-[1025px]:max-h-none forces it open on desktop no matter what
          `searchOpen` holds, so a stale mobile state can never hide it there. */}
      {search && (
        <div
          id="home-search"
          ref={searchWrapRef}
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none ${
            searchOpen ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
          } min-[1025px]:max-h-none min-[1025px]:opacity-100`}
          aria-hidden={!searchOpen && compactLayout}
        >
          {search}
        </div>
      )}
      {children && (
        <div className="no-scrollbar overflow-x-auto border-b border-[#dbe8e0] bg-[var(--color-surface)]">
          <div className="mx-auto w-full max-w-[var(--container-feed)] py-3 px-4 sm:px-6 lg:px-10 xl:px-14">
            <div className="flex min-w-max items-center gap-2">{children}</div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
