import { render, waitFor, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GeneratedPlanPage from "@/app/generated-plan/[id]/page";
import type { GeneratedTrip } from "@/types";

const replace = vi.fn();
let currentTripId = "local-ai-trip";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: currentTripId }),
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/layout/Sidebar", () => ({ Sidebar: () => <div /> }));

let mockBackendUser: { id: string; name: string } | null = null;
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ backendUser: mockBackendUser, user: null, isLoading: false }),
}));
const showToastMock = vi.fn();
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ showToast: showToastMock }) }));

const createTripOnServerMock = vi.fn();
vi.mock("@/lib/trips-create-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/trips-create-api")>("@/lib/trips-create-api");
  return { ...actual, createTripOnServer: (...args: unknown[]) => createTripOnServerMock(...args) };
});

let storedTrip: GeneratedTrip | undefined;
vi.mock("@/lib/generated-trips", async () => {
  const actual = await vi.importActual<typeof import("@/lib/generated-trips")>("@/lib/generated-trips");
  return {
    ...actual,
    getGeneratedTrip: () => storedTrip,
    saveGeneratedTrip: vi.fn(),
    replaceGeneratedTripId: vi.fn(),
  };
});

vi.mock("@/lib/trips-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/trips-api")>("@/lib/trips-api");
  return { ...actual, getTrip: () => Promise.reject(new Error("not on the server yet")), getMyTrips: async () => [] };
});

// An AI plan as it exists the moment /trips/plan/generate answers: real content,
// a client-generated id, and nothing on the server.
function aiTrip(overrides: Partial<GeneratedTrip> = {}): GeneratedTrip {
  return {
    id: "local-ai-trip",
    draftId: "draft-1",
    createdAt: "2026-09-04T00:00:00.000Z",
    destination: "หลวงพระบาง, ลาว",
    coverImageUrl: "/images/hero-mountain.jpg",
    durationLabel: "2 วัน 1 คืน",
    paceLabel: "Chill เที่ยวสบาย",
    budgetLabel: "฿3,000 / วัน",
    conditionsLabel: "",
    styles: [],
    status: "generated",
    days: [
      { id: "d1", dayNumber: 1, date: "2026-11-20", activities: [] },
      { id: "d2", dayNumber: 2, date: "2026-11-21", activities: [] },
    ],
    ...overrides,
  } as GeneratedTrip;
}

const NOTICE = {
  resolvedWithoutErrors: false,
  modelWarnings: ["ตัดน้ำตกออกเพราะเดินไกล"],
  violations: [
    {
      severity: "error" as const,
      code: "impossible_travel_time",
      message: "Day 1 item 3: only 20min between stops, but travel is estimated at 27min",
      dayNumber: 1,
    },
  ],
};

