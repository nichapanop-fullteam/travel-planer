"use client";

// The bookmark toggle on a single place. Deliberately knows nothing about where
// it is rendered — a stop on /view-trip today, a recommendation card or a map
// popup tomorrow — so it takes a placeId and an initial state and nothing else.
//
// Optimistic like the trip-level bookmark on /view-trip: the icon fills on
// click and reverts with a toast if the write fails, because a bookmark is
// cheap to undo and waiting for a round trip to fill an icon reads as broken.
import { useState } from "react";
import { Bookmark } from "lucide-react";
import { savePlace, unsavePlace } from "@/lib/saved-places-api";
import { useToast } from "@/providers/ToastProvider";

export function SavePlaceButton({
  placeId,
  placeName,
  initialSaved = false,
  signedIn,
  onRequireLogin,
  onSavedChange,
  className,
}: {
  placeId: string;
  // Only for the toast copy — the button itself renders no text.
  placeName: string;
  initialSaved?: boolean;
  signedIn: boolean;
  onRequireLogin: () => void;
  // For a list that has to drop the card when it stops being saved (/saved).
  onSavedChange?: (saved: boolean) => void;
  className?: string;
}) {
  const { showToast } = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  function handleClick() {
    if (!signedIn) {
      onRequireLogin();
      return;
    }
    if (pending) return;

    const next = !saved;
    setSaved(next);
    setPending(true);
    onSavedChange?.(next);
    (next ? savePlace(placeId) : unsavePlace(placeId))
      .then(() => {
        showToast(next ? `บันทึก "${placeName}" ไว้แล้ว` : `เอา "${placeName}" ออกจากรายการบันทึกแล้ว`);
      })
      .catch((err: unknown) => {
        console.warn("บันทึกสถานที่ไม่สำเร็จ", err);
        setSaved(!next);
        onSavedChange?.(!next);
        showToast(
          next ? "บันทึกสถานที่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "เอาสถานที่ออกจากรายการบันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
          "error"
        );
      })
      .finally(() => setPending(false));
  }

  return (
    <button
      type="button"
      aria-label={saved ? "เอาสถานที่นี้ออกจากรายการบันทึก" : "บันทึกสถานที่นี้"}
      aria-pressed={saved}
      onClick={handleClick}
      className={className ?? "flex h-9 w-9 items-center justify-center rounded-full border bg-white"}
      style={{
        borderColor: "var(--color-border)",
        color: saved ? "var(--color-accent-violet)" : "var(--foreground)",
      }}
    >
      <Bookmark size={16} fill={saved ? "var(--color-accent-violet)" : "none"} />
    </button>
  );
}
