"use client";

import { ArrowDownWideNarrow, Search, X } from "lucide-react";

export type FeedSort = "latest" | "popular";

// Search + sort for the /main feed, in one short band instead of the tall
// centred hero this replaced. That hero spent ~200px on a title, a subtitle
// and a search box before any trip was visible — on mobile it pushed the
// first card most of the way off the screen. The heading moved down next to
// the result count, where it costs one line.
//
// Sort options are limited to what GET /trips actually returns on every row:
// `updatedAt` and `likeCount`. No "most remixed" or "nearest" option, since
// remixCount is optional on the list shape and there's no distance data.
export function FeedControls({
  query,
  onQueryChange,
  sort,
  onSortChange,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  sort: FeedSort;
  onSortChange: (next: FeedSort) => void;
}) {
  // The band is tinted and fades into the white feed below it. Everything on
  // this page used to be white on white, so the search sat on the same surface
  // as the cards and the page read flat. The pill inputs stay white, which is
  // what makes them lift off this band.
  return (
    <div className="border-b border-[#e6efe9] bg-gradient-to-b from-[var(--color-surface)] to-[#f6faf8]">
      <div className="mx-auto flex w-full max-w-[var(--container-feed)] flex-col gap-2.5 py-4 sm:flex-row sm:items-center sm:gap-3 px-6 sm:px-8 lg:px-12 xl:px-16">
        <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-[#e5e5e5] bg-white px-4 py-2 transition-shadow focus-within:border-[var(--color-primary)]/40 focus-within:shadow-[0_4px_16px_rgba(42,158,100,0.12)]">
          <Search size={17} className="shrink-0 text-[var(--color-muted)]" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="ค้นหาทริป จุดหมาย หรือสไตล์การเที่ยว..."
            aria-label="ค้นหาทริป จุดหมาย หรือสไตล์การเที่ยว"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted)]"
          />
          {query.trim() && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="ล้างการค้นหา"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--foreground)]"
            >
              <X size={14} />
            </button>
          )}
        </label>

        {/* A native select rather than a custom menu — it gets the platform's
            own picker on mobile and full keyboard support for free. */}
        <label className="flex shrink-0 items-center gap-2 rounded-full border border-[#e5e5e5] bg-white px-3.5 py-2">
          <ArrowDownWideNarrow size={16} className="shrink-0 text-[var(--color-muted)]" />
          <span className="sr-only">เรียงลำดับ</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as FeedSort)}
            className="cursor-pointer bg-transparent py-1 pr-1 text-sm font-semibold text-[var(--foreground)] outline-none"
          >
            <option value="latest">ล่าสุด</option>
            <option value="popular">ยอดนิยม</option>
          </select>
        </label>
      </div>
    </div>
  );
}
