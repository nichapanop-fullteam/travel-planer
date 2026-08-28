import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RealTripCard } from "@/components/consumer/RealTripCard";
import type { BackendTripListItem } from "@/lib/trips-api";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }) }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ backendUser: null, user: null, isLoading: false }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
// The cover fallback isn't what these tests are about, and left real it fires
// an unmocked network call per render.
vi.mock("@/lib/trip-media-api", () => ({ getTripGallery: () => Promise.resolve({ items: [], total: 0, page: 1, limit: 24 }) }));

// The card's own GET /api/trips/:id — the only source of customer/groupSize,
// so every assertion about the creator chip or the price unit depends on it.
const detail = vi.fn();
beforeEach(() => {
  detail.mockReset();
  detail.mockResolvedValue({});
  vi.stubGlobal("fetch", () => Promise.resolve({ ok: true, json: () => detail() }));
});

const baseTrip: BackendTripListItem = {
  id: "trip-1",
  title: "เที่ยวโตเกียวเก็บทุกไฮไลท์",
  destination: "Tokyo, Japan",
  status: "shared",
  schedule: { durationDays: 4, isDateFlexible: false },
  totalBudget: 12000,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  isSaved: false,
  isLiked: false,
  likeCount: 0,
};

describe("RealTripCard", () => {
  // The reference's cover pill reads "Top Remix", but no endpoint exposes a
  // remix ranking — it's driven by sourceTripId, the one real remix fact a
  // feed row carries. So it must be absent on an ordinary trip rather than
  // decorating every card.
  it("shows the remix pill only for a trip that is itself a remix", async () => {
    const { unmount } = render(<RealTripCard trip={baseTrip} isOwn={false} />);
    await waitFor(() => expect(screen.queryByText("รีมิกซ์")).not.toBeInTheDocument());
    unmount();

    render(<RealTripCard trip={{ ...baseTrip, sourceTripId: "source-1" }} isOwn={false} />);
    expect(await screen.findByText("รีมิกซ์")).toBeInTheDocument();
  });

  // `schedule` is absent on some real GET /trips rows, and the meta line is
  // bullet-separated — a missing segment has to take its bullet with it
  // instead of leaving "Tokyo, Japan • • ฿12,000".
  it("drops the duration segment, and its separator, when the row has no schedule", async () => {
    const { container } = render(
      <RealTripCard trip={{ ...baseTrip, schedule: undefined }} isOwn={false} />
    );

    await waitFor(() => expect(screen.queryByText("4 วัน")).not.toBeInTheDocument());
    // One bullet left: the one before the price. Scoped to the bullet spans
    // by their text — the lucide icons are aria-hidden too.
    const bullets = Array.from(container.querySelectorAll("span")).filter((el) => el.textContent === "\u2022");
    expect(bullets).toHaveLength(1);
  });

  it("labels the budget as a total until a real groupSize proves it is per-person", async () => {
    render(<RealTripCard trip={baseTrip} isOwn={false} />);
    expect(await screen.findByText("รวม", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("฿12,000", { exact: false })).toBeInTheDocument();
  });

  it("divides the budget by the fetched groupSize and marks it per-person", async () => {
    detail.mockResolvedValue({ customer: { id: "u1", name: "Maki", groupSize: 4 } });
    render(<RealTripCard trip={baseTrip} isOwn={false} />);
    expect(await screen.findByText("฿3,000", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("/คน", { exact: false })).toBeInTheDocument();
  });

  // BackendTripCustomer has no username, so the "@handle" of the reference is
  // rendered only when the response actually carries one — never an "@" glued
  // onto a display name.
  it("renders an @handle only when the customer response carries a username", async () => {
    detail.mockResolvedValue({ customer: { id: "u1", name: "Maki Travels", groupSize: 0 } });
    const { unmount } = render(<RealTripCard trip={baseTrip} isOwn={false} />);
    expect(await screen.findByText("Maki Travels")).toBeInTheDocument();
    unmount();

    detail.mockResolvedValue({ customer: { id: "u1", name: "Maki Travels", username: "makitravels", groupSize: 0 } });
    render(<RealTripCard trip={baseTrip} isOwn={false} />);
    expect(await screen.findByText("@makitravels")).toBeInTheDocument();
  });

  // Saving your own trip isn't a real action, so the cover toggle is hidden
  // outright for it — the reference's other cover affordances stay.
  it("hides the bookmark toggle on the user's own trip", async () => {
    render(<RealTripCard trip={baseTrip} isOwn />);
    await waitFor(() => expect(screen.queryByRole("button", { name: "บันทึกทริปนี้" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "ถูกใจทริปนี้" })).toBeInTheDocument();
  });
});
