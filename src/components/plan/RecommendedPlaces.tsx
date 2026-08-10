"use client";

import { useEffect, useState } from "react";
import { Camera, Check, ChevronDown, Hotel, MapPin, Plus, Star, UtensilsCrossed, X, type LucideIcon } from "lucide-react";
import { fetchPlaceRecommendations, type RecommendedPlace } from "@/lib/place-recommendations";
import type { Activity, ActivityCategory, PlaceCategory } from "@/types";

interface CategorySection {
  key: PlaceCategory;
  label: string;
  icon: LucideIcon;
  activityCategory: ActivityCategory;
}

const CATEGORY_SECTIONS: CategorySection[] = [
  { key: "hotel", label: "ที่พัก", icon: Hotel, activityCategory: "hotel" },
  { key: "restaurant", label: "ร้านอาหาร", icon: UtensilsCrossed, activityCategory: "food" },
  { key: "attraction", label: "สถานที่ห้ามพลาด", icon: Camera, activityCategory: "sightseeing" },
];

// Rough default so newly-added activities don't all pile onto the same time —
// there's no real scheduling logic here, just a reasonable next hour.
function nextTimeSlot(existingCount: number): string {
  const hour = Math.min(9 + existingCount, 22);
  return `${String(hour).padStart(2, "0")}:00`;
}

export function RecommendedPlaces({
  center,
  existingPlaceIds,
  activityCount,
  onAdd,
}: {
  center: { lat: number; lng: number };
  existingPlaceIds: Set<string>;
  activityCount: number;
  onAdd: (activity: Activity) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<RecommendedPlace | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--color-border)" }}>
      {selectedPlace && <PlaceDetailDialog place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
      <div className="flex items-center gap-2 p-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--color-sel-bg)" }}
        >
          <MapPin size={16} style={{ color: "var(--color-brand-green)" }} />
        </span>
        <span className="text-sm text-[var(--color-muted)]">เพิ่มสถานที่</span>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 border-t px-3 py-2.5 text-sm font-semibold"
        style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
      >
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "" : "-rotate-90"}`} />
        สถานที่แนะนำ
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 border-t px-3 pb-3 pt-3" style={{ borderColor: "var(--color-border)" }}>
          {CATEGORY_SECTIONS.map((section) => (
            <CategoryRow
              key={section.key}
              section={section}
              center={center}
              existingPlaceIds={existingPlaceIds}
              onSelect={setSelectedPlace}
              onAdd={(place) =>
                onAdd({
                  id: crypto.randomUUID(),
                  time: nextTimeSlot(activityCount),
                  title: place.name,
                  category: section.activityCategory,
                  location: {
                    name: place.name,
                    lat: place.latitude,
                    lng: place.longitude,
                    rating: place.rating,
                    imageUrl: place.imageUrl,
                    googlePlaceId: place.googlePlaceId,
                  },
                  cost: 0,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  section,
  center,
  existingPlaceIds,
  onSelect,
  onAdd,
}: {
  section: CategorySection;
  center: { lat: number; lng: number };
  existingPlaceIds: Set<string>;
  onSelect: (place: RecommendedPlace) => void;
  onAdd: (place: RecommendedPlace) => void;
}) {
  const [places, setPlaces] = useState<RecommendedPlace[] | null>(null);
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetchPlaceRecommendations(section.key, center).then((result) => {
      if (!cancelled) setPlaces(result);
    });
    return () => {
      cancelled = true;
    };
  }, [section.key, center.lat, center.lng]);

  const Icon = section.icon;

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--color-muted)]">
        <Icon size={13} />
        {section.label}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {places === null && <p className="text-xs text-[var(--color-muted)]">กำลังโหลด...</p>}
        {places?.length === 0 && <p className="text-xs text-[var(--color-muted)]">ไม่พบสถานที่แนะนำ</p>}
        {places?.map((place) => {
          const isAdded = existingPlaceIds.has(place.googlePlaceId) || justAdded.has(place.googlePlaceId);
          return (
            <div
              key={place.googlePlaceId}
              className="flex shrink-0 items-center gap-2 rounded-2xl border border-dashed p-1.5 pr-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <button
                type="button"
                onClick={() => onSelect(place)}
                className="flex min-w-0 shrink-0 items-center gap-2"
              >
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: "var(--color-surface)" }}>
                  {place.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Icon size={16} style={{ color: "var(--color-muted)" }} />
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-col items-start">
                  <span className="max-w-[90px] truncate text-left text-xs font-semibold">{place.name}</span>
                  {place.rating !== undefined && (
                    <span className="flex items-center gap-0.5 text-[11px] text-[var(--color-muted)]">
                      <Star size={10} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
                      {place.rating.toFixed(1)}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                disabled={isAdded}
                onClick={() => {
                  setJustAdded((prev) => new Set(prev).add(place.googlePlaceId));
                  onAdd(place);
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border disabled:opacity-40"
                style={{ borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)" }}
              >
                {isAdded ? <Check size={12} /> : <Plus size={12} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlaceDetailDialog({ place, onClose }: { place: RecommendedPlace; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {place.imageUrl && (
          <div className="relative h-36 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-bold">{place.name}</p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <X size={14} />
            </button>
          </div>

          {place.rating !== undefined && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Star size={14} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
              <span className="font-bold">{place.rating.toFixed(1)}</span>
            </div>
          )}

          {place.address && (
            <div className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span>{place.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
