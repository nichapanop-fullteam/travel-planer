"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";

type NavKey = "home" | "myTrips" | "puntok" | "saved" | "messages";

// Anything that can draw itself at the size the bar gives it and take its
// colour from `currentColor` — a lucide glyph or one of the exported design
// assets below.
type NavIcon = ((props: { className: string }) => ReactElement) & { displayName?: string };

// The notch: a circle centred on the sheet's top edge, cut a few pixels wider
// than the 48px create button so a ring of page shows between the two.
const NOTCH_MASK =
  "radial-gradient(circle 30px at 50% 0, transparent 29.5px, #000 30.5px)";

// Home.svg's own stroke weight — it is the only outline glyph left in the bar.
const ICON_STROKE = 1.5;

// Inlined from the design's Home.svg. A stroked glyph, unlike the solid
// account_circle below — that difference is the design's, not an accident.
// `stroke="currentColor"` in place of the export's #483234 is what lets the
// tab's active/inactive colour reach it.
const HomeIcon: NavIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={ICON_STROKE}
    aria-hidden
    className={className}
  >
    <path d="M2.5 10.9384C2.5 9.71422 3.06058 8.55744 4.02142 7.79888L9.52142 3.45677C10.9747 2.30948 13.0253 2.30948 14.4786 3.45677L19.9786 7.79888C20.9394 8.55744 21.5 9.71422 21.5 10.9384V17.5C21.5 19.7091 19.7091 21.5 17.5 21.5H16C15.4477 21.5 15 21.0523 15 20.5V17.5C15 16.3954 14.1046 15.5 13 15.5H11C9.89543 15.5 9 16.3954 9 17.5V20.5C9 21.0523 8.55228 21.5 8 21.5H6.5C4.29086 21.5 2.5 19.7091 2.5 17.5L2.5 10.9384Z" />
  </svg>
);
HomeIcon.displayName = "NavHomeIcon";

