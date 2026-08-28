import { describe, expect, it } from "vitest";

import { buildCreateTripItemRequest } from "@/lib/trips-update-api";

describe("granular trip item API contract", () => {
  it("maps bulk-plan field names to POST /days/:dayId/items", () => {
    expect(
      buildCreateTripItemRequest({
        id: "client-only-idempotency-key",
        placeId: "33333333-3333-4333-8333-333333333333",
        title: "วัดเชียงทอง",
        category: "sightseeing",
        time: "09:00",
        cost: 200,
        costCurrency: "THB",
        notes: "ไปเช้า",
        orderIndex: 1,
      })
    ).toEqual({
      placeId: "33333333-3333-4333-8333-333333333333",
      customName: undefined,
      category: undefined,
      startTime: "09:00",
      costAmount: 200,
      costCurrency: "THB",
      notes: "ไปเช้า",
      orderIndex: 1,
    });
  });

  it("uses customName and category for a hand-typed stop", () => {
    expect(
      buildCreateTripItemRequest({
        title: "เดินตลาดมืด",
        category: "other",
        time: "18:00",
        cost: 0,
      })
    ).toMatchObject({
      customName: "เดินตลาดมืด",
      category: "other",
      startTime: "18:00",
      costAmount: 0,
    });
  });
});
