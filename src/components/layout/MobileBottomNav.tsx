"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Briefcase, Home, Plus, User } from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";

type NavKey = "home" | "myTrips" | "saved" | "messages";

// Fixed bottom tab bar for phones and tablets — the pattern that makes a site
// read as an app rather than a page.
//
// Icon-only, following the reference design: at five slots the labels were
// doing little work (the icons are the conventional ones) while costing a
// whole line of bar height. Every control still carries an aria-label, so
// dropping the visible text doesn't cost screen-reader users anything.
//
// Shown up to 1024px inclusive so it covers iPad in both orientations, the
// same boundary HomeNavbar uses for its compact treatment. Keeping the two in
// step matters: at widths where one applied and the other didn't, the layout
// was neither the app treatment nor the desktop one.
const DESTINATIONS: { key: NavKey; label: string; icon: typeof Home; href: string }[] = [
  { key: "home", label: "หน้าแรก", icon: Home, href: "/main" },
  // The reference design has "Discover" in this slot. There's no separate
  // discover destination in this app — /main *is* the discovery feed (its own
  // heading reads "สำรวจทริป"), so a Discover tab would either duplicate Home
  // or, worse, be another dead placeholder like the "Explore" sidebar item
  // that got removed for exactly that reason. My Trips is a real page that
  // earns the slot.
  { key: "myTrips", label: "ทริปของฉัน", icon: Briefcase, href: "/my-trips" },
  { key: "saved", label: "บันทึกไว้", icon: Bookmark, href: "/saved" },
];

export function MobileBottomNav({ active }: { active?: NavKey }) {
  const pathname = usePathname();
  const appShell = useAppShell();

  // Falls back to the URL so a page that forgets to pass `active` still
  // highlights correctly.
  const resolved: NavKey | undefined =
    active ??
    (pathname === "/main"
      ? "home"
      : pathname?.startsWith("/my-trips")
        ? "myTrips"
        : pathname?.startsWith("/saved")
          ? "saved"
          : undefined);

  return (
    <nav
      aria-label="เมนูหลัก"
      // env(safe-area-inset-bottom) keeps the row clear of the iOS home
      // indicator, which otherwise overlaps the row on notched phones.
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6efe9] bg-white min-[1025px]:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between px-3 py-1">
        <TabItem item={DESTINATIONS[0]} isActive={resolved === DESTINATIONS[0].key} />
        <TabItem item={DESTINATIONS[1]} isActive={resolved === DESTINATIONS[1].key} />

        {/* Sits in the row rather than raised above it, matching the reference:
            a squircle rather than a circle, so it reads as the primary action
            without breaking the bar's line. */}
        <Link
          href="/create-trip"
          aria-label="สร้างทริป"
          className="group flex h-11 flex-1 items-center justify-center"
        >
          <span className="flex h-9 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-[0_4px_12px_-3px_rgba(42,158,100,0.55)] transition-transform duration-150 group-active:scale-95">
            <Plus size={22} strokeWidth={2.6} />
          </span>
        </Link>

        <TabItem item={DESTINATIONS[2]} isActive={resolved === DESTINATIONS[2].key} />

        {/* Profile opens the account dialog rather than navigating: the
            standalone /account page was removed in favour of that dialog, so
            there's no route to point at. Uses the shell's single instance. */}
        <TabButton label="โปรไฟล์" icon={User} onClick={appShell?.openAccount} disabled={!appShell} />
      </div>
    </nav>
  );
}

// h-11 keeps every target at 44px — the minimum both Apple's and Google's
// guidelines ask for — even though the icon itself is only 24px.
const ITEM_CLASS = "flex h-11 flex-1 items-center justify-center rounded-xl transition-colors";

// The active tab is drawn solid rather than outlined, which is how the
// reference separates it. Colour alone would be the only signal otherwise, and
// aria-current already covers the non-visual half of that.
function iconProps(isActive: boolean) {
  return {
    size: 24,
    strokeWidth: isActive ? 2 : 1.8,
    fill: isActive ? "currentColor" : "none",
  } as const;
}

function TabItem({
  item,
  isActive,
}: {
  item: { label: string; icon: typeof Home; href: string };
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      className={ITEM_CLASS}
      style={{ color: isActive ? "var(--color-primary)" : "var(--color-muted)" }}
    >
      <Icon {...iconProps(isActive)} />
    </Link>
  );
}

function TabButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof Home;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`${ITEM_CLASS} disabled:opacity-40`}
      style={{ color: "var(--color-muted)" }}
    >
      <Icon {...iconProps(false)} />
    </button>
  );
}