// Inlined from the design's account_circle.svg. Inline rather than a file or a
// mask: `fill="currentColor"` gives the active/inactive colour switch for free,
// it costs no request, and it stays crisp at any DPR — the PNG it replaces was
// a 20px export being drawn at 22px. The export's own #483234 fill is dropped
// for the same reason.
const ProfileIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={className}>
    <path d="M3.85 15.1C4.7 14.45 5.65 13.9375 6.7 13.5625C7.75 13.1875 8.85 13 10 13C11.15 13 12.25 13.1875 13.3 13.5625C14.35 13.9375 15.3 14.45 16.15 15.1C16.7333 14.4167 17.1875 13.6417 17.5125 12.775C17.8375 11.9083 18 10.9833 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 10.9833 2.1625 11.9083 2.4875 12.775C2.8125 13.6417 3.26667 14.4167 3.85 15.1ZM7.5125 9.9875C6.8375 9.3125 6.5 8.48333 6.5 7.5C6.5 6.51667 6.8375 5.6875 7.5125 5.0125C8.1875 4.3375 9.01667 4 10 4C10.9833 4 11.8125 4.3375 12.4875 5.0125C13.1625 5.6875 13.5 6.51667 13.5 7.5C13.5 8.48333 13.1625 9.3125 12.4875 9.9875C11.8125 10.6625 10.9833 11 10 11C9.01667 11 8.1875 10.6625 7.5125 9.9875ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM12.5 17.6125C13.2833 17.3542 14 16.9833 14.65 16.5C14 16.0167 13.2833 15.6458 12.5 15.3875C11.7167 15.1292 10.8833 15 10 15C9.11667 15 8.28333 15.1292 7.5 15.3875C6.71667 15.6458 6 16.0167 5.35 16.5C6 16.9833 6.71667 17.3542 7.5 17.6125C8.28333 17.8708 9.11667 18 10 18C10.8833 18 11.7167 17.8708 12.5 17.6125ZM11.075 8.575C11.3583 8.29167 11.5 7.93333 11.5 7.5C11.5 7.06667 11.3583 6.70833 11.075 6.425C10.7917 6.14167 10.4333 6 10 6C9.56667 6 9.20833 6.14167 8.925 6.425C8.64167 6.70833 8.5 7.06667 8.5 7.5C8.5 7.93333 8.64167 8.29167 8.925 8.575C9.20833 8.85833 9.56667 9 10 9C10.4333 9 10.7917 8.85833 11.075 8.575Z" />
  </svg>
);
ProfileIcon.displayName = "NavProfileIcon";
// Matched to Home.svg's 1.5 so the outline glyphs share one weight.
// Inlined from the design's luggage.svg and video_template.svg. Both are solid
// glyphs (the export fills them at #1C1B1F), so they take `fill="currentColor"`
// where Home.svg takes a stroke — that split is the design's, not an accident.
const MyTripsIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 15 22" fill="currentColor" aria-hidden className={className}>
    <path d="M1.9521 20.5494C1.42757 20.5494 0.971143 20.3713 0.582807 20.0149C0.194269 19.6583 0 19.2189 0 18.6967V5.92308C0 5.38678 0.190323 4.92885 0.570969 4.54929C0.951615 4.16952 1.41088 3.97964 1.94876 3.97964H4.22414V1.94343C4.22414 1.40713 4.41436 0.949103 4.7948 0.569342C5.17545 0.189781 5.63825 0 6.18322 0H8.81678C9.35567 0 9.81575 0.189478 10.197 0.568434C10.5783 0.94739 10.7689 1.40451 10.7689 1.93981V3.97269H13.0479C13.5866 3.97269 14.0466 4.16217 14.4278 4.54113C14.8093 4.92008 15 5.38073 15 5.92308V18.6665C15 19.1862 14.8057 19.63 14.4172 19.9976C14.0289 20.3655 13.5724 20.5494 13.0479 20.5494V20.8399C13.0479 21.1616 12.9331 21.4354 12.7034 21.6612C12.4739 21.8871 12.2104 22 11.9129 22C11.6157 22 11.3523 21.8871 11.1228 21.6612C10.8931 21.4354 10.7783 21.1616 10.7783 20.8399V20.5494H4.22171V20.8701C4.22171 21.1662 4.10828 21.4285 3.88143 21.657C3.65459 21.8857 3.37967 22 3.0567 22C2.75073 22 2.49019 21.8857 2.27507 21.657C2.05976 21.4285 1.9521 21.1662 1.9521 20.8701V20.5494ZM1.9521 18.978H13.0479C13.1568 18.978 13.2463 18.9432 13.3165 18.8735C13.3866 18.8038 13.4216 18.7146 13.4216 18.606V5.92308C13.4216 5.81449 13.3866 5.72534 13.3165 5.65563C13.2463 5.58593 13.1568 5.55107 13.0479 5.55107H1.9521C1.84323 5.55107 1.75368 5.58593 1.68346 5.65563C1.61345 5.72534 1.57844 5.81449 1.57844 5.92308V18.606C1.57844 18.7146 1.61345 18.8038 1.68346 18.8735C1.75368 18.9432 1.84323 18.978 1.9521 18.978ZM4.59537 17.0624H6.17381V7.4667H4.59537V17.0624ZM8.82619 17.0624H10.4046V7.4667H8.82619V17.0624ZM5.80956 3.97964H9.19044V1.94343C9.19044 1.83484 9.15543 1.7457 9.08542 1.67599C9.0154 1.60628 8.92585 1.57143 8.81678 1.57143H6.18322C6.07415 1.57143 5.9846 1.60628 5.91458 1.67599C5.84456 1.7457 5.80956 1.83484 5.80956 1.94343V3.97964Z" />
  </svg>
);
MyTripsIcon.displayName = "NavMyTripsIcon";

const PuntokIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 19 21" fill="currentColor" aria-hidden className={className}>
    <path d="M2.77875 20.6C2.27375 20.6 1.87958 20.4583 1.59625 20.175C1.31292 19.8917 1.17125 19.4974 1.17125 18.9923V17.9173H2.47125V18.9923C2.47125 19.0821 2.50008 19.1558 2.55775 19.2135C2.61542 19.2712 2.68908 19.3 2.77875 19.3H15.4213C15.5109 19.3 15.5846 19.2712 15.6423 19.2135C15.6999 19.1558 15.7288 19.0821 15.7288 18.9923V17.9173H17.0288V18.9923C17.0288 19.4974 16.8871 19.8917 16.6038 20.175C16.3204 20.4583 15.9263 20.6 15.4213 20.6H2.77875ZM1.60775 15.925C1.10258 15.925 0.708333 15.7833 0.425 15.5C0.141667 15.2167 0 14.8224 0 14.3173V6.28275C0 5.77758 0.141667 5.38333 0.425 5.1C0.708333 4.81667 1.10258 4.675 1.60775 4.675H16.5923C17.0974 4.675 17.4917 4.81667 17.775 5.1C18.0583 5.38333 18.2 5.77758 18.2 6.28275V14.3173C18.2 14.8224 18.0583 15.2167 17.775 15.5C17.4917 15.7833 17.0974 15.925 16.5923 15.925H1.60775ZM1.17125 2.68275V1.60775C1.17125 1.10258 1.31292 0.708333 1.59625 0.425C1.87958 0.141667 2.27375 0 2.77875 0H15.4213C15.9263 0 16.3204 0.141667 16.6038 0.425C16.8871 0.708333 17.0288 1.10258 17.0288 1.60775V2.68275H15.7288V1.60775C15.7288 1.51792 15.6999 1.44417 15.6423 1.3865C15.5846 1.32883 15.5109 1.3 15.4213 1.3H2.77875C2.68908 1.3 2.61542 1.32883 2.55775 1.3865C2.50008 1.44417 2.47125 1.51792 2.47125 1.60775V2.68275H1.17125ZM1.60775 14.625H16.5923C16.6821 14.625 16.7558 14.5962 16.8135 14.5385C16.8712 14.4808 16.9 14.4071 16.9 14.3173V6.28275C16.9 6.19292 16.8712 6.11917 16.8135 6.0615C16.7558 6.00383 16.6821 5.975 16.5923 5.975H1.60775C1.51792 5.975 1.44417 6.00383 1.3865 6.0615C1.32883 6.11917 1.3 6.19292 1.3 6.28275V14.3173C1.3 14.4071 1.32883 14.4808 1.3865 14.5385C1.44417 14.5962 1.51792 14.625 1.60775 14.625ZM7.4635 12.8078L11.6365 10.3L7.4635 7.79225V12.8078Z" />
  </svg>
);
PuntokIcon.displayName = "NavPuntokIcon";

// Fixed bottom tab bar for phones and tablets — the pattern that makes a site
// read as an app rather than a page.
//
// The pluno reference's treatment: a white sheet with a large rounded top edge
// lifted off the page by a shadow, labels back under the icons, and the create
// action raised out of the bar as a warm circle with its own glow rather than
// sitting inline with the tabs.
//
// Home and Profile use the exported design assets. The other two exported
// icons — a magnifier and a shuffle — belong to the reference's Discovery and
// Remix tabs, which this bar does not have: /main *is* the discovery feed, and
// remixing starts from a public plan's own page (POST /trips/:sourceTripId/remix
// needs a source, so there is no standalone route). My Trips and Saved keep
// lucide glyphs rather than borrowing an icon that would name the wrong place.
//
// Shown up to 1024px inclusive so it covers iPad in both orientations, the
// same boundary FrostedTopNav uses for its compact treatment. Keeping the two
// in step matters: at widths where one applied and the other didn't, the layout
// was neither the app treatment nor the desktop one.
const DESTINATIONS: { key: NavKey; label: string; icon: NavIcon; href: string }[] = [
  { key: "home", label: "Home", icon: HomeIcon, href: "/main" },
  { key: "myTrips", label: "My Trip", icon: MyTripsIcon, href: "/my-trips" },
  { key: "puntok", label: "Puntok", icon: PuntokIcon, href: "/puntok" },
];

