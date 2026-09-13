import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AddPlaceCoachMark } from "@/components/plan/AddPlaceCoachMark";

const KEY = "punguide.addPlaceCoachMarkDismissed";
const HINT = "กดปุ่ม + เพื่อเพิ่มสถานที่ลงแผนของคุณ";

beforeEach(() => {
  window.localStorage.clear();
});

describe("AddPlaceCoachMark", () => {
  it("teaches the + button on a first visit", async () => {
    render(<AddPlaceCoachMark />);

    expect(await screen.findByText(HINT)).toBeInTheDocument();
  });

  it("stays gone once it has been dismissed", async () => {
    const { unmount } = render(<AddPlaceCoachMark />);
    fireEvent.click(await screen.findByRole("button", { name: "ปิดคำแนะนำ" }));

    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe("1");

    // The next trip this person opens.
    unmount();
    render(<AddPlaceCoachMark />);
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });
});
