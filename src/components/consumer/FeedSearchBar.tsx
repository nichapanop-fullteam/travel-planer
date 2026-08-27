"use client";

import { ArrowDownWideNarrow, Search, X } from "lucide-react";

export type FeedSort = "latest" | "popular";

// The tinted band holding the /main feed's search field, and — as a separate
// export below — the sort control that used to sit beside it.
//
// They were split apart so the search can be genuinely centred. Sharing a row
// meant the field's midpoint depended on how wide the sort dropdown rendered,
// and the sort itself read as an orphan pinned to one side (worse on mobile,
// where it dropped onto a full-width row of its own). The sort now lives on
// the results line next to "สำรวจทริป · N ทริป", which is what it describes.
export function FeedSearchBar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (next: string) => void;
}) {
  // Results update live from onChange, so submitting has nothing new to
  // fetch — but a real <form> still earns its place: it makes Enter behave
  // (without one, Enter in a bare input does nothing at all, which reads as
  // broken), and blurring on submit dismisses the mobile keyboard so the
  // results the user just filtered are actually visible.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    (event.currentTarget.querySelector("input") as HTMLInputElement | null)?.blur();
  }

  // The band is tinted and fades into the white feed below it. Everything on
  // this page used to be white on white, so the search sat on the same surface
  // as the cards and the page read flat. The field stays white, which is what
  // makes it lift off this band.
  return (
    <div className="border-b border-[#e6efe9] bg-gradient-to-b from-[var(--color-surface)] to-[#f6faf8]">
      <div className="mx-auto w-full max-w-[var(--container-feed)] px-7 py-4 sm:px-10 lg:px-16 xl:px-20">
        <form onSubmit={handleSubmit} role="search" className="mx-auto w-full sm:w-[26rem] lg:w-[30rem]">
          <div className="flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-white py-1.5 pl-4 pr-1.5 transition-shadow focus-within:border-[var(--color-primary)]/40 focus-within:shadow-[0_4px_16px_rgba(42,158,100,0.12)]">
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

            {/* Kept in the brand green rather than the reference's orange:
                --color-accent-orange already carries a specific meaning in this
                app (the notification dot, the "สถานที่ห้ามพลาด" badge), so
                spending it on the search action would blur that. */}
            <button
              type="submit"
              aria-label="ค้นหาทริป"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-all hover:bg-[var(--color-deep-green)] hover:shadow-[0_4px_14px_-2px_rgba(42,158,100,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 focus-visible:ring-offset-2"
            >
              <Search size={17} strokeWidth={2.5} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sits on the results line. A native select rather than a custom menu — it
// gets the platform's own picker on mobile and full keyboard support for free.
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
