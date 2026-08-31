/** The flat travel illustration behind every hero scrim (/main's hero and
 *  Create Trip's). Shared so the two can't drift apart — they were on
 *  different assets before, which read as two different products.
 *
 *  Every consumer guards it with onError: the deep-green ground underneath
 *  (--color-deep-green) is a usable background on its own, so a missing asset
 *  degrades to a plain dark hero rather than a broken image. */
export const HERO_ILLUSTRATION = "/images/hero-main.png";
