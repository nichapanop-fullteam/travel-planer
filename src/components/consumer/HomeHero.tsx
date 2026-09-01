"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { FrostedTopNav } from "@/components/consumer/FrostedTopNav";
import { useAppShell } from "@/components/layout/AppShell";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuth } from "@/providers/AuthProvider";
import { HERO_ILLUSTRATION } from "@/lib/hero-image";

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

  // 1025px inclusive, matching the CSS boundary. Needed in JS and not just
  // Tailwind because `aria-hidden` on the collapsed field can't come from a
  // variant, and leaving it set at desktop widths would hide a visible field
  // from screen readers.
  const compactLayout = useMediaQuery("(max-width: 1024px)");

  // Below 1025px the field starts open and folds away on scroll, handing its
  // job to the app bar's search icon. Open-by-default because searching is the
  // first thing the hero offers and a field behind an icon reads as absent;
  // folding on scroll because the header is sticky, so an always-open field
  // would hold a whole row of a small screen for the entire page.
  //
  // Two thresholds rather than one: a single boundary flips back and forth
  // under a fingertip resting near it, and each flip resizes the sticky header.
  const [scrolledPast, setScrolledPast] = useState(false);
  const scrollRef = appShell?.scrollRef;
  useEffect(() => {
    const scroller = scrollRef?.current;
    if (!scroller) return;
    const COLLAPSE_AT = 56;
    const RESTORE_AT = 16;
    const onScroll = () => {
      const y = scroller.scrollTop;
      if (y > COLLAPSE_AT) {
        setScrolledPast(true);
      } else if (y < RESTORE_AT) {
        setScrolledPast(false);
      }
    };
    // Deferred rather than called straight away: a browser that restored the
    // scroll position on reload lands mid-page, and this is a state write that
    // has no business happening synchronously inside an effect.
    const raf = requestAnimationFrame(onScroll);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [scrollRef]);

  // Desktop always shows it. On compact it is open until scrolled away, and a
  // non-empty query pins it open regardless — otherwise picking a destination
  // from the rail (which fills this field in) would narrow the grid on a phone
  // with nothing on screen to say why.
  const searchExpanded = !compactLayout || !scrolledPast || query.trim().length > 0;
  // The icon is the folded field's stand-in, so it only earns a slot once the
  // field has actually folded away.
  const showSearchIcon = compactLayout && scrolledPast;

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
          className="absolute inset-0 h-full w-full object-cover object-[50%_70%]"
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
        searchHref={showSearchIcon ? "/search" : undefined}
      />

      {/* No vertical padding on phones: the heading is hidden there and the
          search field is collapsed, so any padding here would hold open an
          empty dark band under the app bar. What's left below 640px is the bar
          itself, and the hero's rounded bottom becomes the bar's. From 640px up
          the heading is back and the padding comes with it. */}
      <div className="relative z-10 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {/* Heading and field share one collapsing region, and every bit of
              their spacing lives inside it. Two reasons: a collapsed hero then
              contributes nothing at all (on a phone it shrinks to the app bar),
              and the heading folds away with the field on scroll instead of
              staying pinned — it belongs to the same "hero content" the scroll
              gesture is dismissing. From 1025px up the region never collapses,
              so desktop is unaffected.
              max-h-64 rather than a tighter cap: at 640px+ the padded content
              measures ~210px, and a cap under that would clip the field. */}
          <div
            id={SEARCH_ID}
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none ${
              searchExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
            } min-[1025px]:max-h-none min-[1025px]:opacity-100`}
            aria-hidden={!searchExpanded && compactLayout}
          >
            <div className="py-5 sm:py-12">
            <h1 className="text-center text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] min-[640px]:text-[32px] min-[1025px]:text-[38px]">
              จุดหมายที่คุณจะไป
            </h1>

            {/* Compact layout hands searching to /search — the full-screen
                surface with recent terms and trends. Rendered as a link that
                copies the field's shape rather than a real input, so the hero
                looks identical and the tap goes straight to the page instead of
                opening a keyboard under a 45px app bar. Desktop keeps the live
                field: there is room for it, and no page to send anyone to. */}
            <Link
              href="/search"
              className="mt-4 flex items-center gap-1 rounded-full bg-white p-1 ring-2 ring-white/25 min-[640px]:gap-1.5 min-[1025px]:hidden"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-accent-orange)] min-[640px]:h-7 min-[640px]:w-7">
                <Search strokeWidth={2.5} className="h-[15px] w-[15px]" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-muted)] min-[640px]:text-[13px]">
                {query.trim() || "ค้นหาชื่อที่ ย่าน หรือประเภท"}
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white min-[640px]:h-8 min-[640px]:w-8">
                <ArrowRight strokeWidth={2.5} className="h-4 w-4" />
              </span>
            </Link>

            <form onSubmit={handleSubmit} role="search" className="mt-4 hidden sm:mt-7 min-[1025px]:block">
              {/* The pale ring is what lifts the field off the scrim — without
                  it the white pill reads as sitting flat on the photo. */}
              <div className="flex items-center gap-1 rounded-full bg-white p-1 ring-2 ring-white/25 transition focus-within:ring-white/70 min-[640px]:gap-1.5 min-[1025px]:ring-[3px]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-accent-orange)] min-[640px]:h-7 min-[640px]:w-7 min-[1025px]:h-8 min-[1025px]:w-8">
                  <Search strokeWidth={2.5} className="h-[15px] w-[15px] min-[1025px]:h-4 min-[1025px]:w-4" />
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
                  className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted)] min-[640px]:text-[13px] min-[1025px]:text-sm"
                />
                <button
                  type="submit"
                  aria-label="ค้นหาทริป"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white transition hover:bg-[#2b2b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 min-[640px]:h-8 min-[640px]:w-8 min-[1025px]:h-9 min-[1025px]:w-9"
                >
                  <ArrowRight strokeWidth={2.5} className="h-4 w-4 min-[1025px]:h-[17px] min-[1025px]:w-[17px]" />
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
