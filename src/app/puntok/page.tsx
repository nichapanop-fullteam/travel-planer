"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  Menu,
  Search,
  Shuffle,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell, useAppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/common/Logo";
import { PuntokFeed, type PuntokTab } from "@/components/consumer/PuntokFeed";
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
  // Both live here rather than in PuntokFeed because the header owns the
  // controls that change them — the filter menu switches the tab, the same
  // menu reshuffles the order — and the header is the feed's sibling.
  const [tab, setTab] = useState<PuntokTab>("forYou");
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
      <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col overflow-hidden bg-black min-[1025px]:h-[100dvh] min-[1025px]:bg-white">
        <PuntokHeader tab={tab} onTabChange={setTab} onShuffle={shuffle} />
        {/* min-h-0 is what lets this shrink to the space the header leaves —
            a flex child's default min-height is its content, which for a
            full-height feed is the whole viewport again. */}
        <div className="min-h-0 flex-1">
          <PuntokFeed clips={clips} tab={tab} onTabChange={setTab} />
        </div>
      </div>
    </AppShell>
  );
}

// Desktop only. Below 1025px the design gives the clip the entire screen —
// the feed's own tabs and the bottom bar are the only chrome there — so a
// header would be taking a row away from the one thing the page is for.
//
// Two rows: a black bar carrying the nav and the wordmark, rounded off at the
// bottom so it reads as a panel the feed hangs from, and a plain search row
// under it running the full page width.
function PuntokHeader({
  tab,
  onTabChange,
  onShuffle,
}: {
  tab: PuntokTab;
  onTabChange: (next: PuntokTab) => void;
  onShuffle: () => void;
}) {
  const router = useRouter();
  const appShell = useAppShell();
  const { user: firebaseUser, backendUser } = useAuth();
  const [query, setQuery] = useState("");

  const avatarUrl = backendUser?.avatarUrl || firebaseUser?.photoURL || null;
  const displayName = backendUser?.name || firebaseUser?.displayName || "โปรไฟล์ผู้ใช้";
  const accountLabel = backendUser ? `บัญชีของ ${displayName}` : "เข้าสู่ระบบ";

  // White on the black bar, so the glyph colour is the bar's, not the app's
  // green — the brand accent disappears against it.
  const barButton =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#111111] transition hover:bg-white/85";

  // Nothing to search inside a six-post feed, so the field hands the term to
  // /search rather than filtering six rows or doing nothing on Enter.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="relative z-30 hidden shrink-0 bg-white min-[1025px]:block">
      <div className="rounded-b-[26px] bg-[#111111] px-8 py-3">
        <div className="relative flex min-h-9 items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => router.back()} aria-label="ย้อนกลับ" className={barButton}>
              <ChevronLeft size={19} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => appShell?.openSidebar()}
              aria-label="เมนู"
              className={barButton}
            >
              <Menu size={18} strokeWidth={2.5} />
            </button>
          </div>

          <Logo className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl text-white" />

          <div className="flex items-center gap-2.5">
            {/* The bookmark in the design, pointed at the page that already
                answers to it. /saved lost its bottom-bar slot to Puntok, so
                this is the one place on the screen that still reaches it. */}
            <Link href="/saved" aria-label="ทริปที่บันทึกไว้" className={barButton}>
              <Bookmark size={17} strokeWidth={2.3} />
            </Link>
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
                className="h-9 w-9 rounded-full border-2 border-white object-cover"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Full page width, not capped like PageContainer's rows: the design runs
          this field from margin to margin, and the card below is centred on the
          page rather than inside a column. */}
      <div className="flex items-center gap-3 px-8 py-3">
        <form onSubmit={handleSubmit} role="search" className="min-w-0 flex-1">
          <div className="flex items-center gap-2 rounded-full bg-white p-1 pl-4 ring-1 ring-[#e7e7e7] transition focus-within:ring-2 focus-within:ring-[var(--color-primary)]/40">
            <Search size={16} strokeWidth={2.4} className="shrink-0 text-[var(--color-muted)]" aria-hidden />
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

        <FeedFilterMenu tab={tab} onTabChange={onTabChange} onShuffle={onShuffle} />
      </div>
    </header>
  );
}

// The lime square from the design. It holds what the phone layout shows as two
// pills over the clip: the design leaves the desktop stage clean, so the tab
// switch moves in here rather than being dropped — this is the only way to the
// "กำลังติดตาม" feed at this width.
function FeedFilterMenu({
  tab,
  onTabChange,
  onShuffle,
}: {
  tab: PuntokTab;
  onTabChange: (next: PuntokTab) => void;
  onShuffle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const options: { key: PuntokTab; label: string }[] = [
    { key: "forYou", label: "สำหรับคุณ" },
    { key: "following", label: "กำลังติดตาม" },
  ];

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="ตัวเลือกฟีด"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent-lime)] text-[var(--foreground)] transition hover:brightness-95 active:scale-95"
      >
        <SlidersHorizontal size={17} strokeWidth={2.4} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-48 rounded-2xl bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(16,24,40,0.28)] ring-1 ring-black/5"
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitemradio"
              aria-checked={tab === option.key}
              onClick={() => {
                onTabChange(option.key);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--color-surface)]"
            >
              {option.label}
              {tab === option.key && (
                <Check size={15} strokeWidth={3} className="text-[var(--color-primary)]" />
              )}
            </button>
          ))}
          <div className="my-1 h-px bg-[#eceeed]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onShuffle();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--color-surface)]"
          >
            <Shuffle size={15} strokeWidth={2.4} />
            สุ่มลำดับคลิป
          </button>
        </div>
      )}
    </div>
  );
}
