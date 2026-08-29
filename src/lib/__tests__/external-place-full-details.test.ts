import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPlaceFullDetails, fetchResolvedPlaceFullDetails } from "@/lib/external-places-api";

const placeDetails = {
  externalRef: "ChIJ-test",
  name: "Berthillon",
  address: "Paris",
  lat: 48.8517,
  lng: 2.3567,
  primaryType: "ice_cream_shop",
  primaryTypeDisplayName: "ร้านไอศกรีม",
  rating: 4.5,
  userRatingCount: 4679,
  priceLevel: "PRICE_LEVEL_EXPENSIVE",
  nationalPhoneNumber: null,
  internationalPhoneNumber: null,
  websiteUri: null,
  googleMapsUri: null,
  businessStatus: "OPERATIONAL",
  editorialSummary: null,
  regularOpeningHours: null,
  currentOpeningHours: null,
  accessibilityOptions: null,
  photos: [],
  reviews: [],
};

describe("fetchPlaceFullDetails", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads a place by the internal place UUID", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(placeDetails), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchPlaceFullDetails("12f642ae-d16f-4e64-bf5a-fca160f2d945")).resolves.toEqual(placeDetails);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/places/12f642ae-d16f-4e64-bf5a-fca160f2d945",
      { signal: undefined }
    );
  });

  it("maps 404 and upstream failures to stable UI errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(fetchPlaceFullDetails("missing")).rejects.toThrow("PLACE_NOT_FOUND");

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(fetchPlaceFullDetails("unavailable")).rejects.toThrow("PLACE_DETAILS_UNAVAILABLE");
  });

  it("resolves a legacy item without an internal UUID by exact place name", async () => {
    const internalId = "90688296-595a-42a3-b501-4661cd4ccec9";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: internalId, name: "Hilton Tokyo", address: "Tokyo", category: "hotel", lat: 35.69, lng: 139.69 },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...placeDetails, name: "Hilton Tokyo" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    await expect(fetchResolvedPlaceFullDetails(undefined, "Hilton Tokyo")).resolves.toMatchObject({
      name: "Hilton Tokyo",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/places/search?q=Hilton+Tokyo&limit=5");
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/places/${internalId}`, { signal: undefined });
  });
});
