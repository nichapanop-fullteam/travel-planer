import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharedTripPage from "@/app/shared-trips/[shareToken]/page";
import { getSharedTrip, type SharedTrip } from "@/lib/share-api";

vi.mock("@/lib/share-api", () => ({ getSharedTrip: vi.fn() }));

const mockedGetSharedTrip = vi.mocked(getSharedTrip);

// Only the fields the public payload actually carries — deliberately no ids
// anywhere (see SharedTrip's doc comment in lib/share-api.ts).
const sharedTrip: SharedTrip = {
  title: "หลวงพระบาง 3 วัน 2 คืน",
  destination: "หลวงพระบาง, ลาว",
  schedule: { startDate: "2026-09-10", endDate: "2026-09-12", durationDays: 3, durationNights: 2 },
  tags: ["nature"],
  owner: { name: "นุ้ย", avatarUrl: null },
  coverImage: { large: "https://cdn.example/cover.jpg", altText: "วัดเชียงทอง" },
  days: [
    {
      dayNumber: 1,
      date: "2026-09-10",
      activities: [
        {
          order: 0,
          time: "09:00",
          title: "วัดเชียงทอง",
          category: "sightseeing",
          place: { name: "วัดเชียงทอง", rating: 4.6 },
        },
      ],
    },
  ],
  likeCount: 0,
  remixCount: 0,
};

async function renderPage(shareToken = "sometoken") {
  const ui = await SharedTripPage({ params: Promise.resolve({ shareToken }) });
  return render(ui);
}

describe("GET /shared-trips/:shareToken page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the shared plan without requiring a signed-in viewer", async () => {
    mockedGetSharedTrip.mockResolvedValue(sharedTrip);
    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: /หลวงพระบาง 3 วัน 2 คืน/ })).toBeInTheDocument();
    expect(screen.getByText("หลวงพระบาง, ลาว")).toBeInTheDocument();
    expect(screen.getByText(/แผนโดย นุ้ย/)).toBeInTheDocument();
    expect(screen.getByText("วันที่ 1")).toBeInTheDocument();
    expect(screen.getByText("วัดเชียงทอง")).toBeInTheDocument();
  });

  // The four failure cases (unknown token, revoked, expired, deleted trip) all
  // arrive as one 404 → null. The page must show a single neutral message and
  // must never state which of the four it was.
  it("shows one neutral dead-link page when the link no longer works", async () => {
    mockedGetSharedTrip.mockResolvedValue(null);
    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "ลิงก์นี้ใช้ไม่ได้แล้ว" })).toBeInTheDocument();
    // No plan content leaks through.
    expect(screen.queryByText(/หลวงพระบาง/)).not.toBeInTheDocument();
  });

  it("omits the byline entirely when the owner has no display name", async () => {
    // The API drops `owner` rather than falling back to a username, so there's
    // nothing to render — and definitely no "@username" to invent.
    mockedGetSharedTrip.mockResolvedValue({ ...sharedTrip, owner: undefined });
    await renderPage();

    expect(screen.queryByText(/แผนโดย/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /หลวงพระบาง/ })).toBeInTheDocument();
  });

  it("passes the raw token through to the API so the URL is the only credential", async () => {
    mockedGetSharedTrip.mockResolvedValue(sharedTrip);
    await renderPage("q5LMr_f1tphUYZUJD71BehvN-HtOqnBFLjUL544MPio");

    expect(mockedGetSharedTrip).toHaveBeenCalledWith("q5LMr_f1tphUYZUJD71BehvN-HtOqnBFLjUL544MPio");
  });
});
