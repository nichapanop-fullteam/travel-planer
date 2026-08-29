"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { FrostedTopNav } from "@/components/consumer/FrostedTopNav";
import { useAppShell } from "@/components/layout/AppShell";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuth } from "@/providers/AuthProvider";

/** Flat travel illustration behind the hero scrim. Still guarded by onError:
 *  the deep-green ground underneath is a usable background on its own, so a
 *  missing asset degrades to a plain dark hero rather than a broken image. */
const HERO_ILLUSTRATION = "/images/hero-main.png";

const SEARCH_ID = "home-search";

// /main's hero — the frosted app bar, the page's one <h1>, and the feed search.
// Replaces the old white sticky HomeNavbar + tinted FeedSearchBar band: the
// wordmark, menu, account and search all lived in that bar, and they all have a
// home here now (search below, the rest inside FrostedTopNav).
//
// Search is still the same live filter it was — `query`/`onQueryChange` drive
// the feed's own useMemo, so typing narrows the grid as you go and the form's
// only job is to make Enter behave and dismiss the mobile keyboard.
export function HomeHero({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (next: string) => void;
}) {
  const appShell = useAppShell();
  const { user: firebaseUser, backendUser } = useAuth();

  const avatarUrl = backendUser?.avatarUrl || firebaseUser?.photoURL || null;
  const displayName = backendUser?.name || firebaseUser?.displayName || "โปรไฟล์ผู้ใช้";
  const accountLabel = backendUser ? `บัญชีของ ${displayName}` : "เข้าสู่ระบบ";

  // The illustration is decorative; hiding it on a load failure leaves the
  // gradient, which is the intended ground colour anyway.
  const [illustrationFailed, setIllustrationFailed] = useState(false);

  // Below 1025px the field is collapsed behind the app bar's search icon: a
  // permanently expanded one cost a whole row of a small screen, and what
  // people arrive to do is browse the feed. Desktop is wide enough to just show
  // it, so this state only gates the compact layout — the CSS override below
  // keeps the field open from 1025px up whatever this says.
  const [searchOpen, setSearchOpen] = useState(false);
  // A non-empty query forces it open. Otherwise picking a destination from the
  // rail (which fills this field in) narrowed the grid on a phone with nothing
  // on screen to say why.
  const searchExpanded = searchOpen || query.trim().length > 0;

  // 1025px inclusive, matching the CSS boundary. Needed in JS and not just
  // Tailwind because `aria-hidden` on the collapsed field can't come from a
  // variant, and leaving it set at desktop widths would hide a visible field
  // from screen readers.
  const compactLayout = useMediaQuery("(max-width: 1024px)");

  // Opening from an icon should land the caret in the field; otherwise the tap
  // reveals an input and then asks for a second tap to use it.
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!searchOpen) return;
    searchWrapRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [searchOpen]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    (event.currentTarget.querySelector("input") as HTMLInputElement | null)?.blur();
  }

  return (
    <div className="relative overflow-hidden bg-[var(--color-deep-green)]">
      {!illustrationFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={HERO_ILLUSTRATION}
          alt=""
          onError={() => setIllustrationFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* Weak at the top so the frosted bar above doesn't turn grey behind its
          own blur, heavy through the middle and bottom — that band is what the
          white heading and the search field's ring sit on, and the illustration
          is bright enough (cream sky, orange sun) to swallow both without it. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/55 to-black/75" />

      <FrostedTopNav
        onMenuClick={() => appShell?.openSidebar()}
        avatarUrl={avatarUrl}
        onAvatarClick={appShell?.openAccount}
        avatarLabel={accountLabel}
        onSearchClick={() => setSearchOpen((open) => !open)}
        searchOpen={searchExpanded}
        searchControls={SEARCH_ID}
      />

      {/* No vertical padding on phones: the heading is hidden there and the
          search field is collapsed, so any padding here would hold open an
          empty dark band under the app bar. What's left below 640px is the bar
          itself, and the hero's rounded bottom becomes the bar's. From 640px up
          the heading is back and the padding comes with it. */}
      <div className="relative z-10 px-4 sm:px-6 sm:pb-12 sm:pt-12">
        <div className="mx-auto w-full max-w-3xl">
          {/* Phones get the search field as the hero's only content — the
              heading was a full line of large type restating what the page
              already is, above a fold that has to reach the feed. */}
          <h1 className="hidden text-center text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:block min-[640px]:text-[32px] min-[1025px]:text-[38px]">
            จุดหมายที่คุณจะไป
          </h1>

          {/* Every bit of the field's spacing lives on the form, inside the
              collapsing wrapper, so a collapsed field contributes no height at
              all — on phones that's what lets the hero shrink to the bar, and
              from 640px up it's what keeps the gap under the heading from
              surviving a collapse. */}
          <div
            id={SEARCH_ID}
            ref={searchWrapRef}
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none ${
              searchExpanded ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
            } min-[1025px]:max-h-none min-[1025px]:opacity-100`}
            aria-hidden={!searchExpanded && compactLayout}
          >
            <form onSubmit={handleSubmit} role="search" className="py-4 sm:mt-7 sm:py-0">
              {/* The pale ring is what lifts the field off the scrim — without
                  it the white pill reads as sitting flat on the photo. */}
              <div className="flex items-center gap-2 rounded-full bg-white p-1.5 ring-4 ring-white/25 transition focus-within:ring-white/70">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-accent-orange)]">
                  <Search size={17} strokeWidth={2.5} />
                </span>
                <input
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="ค้นหาชื่อที่ ย่าน หรือประเภท"
                  aria-label="ค้นหาทริป จุดหมาย หรือสไตล์การเที่ยว"
                  // Left-aligned, not centred like the reference's placeholder:
                  // with an empty value a centred field puts the caret in the
                  // middle of the placeholder text on focus, and typing then
                  // grows the query outwards from the centre. The placeholder
                  // looked right at rest and wrong the moment anyone used it.
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted)] sm:text-base"
                />
                <button
                  type="submit"
                  aria-label="ค้นหาทริป"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white transition hover:bg-[#2b2b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <ArrowRight size={18} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
