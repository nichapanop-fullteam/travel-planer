import { describe, expect, it } from "vitest";
import { buildGeneratedTripFromApiResponse } from "@/lib/generated-trips";
import type { GeneratePlanResponse } from "@/lib/generate-plan-api";
import type { TripDraft } from "@/types";

function tripDraft(): TripDraft {
  return {
    id: "draft-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    mode: "ai",
    destination: "หลวงพระบาง, ลาว",
    duration: "3 วัน 2 คืน",
    guests: "ผู้ใหญ่ 2 คน",
    adults: 2,
    children: 0,
    styles: ["ภูเขา", "ธรรมชาติ"],
    pace: "Balance",
    budget: "Comfort",
    customBudget: "",
    conditions: ["เดินเยอะไม่ได้"],
  } as TripDraft;
}

function response(days: unknown): GeneratePlanResponse {
  return {
    draft: {
      title: "เที่ยวหลวงพระบาง 3 วัน",
      destination: "หลวงพระบาง, ลาว",
      planMode: "ai",
      numPeople: 2,
      budgetTier: "comfort",
      budgetLimit: 30000,
      styles: ["mountain", "nature"],
      intensity: "balance",
      transport: ["recommend"],
      constraints: ["limited_walking"],
      days,
    },
    resolvedBrief: {
      durationDays: 3,
      numPeople: 2,
      itemsPerDay: { min: 6, max: 6 },
      budgetPerPersonPerDayCap: 5000,
      budgetCapTotal: 30000,
      defaultsApplied: ["transport"],
      warnings: [],
    },
    generation: { attempts: 1, resolvedWithoutErrors: true, modelWarnings: [], violations: [] },
  } as GeneratePlanResponse;
}

// The live service returns a day's stops as `activities`, with `time` and
// `cost`, while the documented contract calls them `items`, with `startTime`
// and `costAmount`. Reading only the documented names made `day.items`
// undefined, so the .map() threw — and because that throw happened inside
// create-trip's .then(), it was swallowed by the same .catch() that handles a
// failed request: the plan generated fine, the traveler saw "เกิดข้อผิดพลาด"
// and never left the form.
describe("buildGeneratedTripFromApiResponse — day/item field naming", () => {
  it("reads the live service's activities/time/cost shape", () => {
    const trip = buildGeneratedTripFromApiResponse(
      tripDraft(),
      response([
        {
          dayNumber: 1,
          date: null,
          activities: [
            { time: "16:30", title: "พระธาตุพูสี", placeId: "dc55e684", cost: 300, costCurrency: "THB" },
          ],
        },
      ])
    );

    expect(trip.days).toHaveLength(1);
    expect(trip.days[0].date).toBe("");
    expect(trip.days[0].activities).toHaveLength(1);
    expect(trip.days[0].activities[0]).toMatchObject({
      time: "16:30",
      title: "พระธาตุพูสี",
      cost: 300,
    });
    expect(trip.days[0].activities[0].location).toMatchObject({ googlePlaceId: "dc55e684" });
  });

  it("still reads the documented items/startTime/costAmount shape", () => {
    const trip = buildGeneratedTripFromApiResponse(
      tripDraft(),
      response([
        {
          dayNumber: 1,
          items: [{ startTime: "09:15", title: "Wat Xieng Thong", costAmount: 300 }],
        },
      ])
    );

    expect(trip.days[0].activities[0]).toMatchObject({ time: "09:15", cost: 300 });
  });

  // A shape neither name matches must still produce a trip to navigate to —
  // an empty day is recoverable by hand, a thrown error is not.
  it("degrades an unrecognised day shape to an empty day instead of throwing", () => {
    const trip = buildGeneratedTripFromApiResponse(tripDraft(), response([{ dayNumber: 1 }]));

    expect(trip.days[0].activities).toEqual([]);
  });
});

// Every stop defaulting to "activity" made the trip header read
// "18 ที่เที่ยว / 0 ร้านอาหาร / 0 ที่พัก" — restaurants and hotels counted as
// sights. getTripPlaceStats and the icon lookup both key off ActivityCategory,
// so the places taxonomy the service sends has to be folded into it first.
describe("buildGeneratedTripFromApiResponse — category", () => {
  const activities = [
    { time: "08:00", title: "THE JAM hostel", category: "hotel" },
    { time: "09:15", title: "Wat Xieng Thong", category: "attraction" },
    { time: "12:30", title: "Dyen Sabai Restaurant", category: "restaurant" },
    { time: "15:00", title: "Saffron Coffee", category: "cafe" },
    { time: "17:00", title: "Night Market", category: "shopping" },
    { time: "19:00", title: "Slow boat", category: "transport" },
  ];

  it("folds the places taxonomy into ActivityCategory", () => {
    const trip = buildGeneratedTripFromApiResponse(
      tripDraft(),
      response([{ dayNumber: 1, activities }])
    );

    expect(trip.days[0].activities.map((a) => a.category)).toEqual([
      "hotel",
      "sightseeing",
      "food",
      "food",
      "other",
      "transport",
    ]);
  });

  it("passes an ActivityCategory value through untouched", () => {
    const trip = buildGeneratedTripFromApiResponse(
      tripDraft(),
      response([
        { dayNumber: 1, activities: [{ time: "09:00", title: "วัดเชียงทอง", category: "sightseeing" }] },
      ])
    );

    expect(trip.days[0].activities[0].category).toBe("sightseeing");
  });

  // Today's response has no category at all — that has to keep working, and an
  // unknown value must not be written into the trip as if it were valid.
  it("falls back to activity for a missing or unrecognised category", () => {
    const trip = buildGeneratedTripFromApiResponse(
      tripDraft(),
      response([
        {
          dayNumber: 1,
          activities: [
            { time: "09:00", title: "ไม่มี category" },
            { time: "10:00", title: "category ที่ไม่รู้จัก", category: "spaceport" },
          ],
        },
      ])
    );

    expect(trip.days[0].activities.map((a) => a.category)).toEqual(["activity", "activity"]);
  });
});
