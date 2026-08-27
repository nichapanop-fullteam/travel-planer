"use client";

import { useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

type NavKey = "home" | "myTrips" | "saved" | "messages";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Off-canvas Sidebar drawer, opened from a page's menu button via AppShell.
// Stays mounted while closed so the slide-in/out transition can run, which
// is why the closed state needs `inert` rather than just `aria-hidden`:
// opacity-0 + pointer-events-none still leave every link in the tab order,
// so keyboard users used to tab straight into an invisible off-screen menu
// (and into an aria-hidden subtree, which is its own violation). `inert`
// takes the whole subtree out of both the tab order and the a11y tree while
// leaving it animatable.
//
// `allWidths` is for pages that hide the persistent desktop sidebar
// (AppShell's hideDesktopSidebar — /main, /my-trips): there the drawer is the
// only route back into the nav, so it has to work at every width instead of
// being capped at md like the plain mobile case.
export function MobileNavigation({
  open,
  onClose,
  active,
  allWidths = false,
}: {
  open: boolean;
  onClose: () => void;
  active?: NavKey;
  allWidths?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Where focus was before opening, so it can be handed back on close —
  // otherwise closing the drawer drops focus to the top of the document.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Focus the first control in the panel so the drawer is immediately
    // keyboard-operable and screen readers announce where they are.
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // Cycle focus within the panel — a modal drawer shouldn't let Tab walk
      // out into the page behind it.
      const focusables = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex ${allWidths ? "" : "md:hidden"} ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="เมนูนำทาง"
        className={`relative z-10 transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar active={active} onClose={onClose} />
      </div>
    </div>
  );
}
