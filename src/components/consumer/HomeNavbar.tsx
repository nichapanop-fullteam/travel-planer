import Link from "next/link";
import { Bookmark } from "lucide-react";

// Top navbar for the redesigned Home page only — other pages (trip-detail, plan,
// share) still use the shared Sidebar + Topbar via ConsumerShell.
const NAV_ITEMS = [
  { key: "home", label: "Home", href: "/main" },
  { key: "discovery", label: "Discovery", href: "#" },
  { key: "my-trip", label: "My Trip", href: "#" },
  { key: "from-creators", label: "From Creators", href: "#" },
] as const;

export function HomeNavbar() {
  return (
    <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-4 rounded-2xl bg-white/70 px-6 py-3 shadow-sm backdrop-blur-md sm:inset-x-8 sm:top-6 sm:px-8">
      <div className="flex items-center gap-1">
        <span className="text-xl font-extrabold text-[var(--foreground)]">Pluno Guid</span>
        <span className="text-xl font-extrabold" style={{ color: "var(--color-accent-orange)" }}>
          e
        </span>
      </div>

      <nav className="hidden items-center gap-8 md:flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`text-sm font-medium transition-colors ${
              item.key === "home"
                ? "border-b-2 pb-1 font-semibold"
                : "text-[var(--color-muted)] hover:text-[var(--foreground)]"
            }`}
            style={
              item.key === "home"
                ? { color: "var(--color-primary)", borderColor: "var(--color-primary)" }
                : undefined
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label="รายการที่บันทึกไว้"
        >
          <Bookmark size={16} className="text-[var(--foreground)]" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=80&q=80"
          alt="โปรไฟล์ผู้ใช้"
          className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
        />
      </div>
    </div>
  );
}