describe("AI plan is persisted as soon as it opens", () => {
  beforeEach(() => {
    replace.mockReset();
    showToastMock.mockReset();
    createTripOnServerMock.mockReset();
    createTripOnServerMock.mockResolvedValue({ id: "server-uuid-1", days: [] });
    mockBackendUser = { id: "owner-1", name: "Owner" };
    currentTripId = "local-ai-trip";
    storedTrip = aiTrip();
  });

  it("saves the plan without waiting for the traveler to press anything", async () => {
    render(<GeneratedPlanPage />);

    await waitFor(() => expect(createTripOnServerMock).toHaveBeenCalledTimes(1));
  });

  // The URL still carries the client-generated id at this point; a reload on it
  // would 404 once storage has renamed the entry.
  it("swaps the url for the real backend id", async () => {
    render(<GeneratedPlanPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/generated-plan/server-uuid-1"));
  });

  it("saves only once, however many times the page re-renders", async () => {
    const { rerender } = render(<GeneratedPlanPage />);
    await waitFor(() => expect(createTripOnServerMock).toHaveBeenCalledTimes(1));

    rerender(<GeneratedPlanPage />);

    await waitFor(() => expect(createTripOnServerMock).toHaveBeenCalledTimes(1));
  });

  // POST /trips/create takes its owner from the token, so there is nothing to
  // save against until the traveler is signed in.
  it("does nothing while signed out", async () => {
    mockBackendUser = null;
    render(<GeneratedPlanPage />);

    await waitFor(() => expect(screen.queryByText(/หลวงพระบาง/)).toBeInTheDocument());
    expect(createTripOnServerMock).not.toHaveBeenCalled();
  });

  // A plan that never reached the server looks exactly like one that did —
  // until its travel segments and photos never show up, and a 404 is the only
  // clue anyone gets. Say it instead.
  it("tells the traveler their plan is local-only while signed out", async () => {
    mockBackendUser = null;
    render(<GeneratedPlanPage />);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(expect.stringContaining("เก็บอยู่ในเครื่องนี้เท่านั้น"))
    );
  });

  it("says so when the save fails, rather than failing quietly", async () => {
    createTripOnServerMock.mockRejectedValue(new Error("401 Unauthorized"));
    render(<GeneratedPlanPage />);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(expect.stringContaining("บันทึกแพลนไม่สำเร็จ"))
    );
  });

  it("says nothing when the save works", async () => {
    render(<GeneratedPlanPage />);

    await waitFor(() => expect(createTripOnServerMock).toHaveBeenCalledTimes(1));
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("leaves a trip that already has a backend row alone", async () => {
    storedTrip = aiTrip({ id: "server-uuid-9", backendSynced: true });
    currentTripId = "server-uuid-9";
    render(<GeneratedPlanPage />);

    await waitFor(() => expect(screen.queryByText(/หลวงพระบาง/)).toBeInTheDocument());
    expect(createTripOnServerMock).not.toHaveBeenCalled();
  });

  // The old gate. Nothing to opt into any more — the plan is already saved.
  it("no longer shows the นำไปปรับเป็นทริปของฉัน button", async () => {
    render(<GeneratedPlanPage />);

    await waitFor(() => expect(screen.queryByText(/หลวงพระบาง/)).toBeInTheDocument());
    expect(screen.queryByText("นำไปปรับเป็นทริปของฉัน")).not.toBeInTheDocument();
  });

  // Re-rolling a whole plan spent another model completion plus a fresh round
  // of place searches on every press — the biggest single multiplier on what
  // this feature costs, for a plan the traveler can simply edit instead.
  it("no longer offers สร้างใหม่ทั้งหมด", async () => {
    render(<GeneratedPlanPage />);

    await waitFor(() => expect(screen.queryByText(/หลวงพระบาง/)).toBeInTheDocument());
    expect(screen.queryByText("สร้างใหม่ทั้งหมด")).not.toBeInTheDocument();
  });

  it("still tells the traveler the plan is an editable draft", async () => {
    render(<GeneratedPlanPage />);

    expect(await screen.findByText("แพลนฉบับร่างโดย PunGuide")).toBeInTheDocument();
  });
});

// The findings are the only place a traveller learns that a place they picked
// did not fit, or that two stops sit closer together than the drive between
// them — but they describe a plan they are about to edit, so a warning that
// cannot be closed just becomes furniture.
describe("the generation notice can be dismissed", () => {
  beforeEach(() => {
    storedTrip = aiTrip({ generationNotice: NOTICE });
  });

  it("shows the notice for a plan that came back with findings", async () => {
    render(<GeneratedPlanPage />);

    expect(await screen.findByText("แผนนี้อาจมีจุดที่ต้องปรับ")).toBeInTheDocument();
  });

  it("closes it when the traveler asks", async () => {
    render(<GeneratedPlanPage />);
    const close = await screen.findByLabelText("ปิดคำเตือนเกี่ยวกับแผนนี้");

    close.click();

    await waitFor(() =>
      expect(screen.queryByText("แผนนี้อาจมีจุดที่ต้องปรับ")).not.toBeInTheDocument()
    );
  });

  // Dismissing hides it for this viewing, not for good: the findings are still
  // true, and the trip must not be rewritten to say otherwise.
  it("does not write the dismissal onto the trip", async () => {
    render(<GeneratedPlanPage />);
    (await screen.findByLabelText("ปิดคำเตือนเกี่ยวกับแผนนี้")).click();

    await waitFor(() =>
      expect(screen.queryByText("แผนนี้อาจมีจุดที่ต้องปรับ")).not.toBeInTheDocument()
    );
    expect(storedTrip?.generationNotice).toEqual(NOTICE);
  });

  it("stays hidden for a plan that came back clean", async () => {
    storedTrip = aiTrip();
    render(<GeneratedPlanPage />);

    await waitFor(() => expect(screen.queryByText(/หลวงพระบาง/)).toBeInTheDocument());
    expect(screen.queryByText("แผนนี้อาจมีจุดที่ต้องปรับ")).not.toBeInTheDocument();
  });
});
