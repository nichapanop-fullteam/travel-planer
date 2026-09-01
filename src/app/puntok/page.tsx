"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, ChevronLeft, Menu, Search, Shuffle } from "lucide-react";
import { AppShell, useAppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/common/Logo";
import { PuntokFeed } from "@/components/consumer/PuntokFeed";
import { useAuth } from "@/providers/AuthProvider";
import { puntokClips, type PuntokClip } from "@/lib/puntok-content";

// Puntok — the short-clip feed behind the bottom bar's third tab, and until
// now the one tab in that bar with nothing behind it.
//
// A UI prototype: the posts are the mock rows in lib/puntok-content.ts playing
// the clips already in public/videos, and none of the feed's controls reach a
// backend. What is real is the shape — the snap feed, the two tabs, the action
// rail and the desktop stage all behave, so the screen can be judged by using
// it rather than by looking at it.
//
// hideTopbar/hideDesktopSidebar for the same reason /main and /my-trips pass
// them: the page brings its own header, and the drawer behind the menu button
// is the whole nav at every width.
export default function PuntokPage() {
  // The feed's order lives here rather than in PuntokFeed because the header's
  // shuffle button is what changes it, and the two are siblings.
  const [clips, setClips] = useState<PuntokClip[]>(puntokClips);

  const shuffle = useCallback(() => {
    setClips((current) => {
      const next = [...current];
      // Fisher-Yates. `sort(() => Math.random() - 0.5)` is the usual one-liner
      // and is not a shuffle — it leaves the first rows where they were often
      // enough to be visible on a six-post feed.
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }, []);

  return (
    <AppShell active="puntok" hideTopbar hideDesktopSidebar>
      {/* The page has to end exactly at the bottom of the shell's viewport —
          the feed scrolls inside itself, and anything taller hands the scroll
          to the shell instead, which snaps nothing and hides the bottom bar.
          Spelled out in dvh rather than h-full because the shell's <main> is a
          flex item with no height of its own to take a percentage of: h-full
          there resolves to auto, every section falls back to its content
          height, and the feed becomes one long 4000px page.
          The 4rem + safe-area term is the padding <main> already reserves for
          MobileBottomNav (see AppShell), which is gone from 1025px up. */}
      <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col overflow-hidden min-[1025px]:h-[100dvh]">
        <PuntokHeader onShuffle={shuffle} />
        {/* min-h-0 is what lets this shrink to the space the header leaves —
            a flex child's default min-height is its content, which for a
            full-height feed is the whole viewport again. */}
        <div className="min-h-0 flex-1">
          <PuntokFeed clips={clips} />
        </div>
      </div>
    </AppShell>
  );
}

// Desktop only. Below 1025px the design gives the clip the entire screen —
// the feed's own tabs and the bottom bar are the only chrome there — so a
// header would be taking a row away from the one thing the page is for.
function PuntokHeader({ onShuffle }: { onShuffle: () => void }) {
  const router = useRouter();
  const appShell = useAppShell();
  const { user: firebaseUser, backendUser } = useAuth();
  const [query, setQuery] = useState("");

  const avatarUrl = backendUser?.avatarUrl || firebaseUser?.photoURL || null;
  const displayName = backendUser?.name || firebaseUser?.displayName || "โปรไฟล์ผู้ใช้";
  const accountLabel = backendUser ? `บัญชีของ ${displayName}` : "เข้าสู่ระบบ";

  const iconButton =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-[var(--shadow-sm)] transition hover:bg-white/80";

  // Nothing to search yet — the feed is six fixed posts — so the field carries
  // the design's shape and says so, rather than filtering a list of six or
  // silently doing nothing on Enter.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="relative z-30 hidden shrink-0 bg-[var(--color-surface)] px-6 pb-3 pt-3 min-[1025px]:block">
      <div className="mx-auto w-full max-w-3xl">
        <div className="relative flex min-h-9 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="ย้อนกลับ"
              className={iconButton}
              style={{ color: "var(--foreground)" }}
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => appShell?.openSidebar()}
              aria-label="เมนู"
              className={iconButton}
              style={{ color: "var(--color-brand-green)" }}
            >
              <Menu size={17} strokeWidth={2.5} />
            </button>
          </div>

          <Logo className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl text-[var(--foreground)]" />

          <div className="flex items-center gap-2">
            {/* No notifications surface exists, so the bell is drawn and
                disabled rather than pointed at a page that isn't there — the
                same call MobileBottomNav made for this tab until now. */}
            <button
              type="button"
              disabled
              aria-label="การแจ้งเตือน (ยังไม่เปิดใช้งาน)"
              className={`${iconButton} opacity-45`}
              style={{ color: "var(--foreground)" }}
            >
              <Bell size={17} strokeWidth={2.3} />
            </button>
            <button
              type="button"
              onClick={appShell?.openAccount}
              aria-label={accountLabel}
              className="shrink-0 rounded-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl || "/images/profile-avatar.jpg"}
                alt=""
                className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-[var(--shadow-sm)]"
              />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <form onSubmit={handleSubmit} role="search" className="min-w-0 flex-1">
            <div className="flex items-center gap-2 rounded-full bg-white p-1 pl-3.5 shadow-[var(--shadow-sm)] transition focus-within:ring-2 focus-within:ring-[var(--color-primary)]/35">
              <Search
                size={16}
                strokeWidth={2.4}
                className="shrink-0 text-[var(--color-muted)]"
                aria-hidden
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหา"
                aria-label="ค้นหาทริปหรือครีเอเตอร์"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted)]"
              />
              <button
                type="submit"
                aria-label="ค้นหา"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white transition hover:bg-[#2b2b2b]"
              >
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </form>

          {/* The lime square from the design. Reshuffles the running order,
              which is the one thing a "surprise me" control can honestly do
              over a fixed set of posts. */}
          <button
            type="button"
            onClick={onShuffle}
            aria-label="สุ่มลำดับคลิป"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-lime)] text-[var(--foreground)] shadow-[var(--shadow-sm)] transition hover:brightness-95 active:scale-95"
          >
            <Shuffle size={17} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </header>
  );
}
