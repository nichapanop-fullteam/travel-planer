import { describe, expect, it } from "vitest";
import { buildActivity } from "@/lib/trips-create-api";
import type { Activity } from "@/types";

function stop(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "a1",
    time: "09:00",
    title: "วัดพระสิงห์วรมหาวิหาร",
    category: "sightseeing",
    cost: 0,
    ...overrides,
  } as Activity;
}

// The regression the traveller saw: photos arrived and the travel figures
// vanished. The figures only ever existed in this browser, so the first
// refetch of GET /trips/:id rebuilt every stop without them.
describe("buildActivity — the plan's travel estimate reaches the server", () => {
  it("sends the generated plan's estimate when the traveller entered nothing", () => {
    const payload = buildActivity(
      stop({ planTravelEstimate: { durationMin: 6, distanceKm: 2.99 } }),
      1
    );

    expect(payload.travelTimeFromPrevMin).toBe(6);
    expect(payload.travelDistanceFromPrevKm).toBe(2.99);
  });

  // travelFromPrevious means "the traveller entered this". A guess must never
  // overwrite it.
  it("lets what the traveller entered win over the estimate", () => {
    const payload = buildActivity(
      stop({
        planTravelEstimate: { durationMin: 6, distanceKm: 2.99 },
        travelFromPrevious: { type: "walk", durationMin: 20, distanceKm: 1.2 },
      }),
      1
    );

    expect(payload.travelTimeFromPrevMin).toBe(20);
    expect(payload.travelDistanceFromPrevKm).toBe(1.2);
  });

  it("sends nothing for a stop with neither", () => {
    const payload = buildActivity(stop(), 0);

    expect(payload.travelTimeFromPrevMin).toBeUndefined();
    expect(payload.travelDistanceFromPrevKm).toBeUndefined();
  });

  // Half an estimate is still worth keeping.
  it("sends whichever half of the estimate exists", () => {
    const payload = buildActivity(stop({ planTravelEstimate: { durationMin: 6 } }), 1);

    expect(payload.travelTimeFromPrevMin).toBe(6);
    expect(payload.travelDistanceFromPrevKm).toBeUndefined();
  });
});
