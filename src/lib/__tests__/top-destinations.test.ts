import { describe, expect, it } from "vitest";
import { deriveTopDestinations, destinationGroupLabel } from "@/lib/top-destinations";
import type { BackendTripListItem } from "@/lib/trips-api";

function trip(partial: Partial<BackendTripListItem> & { id: string; destination: string }): BackendTripListItem {
  return {
    title: partial.destination,
    status: "shared",
    totalBudget: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    isSaved: false,
    isLiked: false,
    likeCount: 0,
    ...partial,
  };
}

describe("destinationGroupLabel", () => {
  // The rail groups at country level, which is the last segment of the real
  // "City, Country" destinations the API returns.
  it("takes the country segment, and keeps a single-segment destination whole", () => {
    expect(destinationGroupLabel("Tokyo, Japan")).toBe("Japan");
    expect(destinationGroupLabel("หลวงพระบาง, ลาว")).toBe("ลาว");
    expect(destinationGroupLabel("  Bangkok  ")).toBe("Bangkok");
  });
});

describe("deriveTopDestinations", () => {
  it("ranks by trip count and caps at the limit", () => {
    const result = deriveTopDestinations(
      [
        trip({ id: "1", destination: "หลวงพระบาง, ลาว" }),
        trip({ id: "2", destination: "วังเวียง, ลาว" }),
        trip({ id: "3", destination: "Tokyo, Japan" }),
        trip({ id: "4", destination: "Kyoto, Japan" }),
        trip({ id: "5", destination: "Da Nang, เวียดนาม" }),
      ],
      2
    );

    expect(result.map((d) => [d.label, d.tripCount])).toEqual([
      ["ลาว", 2],
      ["Japan", 2],
    ]);
  });

  // Equal counts are broken by label rather than left to Map insertion order,
  // so the rail doesn't reshuffle between renders — which is the common case
  // early on, when every country has exactly one trip. The specific collation
  // is not the contract; being the same every call is.
  it("orders equal-count destinations deterministically", () => {
    const feed = [
      trip({ id: "1", destination: "Tokyo, Japan" }),
      trip({ id: "2", destination: "Da Nang, เวียดนาม" }),
      trip({ id: "3", destination: "หลวงพระบาง, ลาว" }),
    ];

    const first = deriveTopDestinations(feed).map((d) => d.label);
    const reversed = deriveTopDestinations([...feed].reverse()).map((d) => d.label);

    expect(first).toEqual(reversed);
    expect(first).toHaveLength(3);
  });

  // The cover has to be a real trip from the group, picked by a real signal —
  // most-liked, then most-recent — not just whichever row happened to be first.
  it("represents a group with its most-liked trip's cover", () => {
    const [laos] = deriveTopDestinations([
      trip({ id: "quiet", destination: "หลวงพระบาง, ลาว", likeCount: 1 }),
      trip({ id: "popular", destination: "วังเวียง, ลาว", likeCount: 9 }),
    ]);

    expect(laos.coverTripId).toBe("popular");
  });

  it("returns nothing for an empty feed rather than a placeholder row", () => {
    expect(deriveTopDestinations([])).toEqual([]);
  });
});
