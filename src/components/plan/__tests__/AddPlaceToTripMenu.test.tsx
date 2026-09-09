import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AddPlaceToTripMenu } from "@/components/plan/AddPlaceToTripMenu";
import { getMyTrips } from "@/lib/trips-api";
import { addPlaceToTripDay, getTripDayOptions } from "@/lib/add-place-to-trip";
import type { AddablePlace } from "@/lib/add-place-to-trip";

vi.mock("@/lib/trips-api", () => ({ getMyTrips: vi.fn() }));
vi.mock("@/lib/add-place-to-trip", () => ({
  addPlaceToTripDay: vi.fn(),
  getTripDayOptions: vi.fn(),
}));

const showToast = vi.fn();
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ showToast }) }));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const getMyTripsMock = vi.mocked(getMyTrips);
const getTripDayOptionsMock = vi.mocked(getTripDayOptions);
const addPlaceToTripDayMock = vi.mocked(addPlaceToTripDay);

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

const DAYS = [
  { id: "day-1", dayNumber: 1, date: "2026-10-10", activityCount: 3 },
  { id: "day-2", dayNumber: 2, date: "2026-10-11", activityCount: 0 },
];

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "เพิ่มสถานที่นี้เข้าทริปของฉัน" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  getTripDayOptionsMock.mockResolvedValue(DAYS);
  addPlaceToTripDayMock.mockResolvedValue({ dayNumber: 2, linkedToPlace: true });
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

  // The second step is the point of the flow: nothing is written until a day is
  // named, so picking a trip must not add anything on its own.
  it("asks which day after a trip is picked, and writes nothing yet", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ไปหลวงพระบางกัน") as any]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ไปหลวงพระบางกัน"));

    expect(await screen.findByText("ลงวันที่ 1")).toBeInTheDocument();
    expect(screen.getByText("ลงวันที่ 2")).toBeInTheDocument();
    // How full each day already is, so "which day" is an informed choice.
    expect(screen.getByText("3 ที่")).toBeInTheDocument();
    expect(getTripDayOptionsMock).toHaveBeenCalledWith("trip-a");
    expect(addPlaceToTripDayMock).not.toHaveBeenCalled();
  });

  it("adds the place to the picked day and offers the way to that trip", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ไปหลวงพระบางกัน") as any]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ไปหลวงพระบางกัน"));
    fireEvent.click(await screen.findByText("ลงวันที่ 2"));

    await waitFor(() => expect(addPlaceToTripDayMock).toHaveBeenCalledWith(DAYS[1], place));
    // The confirmation is a dialog, not a toast: its useful action is going to
    // the trip that just changed.
    expect(await screen.findByText("Remix สถานที่ลงทริปแล้ว")).toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "ไปดูทริป" }));
    expect(push).toHaveBeenCalledWith("/generated-plan/trip-a");
  });

  it("stays put when the visitor chooses อยู่ต่อ", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ไปหลวงพระบางกัน") as any]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ไปหลวงพระบางกัน"));
    fireEvent.click(await screen.findByText("ลงวันที่ 1"));
    fireEvent.click(await screen.findByRole("button", { name: "อยู่ต่อ" }));

    expect(screen.queryByText("Remix สถานที่ลงทริปแล้ว")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("reports the reason when the write fails, without claiming success", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ไปหลวงพระบางกัน") as any]);
    addPlaceToTripDayMock.mockRejectedValue(new Error("เพิ่มสถานที่ไม่สำเร็จ (500)"));
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ไปหลวงพระบางกัน"));
    fireEvent.click(await screen.findByText("ลงวันที่ 1"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("เพิ่มสถานที่ไม่สำเร็จ (500)", "error")
    );
    expect(screen.queryByText("Remix สถานที่ลงทริปแล้ว")).not.toBeInTheDocument();
    // The day list is still open, so a retry is one click away.
    expect(screen.getByText("ลงวันที่ 1")).toBeInTheDocument();
  });

  it("says so when the picked trip has no days to add to", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMyTripsMock.mockResolvedValue([tripRow("trip-a", "ทริปเปล่า") as any]);
    getTripDayOptionsMock.mockResolvedValue([]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();
    fireEvent.click(await screen.findByText("ทริปเปล่า"));

    expect(await screen.findByText("ทริปนี้ยังไม่มีวันในแผน")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ไปเพิ่มวัน" })).toHaveAttribute(
      "href",
      "/generated-plan/trip-a"
    );
  });

  it("offers a way to create one when the visitor has no trips yet", async () => {
    getMyTripsMock.mockResolvedValue([]);
    render(<AddPlaceToTripMenu place={place} signedIn onRequireLogin={vi.fn()} />);

    openMenu();

    expect(await screen.findByText("ยังไม่มีทริปของคุณ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "สร้างทริปใหม่" })).toHaveAttribute("href", "/create-trip");
  });
});
