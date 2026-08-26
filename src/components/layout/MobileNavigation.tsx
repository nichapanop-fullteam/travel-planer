"use client";

import { Sidebar } from "@/components/layout/Sidebar";

// Off-canvas drawer version of Sidebar for mobile/tablet (<md), extracted out
// of AppShell so the responsive nav pattern has its own name per the
// design-system refactor (previously inlined directly in AppShell/
// ConsumerShell). Same backdrop+slide-in transition already proven out on
// /my-trips and /trip-detail.
export function MobileNavigation({
  open,
  onClose,
  active,
}: {
  open: boolean;
  onClose: () => void;
  active?: "home" | "explore" | "myTrips" | "saved" | "messages";
}) {
  return (
    <div className={`fixed inset-0 z-50 flex md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`relative z-10 transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar active={active} onClose={onClose} />
      </div>
    </div>
  );
}
