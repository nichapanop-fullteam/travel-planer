import { describe, expect, it } from "vitest";
import { buildGeneratedTripFromBackendTrip } from "@/lib/generated-trips";
import type { BackendTrip } from "@/lib/trips-api";

// Only the fields the builder actually reads — schedule must be an object
// (it destructures then reads durationNights off it) and days must be an array.
function backendTrip(overrides: Partial<BackendTrip> = {}): BackendTrip {
  return {
    id: "trip-1",
    ownerId: "owner-1",
    title: "กรุงเทพมหานคร",
    destination: "กรุงเทพมหานคร",
    status: "draft",
    schedule: { durationDays: 3, durationNights: 2 },
    totalBudget: 0,
    days: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as BackendTrip;
}

// These cover the destinationPlace API update. Without the mapping, the trip
// page had no coordinates to search around and every recommendation list fell
// back to one hardcoded city — a Bangkok trip listing Luang Prabang temples.
describe("buildGeneratedTripFromBackendTrip — destinationPlace", () => {
  it("carries the coordinates through so the place search has a centre", () => {
    const trip = buildGeneratedTripFromBackendTrip(
      backendTrip({
        destinationPlace: {
          placeId: "ChIJjYnGqmoXBDERUNK04UrYAwQ",
          name: "Bangkok",
          country: "Thailand",
          countryCode: "TH",
          latitude: 13.7563,
          longitude: 100.5018,
        },
      })
    );

    expect(trip.destinationPlace).toEqual({
      placeId: "ChIJjYnGqmoXBDERUNK04UrYAwQ",
      name: "Bangkok",
      country: "Thailand",
      countryCode: "TH",
      latitude: 13.7563,
      longitude: 100.5018,
    });
  });

  it("keeps the exact decimals rather than rounding them", () => {
    // Stored DECIMAL(9,6) server-side; a rounded centre would shift the search
    // area, so assert the full precision survives the mapping.
    const trip = buildGeneratedTripFromBackendTrip(
      backendTrip({
        destinationPlace: { name: "เกาะช้างใต้", latitude: 12.011734, longitude: 102.380755 },
      })
    );

    expect(trip.destinationPlace?.latitude).toBe(12.011734);
    expect(trip.destinationPlace?.longitude).toBe(102.380755);
  });

  it("fills country with an empty string when the API omits it", () => {
    // Destination.country is typed required, the API returns it optional and
    // its own example sends only countryCode. "" is what the rest of the app
    // already treats as unknown for this field.
    const trip = buildGeneratedTripFromBackendTrip(
      backendTrip({
        destinationPlace: { name: "เกาะช้างใต้", countryCode: "TH", latitude: 12.011734, longitude: 102.380755 },
      })
    );

    expect(trip.destinationPlace?.country).toBe("");
    expect(trip.destinationPlace?.countryCode).toBe("TH");
  });

  it("leaves destinationPlace undefined for a trip with no coordinates", () => {
    // The API omits the key entirely rather than sending null or a zeroed
    // object, so nothing here should invent a 0/0 centre — that's what the
    // NoDestinationCoordsNotice empty state keys off.
    const trip = buildGeneratedTripFromBackendTrip(backendTrip());

    expect(trip.destinationPlace).toBeUndefined();
    expect(trip.destination).toBe("กรุงเทพมหานคร");
  });
});

// The distinction that keeps a reload from wiping the shelf: [] is an answer
// (an owner whose shelf is genuinely empty), undefined is silence (a backend
// that has no shelf to report). Only the second may be overridden by the
// local copy — see the ??= block in generated-plan/[id].
describe("buildGeneratedTripFromBackendTrip — the staging shelf", () => {
  const shelved = {
    id: "item-1",
    time: "",
    title: "ร้านมาลองเต๊อะ เชียงราย",
    category: "food",
    cost: 0,
  };

  it("carries shelved places through", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trip = buildGeneratedTripFromBackendTrip(backendTrip({ stagedItems: [shelved] as any }));

    expect(trip.stagedPlaces).toEqual([shelved]);
  });

  // Every gate on the plan page that asks "does the server know this stop?"
  // reads backendItemIds, and a shelved stop can be deleted and assigned.
  it("counts them as stops the server knows about", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trip = buildGeneratedTripFromBackendTrip(backendTrip({ stagedItems: [shelved] as any }));

    expect(trip.backendItemIds).toContain("item-1");
  });

  it("reports an empty shelf as empty, not as unknown", () => {
    const trip = buildGeneratedTripFromBackendTrip(backendTrip({ stagedItems: [] }));

    expect(trip.stagedPlaces).toEqual([]);
  });

  it("stays undefined when the backend does not report a shelf at all", () => {
    const trip = buildGeneratedTripFromBackendTrip(backendTrip());

    expect(trip.stagedPlaces).toBeUndefined();
  });
});
