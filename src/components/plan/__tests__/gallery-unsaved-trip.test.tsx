import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TripGalleryDialog } from "@/components/plan/TripGalleryDialog";

const getTripGalleryMock = vi.fn();
vi.mock("@/lib/trip-media-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/trip-media-api")>("@/lib/trip-media-api");
  return { ...actual, getTripGallery: (...args: unknown[]) => getTripGalleryMock(...args) };
});

// A plan opens on screen before POST /trips/create has finished, so for a
// moment its id is the one this browser generated. Asking the media routes
// about that id answers "Trip not found", which the traveller reads as their
// photos having gone missing.
describe("TripGalleryDialog on a trip that is not saved yet", () => {
  beforeEach(() => {
    getTripGalleryMock.mockReset();
    getTripGalleryMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24, coverMediaId: undefined });
  });

  it("asks for nothing while the trip has no row behind it", async () => {
    render(
      <TripGalleryDialog tripId="local-id" ready={false} onClose={() => {}} onCoverChanged={() => {}} />
    );

    await waitFor(() =>
      expect(screen.getByText("กำลังบันทึกทริป เดี๋ยวรูปจะขึ้นให้เอง")).toBeInTheDocument()
    );
    expect(getTripGalleryMock).not.toHaveBeenCalled();
  });

  it("loads as soon as the id is real", async () => {
    const { rerender } = render(
      <TripGalleryDialog tripId="local-id" ready={false} onClose={() => {}} onCoverChanged={() => {}} />
    );
    expect(getTripGalleryMock).not.toHaveBeenCalled();

    rerender(
      <TripGalleryDialog tripId="server-id" ready onClose={() => {}} onCoverChanged={() => {}} />
    );

    await waitFor(() => expect(getTripGalleryMock).toHaveBeenCalledWith("server-id"));
  });

  it("keeps the ordinary empty state for a saved trip with no photos", async () => {
    render(
      <TripGalleryDialog tripId="server-id" ready onClose={() => {}} onCoverChanged={() => {}} />
    );

    await waitFor(() => expect(screen.getByText("ยังไม่มีรูปภาพในทริปนี้")).toBeInTheDocument());
  });

  // Uploading needs somewhere to upload to.
  it("disables upload until the trip exists", async () => {
    render(
      <TripGalleryDialog tripId="local-id" ready={false} onClose={() => {}} onCoverChanged={() => {}} />
    );

    expect(await screen.findByText("อัปโหลดรูป")).toBeDisabled();
  });
});
