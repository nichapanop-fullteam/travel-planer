"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Logo } from "@/components/common/Logo";

// Top navbar for the redesigned Home page only — other pages (trip-detail, plan,
// share) still use the shared Sidebar + Topbar via ConsumerShell.
const NAV_ITEMS = [
  { key: "home", label: "Home", href: "/main" },
  { key: "discovery", label: "Discovery", href: "#" },
  { key: "my-trip", label: "My Trip", href: "#" },
  { key: "from-creators", label: "From Creators", href: "#" },
] as const;

export function HomeNavbar() {
  const { user: firebaseUser, backendUser } = useAuth();
  const isLoggedIn = Boolean(backendUser);
  const avatarUrl = backendUser?.avatarUrl || firebaseUser?.photoURL || "/images/profile-avatar.jpg";
  const displayName = backendUser?.name || firebaseUser?.displayName || "โปรไฟล์ผู้ใช้";

  return (
    <div
      className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-4 bg-white/50 px-6 py-3 shadow-sm backdrop-blur-md sm:inset-x-8 sm:top-6 sm:px-8"
      style={{ borderRadius: "100px" }}
    >
      <Logo className="shrink-0 text-lg" />

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
        {isLoggedIn ? (
          <Link href="/my-trips">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={displayName}
              title={displayName}
              className="h-9 w-9 rounded-full object-cover"
            />
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </div>
  );
}
