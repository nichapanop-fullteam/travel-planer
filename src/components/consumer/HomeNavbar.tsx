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
    <div
      className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-4 bg-white/50 px-6 py-3 shadow-sm backdrop-blur-md sm:inset-x-8 sm:top-6 sm:px-8"
      style={{ borderRadius: "100px" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/brand-logo.svg" alt="Pluno Guide" className="h-5 w-auto shrink-0" />

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
                ? { color: "var(--color-brand-green)", borderColor: "var(--color-brand-green)" }
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
          src="/images/profile-avatar.jpg"
          alt="โปรไฟล์ผู้ใช้"
          className="h-9 w-9 rounded-full object-cover"
        />
      </div>
    </div>
  );
}
