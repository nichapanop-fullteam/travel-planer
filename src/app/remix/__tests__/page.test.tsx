import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RemixDiscoveryPage from "@/app/remix/page";
import type { BackendTripListItem } from "@/lib/trips-api";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }) }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ backendUser: null, user: null, isLoading: false }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
// RealTripCard's cover fallback isn't what these tests are about, and left
// real it fires an unmocked network call per card.
vi.mock("@/lib/trip-media-api", () => ({ getTripGallery: () => Promise.resolve({ items: [], total: 0, page: 1, limit: 24 }) }));

let tripsImpl: () => Promise<BackendTripListItem[]> = async () => [];
vi.mock("@/lib/trips-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/trips-api")>("@/lib/trips-api");
  return { ...actual, listTrips: () => tripsImpl(), getMyTrips: async () => [] };
});

function trip(overrides: Partial<BackendTripListItem> & { id: string; title: string }): BackendTripListItem {
  return {
    destination: "Somewhere",
    status: "shared",
    totalBudget: 1000,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    isSaved: false,
    isLiked: false,
    likeCount: 0,
    ...overrides,
  };
}

const TRIPS: BackendTripListItem[] = [
  trip({ id: "t-japan", title: "โตเกียวสายกิน", tags: ["japan"], remixCount: 0 }),
  trip({
    id: "t-thailand-top",
    title: "หลวงพระบาง 3 วัน",
    tags: ["thailand"],
    remixCount: 50,
    creator: { id: "creator-1", name: "Maki" },
  }),
  trip({
    id: "t-thailand-2",
    title: "เชียงรายชิลๆ",
    tags: ["thailand"],
    remixCount: 0,
    creator: { id: "creator-1", name: "Maki" },
  }),
  trip({
    id: "t-no-tag",
    title: "ทริปไม่มีแท็ก",
    remixCount: 0,
    creator: { id: "creator-2", name: "Korea Tripster" },
  }),
];

describe("RemixDiscoveryPage", () => {
  beforeEach(() => {
    tripsImpl = async () => TRIPS;
    vi.stubGlobal("fetch", () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
  });

  it("renders every public trip on the default For you tab", async () => {
    render(<RemixDiscoveryPage />);
    expect(await screen.findByText("โตเกียวสายกิน")).toBeInTheDocument();
    // The remixCount:50 trip also renders in the always-visible Top Remixes
    // rail, so it legitimately appears twice.
    expect(screen.getAllByText("หลวงพระบาง 3 วัน").length).toBeGreaterThan(0);
    expect(screen.getByText("เชียงรายชิลๆ")).toBeInTheDocument();
    expect(screen.getByText("ทริปไม่มีแท็ก")).toBeInTheDocument();
  });

  it("narrows to only the tagged trips when a category tab is selected", async () => {
    render(<RemixDiscoveryPage />);
    await screen.findByText("โตเกียวสายกิน");

    fireEvent.click(screen.getByRole("button", { name: /^Thailand/ }));

    await waitFor(() => expect(screen.queryByText("โตเกียวสายกิน")).not.toBeInTheDocument());
    expect(screen.getAllByText("หลวงพระบาง 3 วัน").length).toBeGreaterThan(0);
    expect(screen.getByText("เชียงรายชิลๆ")).toBeInTheDocument();
    expect(screen.queryByText("ทริปไม่มีแท็ก")).not.toBeInTheDocument();
  });

  it("Top Remixes only shows trips with at least one remix", async () => {
    render(<RemixDiscoveryPage />);
    await screen.findByText("โตเกียวสายกิน");

    fireEvent.click(screen.getByRole("button", { name: /^Top Remixes/ }));

    await waitFor(() => expect(screen.queryByText("โตเกียวสายกิน")).not.toBeInTheDocument());
    expect(screen.getAllByText("หลวงพระบาง 3 วัน").length).toBeGreaterThan(0);
    expect(screen.queryByText("เชียงรายชิลๆ")).not.toBeInTheDocument();
    expect(screen.queryByText("ทริปไม่มีแท็ก")).not.toBeInTheDocument();
  });

  it("the Top Remixes rail renders above the tabs regardless of the active tab", async () => {
    render(<RemixDiscoveryPage />);
    expect(await screen.findByText("Top Remixes")).toBeInTheDocument();
    // Rail card for the one trip with remixCount > 0.
    expect(screen.getAllByText("หลวงพระบาง 3 วัน").length).toBeGreaterThan(0);
  });

  it("By Creator groups trips under their creator, skipping trips with no creator info", async () => {
    render(<RemixDiscoveryPage />);
    await screen.findByText("โตเกียวสายกิน");

    fireEvent.click(screen.getByRole("button", { name: /^By Creator/ }));

    const makiHeading = await screen.findByText("Maki");
    expect(makiHeading).toBeInTheDocument();
    expect(screen.getByText("Korea Tripster")).toBeInTheDocument();
    // t-japan has no creator — grouped view must not surface it under anyone.
    expect(screen.queryByText("โตเกียวสายกิน")).not.toBeInTheDocument();
    expect(screen.getAllByText("หลวงพระบาง 3 วัน").length).toBeGreaterThan(0);
    expect(screen.getByText("เชียงรายชิลๆ")).toBeInTheDocument();
  });

  it("shows the empty state when a search matches nothing", async () => {
    render(<RemixDiscoveryPage />);
    await screen.findByText("โตเกียวสายกิน");

    const input = screen.getByPlaceholderText("ค้นหาชื่อที่ ย่าน หรือประเภท");
    fireEvent.change(input, { target: { value: "ไม่มีทริปนี้แน่นอน" } });

    expect(await screen.findByText("ไม่พบทริปที่ตรงกับการค้นหา")).toBeInTheDocument();
  });
});
