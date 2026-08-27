import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";

// The hook batches work into requestAnimationFrame. Run those callbacks
// straight away so a scroll dispatch settles inside one act().
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => vi.unstubAllGlobals());

// jsdom won't scroll anything, so the "container" is a plain div whose
// scrollTop we set by hand before dispatching the event the hook listens for.
function Harness({ onState }: { onState: (hidden: boolean) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const hidden = useHideOnScroll(ref);
  onState(hidden);
  return <div ref={ref} data-testid="scroller" />;
}

function setup() {
  let hidden = false;
  const { getByTestId } = render(<Harness onState={(h) => (hidden = h)} />);
  const el = getByTestId("scroller");

  function scrollTo(y: number) {
    act(() => {
      el.scrollTop = y;
      el.dispatchEvent(new Event("scroll"));
    });
  }

  return { scrollTo, isHidden: () => hidden };
}

describe("useHideOnScroll", () => {
  it("starts visible", () => {
    const { isHidden } = setup();
    expect(isHidden()).toBe(false);
  });

  it("hides once the reader scrolls down past the threshold", () => {
    const { scrollTo, isHidden } = setup();

    // Still inside the 96px threshold — a small nudge near the top of the feed
    // must not make the header disappear.
    scrollTo(60);
    expect(isHidden()).toBe(false);

    scrollTo(400);
    expect(isHidden()).toBe(true);
  });

  it("comes back on the first upward scroll", () => {
    const { scrollTo, isHidden } = setup();
    scrollTo(400);
    expect(isHidden()).toBe(true);

    scrollTo(300);
    expect(isHidden()).toBe(false);
  });

  it("always reveals near the top, even after a fast downward fling", () => {
    const { scrollTo, isHidden } = setup();
    scrollTo(900);
    expect(isHidden()).toBe(true);

    // Jumping back to the top must not leave the header stranded off-screen.
    scrollTo(0);
    expect(isHidden()).toBe(false);
  });

  it("ignores movements below the delta so the header doesn't flicker", () => {
    const { scrollTo, isHidden } = setup();
    scrollTo(400);
    expect(isHidden()).toBe(true);

    // 4px of trackpad inertia upward — under the 8px delta, so the state holds
    // instead of flipping.
    scrollTo(396);
    expect(isHidden()).toBe(true);
  });
});
