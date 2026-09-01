"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { UserAccountDialog } from "@/components/layout/UserAccountDialog";

type NavKey = "home" | "myTrips" | "saved" | "messages";

// Lets a page's own header (e.g. /main's HomeNavbar) open the shell's single
// drawer instead of building a second one. Before this, /main rendered its
// own overlay + Sidebar on top of the shell's, so the page carried three
// Sidebar instances — three nav landmarks and three UserAccountDialog state
// trees — with two menu buttons opening two different drawers.
//
// `scrollRef` points at the element that actually scrolls — the inner
// overflow-y-auto div, not the window. Headers need it to react to scrolling
// (see useHideOnScroll); window scroll events never fire for this layout.
//
// `openAccount` exists for the same reason as `openSidebar`: the account
// dialog was being mounted separately by Sidebar, Topbar, HomeNavbar and
// /my-trips — four independent copies with four independent open states, all
// inside one shell. One instance lives here now and everyone opens that.
type AppShellContextValue = {
  openSidebar: () => void;
  openAccount: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

// Returns null outside an AppShell, so a header component can render its menu
// button conditionally rather than crashing.
export function useAppShell(): AppShellContextValue | null {
  return useContext(AppShellContext);
}

// The one shared application shell for every signed-in-consumer-facing route
// (/main, /my-trips, /trip-detail/[id]) — desktop sidebar, off-canvas drawer
// via MobileNavigation, and the Topbar (search/notif/avatar) on top of page
// content. Renamed from ConsumerShell as part of the /main, /my-trips,
// /trip-detail design-system unification — same behavior, just a name/location
// that reflects it's the app-wide shell now, not a "consumer"-only pattern.
export function AppShell({
  active,
  hideTopbar = false,
  hideDesktopSidebar = false,
  children,
}: {
  active?: NavKey;
  /** For pages that ship their own header (/main's HomeNavbar, /my-trips's).
   *  Was `hideDesktopTopbar`, which only applied `md:hidden` — so the shared
   *  Topbar still rendered below md, *underneath* the page's own header. On
   *  mobile that stacked two logos, two menu buttons (opening the same drawer),
   *  two avatars and two different search fields before any content. Both call
   *  sites always wanted it gone outright. */
  hideTopbar?: boolean;
  hideDesktopSidebar?: boolean;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [accountOpen, setAccountOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const openAccount = useCallback(() => setAccountOpen(true), []);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contextValue = useMemo(
    () => ({ openSidebar, openAccount, scrollRef }),
    [openSidebar, openAccount]
  );

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="flex h-screen bg-[var(--color-surface)]">
        {/* Persistent on desktop (md+); on mobile/tablet it's the off-canvas
            MobileNavigation drawer opened via the menu button. Skipped
            entirely (not just visually hidden) when the page opts out, so the
            page doesn't pay for a Sidebar it never shows. */}
        {!hideDesktopSidebar && (
          <div className="hidden md:flex">
            <Sidebar active={active} />
          </div>
        )}

        {/* When the desktop sidebar is hidden, the drawer is the only way back
            into the nav, so it must work at every width — not just below md. */}
        <MobileNavigation
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          active={active}
          allWidths={hideDesktopSidebar}
        />

        <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
          {!hideTopbar && <Topbar onMenuClick={openSidebar} />}
          {/* Clears the fixed MobileBottomNav at exactly the widths it shows
              (<=1024px) — without it the last row of cards scrolls underneath
              the tab bar and can't be reached. The safe-area term matters on a
              notched phone: the bar grows by the home-indicator inset there, so
              a flat 4rem left the last card partly behind it. */}
          <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] min-[1025px]:pb-0">
            {children}
          </main>
        </div>

        <MobileBottomNav active={active} />

        {accountOpen && <UserAccountDialog onClose={() => setAccountOpen(false)} />}
      </div>
    </AppShellContext.Provider>
  );
}
