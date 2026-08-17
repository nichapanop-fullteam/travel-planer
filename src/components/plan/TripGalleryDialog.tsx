"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, LoaderCircle, Star, Trash2, Upload, X } from "lucide-react";
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.urls.thumbnail} alt={item.altText ?? ""} className="h-full w-full object-cover" />
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
    </div>
  );
}
