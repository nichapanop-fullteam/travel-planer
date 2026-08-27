"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Briefcase, Home, Plus, User } from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";

type NavKey = "home" | "myTrips" | "saved" | "messages";

// Fixed bottom tab bar for phones and tablets — the pattern that makes a site
// read as an app rather than a page. Five slots, two either side of a raised
// centre create button.
//
// Shown up to 1024px inclusive so it covers iPad in both orientations, which
// is the same boundary HomeNavbar uses to decide whether the top navigation
// collapses on scroll. Keeping the two in step matters: at widths where one
// applied and the other didn't, the layout was neither the app treatment nor
// the desktop one.
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
      // indicator, which otherwise overlaps the labels on notched phones.
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6efe9] bg-white min-[1025px]:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg items-end justify-between px-2 pb-1 pt-2">
        <TabItem item={DESTINATIONS[0]} isActive={resolved === DESTINATIONS[0].key} />
        <TabItem item={DESTINATIONS[1]} isActive={resolved === DESTINATIONS[1].key} />

        {/* Raised centre action, the way a native tab bar promotes its primary
            create flow — it sits between the destinations rather than taking a
            slot from them. */}
        <Link
          href="/create-trip"
          aria-label="สร้างทริป"
          className="group -mt-7 flex shrink-0 items-center justify-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_0_0_6px_rgba(42,158,100,0.10),0_8px_20px_-4px_rgba(42,158,100,0.55)] transition-transform duration-150 group-active:scale-95">
            <Plus size={26} strokeWidth={2.5} />
          </span>
        </Link>

        <TabItem item={DESTINATIONS[2]} isActive={resolved === DESTINATIONS[2].key} />

        {/* Profile opens the account dialog rather than navigating: the
            standalone /account page was removed in favour of that dialog, so
            there's no route to point at. Uses the shell's single instance. */}
        <TabButton
          label="โปรไฟล์"
          icon={User}
          isActive={false}
          onClick={appShell?.openAccount}
          disabled={!appShell}
        />
      </div>
    </nav>
  );
}

const ITEM_CLASS =
  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors";

function labelClass(isActive: boolean) {
  return `max-w-full truncate text-[11px] ${isActive ? "font-bold" : "font-semibold"}`;
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
      aria-current={isActive ? "page" : undefined}
      className={ITEM_CLASS}
      style={{ color: isActive ? "var(--color-primary)" : "var(--color-muted)" }}
    >
      <Icon size={23} strokeWidth={isActive ? 2.4 : 1.9} />
      <span className={labelClass(isActive)}>{item.label}</span>
    </Link>
  );
}

function TabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof Home;
  isActive: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${ITEM_CLASS} disabled:opacity-40`}
      style={{ color: isActive ? "var(--color-primary)" : "var(--color-muted)" }}
    >
      <Icon size={23} strokeWidth={isActive ? 2.4 : 1.9} />
      <span className={labelClass(isActive)}>{label}</span>
    </button>
  );
}
