import { describe, expect, it } from "vitest";

import { toPerPersonAmount, toWholeTripAmount } from "@/lib/budget-units";
import { buildCreateTripRequest } from "@/lib/trips-create-api";
import type { GeneratedTrip, TripDraft } from "@/types";

describe("budget unit conversion", () => {
  it("converts between the API's whole-trip cap and the per-person figures shown", () => {
    expect(toPerPersonAmount(36000, 4)).toBe(9000);
    expect(toWholeTripAmount(9000, 4)).toBe(36000);
  });

  // Guessing a traveler count would scale a real money figure by a made-up
  // number, so an unknown group is a pass-through in both directions.
  it("leaves amounts untouched when the group size is unknown", () => {
    expect(toPerPersonAmount(36000, undefined)).toBe(36000);
    expect(toPerPersonAmount(36000, 0)).toBe(36000);
    expect(toWholeTripAmount(9000, undefined)).toBe(9000);
  });
});

describe("POST /trips/create budgetLimit", () => {
  const trip = {
    id: "trip-1",
    title: "เที่ยวเชียงใหม่",
    destination: "เชียงใหม่, ไทย",
    days: [
      { id: "d1", dayNumber: 1, date: "2026-10-10", activities: [] },
      { id: "d2", dayNumber: 2, date: "2026-10-11", activities: [] },
      { id: "d3", dayNumber: 3, date: "2026-10-12", activities: [] },
    ],
  } as unknown as GeneratedTrip;

  const draft = {
    adults: 2,
    children: 2,
    styles: [],
    conditions: [],
    budget: "custom",
    customBudget: "1000",
  } as unknown as TripDraft;

  // The wizard collects baht per person per day; the API's cap is for the
  // whole trip and the whole group.
  it("sends the wizard's per-person-per-day amount as a whole-trip total", () => {
    expect(buildCreateTripRequest(trip, draft).budgetLimit).toBe(1000 * 3 * 4);
  });

  it("scales a preset tier by days and travellers too", () => {
    const comfort = { ...draft, budget: "Comfort", customBudget: "" } as unknown as TripDraft;
    // 3000 ฿/person/day (BUDGET_TIER_DAILY_AMOUNT) × 3 days × 4 travellers.
    expect(buildCreateTripRequest(trip, comfort).budgetLimit).toBe(36000);
  });
});
