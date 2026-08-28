import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Activity } from "@/types";

const uploadTripMedia = vi.fn();
vi.mock("@/lib/trip-media-api", () => ({ uploadTripMedia: (...args: unknown[]) => uploadTripMedia(...args) }));

const { uploadActivityImagesForItem } = await import("@/lib/trips-create-api");

// 1x1 transparent GIF — small enough to inline, real enough for Blob/File.
const GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const HOSTED = "https://cdn.example.com/already-uploaded.jpg";

function activity(overrides: Partial<Activity> = {}): Activity {
  return { id: "local-1", time: "09:00", title: "วัดเชียงทอง", category: "sightseeing", ...overrides } as Activity;
}

function media(n: number) {
  return {
    mediaId: `media-${n}`,
    urls: { original: `https://cdn/o/${n}.gif`, large: `https://cdn/l/${n}.gif`, thumbnail: `https://cdn/t/${n}.gif` },
  };
}

beforeEach(() => {
  uploadTripMedia.mockReset();
  let n = 0;
  uploadTripMedia.mockImplementation(() => Promise.resolve(media((n += 1))));
});

describe("uploadActivityImagesForItem", () => {
  it("uploads each data-URL photo against the item that now exists server-side", async () => {
    await uploadActivityImagesForItem("trip-9", "item-42", activity({ images: [GIF, GIF] }));

    expect(uploadTripMedia).toHaveBeenCalledTimes(2);
    for (const [tripId, file, opts] of uploadTripMedia.mock.calls) {
      expect(tripId).toBe("trip-9");
      expect(file).toBeInstanceOf(File);
      expect(file.type).toBe("image/gif");
      expect(opts).toEqual({ activityId: "item-42", altText: "วัดเชียงทอง" });
    }
    // Named per index so two photos on one activity don't collide.
    expect(uploadTripMedia.mock.calls.map((c) => c[1].name)).toEqual(["activity-1.gif", "activity-2.gif"]);
  });

  // The swap is what makes "still a data: URL" mean "not uploaded yet". Without
  // it, editing an activity re-uploads every photo it has, every time.
  it("returns the hosted URLs in place of the base64 originals", async () => {
    const next = await uploadActivityImagesForItem("trip-9", "item-42", activity({ images: [GIF, GIF] }));

    expect(next).toEqual(["https://cdn/l/1.gif", "https://cdn/l/2.gif"]);
    expect(next?.some((src) => src.startsWith("data:"))).toBe(false);
  });

  it("keeps already-hosted photos in place and uploads only the new one", async () => {
    const next = await uploadActivityImagesForItem("trip-9", "item-42", activity({ images: [HOSTED, GIF] }));

    expect(uploadTripMedia).toHaveBeenCalledTimes(1);
    // Order preserved, and the untouched entry is byte-identical.
    expect(next).toEqual([HOSTED, "https://cdn/l/1.gif"]);
    // Index counts uploads, not array position, so the filename isn't a gap.
    expect(uploadTripMedia.mock.calls[0][1].name).toBe("activity-1.gif");
  });

  it("keeps the data URL when the upload response carries no URL", async () => {
    // Losing the picture would be worse than a possible re-upload later.
    uploadTripMedia.mockResolvedValue({ mediaId: "media-x" });

    const next = await uploadActivityImagesForItem("trip-9", "item-42", activity({ images: [GIF] }));

    expect(next).toEqual([GIF]);
  });

  it("returns null without uploading when nothing is pending", async () => {
    // null lets the caller skip a state write entirely.
    expect(await uploadActivityImagesForItem("trip-9", "item-42", activity())).toBeNull();
    expect(await uploadActivityImagesForItem("trip-9", "item-42", activity({ images: [] }))).toBeNull();
    expect(await uploadActivityImagesForItem("trip-9", "item-42", activity({ images: [HOSTED] }))).toBeNull();

    expect(uploadTripMedia).not.toHaveBeenCalled();
  });
});
