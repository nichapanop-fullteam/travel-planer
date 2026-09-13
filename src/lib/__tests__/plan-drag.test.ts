import { describe, expect, it } from "vitest";
import { resolveDragEnd } from "@/lib/plan-drag";
import { SHELF_ID } from "@/components/plan/StagedPlacesShelf";
import type { Activity, GeneratedTrip } from "@/types";

function place(id: string, title = id): Activity {
  return { id, time: "", title, category: "food", cost: 0 } as Activity;
}

// Day 1 has two stops, Day 2 is empty, and one place waits on the shelf.
function trip(overrides: Partial<GeneratedTrip> = {}): GeneratedTrip {
  return {
    id: "trip-1",
    days: [
      { id: "day-1", dayNumber: 1, date: "2026-10-10", activities: [place("a1"), place("a2")] },
      { id: "day-2", dayNumber: 2, date: "2026-10-11", activities: [] },
    ],
    stagedPlaces: [place("s1")],
    ...overrides,
  } as GeneratedTrip;
}

describe("resolveDragEnd — reordering inside one day", () => {
  it("returns the day's stops in their new order", () => {
    expect(resolveDragEnd(trip(), "a2", "a1")).toEqual({
      kind: "reorder",
      dayId: "day-1",
      activities: [place("a2"), place("a1")],
    });
  });

  it("does nothing when a card is dropped on itself", () => {
    expect(resolveDragEnd(trip(), "a1", "a1")).toBeNull();
  });

  // There is no endpoint to persist the shelf's own order yet, and an order
  // that silently resets on the next reload is worse than one that never moved.
  it("refuses to reorder the shelf", () => {
    const t = trip({ stagedPlaces: [place("s1"), place("s2")] });

    expect(resolveDragEnd(t, "s2", "s1")).toBeNull();
  });
});

describe("resolveDragEnd — moving between buckets", () => {
  it("drops a shelved place onto the card it was aimed at", () => {
    expect(resolveDragEnd(trip(), "s1", "a2")).toEqual({
      kind: "move",
      placeId: "s1",
      toDayId: "day-1",
      toIndex: 1,
    });
  });

  // Dropping on the bucket itself, rather than on any card in it.
  it("appends when dropped on a day rather than on one of its stops", () => {
    expect(resolveDragEnd(trip(), "s1", "day-1")).toEqual({
      kind: "move",
      placeId: "s1",
      toDayId: "day-1",
      toIndex: undefined,
    });
  });

  // A day with no stops has no card to aim at, which is the whole reason its
  // droppable id has to resolve on its own.
  it("can drop into a day that is empty", () => {
    expect(resolveDragEnd(trip(), "s1", "day-2")).toEqual({
      kind: "move",
      placeId: "s1",
      toDayId: "day-2",
      toIndex: undefined,
    });
  });

  it("moves a stop from one day to another", () => {
    expect(resolveDragEnd(trip(), "a1", "day-2")).toEqual({
      kind: "move",
      placeId: "a1",
      toDayId: "day-2",
      toIndex: undefined,
    });
  });

  // The undo for every assign.
  it("sends a stop back to the shelf", () => {
    expect(resolveDragEnd(trip(), "a1", SHELF_ID)).toEqual({
      kind: "move",
      placeId: "a1",
      toDayId: null,
      toIndex: undefined,
    });
  });

  it("sends it back at the position it was dropped at", () => {
    expect(resolveDragEnd(trip(), "a1", "s1")).toEqual({
      kind: "move",
      placeId: "a1",
      toDayId: null,
      toIndex: 0,
    });
  });
});

describe("resolveDragEnd — drops that mean nothing", () => {
  it("does nothing when the card was released over no bucket at all", () => {
    expect(resolveDragEnd(trip(), "a1", null)).toBeNull();
  });

  it("does nothing when the target is not part of this plan", () => {
    expect(resolveDragEnd(trip(), "a1", "some-other-thing")).toBeNull();
  });

  it("does nothing when the dragged id is not part of this plan", () => {
    expect(resolveDragEnd(trip(), "ghost", "day-2")).toBeNull();
  });

  // A trip that has never synced has no shelf field at all.
  it("copes with a trip that has no shelf", () => {
    const t = trip({ stagedPlaces: undefined });

    expect(resolveDragEnd(t, "a1", "day-2")).toMatchObject({ kind: "move", toDayId: "day-2" });
    expect(resolveDragEnd(t, "a1", SHELF_ID)).toMatchObject({ toDayId: null });
  });
});
