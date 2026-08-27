// The one grid used for every RealTripCard listing (/main, /saved,
// /my-trips). Kept here rather than repeated per page: the four copies had
// already drifted apart once (/saved was 1/2/3 while the others were 2/3/4),
// which put the same card at a different size on each page.
//
// The column ramp is driven by how narrow a card can get before it stops
// working. These cards carry a title, a location line, a creator row and a
// stats row, and Thai text doesn't hyphenate — at 375px, two columns left each
// card 152px wide, which broke titles mid-phrase ("หลวงพระ / บาง, ลาว 4 …")
// and wrapped the price onto its own second line. So phones get a single
// column; the second only appears once there's room for it at ~480px.
//
// Resulting card widths: 375px→335, 480px→208, 768px→221, 1280px→270,
// 1536px (the --container-feed cap) →334.
export const TRIP_GRID_CLASS =
  "grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6";
