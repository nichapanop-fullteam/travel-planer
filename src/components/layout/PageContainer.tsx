import type { HTMLAttributes } from "react";

// The one canonical page width/padding wrapper for AppShell-based routes.
//
// Two widths, because the pages divide into two shapes:
//
// - "page" (default) — --container-max (80rem), matching /trip-detail's
//   pre-existing max-w-7xl. For prose and detail views, which stay readable by
//   staying narrow.
// - "feed" — --container-feed (96rem) with a wider padding ramp. For the trip
//   card grids (/main, /my-trips, /saved): at 80rem a large display was mostly
//   empty margin, and those three pages had each invented their own width
//   (80rem / 72rem / 80rem) and padding, so the same card grid sat at a
//   different left edge on every one of them.
//
// Anything sharing a sticky header with the content it scrolls under needs the
// same variant on both, or the header drifts off the content's left edge.
export function PageContainer({
  width = "page",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { width?: "page" | "feed" }) {
  const constraint =
    width === "feed"
      ? "max-w-[var(--container-feed)] px-4 sm:px-6 lg:px-10 xl:px-14"
      : "max-w-[var(--container-max)] px-6 sm:px-10";

  return <div className={`mx-auto w-full ${constraint} py-10 ${className}`} {...props} />;
}
