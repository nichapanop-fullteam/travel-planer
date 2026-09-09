import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addPlaceToTripDay,
  addablePlaceFromActivity,
  getTripDayOptions,
} from "@/lib/add-place-to-trip";
import { getTrip } from "@/lib/trips-api";
import { searchExternalPlaces } from "@/lib/external-places-api";
import { createTripItemOnServer } from "@/lib/trips-update-api";
import type { Activity } from "@/types";

vi.mock("@/lib/trips-api", () => ({ getTrip: vi.fn() }));
vi.mock("@/lib/external-places-api", () => ({ searchExternalPlaces: vi.fn() }));
vi.mock("@/lib/trips-update-api", () => ({ createTripItemOnServer: vi.fn() }));

const getTripMock = vi.mocked(getTrip);
const searchMock = vi.mocked(searchExternalPlaces);
const createItemMock = vi.mocked(createTripItemOnServer);

// น้ำตกตาดกวางสี as it arrives from GET /trips/:id: a `location` with a name
// and coordinates and NO place id — that omission is the whole reason this
// module has to search.
const activity: Activity = {
  id: "source-item-1",
  time: "13:00",
  title: "น้ำตกตาดกวางสี",
  category: "sightseeing",
  cost: 270,
  notes: "ค่าเข้า 50 บาท",
  travelNote: "~45 นาที · 30 กม.",
  travelFromPrevious: { type: "rental_car", durationMin: 45, distanceKm: 30 },
  location: { name: "น้ำตกตาดกวางสี", lat: 19.7477, lng: 101.9946 },
};

// What the menu's day step hands back to addPlaceToTripDay.
function dayOption(id: string, dayNumber: number) {
  return { id, dayNumber, date: "2026-10-11", activityCount: 0 };
}

beforeEach(() => {
  vi.clearAllMocks();
  createItemMock.mockResolvedValue({ place: { ...activity, id: "new-item" }, travelSegment: null });
});

describe("getTripDayOptions", () => {
  it("lists the target trip's days with how full each one is", async () => {
    getTripMock.mockResolvedValue({
      id: "target-trip",
      days: [
        { id: "day-1", dayNumber: 1, date: "2026-10-10", activities: [{}, {}] },
        { id: "day-2", dayNumber: 2, date: "2026-10-11", activities: [] },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(getTripDayOptions("target-trip")).resolves.toEqual([
      { id: "day-1", dayNumber: 1, date: "2026-10-10", activityCount: 2 },
      { id: "day-2", dayNumber: 2, date: "2026-10-11", activityCount: 0 },
    ]);
  });

  it("refuses a trip that is gone", async () => {
    getTripMock.mockResolvedValue(null);
    await expect(getTripDayOptions("target-trip")).rejects.toThrow("ไม่พบทริปที่เลือก");
  });
});

describe("addPlaceToTripDay", () => {
  it("links the resolved place and posts to the day the caller picked", async () => {
    searchMock.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "น้ำตกตาดกวางสี",
        address: "หลวงพระบาง",
        category: "attraction",
        lat: 19.7481,
        lng: 101.9941,
      },
    ]);

    await expect(
      addPlaceToTripDay(dayOption("day-2", 2), addablePlaceFromActivity(activity))
    ).resolves.toEqual({ dayNumber: 2, linkedToPlace: true });

    const [dayId, item] = createItemMock.mock.calls[0];
    expect(dayId).toBe("day-2");
    expect(item).toMatchObject({
      placeId: "11111111-1111-4111-8111-111111111111",
      time: "13:00",
      cost: 270,
      notes: "ค่าเข้า 50 บาท",
      isAiSuggested: false,
    });
    // The leg belongs to the source trip's ordering, not to this one — see the
    // note in add-place-to-trip.ts.
    expect(item).not.toHaveProperty("travelNotesFromPrev");
    expect(item).not.toHaveProperty("travelTimeFromPrevMin");
    expect(item).not.toHaveProperty("orderIndex");
    // The day came from the picker, so nothing had to fetch the trip again.
    expect(getTripMock).not.toHaveBeenCalled();
  });

  // The whole point of GET /trips/:id reporting location.placeId: a stop that
  // knows its own place must not pay for a search, and must not risk resolving
  // to a different place of the same name.
  it("uses the stop's own placeId and never searches", async () => {
    await expect(
      addPlaceToTripDay(dayOption("day-1", 1), {
        ...addablePlaceFromActivity(activity),
        placeId: "33333333-3333-4333-8333-333333333333",
      })
    ).resolves.toEqual({ dayNumber: 1, linkedToPlace: true });

    expect(searchMock).not.toHaveBeenCalled();
    expect(createItemMock.mock.calls[0][1]).toMatchObject({
      placeId: "33333333-3333-4333-8333-333333333333",
    });
  });

  it("keeps the stop unlinked when the only search hit is somewhere else entirely", async () => {
    searchMock.mockResolvedValue([
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "น้ำตกตาดกวางสี",
        address: "Somewhere far away",
        category: "attraction",
        lat: 13.7563,
        lng: 100.5018, // Bangkok — ~1,000 km from the real waterfall
      },
    ]);

    await expect(
      addPlaceToTripDay(dayOption("day-1", 1), addablePlaceFromActivity(activity))
    ).resolves.toEqual({ dayNumber: 1, linkedToPlace: false });
    expect(createItemMock.mock.calls[0][1]).toMatchObject({
      placeId: undefined,
      title: "น้ำตกตาดกวางสี",
      category: "sightseeing",
    });
  });

  it("still saves the stop by name when the place search finds nothing", async () => {
    searchMock.mockResolvedValue([]);

    await expect(
      addPlaceToTripDay(dayOption("day-1", 1), addablePlaceFromActivity(activity))
    ).resolves.toMatchObject({ linkedToPlace: false });
    expect(createItemMock).toHaveBeenCalledTimes(1);
  });
});