export function MobileBottomNav({ active }: { active?: NavKey }) {
  const pathname = usePathname();
  const appShell = useAppShell();

  // Falls back to the URL so a page that forgets to pass `active` still
  // highlights correctly.
  const resolved: NavKey | undefined =
    active ??
    (pathname === "/main"
      ? "home"
      : pathname?.startsWith("/my-trips")
        ? "myTrips"
        : pathname?.startsWith("/puntok")
          ? "puntok"
          : undefined);

  return (
    <nav
      aria-label="เมนูหลัก"
      // env(safe-area-inset-bottom) keeps the row clear of the iOS home
      // indicator, which otherwise overlaps the row on notched phones.
      className="fixed inset-x-0 bottom-0 z-40 min-[1025px]:hidden"
    >
      <div className="relative">
        {/* The sheet, with the reference's notch cut out of its top edge.
            Rebuilt as a mask rather than using the exported Union 1.svg: that
            file is a 1844x544 PNG wrapped in an <svg>, so it would stretch (and
            blur) the notch to whatever width the phone happens to be. A
            radial-gradient mask keeps the cutout a true circle at every width
            and costs no asset.

            It is its own layer, behind everything: a mask applies to an
            element's children too, so the raised button drawn inside it would
            be punched out along with the notch.

            drop-shadow rather than box-shadow — a mask clips a box-shadow away,
            while a filter runs after masking and so follows the cut shape. */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-t-[26px] bg-white"
          style={{
            WebkitMaskImage: NOTCH_MASK,
            maskImage: NOTCH_MASK,
            filter: "drop-shadow(0 -4px 14px rgba(16, 24, 40, 0.12))",
          }}
        />
        <div className="relative">
        {/* Soft halo behind the circle, blurred and non-interactive. It is what
            makes the button read as lifted off the sheet rather than pasted
            onto it. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 left-1/2 h-14 w-14 -translate-x-1/2 rounded-full bg-[var(--color-accent-orange)]/45 blur-xl"
        />

        <Link
          href="/create-trip"
          aria-label="สร้างทริป"
          className="group absolute -top-5 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-b from-[#FFA24B] to-[#F35F28] text-white shadow-[0_8px_20px_-4px_rgba(243,113,48,0.65)] transition-transform duration-150 active:scale-95"
        >
          <Plus size={22} strokeWidth={2.6} />
        </Link>

        {/* Two tabs, the raised button's footprint, then two more. The spacer
            is what keeps the tabs from sliding under the circle. */}
        <div
          className="mx-auto flex max-w-lg items-stretch px-2 pt-2"
          style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom))" }}
        >
          <TabItem item={DESTINATIONS[0]} isActive={resolved === DESTINATIONS[0].key} />
          <TabItem item={DESTINATIONS[1]} isActive={resolved === DESTINATIONS[1].key} />
          <span aria-hidden className="w-14 shrink-0" />
          {/* Puntok took Saved's place at your call; /saved is still reachable
              from the drawer behind the hero's menu button. The slot was drawn
              disabled while nothing answered to it — /puntok exists now, so it
              is a link like the other two. */}
          <TabItem item={DESTINATIONS[2]} isActive={resolved === DESTINATIONS[2].key} />
          {/* Profile opens the account dialog rather than navigating: the
              standalone /account page was removed in favour of that dialog, so
              there's no route to point at. Uses the shell's single instance. */}
          <TabButton label="Profile" icon={ProfileIcon} onClick={appShell?.openAccount} disabled={!appShell} />
        </div>
        </div>
      </div>
    </nav>
  );
}

// min-h-11 keeps every target at 44px — the minimum both Apple's and Google's
// guidelines ask for — even with the label now sharing the height.
const ITEM_CLASS =
  "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors";

const LABEL_CLASS = "text-[10px] font-semibold leading-none";

// One size for every glyph, whether it is a lucide SVG or a masked PNG.
// The active tab is separated by colour, with aria-current carrying the same
// distinction for anyone who can't see it: a masked glyph has a fixed shape, so
// the old "fill it in when active" treatment can't apply to half the bar, and
// half-filled/half-outlined would read as a bug.
const ICON_CLASS = "h-[22px] w-[22px] shrink-0";

function TabItem({
  item,
  isActive,
}: {
  item: { label: string; icon: NavIcon; href: string };
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={ITEM_CLASS}
      style={{ color: isActive ? "var(--color-accent-orange)" : "var(--color-muted)" }}
    >
      <Icon className={ICON_CLASS} />
      <span className={LABEL_CLASS}>{item.label}</span>
    </Link>
  );
}

function TabButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: NavIcon;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${ITEM_CLASS} disabled:opacity-40`}
      style={{ color: "var(--color-muted)" }}
    >
      <Icon className={ICON_CLASS} />
      <span className={LABEL_CLASS}>{label}</span>
    </button>
  );
}
