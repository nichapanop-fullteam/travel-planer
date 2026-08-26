"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNavigation } from "@/components/layout/MobileNavigation";

type NavKey = "home" | "explore" | "myTrips" | "saved" | "messages";

// The one shared application shell for every signed-in-consumer-facing route
// (/main, /my-trips, /trip-detail/[id], /account) — desktop sidebar, mobile
// off-canvas drawer via MobileNavigation, and the Topbar (search/notif/
// avatar) on top of page content. Renamed from ConsumerShell as part of the
// /main, /my-trips, /trip-detail design-system unification — same behavior,
// just a name/location that reflects it's the app-wide shell now, not a
// "consumer"-only pattern.
export function AppShell({
  active,
  hideDesktopTopbar = false,
  children,
}: {
  active?: NavKey;
  hideDesktopTopbar?: boolean;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--color-surface)]">
      {/* Persistent on desktop (md+); on mobile/tablet it's the off-canvas
          MobileNavigation drawer opened via Topbar's menu button. */}
      <div className="hidden md:flex">
        <Sidebar active={active} />
      </div>

      <MobileNavigation open={sidebarOpen} onClose={() => setSidebarOpen(false)} active={active} />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className={hideDesktopTopbar ? "md:hidden" : ""}>
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
