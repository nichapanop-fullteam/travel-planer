import Link from "next/link";
import { Plus } from "lucide-react";

// The one "สร้างทริป" CTA, previously hand-rolled three times (HomeNavbar,
// Sidebar, /my-trips header) with three slightly different weights, radii
// and shadows. Minimal by design: a pill with no resting shadow, semibold
// rather than bold text, and a soft green glow that only appears on hover —
// so the button reads as one calm shape at rest instead of a heavy slab.
//
// `variant="block"` is the sidebar's full-width version; the default
// "compact" is the inline header one, which drops its label below sm and
// becomes a round icon button.
export function CreateTripButton({
  variant = "compact",
  className = "",
}: {
  variant?: "compact" | "block";
  className?: string;
}) {
  const base =
    "group inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] font-semibold text-white transition-all duration-200 hover:bg-[var(--color-deep-green)] hover:shadow-[0_6px_18px_-4px_rgba(42,158,100,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 focus-visible:ring-offset-2";

  if (variant === "block") {
    return (
      <Link href="/create-trip" className={`${base} w-full gap-2 py-3.5 text-base ${className}`}>
        <Plus size={17} strokeWidth={2.5} className="transition-transform duration-200 group-hover:rotate-90" />
        สร้างทริป
      </Link>
    );
  }

  return (
    <Link href="/create-trip" className={`${base} gap-1.5 px-3 py-2.5 text-sm sm:px-4 ${className}`}>
      <Plus size={17} strokeWidth={2.5} className="transition-transform duration-200 group-hover:rotate-90" />
      <span className="hidden sm:inline">สร้างทริป</span>
    </Link>
  );
}
