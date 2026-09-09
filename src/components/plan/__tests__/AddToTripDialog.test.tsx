import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AddToTripDialog } from "@/components/plan/AddToTripDialog";
import { getMyTrips } from "@/lib/trips-api";

vi.mock("@/lib/trips-api", () => ({ getMyTrips: vi.fn() }));

const getMyTripsMock = vi.mocked(getMyTrips);

// Only the fields the dialog reads — the real rows carry two dozen more.
function tripRow(
  id: string,
  title: string,
  schedule?: { startDate?: string; endDate?: string; durationDays?: number }
) {
  return { id, title, destination: "หลวงพระบาง, ลาว", schedule };
}

function props(overrides: Partial<Parameters<typeof AddToTripDialog>[0]> = {}) {
  return {
    excludeTripId: "source-trip",
    submitting: false,
    onClose: vi.fn(),
    onCreateNew: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AddToTripDialog", () => {
  it("lists the visitor's own trips, leaving out the one being read", async () => {
    getMyTripsMock.mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("trip-a", "ไปหลวงพระบางกัน") as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("source-trip", "ทริปหลวงพระบางสายชิล") as any,
    ]);

    render(<AddToTripDialog {...props()} />);

    expect(await screen.findByText("ไปหลวงพระบางกัน")).toBeInTheDocument();
    // Remixing a trip into itself is a 400 — it must never be offerable.
    expect(screen.queryByText("ทริปหลวงพระบางสายชิล")).not.toBeInTheDocument();
  });

  it("keeps ตกลง disabled until a trip is picked, then hands that trip back", async () => {
    const onConfirm = vi.fn();
    getMyTripsMock.mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("trip-a", "ไปหลวงพระบางกัน") as any,
    ]);

    render(<AddToTripDialog {...props({ onConfirm })} />);

    const confirm = screen.getByRole("button", { name: "ตกลง" });
    expect(confirm).toBeDisabled();

    fireEvent.click(await screen.findByRole("radio", { name: /ไปหลวงพระบางกัน/ }));
    expect(confirm).toBeEnabled();

    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0].id).toBe("trip-a");
  });

  it("marks the picked trip as checked so only one can be selected", async () => {
    getMyTripsMock.mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("trip-a", "ไปหลวงพระบางกัน") as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("trip-b", "ญี่ปุ่น") as any,
    ]);

    render(<AddToTripDialog {...props()} />);

    fireEvent.click(await screen.findByRole("radio", { name: /ไปหลวงพระบางกัน/ }));
    fireEvent.click(screen.getByRole("radio", { name: /ญี่ปุ่น/ }));

    expect(screen.getByRole("radio", { name: /ไปหลวงพระบางกัน/ })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    expect(screen.getByRole("radio", { name: /ญี่ปุ่น/ })).toHaveAttribute("aria-checked", "true");
  });

  it("labels a trip with no dates rather than leaving the badge blank", async () => {
    getMyTripsMock.mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("trip-a", "ญี่ปุ่น", { durationDays: 7 }) as any,
    ]);

    render(<AddToTripDialog {...props()} />);

    expect(await screen.findByText("ยังไม่ได้กำหนดวัน")).toBeInTheDocument();
    expect(screen.getByText("· 7 วัน")).toBeInTheDocument();
  });

  it("offers สร้างทริปใหม่ as the way out when the visitor has no trips at all", async () => {
    const onCreateNew = vi.fn();
    getMyTripsMock.mockResolvedValue([]);

    render(<AddToTripDialog {...props({ onCreateNew })} />);

    expect(await screen.findByText(/ยังไม่มีทริปของคุณ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "สร้างทริปใหม่" }));
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it("offers a retry when My Trips fails to load", async () => {
    getMyTripsMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("trip-a", "ไปหลวงพระบางกัน") as any,
    ]);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<AddToTripDialog {...props()} />);

    fireEvent.click(await screen.findByRole("button", { name: "ลองอีกครั้ง" }));

    expect(await screen.findByText("ไปหลวงพระบางกัน")).toBeInTheDocument();
  });

  it("locks every exit while the merge is in flight", async () => {
    const onClose = vi.fn();
    getMyTripsMock.mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tripRow("trip-a", "ไปหลวงพระบางกัน") as any,
    ]);

    render(<AddToTripDialog {...props({ submitting: true, onClose })} />);

    await waitFor(() => expect(screen.getByText("ไปหลวงพระบางกัน")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ปิด" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "สร้างทริปใหม่" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the API's own message when the merge fails", async () => {
    getMyTripsMock.mockResolvedValue([]);

    render(<AddToTripDialog {...props({ errorMessage: "ไม่สามารถนำแผนส่วนตัวนี้ไปใช้ได้" })} />);

    expect(await screen.findByText("ไม่สามารถนำแผนส่วนตัวนี้ไปใช้ได้")).toBeInTheDocument();
  });
});
