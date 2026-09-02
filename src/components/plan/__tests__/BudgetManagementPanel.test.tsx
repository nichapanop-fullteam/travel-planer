import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { GeneratedTrip } from "@/types";

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ backendUser: { id: "owner-1", name: "Owner" }, user: null, isLoading: false }),
}));

const getTripBudget = vi.fn();
vi.mock("@/lib/trip-budget-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/trip-budget-api")>();
  return { ...actual, getTripBudget: (...args: unknown[]) => getTripBudget(...args) };
});

const { BudgetManagementPanel } = await import("@/components/plan/BudgetManagementPanel");

function trip(): GeneratedTrip {
  return {
    id: "trip-1",
    draftId: "trip-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    destination: "ฮ่องกง",
    coverImageUrl: "/images/hero-mountain.jpg",
    durationLabel: "1 วัน",
    paceLabel: "ปกติ",
    budgetLabel: "ยังไม่ระบุ",
    conditionsLabel: "ไม่มีเงื่อนไขพิเศษ",
    styles: [],
    status: "generated",
    backendSynced: true,
    days: [{ id: "day-1", dayNumber: 1, date: "2026-09-02", activities: [] }],
  };
}

// Reproduces the console error the user hit: "Encountered two children with
// the same key". GET /trips/:id/budget returns line items from four different
// sources (activity/travel/accommodation/expense) that don't share one id
// space — an activity's own cost and the travel leg arriving at it can carry
// the same id. getTripBudget passes the response straight through with no
// client-side remapping (see src/lib/trip-budget-api.ts), so a backend that
// does this reaches the render list unchanged.
describe("BudgetManagementPanel — duplicate line-item ids across sources", () => {
  beforeEach(() => {
    getTripBudget.mockReset().mockResolvedValue({
      totalBudget: 500,
      byCategory: [],
      byDay: [{ dayId: "day-1", dayNumber: 1, date: "2026-09-02", amount: 500 }],
      items: [
        { id: "d1e9ea9d-3b2e-4d54-afb5-06e5d5e11668", title: "ท่าอากาศยานนานาชาติฮ่องกง", category: "other", amount: 300, dayNumber: 1, source: "activity" },
        { id: "d1e9ea9d-3b2e-4d54-afb5-06e5d5e11668", title: "เดินทางไปยังจุดถัดไป", category: "other", amount: 200, dayNumber: 1, source: "travel" },
      ],
    });
  });

  it("renders both line items without a React duplicate-key warning", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<BudgetManagementPanel trip={trip()} onPatch={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("ท่าอากาศยานนานาชาติฮ่องกง")).toBeInTheDocument());
    expect(screen.getByText("เดินทางไปยังจุดถัดไป")).toBeInTheDocument();

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      call.some((arg) => typeof arg === "string" && arg.includes("same key"))
    );
    expect(duplicateKeyWarning).toBe(false);

    errorSpy.mockRestore();
  });
});
