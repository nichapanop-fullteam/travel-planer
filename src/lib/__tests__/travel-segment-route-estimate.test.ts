import { describe, expect, it } from "vitest";

import { getDayRouteEstimate } from "@/lib/trip-utils";
import type { Day } from "@/types";

describe("travel segment route estimates", () => {
  it("uses calculated backend segments instead of client travel guesses", () => {
    const day: Day = {
      id: "day-1",
      dayNumber: 1,
      date: "2026-08-28",
      activities: [
        { id: "item-a", time: "09:00", title: "A", category: "other", cost: 0 },
        { id: "item-b", time: "10:00", title: "B", category: "other", cost: 0 },
        { id: "item-c", time: "11:00", title: "C", category: "other", cost: 0 },
      ],
      travelSegments: [
        {
          id: "segment-1",
          dayId: "day-1",
          fromPlaceId: "item-a",
          toPlaceId: "item-b",
          order: 0,
          travelMode: "DRIVE",
          routeStatus: "CALCULATED",
          durationSeconds: 300,
          durationMinutes: 5,
          distanceMeters: 1800,
          distanceKilometers: 1.8,
          calculatedAt: "2026-08-28T10:00:00.000Z",
        },
        {
          id: "segment-2",
          dayId: "day-1",
          fromPlaceId: "item-b",
          toPlaceId: "item-c",
          order: 1,
          travelMode: "DRIVE",
          routeStatus: "CALCULATED",
          durationSeconds: 420,
          durationMinutes: 7,
          distanceMeters: 2200,
          distanceKilometers: 2.2,
          calculatedAt: "2026-08-28T10:01:00.000Z",
        },
      ],
    };

    expect(getDayRouteEstimate(day)).toEqual({ distanceKm: 4, minutes: 12 });
  });

  it("ignores failed segments whose route numbers are null", () => {
    const day: Day = {
      id: "day-1",
      dayNumber: 1,
      date: "",
      activities: [
        { id: "item-a", time: "", title: "A", category: "other", cost: 0 },
        { id: "item-b", time: "", title: "B", category: "other", cost: 0 },
      ],
      travelSegments: [
        {
          id: "segment-failed",
          dayId: "day-1",
          fromPlaceId: "item-a",
          toPlaceId: "item-b",
          order: 0,
          travelMode: "DRIVE",
          routeStatus: "FAILED",
          durationSeconds: null,
          durationMinutes: null,
          distanceMeters: null,
          distanceKilometers: null,
          calculatedAt: null,
        },
      ],
    };

    expect(getDayRouteEstimate(day)).toEqual({ distanceKm: 3.1, minutes: 55 });
  });
});
