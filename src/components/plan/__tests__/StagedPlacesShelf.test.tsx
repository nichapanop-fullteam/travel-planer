import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StagedPlacesShelf } from "@/components/plan/StagedPlacesShelf";
import type { Activity, Day } from "@/types";

function place(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "item-1",
    time: "",
    title: "ร้านมาลองเต๊อะ เชียงราย",
    category: "food",
    cost: 0,
    ...overrides,
  } as Activity;
}

function day(id: string, dayNumber: number, activities: Activity[] = []): Day {
  return { id, dayNumber, date: "2026-10-10", activities } as Day;
}

const DAYS = [day("day-1", 1, [place({ id: "x" }), place({ id: "y" })]), day("day-2", 2)];

function openDayMenu(label = "ร้านมาลองเต๊อะ เชียงราย") {
  fireEvent.click(screen.getByRole("button", { name: `เลือกวันให้ ${label}` }));
}

describe("StagedPlacesShelf", () => {
  // An empty box headed "places you have not scheduled" is an accusation, not
  // information.
  it("renders nothing when the shelf is empty", () => {
    const { container } = render(
      <StagedPlacesShelf places={[]} days={DAYS} onAssign={vi.fn()} onDelete={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("lists what is waiting, and how much of it", () => {
    render(
      <StagedPlacesShelf
        places={[place(), place({ id: "item-2", title: "วัดร่องขุ่น" })]}
        days={DAYS}
        onAssign={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("ร้านมาลองเต๊อะ เชียงราย")).toBeInTheDocument();
    expect(screen.getByText("วัดร่องขุ่น")).toBeInTheDocument();
    expect(screen.getByText("2 ที่")).toBeInTheDocument();
  });

  it("offers every day, with how full each already is", () => {
    render(
      <StagedPlacesShelf places={[place()]} days={DAYS} onAssign={vi.fn()} onDelete={vi.fn()} />
    );

    openDayMenu();

    expect(screen.getByText("ลงวันที่ 1")).toBeInTheDocument();
    expect(screen.getByText("ลงวันที่ 2")).toBeInTheDocument();
    expect(screen.getByText("2 ที่")).toBeInTheDocument();
    expect(screen.getByText("0 ที่")).toBeInTheDocument();
  });

  it("reports which place is going to which day", () => {
    const onAssign = vi.fn();
    render(
      <StagedPlacesShelf places={[place()]} days={DAYS} onAssign={onAssign} onDelete={vi.fn()} />
    );

    openDayMenu();
    fireEvent.click(screen.getByText("ลงวันที่ 2"));

    expect(onAssign).toHaveBeenCalledWith("item-1", "day-2");
  });

  // A trip started from the "+" menu on someone else's plan has no days yet,
  // so this is a real state rather than an edge case.
  it("says what to do when the trip has no days yet", () => {
    render(
      <StagedPlacesShelf places={[place()]} days={[]} onAssign={vi.fn()} onDelete={vi.fn()} />
    );

    openDayMenu();

    expect(screen.getByText(/ยังไม่มีวันในแผน/)).toBeInTheDocument();
  });

  it("can drop a place it turns out you do not want", () => {
    const onDelete = vi.fn();
    render(
      <StagedPlacesShelf places={[place()]} days={DAYS} onAssign={vi.fn()} onDelete={onDelete} />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "ลบ ร้านมาลองเต๊อะ เชียงราย ออกจากรายการที่ยังไม่ได้ลงวัน",
      })
    );

    expect(onDelete).toHaveBeenCalledWith("item-1");
  });

  // Two assigns of the same stop would race for its order index.
  it("stops taking a second answer while one is being written", () => {
    render(
      <StagedPlacesShelf
        places={[place()]}
        days={DAYS}
        pendingPlaceId="item-1"
        onAssign={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "เลือกวันให้ ร้านมาลองเต๊อะ เชียงราย" })
    ).toBeDisabled();
  });
});
