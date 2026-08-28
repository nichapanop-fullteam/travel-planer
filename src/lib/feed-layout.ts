// The one layout used for every RealTripCard listing (/main, /saved,
// /my-trips). Kept here rather than repeated per page: the copies had already
// drifted apart once (/saved was 1/2/3 while the others were 2/3/4), which put
// the same card at a different size on each page.
//
// Two different layout engines, on purpose:
//
// - Phones and tablets get CSS multi-column, i.e. masonry. Cards flow into
//   whichever column is shortest, so a card that's taller than its neighbours
//   staggers the columns instead of stranding one. A grid can't do that: its
//   rows are a uniform height, so one tall card just leaves a gap under the
//   card beside it.
// - From 1025px up it's a plain grid. Cards are uniform there, and a grid
//   keeps reading order left-to-right; multi-column reads top-to-bottom per
//   column, which is wrong once there are three or four of them.
//
// 1025 rather than a Tailwind breakpoint because iPad landscape is exactly
// 1024 — the same boundary the bottom tab bar and the collapsed search use.
export const TRIP_GRID_CLASS = [
  // masonry (<=1024px)
  "columns-2 gap-2.5 [&>*]:mb-2.5 [&>*]:break-inside-avoid",
  // grid (>=1025px) — display:grid makes the column-count above inert
  "min-[1025px]:grid min-[1025px]:grid-cols-3 min-[1025px]:gap-4 min-[1025px]:[&>*]:mb-0",
  "xl:grid-cols-4 xl:gap-5",
].join(" ");
