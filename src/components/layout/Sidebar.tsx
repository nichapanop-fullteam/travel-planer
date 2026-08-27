"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, ChevronDown, Home, MessageSquare, Menu, Briefcase } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { UserAccountDialog } from "@/components/layout/UserAccountDialog";
import { CreateTripButton } from "@/components/ui/CreateTripButton";

type NavKey = "home" | "myTrips" | "saved" | "messages";

// Sidebar nav, restyled to match the "Discover your next journey" reference
// layout — every visible entry now links somewhere real (see app/main,
// app/my-trips, app/saved). "Explore" used to sit between Home and My Trips
// as a dead placeholder: it had no href at all, and /main is itself the
// explore feed (its own heading reads "สำรวจทริปของคุณ"), so the two were
// the same destination under two names. Messages is hidden rather than
// deleted — see navItems below. The previous "Groups Trip"/"ทริปของฉัน"
// list and promo card are gone — the reference sidebar is nav-only, with
// the real trip list living at /my-trips instead.
export function Sidebar({ active, onClose }: { active?: NavKey; onClose?: () => void }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
  const resolvedActive: NavKey | undefined =
    active ??
    (pathname === "/main"
      ? "home"
      : pathname?.startsWith("/my-trips")
        ? "myTrips"
        : pathname?.startsWith("/saved")
          ? "saved"
          : undefined);

  const { backendUser } = useAuth();

  // `hidden` keeps an entry defined but out of the rendered nav — for
  // Messages, which has no backend yet (its "2" badge was always a mock).
  // Drop the flag to bring it back once there's something real behind it.
  const navItems: { key: NavKey; label: string; icon: typeof Home; href?: string; badge?: number; hidden?: boolean }[] = [
    { key: "home", label: "Home", icon: Home, href: "/main" },
    { key: "myTrips", label: "My Trips", icon: Briefcase, href: "/my-trips" },
    { key: "saved", label: "Saved", icon: Bookmark, href: "/saved" },
    { key: "messages", label: "Messages", icon: MessageSquare, badge: 2, hidden: true },
  ];

  return (
    <>
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
        {navItems
          .filter((item) => !item.hidden)
          .map((item) => (
            <NavItem key={item.key} item={item} isActive={resolvedActive === item.key} />
          ))}
      </nav>

      <CreateTripButton variant="block" className="mr-5 mt-7" />

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setAccountOpen(true)}
        className="mr-4 flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/70"
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
          <p className="truncate text-sm font-bold leading-tight">{backendUser?.name || "เข้าสู่ระบบ"}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">
            {backendUser?.username ? `@${backendUser.username}` : "บันทึกและจัดการทริป"}
          </p>
        </div>
        <ChevronDown size={16} className="shrink-0 text-[var(--color-muted)]" />
      </button>
    </aside>
    {accountOpen && <UserAccountDialog onClose={() => setAccountOpen(false)} />}
    </>
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
