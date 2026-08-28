"use client";

import { ArrowDownWideNarrow } from "lucide-react";

export type FeedSort = "latest" | "popular";

// The /main feed's sort control. This file used to also export FeedSearchBar,
// the tinted band that held the feed's search field — that field now lives in
// HomeHero, which is where the redesigned page puts search, so only the sort
// remained.
//
// Sits on the filter row, next to the chips it shares a grid with. A native
// select rather than a custom menu — it gets the platform's own picker on
// mobile and full keyboard support for free.
//
// The options are limited to what GET /trips returns on every row: `updatedAt`
// and `likeCount`. No "most remixed" or "nearest", since remixCount is
// optional on the list shape and there's no distance data.
export function FeedSortSelect({
  sort,
  onSortChange,
}: {
  sort: FeedSort;
  onSortChange: (next: FeedSort) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)]/40 bg-white px-3 py-1.5">
      <ArrowDownWideNarrow size={15} className="shrink-0 text-[var(--color-muted)]" />
      <span className="sr-only">เรียงลำดับ</span>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as FeedSort)}
        className="cursor-pointer bg-transparent text-xs font-semibold text-[var(--foreground)] outline-none"
      >
        <option value="latest">ล่าสุด</option>
        <option value="popular">ยอดนิยม</option>
      </select>
    </label>
  );
}
