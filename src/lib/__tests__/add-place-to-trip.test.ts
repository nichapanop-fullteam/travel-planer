import { beforeEach, describe, expect, it, vi } from "vitest";

import { addPlaceToTripShelf, addablePlaceFromActivity } from "@/lib/add-place-to-trip";
import { searchExternalPlaces } from "@/lib/external-places-api";
import { createStagedItemOnServer } from "@/lib/trips-update-api";
import type { Activity } from "@/types";

vi.mock("@/lib/external-places-api", () => ({ searchExternalPlaces: vi.fn() }));
vi.mock("@/lib/trips-update-api", () => ({ createStagedItemOnServer: vi.fn() }));

const searchMock = vi.mocked(searchExternalPlaces);
const createItemMock = vi.mocked(createStagedItemOnServer);

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

beforeEach(() => {
  vi.clearAllMocks();
  createItemMock.mockResolvedValue({ ...activity, id: "new-item" });
});

describe("addPlaceToTripShelf", () => {
  it("links the resolved place and posts to the trip's shelf", async () => {
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
      addPlaceToTripShelf("target-trip", addablePlaceFromActivity(activity))
    ).resolves.toEqual({ linkedToPlace: true });

    const [tripId, item] = createItemMock.mock.calls[0];
    expect(tripId).toBe("target-trip");
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
  });

  // The whole point of GET /trips/:id reporting location.placeId: a stop that
  // knows its own place must not pay for a search, and must not risk resolving
  // to a different place of the same name.
  it("uses the stop's own placeId and never searches", async () => {
    await expect(
      addPlaceToTripShelf("target-trip", {
        ...addablePlaceFromActivity(activity),
        placeId: "33333333-3333-4333-8333-333333333333",
      })
    ).resolves.toEqual({ linkedToPlace: true });

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
      addPlaceToTripShelf("target-trip", addablePlaceFromActivity(activity))
    ).resolves.toEqual({ linkedToPlace: false });
    expect(createItemMock.mock.calls[0][1]).toMatchObject({
      placeId: undefined,
      title: "น้ำตกตาดกวางสี",
      category: "sightseeing",
    });
  });

  it("still saves the stop by name when the place search finds nothing", async () => {
    searchMock.mockResolvedValue([]);

    await expect(
      addPlaceToTripShelf("target-trip", addablePlaceFromActivity(activity))
    ).resolves.toMatchObject({ linkedToPlace: false });
    expect(createItemMock).toHaveBeenCalledTimes(1);
  });

  // The shelf dedupes by place server-side, so there is no key to send — see
  // createStagedItemOnServer.
  it("sends no idempotency key", async () => {
    await addPlaceToTripShelf("target-trip", {
      ...addablePlaceFromActivity(activity),
      placeId: "33333333-3333-4333-8333-333333333333",
    });

    expect(createItemMock.mock.calls[0]).toHaveLength(2);
  });
});
