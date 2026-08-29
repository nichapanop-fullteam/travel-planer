"use client";

import { Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/common/Logo";

// The pale frosted app bar that sits on top of an image hero.
//
// Modelled on generated-plan's inline Hero bar so /main's hero doesn't grow a
// second one that drifts from it — the feed grid classes had already been
// through exactly that (see lib/feed-layout.ts). Two of that bar's controls are
// deliberately not here: a back button (the feed is where you come back *to*,
// so it had nothing to return to) and a save icon (there's no single trip to
// save from a feed, and each card carries its own bookmark).
//
// Two layouts, split at 1025px:
//
// - From 1025px up: menu on the left, wordmark centred, avatar on the right.
// - At or below: wordmark on the left, search toggle on the right. The menu and
//   the avatar are gone because MobileBottomNav is on screen there and already
//   reaches every destination the drawer holds (Home, My Trips, Saved, create)
//   and opens the same account dialog from its โปรไฟล์ tab — a second route to
//   places one tap away. That frees both corners, so the wordmark takes the
//   left and the search field's toggle takes the right.
//
// The bar is square-cornered. It carried a rounded bottom when it was lifted
// out of generated-plan, where a 28px radius is a three-layer motif (photo hero,
// this bar, the white sheet below) that makes the bar read as a panel floating
// on a tall cover photo. /main has no cover photo to float on, and on a phone
// the hero is exactly this bar's height — so the radius only made an app bar
// look like a card that had come loose from the screen edge.
//
// 1025 rather than a Tailwind breakpoint because iPad landscape is exactly
// 1024: `lg` would treat the larger iPad orientation as a desktop. Same
// boundary the bottom bar and the collapsed search use.
export function FrostedTopNav({
  onMenuClick,
  avatarUrl,
  onAvatarClick,
  avatarLabel = "",
  onSearchClick,
  searchOpen = false,
  searchControls,
}: {
  onMenuClick: () => void;
  avatarUrl?: string | null;
  /** Makes the avatar a real button (e.g. to open the account dialog). Left
   *  out, it stays a plain image — which is what a page with nothing to open
   *  behind it should render. */
  onAvatarClick?: () => void;
  avatarLabel?: string;
  /** Compact-layout entry point to a search field that is collapsed below
   *  1025px. Omitted, no search button renders at all. */
  onSearchClick?: () => void;
  searchOpen?: boolean;
  /** id of the element the toggle expands, for aria-controls. */
  searchControls?: string;
}) {
  const avatar = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl || "/images/profile-avatar.jpg"}
      alt={onAvatarClick ? avatarLabel : ""}
      className="h-8 w-8 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
    />
  );

  const iconButton =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white";

  return (
    <div className="relative z-20 border-b border-white/40 bg-gradient-to-b from-white/65 via-white/45 to-white/25 backdrop-blur-2xl">
      {/* Same width cap and padding ramp as PageContainer's "feed" variant, so
          the bar's controls land on the feed's own left and right edges instead
          of crowding the screen corners. Sharing the grid rather than picking a
          standalone inset is what keeps them aligned at every width — past
          --container-feed the cap centres this row exactly as it centres the
          cards below. */}
      <div className="mx-auto w-full max-w-[var(--container-feed)] px-4 sm:px-6 lg:px-10 xl:px-14">
        {/* min-h-8 rather than relying on the children: from 1025px up the
            wordmark is the only thing between the two icon buttons and it's
            absolutely positioned, so the row would have no in-flow content to
            take its height from once a corner is empty. */}
        <div className="relative flex min-h-8 items-center justify-between gap-3 py-1.5 sm:py-2">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="เมนู"
            className={`hidden ${iconButton} min-[1025px]:flex`}
            style={{ color: "var(--color-brand-green)" }}
          >
            <Menu size={17} strokeWidth={2.5} />
          </button>

          {/* In flow (so justify-between puts it in the left corner) below
              1025px, absolutely centred above it. */}
          <Logo className="pointer-events-none text-base text-[var(--foreground)] sm:text-xl min-[1025px]:absolute min-[1025px]:left-1/2 min-[1025px]:-translate-x-1/2" />

          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              aria-label={searchOpen ? "ปิดการค้นหา" : "ค้นหาทริป"}
              aria-expanded={searchOpen}
              aria-controls={searchControls}
              className={`${iconButton} min-[1025px]:hidden`}
              style={{ color: "var(--color-brand-green)" }}
            >
              {searchOpen ? <X size={17} strokeWidth={2.5} /> : <Search size={17} strokeWidth={2.5} />}
            </button>
          )}

          <span className="hidden shrink-0 items-center min-[1025px]:flex">
            {onAvatarClick ? (
              <button type="button" onClick={onAvatarClick} aria-label={avatarLabel} className="shrink-0 rounded-full">
                {avatar}
              </button>
            ) : (
              avatar
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
