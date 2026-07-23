import Link from "next/link";
import { Home, Plus, Users } from "lucide-react";

type NavKey = "home";

// Groups are a friend-group nickname for a trip, distinct from the trip's own title —
// hence the separate name here rather than reusing FeedTrip.title.
const SIDEBAR_GROUPS = [{ tripId: "feed-luangprabang-3d", name: "ไปหลวงพระบางกันจ้า" }];

// Sidebar nav — only "หน้าหลัก" (Home) links anywhere real right now; "New Trip" and
// "Create Group" are visual placeholders (see CONTRIBUTING.md for what's real vs. visual).
// Groups list links to real trip-detail pages, so those are fully wired.
export function Sidebar({ active, activeGroupId }: { active?: NavKey; activeGroupId?: string }) {
  const groups = SIDEBAR_GROUPS;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[var(--color-border)]/40 bg-white p-4">
      <div className="mb-5 flex items-center gap-1 px-2">
        <span className="text-2xl font-extrabold text-[var(--color-primary)]">pluno</span>
        <span className="text-2xl font-extrabold text-[var(--color-accent-orange)]">+</span>
      </div>

      <button
        className="mb-5 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <Plus size={16} />
        New Trip
      </button>

      <nav className="flex flex-col gap-1">
        <NavItem
          item={{ key: "home", label: "หน้าหลัก", icon: Home, href: "/main" }}
          isActive={active === "home"}
        />
      </nav>

      <div className="mt-6 flex flex-1 flex-col overflow-hidden">
        <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
          Groups
        </p>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {groups.map((group) => (
            <Link
              key={group.tripId}
              href={`/trip-detail/${group.tripId}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                activeGroupId === group.tripId
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
              }`}
            >
              <Users size={16} className="shrink-0" />
              <span className="truncate">{group.name}</span>
            </Link>
          ))}
          <span
            className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-muted)] opacity-70"
            title="ยังไม่เปิดใช้งานในเดโมนี้"
          >
            <Plus size={16} className="shrink-0" />
            Create Group
          </span>
        </div>
      </div>

      <PromoCard />
    </aside>
  );
}

function NavItem({
  item,
  isActive,
}: {
  item: { key: NavKey; label: string; icon: typeof Home; href: string };
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          : "text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
      }`}
    >
      <Icon size={18} />
      {item.label}
    </Link>
  );
}

function PromoCard() {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-4 text-center">
      <svg width="88" height="56" viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="80" height="40" rx="6" fill="white" />
        <path d="M10 34 L28 20 L40 30 L54 16 L78 34" stroke="var(--color-primary)" strokeWidth="2" fill="none" />
        <circle cx="28" cy="20" r="4" fill="var(--color-accent-orange)" />
        <circle cx="54" cy="16" r="4" fill="var(--color-primary)" />
        <circle cx="22" cy="44" r="6" fill="var(--color-primary)" />
        <circle cx="38" cy="44" r="6" fill="var(--color-accent-orange)" />
        <circle cx="54" cy="44" r="6" fill="var(--color-primary)" />
      </svg>
      <div>
        <p className="text-sm font-bold">Plan together, travel better.</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          แชร์แผนเที่ยว บันทึกสถานที่ และทำให้ทุกคนเข้าใจแผนตรงกัน
        </p>
      </div>
    </div>
  );
}
