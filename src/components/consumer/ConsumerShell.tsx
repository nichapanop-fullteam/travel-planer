"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/consumer/Sidebar";
import { Topbar } from "@/components/consumer/Topbar";

type NavKey = "home" | "my-trips" | "account";

export function ConsumerShell({
  active,
  activeGroupId,
  children,
}: {
  active?: NavKey;
  activeGroupId?: string;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--color-surface)]">
      {/* Persistent on desktop (md+); on mobile/tablet it's an off-canvas
          drawer opened via Topbar's menu button, matching the overlay
          pattern already used on generated-plan/[id]. */}
      <div className="hidden md:flex">
        <Sidebar active={active} activeGroupId={activeGroupId} />
      </div>

      <div
        className={`fixed inset-0 z-50 flex md:hidden ${sidebarOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!sidebarOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
            sidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={`relative z-10 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar active={active} activeGroupId={activeGroupId} onClose={() => setSidebarOpen(false)} />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
