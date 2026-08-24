import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useRemixTrip, type RemixFormValues, type RemixSourceMeta } from "@/hooks/useRemixTrip";
import { RemixApiError } from "@/lib/trip-remix-api";

const remixTripMock = vi.fn();
const saveGeneratedTripMock = vi.fn();
let mockBackendUser: { id: string } | null = { id: "user-1" };

vi.mock("@/lib/trip-remix-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/trip-remix-api")>("@/lib/trip-remix-api");
  return { ...actual, remixTrip: (...args: unknown[]) => remixTripMock(...args) };
});

vi.mock("@/lib/generated-trips", async () => {
  const actual = await vi.importActual<typeof import("@/lib/generated-trips")>("@/lib/generated-trips");
  return { ...actual, saveGeneratedTrip: (...args: unknown[]) => saveGeneratedTripMock(...args) };
});

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ backendUser: mockBackendUser, user: null, isLoading: false }),
}));

const values: RemixFormValues = {
  title: "ทริปหลวงพระบางของฉัน",
  startDate: "2026-09-12",
  travelerCount: 2,
  copyNotes: true,
  copyBudget: true,
};

const source: RemixSourceMeta = {
  sourceTripId: "source-1",
  sourceTitle: "หลวงพระบาง 3 วัน 2 คืน",
  sourceCreatorName: "TravelWithTawn",
  sourceDurationDays: 3,
};

describe("useRemixTrip", () => {
  beforeEach(() => {
    remixTripMock.mockReset();
    saveGeneratedTripMock.mockReset();
    mockBackendUser = { id: "user-1" };
  });

  it("goes idle -> submitting -> success and exposes the new trip id", async () => {
    let resolveFetch: (value: { id: string }) => void = () => {};
    remixTripMock.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));

    const { result } = renderHook(() => useRemixTrip());
    expect(result.current.status).toBe("idle");

    act(() => {
      void result.current.submit(values, source);
    });
    await waitFor(() => expect(result.current.status).toBe("submitting"));

    act(() => resolveFetch({ id: "new-trip-1" }));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.newTripId).toBe("new-trip-1");
    expect(saveGeneratedTripMock).toHaveBeenCalledTimes(1);
  });

  it("blocks a double-click submit — only one request fires", async () => {
    remixTripMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: "new-trip-1" }), 20))
    );

    const { result } = renderHook(() => useRemixTrip());

    act(() => {
      void result.current.submit(values, source);
      void result.current.submit(values, source);
      void result.current.submit(values, source);
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(remixTripMock).toHaveBeenCalledTimes(1);
  });

  it("never calls the Remix API when unauthenticated", async () => {
    mockBackendUser = null;
    const { result } = renderHook(() => useRemixTrip());

    await act(async () => {
      await result.current.submit(values, source);
    });

    expect(remixTripMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("unauthorized");
  });

  it("blocks submission on invalid form data without calling the API", async () => {
    const { result } = renderHook(() => useRemixTrip());

    await act(async () => {
      await result.current.submit({ ...values, title: "" }, source);
    });

    expect(remixTripMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("validation_error");
  });

  it("saves a fresh local shell that shares no object references with the source metadata passed in", async () => {
    remixTripMock.mockResolvedValue({ id: "new-trip-1" });
    const mutableSourceObject: RemixSourceMeta = { ...source };

    const { result } = renderHook(() => useRemixTrip());
    await act(async () => {
      await result.current.submit(values, mutableSourceObject);
    });

    expect(saveGeneratedTripMock).toHaveBeenCalledTimes(1);
    const savedTrip = saveGeneratedTripMock.mock.calls[0][0];
    expect(savedTrip).not.toBe(mutableSourceObject);
    expect(savedTrip.remixedFrom).not.toBe(mutableSourceObject);
    // Mutating the source metadata object afterward must never affect the
    // trip that was already saved — proves it was deep-copied, not
    // referenced.
    mutableSourceObject.sourceTitle = "mutated after the fact";
    expect(savedTrip.remixedFrom.sourceTitle).toBe(source.sourceTitle);
  });

  it.each([
    ["validation", "duration_mismatch"],
    ["forbidden", "forbidden"],
    ["not_found", "not_found"],
    ["server", "error"],
  ] as const)("maps RemixApiError kind %s to status %s", async (kind, expectedStatus) => {
    remixTripMock.mockRejectedValue(new RemixApiError(kind, "ข้อความ", kind === "validation" ? 3 : undefined));
    const { result } = renderHook(() => useRemixTrip());

    await act(async () => {
      await result.current.submit(values, source);
    });

    expect(result.current.status).toBe(expectedStatus);
  });
});
