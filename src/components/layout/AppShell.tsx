"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNavigation } from "@/components/layout/MobileNavigation";

type NavKey = "home" | "myTrips" | "saved" | "messages";

// Lets a page's own header (e.g. /main's HomeNavbar) open the shell's single
// drawer instead of building a second one. Before this, /main rendered its
// own overlay + Sidebar on top of the shell's, so the page carried three
// Sidebar instances — three nav landmarks and three UserAccountDialog state
// trees — with two menu buttons opening two different drawers.
type AppShellContextValue = { openSidebar: () => void };

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
  hideDesktopTopbar = false,
  hideDesktopSidebar = false,
  children,
}: {
  active?: NavKey;
  hideDesktopTopbar?: boolean;
  hideDesktopSidebar?: boolean;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const contextValue = useMemo(() => ({ openSidebar }), [openSidebar]);

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

        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className={hideDesktopTopbar ? "md:hidden" : ""}>
            <Topbar onMenuClick={openSidebar} />
          </div>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
