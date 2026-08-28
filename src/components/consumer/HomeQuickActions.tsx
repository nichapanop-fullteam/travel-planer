"use client";

import Link from "next/link";
import { Plus, Shuffle, Sparkles } from "lucide-react";

// The three dark action tiles under /main's hero. Only the first has a real
// destination today, and the other two say so rather than looking live:
//
// - สร้างทริป  → /create-trip, the existing wizard (same route CreateTripButton
//   has always pointed at, which is why that button is gone from this page —
//   two entry points to one flow on one screen is one too many).
// - Trip Remix → remixing starts from a public plan's own page (POST
//   /trips/:sourceTripId/remix needs a source; see canRemix in
//   generated-plan/[id]), so there is no standalone route to send anyone to.
// - AI สร้างทริป → the wizard's AI mode is behind AI_MODE_ENABLED = false in
//   app/create-trip/page.tsx; linking there today just lands on the manual
//   flow under an AI label.
//
// Both are rendered as disabled buttons with a "เร็ว ๆ นี้" badge: the design
// calls for three tiles, and a dead link that silently does the wrong thing is
// worse than a control that admits it isn't wired up yet.
const ACTIONS = [
  {
    key: "create",
    label: "สร้างทริป",
    icon: Plus,
    href: "/create-trip",
    // Left-edge bleed rather than a full-tile gradient — the reference keeps
    // the tiles reading as one dark family, with the colour only identifying
    // which action is which.
    glow: "from-[#e2572a]/75",
    ring: "bg-white/15",
  },
  {
    key: "remix",
    label: "Trip Remix",
    icon: Shuffle,
    href: null,
    glow: "from-[#6d4aec]/80",
    ring: "bg-white/15",
  },
  {
    key: "ai",
    label: "AI สร้างทริป",
    icon: Sparkles,
    href: null,
    glow: "from-[#2563eb]/80",
    ring: "bg-white/15",
    badge: "AI",
  },
] as const;

// Desktop only, at the same 1025px boundary the rest of this page splits on.
// Below it MobileBottomNav's raised centre button is already the create action,
// and two of these three tiles aren't wired up yet — so on a phone or tablet
// they were a screenful above the feed that mostly couldn't be used.
export function HomeQuickActions() {
  return (
    <div className="hidden gap-3 min-[1025px]:grid min-[1025px]:grid-cols-3">
      {ACTIONS.map((action) => {
        const inner = (
          <>
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${action.glow} via-transparent to-transparent`}
            />
            <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.ring}`}>
              <action.icon size={18} strokeWidth={2.5} />
              {"badge" in action && action.badge && (
                <span className="absolute -top-1.5 -right-1.5 rounded-full bg-white px-1 text-[8px] font-extrabold text-[#111111]">
                  {action.badge}
                </span>
              )}
            </span>
            <span className="relative truncate text-[15px] font-bold">{action.label}</span>
          </>
        );

        const shell =
          "relative flex items-center gap-3 overflow-hidden rounded-2xl bg-[#141414] px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(16,24,40,0.18)]";

        if (!action.href) {
          return (
            <button
              key={action.key}
              type="button"
              disabled
              className={`${shell} cursor-not-allowed opacity-55`}
            >
              {inner}
              <span className="relative ml-auto shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                เร็ว ๆ นี้
              </span>
            </button>
          );
        }

        return (
          <Link
            key={action.key}
            href={action.href}
            className={`${shell} transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2`}
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
