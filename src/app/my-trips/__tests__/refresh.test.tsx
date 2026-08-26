import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MyTripsPage from "@/app/my-trips/page";
import { onGeneratedTripsChanged } from "@/lib/generated-trips";

const push = vi.fn();
const replace = vi.fn();
// A stable router object — see the backendUser comment below for why a
// fresh literal per call would cause the page's effect to re-subscribe
// (and re-fetch) on every one of its own re-renders instead of once per
// mount, like the real next/navigation router reference does.
const stableRouter = { push, replace, back: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/LogoutButton", () => ({ default: () => <button>logout</button> }));

const getMyTripsMock = vi.fn();
vi.mock("@/lib/trips-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/trips-api")>("@/lib/trips-api");
  return { ...actual, getMyTrips: () => getMyTripsMock() };
});

// A stable object reference — a fresh literal on every call would change
// identity every render and re-trigger the page's `[backendUser]` effect
// dependency on each of its own setState re-renders, which is not how the
// real AuthProvider context value behaves once settled.
const stableBackendUser = { id: "user-1", name: "Test User", email: "t@example.com" };
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ backendUser: stableBackendUser, user: null, isLoading: false }),
}));

describe("MyTripsPage refresh", () => {
  beforeEach(() => {
    getMyTripsMock.mockReset();
    getMyTripsMock.mockResolvedValue([]);
  });

  it("re-fetches My Trips when a generated-trips-changed event fires (e.g. after a successful Remix)", async () => {
    render(<MyTripsPage />);
    await waitFor(() => expect(getMyTripsMock).toHaveBeenCalledTimes(1));

    getMyTripsMock.mockResolvedValueOnce([
      {
        id: "new-trip-1",
        title: "ทริปหลวงพระบางของฉัน",
        destination: "หลวงพระบาง, ลาว",
        status: "draft",
        schedule: { durationDays: 3, isDateFlexible: false },
        totalBudget: 0,
        tags: [],
        createdAt: "2026-08-21T00:00:00.000Z",
        updatedAt: "2026-08-21T00:00:00.000Z",
      },
    ]);

    // Simulate the exact side effect useRemixTrip's success path triggers —
    // saveGeneratedTrip fires this same event.
    window.dispatchEvent(new Event("punguide:generated-trips-changed"));

    await waitFor(() => expect(getMyTripsMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("ทริปหลวงพระบางของฉัน")).toBeInTheDocument();
  });

  it("registers exactly one onGeneratedTripsChanged listener per mount and cleans it up on unmount", () => {
    const unsubscribeSpy = vi.fn();
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(<MyTripsPage />);
    const listenerCallsBefore = addSpy.mock.calls.filter(([type]) => type === "punguide:generated-trips-changed").length;
    expect(listenerCallsBefore).toBe(1);

    unmount();
    const removedCalls = removeSpy.mock.calls.filter(([type]) => type === "punguide:generated-trips-changed").length;
    expect(removedCalls).toBe(1);

    unsubscribeSpy.mockClear();
    addSpy.mockRestore();
    removeSpy.mockRestore();
    // onGeneratedTripsChanged itself is exercised above via the real
    // (unmocked) lib/generated-trips.ts module — imported just to document
    // that this test relies on its real event wiring, not a mock of it.
    void onGeneratedTripsChanged;
  });
});
