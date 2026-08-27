"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// Hides a sticky header while the reader is scrolling down through content and
// brings it back the moment they scroll up — the pattern most feed apps use to
// hand the screen back to the content without making the controls unreachable.
//
// Reads from the element passed in rather than window: AppShell scrolls an
// inner overflow-y-auto div, so window scroll events never fire here.
export function useHideOnScroll(
  ref: RefObject<HTMLElement | null> | null,
  {
    // Don't hide until past this much scroll, so the header can't vanish from a
    // small nudge near the top of the feed.
    threshold = 96,
    // Ignore movements smaller than this. Without it, sub-pixel scroll and
    // trackpad inertia flip the direction constantly and the header flickers.
    delta = 8,
  }: { threshold?: number; delta?: number } = {}
) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  // Coalesces the burst of scroll events into one evaluation per frame; one is
  // plenty and keeps long feeds smooth.
  //
  // `scheduled` is a separate flag from the frame id on purpose: it's set
  // *before* requestAnimationFrame is called. Gating on the id alone breaks if
  // the callback ever runs synchronously, because the assignment of the id
  // lands after the callback has already cleared it — leaving a stale non-null
  // id that makes every later scroll return early and the header stick.
  const scheduled = useRef(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;

    lastY.current = el.scrollTop;

    function evaluate() {
      scheduled.current = false;
      const node = ref?.current;
      if (!node) return;

      const y = node.scrollTop;
      const moved = y - lastY.current;

      if (Math.abs(moved) < delta) return;

      // Always reveal near the top — otherwise landing there after a fast
      // downward fling can leave the header stuck off-screen.
      if (y <= threshold) {
        setHidden(false);
      } else {
        setHidden(moved > 0);
      }

      lastY.current = y;
    }

    function onScroll() {
      if (scheduled.current) return;
      scheduled.current = true;
      frame.current = window.requestAnimationFrame(evaluate);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      scheduled.current = false;
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [ref, threshold, delta]);

  return hidden;
}
