"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useAppShell } from "@/components/layout/AppShell";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { CreateTripButton } from "@/components/ui/CreateTripButton";

// Top navbar for the redesigned Home page only — other pages (trip-detail, plan,
// share) still use the shared Sidebar + Topbar via ConsumerShell.
export function HomeNavbar({ children, search }: { children?: ReactNode; search?: ReactNode }) {
  // Opens AppShell's single drawer rather than a second one owned by the page
  // — see the note on AppShellContext.
  const appShell = useAppShell();
  // On phones and iPads — both orientations — the wordmark row collapses away
  // while the
  // reader scrolls down and returns on the first upward scroll. Search and the
  // filter chips stay pinned the whole time; those are what you reach for
  // mid-feed, whereas the wordmark row is mostly identity.
  //
  // Gated in JS as well as CSS on purpose: `inert` and `aria-hidden` below
  // can't come from a Tailwind variant, and leaving them on at desktop widths
  // would pull the menu button out of the tab order while it's still visible.
  // 1024px inclusive, because that's iPad landscape: Tailwind's lg starts at
  // exactly 1024, so gating on lg would have left the larger iPad orientation
  // behaving like a desktop. Hence the 1025px CSS override below rather than
  // lg:.
  const compactLayout = useMediaQuery("(max-width: 1024px)");
  const hidden = useHideOnScroll(appShell?.scrollRef ?? null) && compactLayout;
  const { user: firebaseUser, backendUser } = useAuth();
  const isLoggedIn = Boolean(backendUser);
  const avatarUrl = backendUser?.avatarUrl || firebaseUser?.photoURL || "/images/profile-avatar.jpg";
  const displayName = backendUser?.name || firebaseUser?.displayName || "โปรไฟล์ผู้ใช้";

  return (
    <>
    <div className="sticky top-0 z-30 shrink-0 bg-white shadow-[0_4px_14px_-2px_rgba(15,36,25,0.10)]">
      {/* Same width cap and padding scale as PageContainer/FeedControls, so
          the wordmark, the filter chips, the search field and the cards all
          share one left edge. This row used to be uncapped with lg:px-[7.5vw],
          which put it on a different grid from the feed — three different left
          edges at 1280px, drifting further apart the wider the screen got. */}
      <header
        className={`overflow-hidden border-b border-[#eeeeee] transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none ${
          hidden ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
        } min-[1025px]:max-h-none min-[1025px]:opacity-100`}
        aria-hidden={hidden}
        inert={hidden}
      >
        <div className="mx-auto flex h-14 w-full max-w-[var(--container-feed)] items-center justify-between gap-4 px-7 sm:px-10 md:h-[92px] lg:px-16 xl:px-20">
        <div className="flex shrink-0 items-center gap-2">
          {appShell && (
            <button
              type="button"
              onClick={appShell.openSidebar}
              aria-label="เปิดเมนู"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[var(--color-surface)]"
            >
              <Menu size={20} />
            </button>
          )}
          <Link
            href="/main"
            className="text-[22px] font-extrabold tracking-[-0.045em] text-[var(--color-brand-green)] md:text-[26px]"
          >
            PUNGUIDE
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Hidden wherever MobileBottomNav shows (<=1024px): it already
              carries the create action as its raised centre button, and having
              both put two identical "+" targets on the same screen. */}
          <span className="hidden min-[1025px]:inline-flex">
            <CreateTripButton />
          </span>
          {isLoggedIn ? (
            <button type="button" onClick={appShell?.openAccount} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--color-surface)]">
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
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--color-surface)]"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
        </div>
      </header>
      {/* Inside the sticky wrapper and never collapsed, so the search field is
          reachable at any scroll position. Order is bar -> search -> filters:
          you pick what to look for before narrowing it. */}
      {search}
      {children && (
        <div className="no-scrollbar overflow-x-auto border-b border-[#dbe8e0] bg-[var(--color-surface)]">
          <div className="mx-auto w-full max-w-[var(--container-feed)] py-3 px-7 sm:px-10 lg:px-16 xl:px-20">
            <div className="flex min-w-max items-center gap-2">{children}</div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
