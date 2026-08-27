"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { UserAccountDialog } from "@/components/layout/UserAccountDialog";
import { useAppShell } from "@/components/layout/AppShell";
import { CreateTripButton } from "@/components/ui/CreateTripButton";

// Top navbar for the redesigned Home page only — other pages (trip-detail, plan,
// share) still use the shared Sidebar + Topbar via ConsumerShell.
export function HomeNavbar({ children }: { children?: ReactNode }) {
  // Opens AppShell's single drawer rather than a second one owned by the page
  // — see the note on AppShellContext.
  const appShell = useAppShell();
  const { user: firebaseUser, backendUser } = useAuth();
  const isLoggedIn = Boolean(backendUser);
  const avatarUrl = backendUser?.avatarUrl || firebaseUser?.photoURL || "/images/profile-avatar.jpg";
  const displayName = backendUser?.name || firebaseUser?.displayName || "โปรไฟล์ผู้ใช้";
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
    <div className="sticky top-0 z-30 shrink-0 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <header className="flex h-[92px] items-center justify-between gap-4 border-b border-[#eeeeee] px-5 sm:px-10 lg:px-[7.5vw]">
        <div className="flex shrink-0 items-center gap-2">
          {appShell && (
            <button
              type="button"
              onClick={appShell.openSidebar}
              aria-label="เปิดเมนู"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[var(--color-surface)]"
            >
              <Menu size={20} />
            </button>
          )}
          <Link
            href="/main"
            className="text-[22px] font-extrabold tracking-[-0.045em] text-[var(--color-brand-green)] sm:text-[26px]"
          >
            PUNGUIDE
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <CreateTripButton />
          {isLoggedIn ? (
            <button type="button" onClick={() => setAccountOpen(true)} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--color-surface)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={displayName}
                title={displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="hidden text-sm font-semibold sm:block">{displayName}</span>
            </button>
          ) : (
            // Ghost rather than a second solid green block — สร้างทริป is the
            // page's primary action, and two filled buttons side by side left
            // neither of them reading as the one to press.
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--color-surface)]"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </header>
      {children && (
        <div className="overflow-x-auto px-4 py-3 sm:px-8 lg:px-[7.5vw]">
          <div className="flex min-w-max items-center gap-2">{children}</div>
        </div>
      )}
    </div>
    {accountOpen && <UserAccountDialog onClose={() => setAccountOpen(false)} />}
    </>
  );
}
