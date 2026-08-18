"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, LoaderCircle, Star, Trash2, Upload, X } from "lucide-react";
import {
  deleteTripMedia,
  getTripGallery,
  setTripCover,
  uploadTripMedia,
} from "@/lib/trip-media-api";
import type { GalleryMediaItem, Media, MediaSummary } from "@/types";

// Gallery management dialog opened from the "จัดการรูปภาพ" button on the
// generated-plan Hero — view/upload/delete gallery photos and set the trip
// cover. Only works once the trip has been saved to the server (POST
// /trips/create), since the tripId here has to match a real backend trip —
// a 404 from any call below most likely means that hasn't happened yet.
export function TripGalleryDialog({
  tripId,
  onClose,
  onCoverChanged,
}: {
  tripId: string;
  onClose: () => void;
  onCoverChanged: (coverImage: Media | undefined, mediaSummary: MediaSummary | undefined) => void;
}) {
  const [items, setItems] = useState<GalleryMediaItem[]>([]);
  const [coverMediaId, setCoverMediaId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Which item is open in the full-size preview lightbox — set/cleared by
  // clicking a thumbnail (not the hover star/trash quick-actions, which stay
  // on the grid for the "act without opening anything" case).
  const [previewId, setPreviewId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    setError(null);
    getTripGallery(tripId)
      .then((res) => {
        setItems(res.items);
        setCoverMediaId(res.coverMediaId);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "โหลดรูปภาพไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      await uploadTripMedia(tripId, file);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function handleSetCover(mediaId: string) {
    setBusyId(mediaId);
    setError(null);
    try {
      const trip = await setTripCover(tripId, mediaId);
      setCoverMediaId(mediaId);
      setItems((prev) => prev.map((it) => ({ ...it, isCover: it.id === mediaId })));
      onCoverChanged(trip.coverImage, trip.mediaSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ตั้งรูปปกไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(mediaId: string) {
    setBusyId(mediaId);
    setError(null);
    try {
      await deleteTripMedia(tripId, mediaId);
      setItems((prev) => prev.filter((it) => it.id !== mediaId));
      if (mediaId === coverMediaId) {
        setCoverMediaId(undefined);
        onCoverChanged(undefined, undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบรูปภาพไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="text-base font-bold">จัดการรูปภาพทริป</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ borderColor: "var(--color-border)" }}
          >
            {uploading ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
          </button>

          {error && (
            <p
              className="mb-4 rounded-xl px-3 py-2 text-xs"
              style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-danger)" }}
            >
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoaderCircle size={20} className="animate-spin text-[var(--color-muted)]" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-[var(--color-muted)]">
              <ImageOff size={24} />
              <p className="text-sm">ยังไม่มีรูปภาพในทริปนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewId(item.id)}
                    aria-label="ดูรูปภาพขนาดใหญ่"
                    className="block h-full w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.urls.thumbnail} alt={item.altText ?? ""} className="h-full w-full object-cover" />
                  </button>
                  {item.isCover && (
                    <span
                      className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold"
                      style={{ color: "var(--color-brand-green)" }}
                    >
                      <Star size={10} fill="currentColor" />
                      รูปปก
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {!item.isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetCover(item.id)}
                        disabled={busyId === item.id}
                        title="ตั้งเป็นรูปปก"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 disabled:opacity-60"
                      >
                        {busyId === item.id ? (
                          <LoaderCircle size={12} className="animate-spin" />
                        ) : (
                          <Star size={12} />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={busyId === item.id}
                      title="ลบรูปภาพ"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 disabled:opacity-60"
                    >
                      <Trash2 size={12} style={{ color: "var(--color-danger)" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewId && (
        <GalleryPreview
          items={items}
          activeId={previewId}
          busyId={busyId}
          onChangeActive={setPreviewId}
          onClose={() => setPreviewId(null)}
          onSetCover={handleSetCover}
          onDelete={async (mediaId) => {
            const index = items.findIndex((it) => it.id === mediaId);
            await handleDelete(mediaId);
            const remaining = items.filter((it) => it.id !== mediaId);
            setPreviewId(remaining.length ? (remaining[Math.min(index, remaining.length - 1)]?.id ?? null) : null);
          }}
        />
      )}
    </div>
  );
}

// Full-size lightbox — opened by clicking a thumbnail (the grid's hover
// star/trash stay as quick-actions that don't require opening this at all).
// Same set-cover/delete actions as the grid, plus prev/next since this is
// also just a nicer way to flip through the trip's photos one at a time.
function GalleryPreview({
  items,
  activeId,
  busyId,
  onChangeActive,
  onClose,
  onSetCover,
  onDelete,
}: {
  items: GalleryMediaItem[];
  activeId: string;
  busyId: string | null;
  onChangeActive: (id: string) => void;
  onClose: () => void;
  onSetCover: (mediaId: string) => void;
  onDelete: (mediaId: string) => void;
}) {
  const index = items.findIndex((it) => it.id === activeId);
  const item = items[index];
  if (!item) return null;

  function step(delta: number) {
    const next = items[(index + delta + items.length) % items.length];
    if (next) onChangeActive(next.id);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิดรูปภาพ"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
      >
        <X size={18} />
      </button>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="รูปก่อนหน้า"
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="รูปถัดไป"
            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <div className="flex max-h-full max-w-3xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.urls.large}
          alt={item.altText ?? ""}
          className="max-h-[70vh] max-w-full rounded-lg object-contain"
        />
        <div className="flex items-center gap-2">
          {item.isCover ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold"
              style={{ color: "var(--color-brand-green)" }}
            >
              <Star size={14} fill="currentColor" />
              รูปปกของทริป
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSetCover(item.id)}
              disabled={busyId === item.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold disabled:opacity-60"
            >
              {busyId === item.id ? <LoaderCircle size={14} className="animate-spin" /> : <Star size={14} />}
              ตั้งเป็นรูปปก
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            disabled={busyId === item.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold disabled:opacity-60"
            style={{ color: "var(--color-danger)" }}
          >
            <Trash2 size={14} />
            ลบรูปภาพ
          </button>
        </div>
      </div>
    </div>
  );
}
