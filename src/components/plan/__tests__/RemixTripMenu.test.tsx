import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RemixTripMenu } from "@/components/plan/RemixTripMenu";

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: /Remix Trip/ }));
}

describe("RemixTripMenu", () => {
  it("opens the two-choice menu instead of firing an action straight away", () => {
    const onWholeTrip = vi.fn();
    render(<RemixTripMenu variant="inline" onWholeTrip={onWholeTrip} />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    openMenu();

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /ใช้แผนในทริปทั้งหมด/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /เลือกใช้บางส่วน/ })).toBeInTheDocument();
    // The trigger itself must not be the action — that was the old behaviour,
    // and the chevron beside it pointed at nothing.
    expect(onWholeTrip).not.toHaveBeenCalled();
  });

  it("runs the whole-trip action and closes the menu", () => {
    const onWholeTrip = vi.fn();
    render(<RemixTripMenu variant="inline" onWholeTrip={onWholeTrip} />);

    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /ใช้แผนในทริปทั้งหมด/ }));

    expect(onWholeTrip).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("disables เลือกใช้บางส่วน while it has no handler behind it", () => {
    render(<RemixTripMenu variant="inline" onWholeTrip={vi.fn()} />);

    openMenu();
    const partial = screen.getByRole("menuitem", { name: /เลือกใช้บางส่วน/ });

    expect(partial).toBeDisabled();
    expect(partial).toHaveTextContent("เร็ว ๆ นี้");
  });

  it("enables เลือกใช้บางส่วน once a handler is passed", () => {
    const onPartial = vi.fn();
    render(<RemixTripMenu variant="inline" onWholeTrip={vi.fn()} onPartial={onPartial} />);

    openMenu();
    const partial = screen.getByRole("menuitem", { name: /เลือกใช้บางส่วน/ });
    expect(partial).toBeEnabled();
    expect(partial).not.toHaveTextContent("เร็ว ๆ นี้");

    fireEvent.click(partial);
    expect(onPartial).toHaveBeenCalledTimes(1);
  });

  it("opens upward in the fixed bottom bar so the menu is not clipped off-screen", () => {
    render(<RemixTripMenu variant="bar" onWholeTrip={vi.fn()} />);

    openMenu();

    expect(screen.getByRole("menu").className).toContain("bottom-full");
  });
});
