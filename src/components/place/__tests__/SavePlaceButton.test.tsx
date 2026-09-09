import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SavePlaceButton } from "@/components/place/SavePlaceButton";
import { savePlace, unsavePlace } from "@/lib/saved-places-api";

vi.mock("@/lib/saved-places-api", () => ({ savePlace: vi.fn(), unsavePlace: vi.fn() }));

const showToast = vi.fn();
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ showToast }) }));

const savePlaceMock = vi.mocked(savePlace);
const unsavePlaceMock = vi.mocked(unsavePlace);

const PLACE = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  savePlaceMock.mockResolvedValue(undefined);
  unsavePlaceMock.mockResolvedValue(undefined);
});

describe("SavePlaceButton", () => {
  it("sends a signed-out visitor to log in instead of writing anything", () => {
    const onRequireLogin = vi.fn();
    render(
      <SavePlaceButton
        placeId={PLACE}
        placeName="วัดเชียงทอง"
        signedIn={false}
        onRequireLogin={onRequireLogin}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "บันทึกสถานที่นี้" }));

    expect(onRequireLogin).toHaveBeenCalledTimes(1);
    expect(savePlaceMock).not.toHaveBeenCalled();
  });

  it("fills the icon on click and saves the place", async () => {
    render(<SavePlaceButton placeId={PLACE} placeName="วัดเชียงทอง" signedIn onRequireLogin={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "บันทึกสถานที่นี้" }));

    // Optimistic: the label flips before the request resolves.
    expect(screen.getByRole("button", { name: "เอาสถานที่นี้ออกจากรายการบันทึก" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await waitFor(() => expect(savePlaceMock).toHaveBeenCalledWith(PLACE));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('บันทึก "วัดเชียงทอง" ไว้แล้ว'));
  });

  it("un-saves a place that is already bookmarked", async () => {
    const onSavedChange = vi.fn();
    render(
      <SavePlaceButton
        placeId={PLACE}
        placeName="วัดเชียงทอง"
        initialSaved
        signedIn
        onRequireLogin={vi.fn()}
        onSavedChange={onSavedChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "เอาสถานที่นี้ออกจากรายการบันทึก" }));

    await waitFor(() => expect(unsavePlaceMock).toHaveBeenCalledWith(PLACE));
    // The list that owns the card removes it on `false` — see SavedPlaceCard.
    expect(onSavedChange).toHaveBeenCalledWith(false);
  });

  // The optimistic flip has to be undone, including for the list that already
  // dropped the card, or the UI keeps a bookmark the server never took.
  it("reverts the icon and the list when the write fails", async () => {
    const onSavedChange = vi.fn();
    savePlaceMock.mockRejectedValue(new Error("บันทึกสถานที่ไม่สำเร็จ (500)"));
    render(
      <SavePlaceButton
        placeId={PLACE}
        placeName="วัดเชียงทอง"
        signedIn
        onRequireLogin={vi.fn()}
        onSavedChange={onSavedChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "บันทึกสถานที่นี้" }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("บันทึกสถานที่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error")
    );
    expect(screen.getByRole("button", { name: "บันทึกสถานที่นี้" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(onSavedChange).toHaveBeenLastCalledWith(false);
  });
});
