import { describe, expect, it } from "vitest";

import { buildGeneratePlanRequest, MAX_SELECTED_PLACE_IDS } from "@/lib/generate-plan-mapping";
import type { TripDraft } from "@/types";

function draftWith(overrides: Partial<TripDraft> = {}): TripDraft {
  return {
    id: "draft-1",
    createdAt: "2026-09-04T00:00:00.000Z",
    mode: "ai",
    destination: "เชียงใหม่, ไทย",
    duration: "3 วัน 2 คืน",
    guests: "ผู้ใหญ่ 2 คน",
    adults: 2,
    children: 0,
    styles: [],
    pace: null,
    budget: null,
    customBudget: "",
    conditions: [],
    ...overrides,
  };
}

function unbooked(overrides: Partial<NonNullable<NonNullable<TripDraft["accommodation"]>["unbooked"]>> = {}) {
  return draftWith({
    accommodation: {
      status: "unbooked",
      unbooked: { styles: [], styleRecommend: false, grades: [], gradeRecommend: false, note: "", ...overrides },
    },
  });
}

describe("POST /trips/plan/generate request mapping", () => {
  it("maps hotel style chips onto the accommodation.styles enum", () => {
    const { preferences } = buildGeneratePlanRequest(unbooked({ styles: ["บูทีค", "โฮมสเตย์"] }));

    expect(preferences?.accommodation).toMatchObject({
      status: "not_booked",
      styles: ["boutique", "homestay"],
    });
    expect(preferences?.accommodation?.customStyles).toBeUndefined();
  });

  it("routes style chips with no enum value to customStyles", () => {
    const { preferences } = buildGeneratePlanRequest(
      unbooked({ styles: ["รีสอร์ท", "อพาร์ทเมนท์", "แคมป์ปิ้ง / กลางแจ้ง"] })
    );

    expect(preferences?.accommodation?.styles).toEqual(["resort"]);
    expect(preferences?.accommodation?.customStyles).toEqual(["อพาร์ทเมนท์", "แคมป์ปิ้ง / กลางแจ้ง"]);
  });

  // The API's grade is an enum, not a star count — sending "3★" is a 400.
  it("converts star chips to a single grade enum, keeping the highest picked", () => {
    expect(buildGeneratePlanRequest(unbooked({ grades: ["3★"] })).preferences?.accommodation?.grade).toBe("midscale");

    const multiple = buildGeneratePlanRequest(unbooked({ grades: ["3★", "5★", "4★"] })).preferences?.accommodation;
    expect(multiple?.grade).toBe("luxury");
    // The tiers that lost out are still stated, so the API isn't told less
    // than the traveler picked.
    expect(multiple?.notes).toContain("3★, 5★, 4★");
  });

  it("sends no grade or styles when the traveler asked PunGuide to choose", () => {
    const { preferences } = buildGeneratePlanRequest(
      unbooked({ styles: ["บูทีค"], styleRecommend: true, grades: ["5★"], gradeRecommend: true, note: "ใกล้ถนนคนเดิน" })
    );

    expect(preferences?.accommodation).toEqual({
      status: "not_booked",
      grade: undefined,
      styles: undefined,
      customStyles: undefined,
      notes: "ใกล้ถนนคนเดิน",
    });
  });

  it("passes picked recommendation ids through as selectedPlaceIds, deduped and capped", () => {
    const id = (n: number) => `place-${n}`;

    expect(buildGeneratePlanRequest(draftWith()).selectedPlaceIds).toBeUndefined();
    expect(buildGeneratePlanRequest(draftWith(), [id(1), id(2), id(1)]).selectedPlaceIds).toEqual([id(1), id(2)]);

    const tooMany = Array.from({ length: MAX_SELECTED_PLACE_IDS + 5 }, (_, i) => id(i));
    expect(buildGeneratePlanRequest(draftWith(), tooMany).selectedPlaceIds).toHaveLength(MAX_SELECTED_PLACE_IDS);
  });
});
