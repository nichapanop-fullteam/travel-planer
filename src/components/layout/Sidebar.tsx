"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, ChevronDown, Compass, Home, MessageSquare, Menu, Plus, Briefcase } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

type NavKey = "home" | "explore" | "myTrips" | "saved" | "messages";

// Sidebar nav, restyled to match the "Discover your next journey" reference
// layout — "หน้าหลัก" (Home) and "My Trips" link somewhere real (see
// app/main and app/my-trips); Explore/Saved/Messages are still visual
// placeholders (see CONTRIBUTING.md for what's real vs. visual). The
// previous "Groups Trip"/"ทริปของฉัน" list and promo card are gone — the
// reference sidebar is nav-only, with the real trip list living at
// /my-trips instead.
export function Sidebar({ active, onClose }: { active?: NavKey; onClose?: () => void }) {
  const pathname = usePathname();
  const resolvedActive: NavKey | undefined =
    active ??
    (pathname === "/main"
      ? "home"
      : pathname?.startsWith("/my-trips")
        ? "myTrips"
        : undefined);

  const { backendUser } = useAuth();

  const navItems: { key: NavKey; label: string; icon: typeof Home; href?: string; badge?: number }[] = [
    { key: "home", label: "Home", icon: Home, href: "/main" },
    { key: "explore", label: "Explore", icon: Compass },
    { key: "myTrips", label: "My Trips", icon: Briefcase, href: "/my-trips" },
    { key: "saved", label: "Saved", icon: Bookmark },
    { key: "messages", label: "Messages", icon: MessageSquare, badge: 2 },
  ];

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-[#f5faf8] px-4 py-7" style={{ borderColor: "#e2ebe7" }}>
      <div className="mb-8 flex items-center justify-between px-4">
        <span className="text-[34px] font-extrabold tracking-[-0.04em] text-[#17895f]">PunGuide</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
            aria-label="ปิดเมนู"
          >
            <Menu size={18} />
          </button>
        )}
      </div>

      <nav className="mr-4 flex flex-col gap-5">
        {navItems.map((item) => (
          <NavItem key={item.key} item={item} isActive={resolvedActive === item.key} />
        ))}
      </nav>

      <Link
        href="/create-trip"
        className="mr-5 mt-7 flex items-center justify-center gap-3 rounded-xl py-4 text-base font-semibold text-white"
        style={{ backgroundColor: "#17895f" }}
      >
        <Plus size={16} />
        Create trip
      </Link>

      <div className="flex-1" />

      <Link
        href="/account"
        className="mr-4 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/70"
      >
        {backendUser?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backendUser.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {(backendUser?.name || "ผู้ใช้ PunGuide").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">{backendUser?.name || "Emily Chen"}</p>
          {backendUser?.username && (
            <p className="truncate text-xs text-[var(--color-muted)]">@{backendUser.username}</p>
          )}
        </div>
        <ChevronDown size={16} className="shrink-0 text-[var(--color-muted)]" />
      </Link>
    </aside>
  );
}

function NavItem({
  item,
  isActive,
}: {
  item: { label: string; icon: typeof Home; href?: string; badge?: number };
  isActive?: boolean;
}) {
  const Icon = item.icon;
  const className = `flex min-h-12 items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
    isActive
      ? "bg-[#dceee6] text-[#167b59]"
      : "text-[#18201d] hover:bg-[#eaf3ef]"
  }`;

  const content = (
    <>
      <Icon size={21} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge != null && (
        <span
          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
          style={{ backgroundColor: "var(--color-accent-orange)" }}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  if (!item.href) {
    return (
      <span className={className} title="ยังไม่เปิดใช้งานในเดโมนี้">
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}
