import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharedTripPage from "@/app/shared-trips/[shareToken]/page";
import SharedTripNotFound from "@/app/shared-trips/[shareToken]/not-found";
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
    // Byline is just the name, matching generated-plan's Hero.
    expect(screen.getByText("นุ้ย")).toBeInTheDocument();
    expect(screen.getByText("ลำดับแพลน")).toBeInTheDocument();
    expect(screen.getByText("วัดเชียงทอง")).toBeInTheDocument();
  });

  // The four failure cases (unknown token, revoked, expired, deleted trip) all
  // arrive as one 404 → null. The page must call notFound() rather than
  // returning the dead-link markup itself, so the response carries a real HTTP
  // 404 instead of 200 OK.
  it("calls notFound() when the link no longer works, so the response is a 404", async () => {
    mockedGetSharedTrip.mockResolvedValue(null);

    // notFound() signals by throwing; Next turns that into the 404 response.
    await expect(renderPage()).rejects.toThrow();
  });

  // The 404 body itself must stay neutral about which of the four cases it was
  // — the API hides that so an ex-recipient can't tell whether the trip still
  // exists or whether they were specifically cut off.
  it("renders a neutral 404 body that names no reason and leaks no plan content", () => {
    render(<SharedTripNotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "ลิงก์นี้ใช้ไม่ได้แล้ว" })).toBeInTheDocument();
    expect(screen.queryByText(/หลวงพระบาง/)).not.toBeInTheDocument();
    for (const leak of [/ถูกยกเลิกโดย/, /หมดอายุเมื่อ/, /ไม่มีทริปนี้/]) {
      expect(screen.queryByText(leak)).not.toBeInTheDocument();
    }
  });

  it("omits the byline entirely when the owner has no display name", async () => {
    // The API drops `owner` rather than falling back to a username, so there's
    // nothing to render — and definitely no "@username" to invent.
    mockedGetSharedTrip.mockResolvedValue({ ...sharedTrip, owner: undefined });
    await renderPage();

    expect(screen.queryByText("นุ้ย")).not.toBeInTheDocument();
    // The rest of the header still renders.
    expect(screen.getByRole("heading", { level: 1, name: /หลวงพระบาง/ })).toBeInTheDocument();
    expect(screen.getByText("หลวงพระบาง, ลาว")).toBeInTheDocument();
  });

  // A single-day plan has nothing to switch between, so the day tabs are
  // suppressed — they only earn their space once there's more than one day.
  it("shows day tabs only when the plan has more than one day", async () => {
    mockedGetSharedTrip.mockResolvedValue(sharedTrip);
    const single = await renderPage();
    expect(screen.queryByRole("button", { name: "วันที่ 1" })).not.toBeInTheDocument();
    single.unmount();

    mockedGetSharedTrip.mockResolvedValue({
      ...sharedTrip,
      days: [
        sharedTrip.days![0],
        { dayNumber: 2, date: "2026-09-11", activities: [{ order: 0, title: "น้ำตกตาดกวางสี", category: "sightseeing" }] },
      ],
    });
    await renderPage();
    expect(screen.getByRole("button", { name: "วันที่ 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "วันที่ 2" })).toBeInTheDocument();
  });

  it("passes the raw token through to the API so the URL is the only credential", async () => {
    mockedGetSharedTrip.mockResolvedValue(sharedTrip);
    await renderPage("q5LMr_f1tphUYZUJD71BehvN-HtOqnBFLjUL544MPio");

    expect(mockedGetSharedTrip).toHaveBeenCalledWith("q5LMr_f1tphUYZUJD71BehvN-HtOqnBFLjUL544MPio");
  });
});
