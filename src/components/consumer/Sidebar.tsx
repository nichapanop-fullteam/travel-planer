import Link from "next/link";
import {
  Bookmark,
  Home,
  MapIcon,
  MessageCircle,
  Plus,
  Search,
  Settings,
  User,
  Users,
} from "lucide-react";

type NavKey = "home" | "search" | "trips" | "saved" | "community" | "messages";

const MAIN_NAV: { key: NavKey; label: string; icon: typeof Home; href?: string }[] = [
  { key: "home", label: "หน้าหลัก", icon: Home, href: "/dashboard" },
  { key: "search", label: "ค้นหา", icon: Search },
  { key: "trips", label: "ทริป", icon: MapIcon },
  { key: "saved", label: "บุ๊คมาร์ก", icon: Bookmark },
  { key: "community", label: "คอมมูนิตี้", icon: Users },
  { key: "messages", label: "ข้อความ", icon: MessageCircle },
];

// Sidebar nav — only "หน้าหลัก" (Home) is wired up this round; the rest are
// placeholders for the demo (see CONTRIBUTING.md for what's real vs. visual).
export function Sidebar({ active }: { active?: NavKey }) {
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-[var(--color-border)]/40 bg-white p-4">
      <div className="mb-6 flex items-center gap-1 px-2">
        <span className="text-xl font-extrabold text-[var(--color-primary)]">pluno</span>
        <span className="text-xl font-extrabold text-[var(--color-accent-orange)]">+</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {MAIN_NAV.map((item) => (
          <NavItem key={item.key} item={item} isActive={active === item.key} />
        ))}

        <div className="my-3 border-t border-[var(--color-border)]/30" />

        <NavItem item={{ key: "profile" as NavKey, label: "โปรไฟล์", icon: User }} isActive={false} />
        <NavItem item={{ key: "settings" as NavKey, label: "ตั้งค่า", icon: Settings }} isActive={false} />
      </nav>

      <button
        className="mt-4 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <Plus size={16} />
        สร้างทริป
      </button>
    </aside>
  );
}

function NavItem({
  item,
  isActive,
}: {
  item: { key: NavKey; label: string; icon: typeof Home; href?: string };
  isActive: boolean;
}) {
  const Icon = item.icon;
  const className = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
      : "text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
  }`;

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        <Icon size={18} />
        {item.label}
      </Link>
    );
  }

  return (
    <span className={`${className} cursor-default opacity-70`} title="ยังไม่เปิดใช้งานในเดโมนี้">
      <Icon size={18} />
      {item.label}
    </span>
  );
}
