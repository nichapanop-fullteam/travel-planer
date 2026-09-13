import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AddPlaceToTripMenu } from "@/components/plan/AddPlaceToTripMenu";
import { getMyTrips } from "@/lib/trips-api";
import { addPlaceToTripShelf } from "@/lib/add-place-to-trip";
import { createEmptyTripForPlace } from "@/lib/trips-draft-api";
import type { AddablePlace } from "@/lib/add-place-to-trip";

vi.mock("@/lib/trips-api", () => ({ getMyTrips: vi.fn() }));
vi.mock("@/lib/add-place-to-trip", () => ({ addPlaceToTripShelf: vi.fn() }));
vi.mock("@/lib/trips-draft-api", () => ({ createEmptyTripForPlace: vi.fn() }));

const showToast = vi.fn();
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ showToast }) }));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const getMyTripsMock = vi.mocked(getMyTrips);
const addPlaceToTripShelfMock = vi.mocked(addPlaceToTripShelf);
const createTripMock = vi.mocked(createEmptyTripForPlace);

const place: AddablePlace = {
  placeId: "11111111-1111-4111-8111-111111111111",
  title: "ตักบาตรข้าวเหนียว",
  category: "sightseeing",
  time: "05:00",
  cost: 120,
};

// Only the fields the menu actually reads — the real rows carry two dozen more.
function tripRow(id: string, title: string) {
  return { id, title, destination: "หลวงพระบาง, ลาว" };
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "เพิ่มสถานที่นี้เข้าทริปของฉัน" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  addPlaceToTripShelfMock.mockResolvedValue({ linkedToPlace: true });
});

describe("AddPlaceToTripMenu", () => {
  it("sends a signed-out visitor to log in instead of opening the menu", () => {
    const onRequireLogin = vi.fn();
    getMyTripsMock.mockResolvedValue([]);
    render(<AddPlaceToTripMenu place={place} signedIn={false} onRequireLogin={onRequireLogin} />);

    openMenu();

    expect(onRequireLogin).toHaveBeenCalledTimes(1);
    expect(getMyTripsMock).not.toHaveBeenCalled();
  });

  it("lists the visitor's own trips, leaving out the one being read", async () => {
    getMyTripsMock.mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("trip-a", "ไปหลวงพระบางกัน") as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("trip-b", "ญี่ปุ่น") as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("source-trip", "ทริปหลวงพระบางสายชิล") as any,
    ]);
    render(
      <AddPlaceToTripMenu place={place} excludeTripId="source-trip" signedIn onRequireLogin={vi.fn()} />
    );

    openMenu();

    expect(await screen.findByText("ไปหลวงพระบางกัน")).toBeInTheDocument();
    expect(screen.getByText("ญี่ปุ่น")).toBeInTheDocument();
    expect(screen.queryByText("ทริปหลวงพระบางสายชิล")).not.toBeInTheDocument();
  });

  // The whole change: picking the trip IS the whole flow now. Nothing asks
  // which day, and no day list is read to offer one.
  it("shelves the place as soon as a trip is picked, with no day step", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ไปหลวงพระบางกัน") as any]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ไปหลวงพระบางกัน"));

    await waitFor(() => expect(addPlaceToTripShelfMock).toHaveBeenCalledWith("trip-a", place));
    expect(screen.queryByText(/ลงวันที่/)).not.toBeInTheDocument();
  });

  it("offers the way to the trip that just changed", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ไปหลวงพระบางกัน") as any]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ไปหลวงพระบางกัน"));

    // The confirmation is a dialog, not a toast: its useful action is finishing
    // the job on the trip that just changed.
    expect(await screen.findByText("เก็บสถานที่ไว้ในทริปแล้ว")).toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "ไปจัดวัน" }));
    expect(push).toHaveBeenCalledWith("/generated-plan/trip-a");
  });

  it("stays put when the visitor chooses อยู่ต่อ", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ไปหลวงพระบางกัน") as any]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ไปหลวงพระบางกัน"));
    fireEvent.click(await screen.findByRole("button", { name: "อยู่ต่อ" }));

    expect(screen.queryByText("เก็บสถานที่ไว้ในทริปแล้ว")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("reports the reason when the write fails, without claiming success", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ไปหลวงพระบางกัน") as any]);
    addPlaceToTripShelfMock.mockRejectedValue(new Error("เพิ่มสถานที่ลงทริปไม่สำเร็จ (500)"));
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ไปหลวงพระบางกัน"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("เพิ่มสถานที่ลงทริปไม่สำเร็จ (500)", "error")
    );
    expect(screen.queryByText("เก็บสถานที่ไว้ในทริปแล้ว")).not.toBeInTheDocument();
    // The trip list is still open, so a retry is one click away.
    expect(screen.getByText("ไปหลวงพระบางกัน")).toBeInTheDocument();
  });

  // A trip with no days is no obstacle any more — the shelf needs none. This
  // used to be a dead end reading "ทริปนี้ยังไม่มีวันในแผน".
  it("shelves into a trip that has no days at all", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ทริปเปล่า") as any]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ทริปเปล่า"));

    await waitFor(() => expect(addPlaceToTripShelfMock).toHaveBeenCalledWith("trip-a", place));
    expect(screen.queryByText("ทริปนี้ยังไม่มีวันในแผน")).not.toBeInTheDocument();
  });
});

describe("สร้างทริปใหม่ from the menu", () => {
  it("creates the trip and puts the place straight onto it", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ไปหลวงพระบางกัน") as any]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createTripMock.mockResolvedValue(tripRow("trip-new", "หลวงพระบาง, ลาว") as any);
    render(
      <AddPlaceToTripMenu
        place={place}
        destinationHint="หลวงพระบาง, ลาว"
        signedIn
        onRequireLogin={vi.fn()}
      />
    );

    openMenu();
    fireEvent.click(await screen.findByText("สร้างทริปใหม่"));

    await waitFor(() => expect(createTripMock).toHaveBeenCalledWith("หลวงพระบาง, ลาว"));
    await waitFor(() => expect(addPlaceToTripShelfMock).toHaveBeenCalledWith("trip-new", place));
    expect(await screen.findByText("เก็บสถานที่ไว้ในทริปแล้ว")).toBeInTheDocument();
  });

  // Otherwise a failed create leaves the traveller believing a trip exists.
  it("writes nothing when the trip cannot be created", async () => {
    getMyTripsMock.mockResolvedValue([]);
    createTripMock.mockRejectedValue(new Error("สร้างทริปไม่สำเร็จ (500)"));
    render(
      <AddPlaceToTripMenu
        place={place}
        destinationHint="หลวงพระบาง, ลาว"
        signedIn
        onRequireLogin={vi.fn()}
      />
    );

    openMenu();
    fireEvent.click(await screen.findByText("สร้างทริปใหม่"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("สร้างทริปไม่สำเร็จ (500)", "error")
    );
    expect(addPlaceToTripShelfMock).not.toHaveBeenCalled();
  });

  // A café is not a destination, so there is nothing honest to name a trip
  // after — /saved passes no hint and gets the full wizard instead.
  it("links out to the wizard when there is no destination to name a trip after", async () => {
    getMyTripsMock.mockResolvedValue([]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();

    expect(await screen.findByText("ยังไม่มีทริปของคุณ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "สร้างทริปใหม่" })).toHaveAttribute(
      "href",
      "/create-trip"
    );
    expect(createTripMock).not.toHaveBeenCalled();
  });
});
