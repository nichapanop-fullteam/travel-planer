import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GeneratedPlanPage from "@/app/generated-plan/[id]/page";
import { RemixApiError } from "@/lib/trip-remix-api";
import type { BackendTrip } from "@/lib/trips-api";

const push = vi.fn();
const replace = vi.fn();
let currentTripId = "public-trip-1";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: currentTripId }),
  useRouter: () => ({ push, replace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/layout/Sidebar", () => ({ Sidebar: () => <div /> }));

let mockBackendUser: { id: string; name: string } | null = null;
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ backendUser: mockBackendUser, user: null, isLoading: false }),
}));

const showToastMock = vi.fn();
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ showToast: showToastMock }) }));

const remixTripMock = vi.fn();
vi.mock("@/lib/trip-remix-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/trip-remix-api")>("@/lib/trip-remix-api");
  return { ...actual, remixTrip: (...args: unknown[]) => remixTripMock(...args) };
});

const publicSourceTrip: BackendTrip = {
  id: "public-trip-1",
  ownerId: "creator-1",
  title: "หลวงพระบาง 3 วัน 2 คืน",
  destination: "หลวงพระบาง, ลาว",
  status: "confirmed",
  schedule: { durationDays: 3, isDateFlexible: false },
  totalBudget: 0,
  days: [
    { id: "d1", dayNumber: 1, date: "2026-11-20", activities: [] },
    { id: "d2", dayNumber: 2, date: "2026-11-21", activities: [] },
    { id: "d3", dayNumber: 3, date: "2026-11-22", activities: [] },
  ],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  customer: { id: "creator-1", name: "TravelWithTawn", groupSize: 1 },
  planMode: "manual",
  visibility: "public",
};

let getTripImpl = () => Promise.resolve(publicSourceTrip);
vi.mock("@/lib/trips-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/trips-api")>("@/lib/trips-api");
  return { ...actual, getTrip: () => getTripImpl(), getMyTrips: async () => [] };
});

vi.mock("@/lib/generated-trips", async () => {
  const actual = await vi.importActual<typeof import("@/lib/generated-trips")>("@/lib/generated-trips");
  return { ...actual, getGeneratedTrip: () => undefined };
});

describe("Remix on the trip detail/Planner page", () => {
  beforeEach(() => {
    push.mockReset();
    remixTripMock.mockReset();
    showToastMock.mockReset();
    mockBackendUser = null;
    currentTripId = "public-trip-1";
    getTripImpl = () => Promise.resolve(publicSourceTrip);
  });

  it("shows the Remix CTA on a public trip the viewer does not own", async () => {
    mockBackendUser = { id: "some-other-user", name: "Viewer" };
    render(<GeneratedPlanPage />);

    expect(await screen.findAllByText("นำไปปรับเป็นทริปของฉัน")).not.toHaveLength(0);
  });

  it("hides the Remix CTA when the current user owns this (private draft) trip", async () => {
    mockBackendUser = { id: "creator-1", name: "TravelWithTawn" };
    render(<GeneratedPlanPage />);

    await waitFor(() => expect(screen.queryByText(/หลวงพระบาง/)).toBeInTheDocument());
    expect(screen.queryByText("นำไปปรับเป็นทริปของฉัน")).not.toBeInTheDocument();
  });

  it("shows creator attribution (avatar/name) from the source trip", async () => {
    mockBackendUser = { id: "some-other-user", name: "Viewer" };
    render(<GeneratedPlanPage />);

    expect(await screen.findByText("TravelWithTawn")).toBeInTheDocument();
  });

  it("opens the Remix Setup dialog when the CTA is clicked", async () => {
    mockBackendUser = { id: "some-other-user", name: "Viewer" };
    render(<GeneratedPlanPage />);

    const [cta] = await screen.findAllByText("นำไปปรับเป็นทริปของฉัน");
    cta.closest("button")?.click();

    expect(await screen.findByText("ตั้งค่าทริปของคุณ")).toBeInTheDocument();
  });

  it("never calls the Remix API before authentication is confirmed, and instead redirects to login", async () => {
    mockBackendUser = null;
    render(<GeneratedPlanPage />);

    const [cta] = await screen.findAllByText("นำไปปรับเป็นทริปของฉัน");
    cta.closest("button")?.click();

    expect(remixTripMock).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/login?redirect="));
    expect(push).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent("/generated-plan/public-trip-1")));
  });

  it("navigates to the NEW trip id on success — never the source trip id", async () => {
    mockBackendUser = { id: "some-other-user", name: "Viewer" };
    remixTripMock.mockResolvedValue({ id: "brand-new-trip-id" });
    render(<GeneratedPlanPage />);

    const [cta] = await screen.findAllByText("นำไปปรับเป็นทริปของฉัน");
    cta.closest("button")?.click();
    (await screen.findByText("สร้างทริปของฉัน")).click();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/generated-plan/brand-new-trip-id"));
    expect(push).not.toHaveBeenCalledWith("/generated-plan/public-trip-1");
    expect(showToastMock).toHaveBeenCalledWith("สร้างทริปของคุณแล้ว แก้ไขได้โดยไม่กระทบแผนต้นฉบับ");
  });

  it("renders source attribution on an already-remixed trip, pointing at the immediate source only", async () => {
    currentTripId = "remixed-trip-1";
    mockBackendUser = { id: "some-other-user", name: "Viewer" };
    getTripImpl = () =>
      Promise.resolve({
        ...publicSourceTrip,
        id: "remixed-trip-1",
        ownerId: "some-other-user",
        sourceTripId: "public-trip-1",
      });
    render(<GeneratedPlanPage />);

    // The banner renders instantly off the flat sourceTripId (generic "Remix
    // จากทริปอื่น" text) and then backfills the real title/creator with one
    // extra GET /trips/:sourceTripId — wait for that second render rather
    // than grabbing the first (generic) one findByText would otherwise match.
    await waitFor(() => {
      expect(screen.getByText(/Remix จาก/).textContent).toContain("หลวงพระบาง 3 วัน 2 คืน");
    });
    const banner = screen.getByText(/Remix จาก/);
    expect(banner.textContent).toContain("TravelWithTawn");
  });

  it("still renders an existing AI-generated trip with no owner/creator metadata (regression)", async () => {
    getTripImpl = () =>
      Promise.resolve({
        ...publicSourceTrip,
        ownerId: "",
        customer: undefined,
        planMode: "ai",
      });
    render(<GeneratedPlanPage />);

    expect(await screen.findByText(/หลวงพระบาง/)).toBeInTheDocument();
  });

  it("surfaces a mapped RemixApiError as a blocking dialog error instead of crashing", async () => {
    mockBackendUser = { id: "some-other-user", name: "Viewer" };
    remixTripMock.mockRejectedValue(new RemixApiError("forbidden", "ไม่สามารถนำแผนส่วนตัวนี้ไปใช้ได้"));
    render(<GeneratedPlanPage />);

    const [cta] = await screen.findAllByText("นำไปปรับเป็นทริปของฉัน");
    cta.closest("button")?.click();
    (await screen.findByText("สร้างทริปของฉัน")).click();

    expect(await screen.findByText("ไม่สามารถนำแผนส่วนตัวนี้ไปใช้ได้")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining("/generated-plan/"));
  });
});
