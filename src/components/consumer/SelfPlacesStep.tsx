"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BedDouble,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Flag,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Timer,
  Trash2,
  TreePine,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  fetchExternalPlaceSuggestions,
  searchExternalPlaces,
  type ExternalPlaceCategory,
  type ExternalSearchPlace,
} from "@/lib/external-places-api";
import { type RecommendedPlace } from "@/lib/place-recommendations";
import { CATEGORY_LABEL_TH, enrichPlace, suggestedTimeLabel, type EnrichedPlace } from "@/lib/place-mock-metadata";

// null dayIndex = "บันทึกไว้ก่อน" (save for later, no day chosen yet) — see
// withSelfRecommendations in create-trip/page.tsx for how each case is
// folded into the final trip.
export interface SelfSelectedRecommendation {
  place: RecommendedPlace;
  dayIndex: number | null;
}

type CategoryFilter = ExternalPlaceCategory | "all";

interface ShortcutCategory {
  key: CategoryFilter;
  label: string;
  icon: LucideIcon;
}

// English labels on purpose — the exact "Shortcut Category" set from the
// recommended-places spec.
const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  { key: "all", label: "Must Visit", icon: Sparkles },
  { key: "attraction", label: "Attractions", icon: Flag },
  { key: "restaurant", label: "Food", icon: UtensilsCrossed },
  { key: "cafe", label: "Café", icon: Coffee },
  { key: "hotel", label: "Hotel", icon: BedDouble },
  { key: "shopping", label: "Shopping", icon: ShoppingBag },
  { key: "activity", label: "Nature", icon: TreePine },
];

const SUGGEST_LIMIT = 20; // documented cap — see lib/place-recommendations.ts
const SEARCH_DEBOUNCE_MS = 350;

function toRecommendedPlace(place: EnrichedPlace): RecommendedPlace {
  return {
    googlePlaceId: place.id,
    name: place.name,
    address: place.address,
    latitude: place.lat,
    longitude: place.lng,
    rating: place.rating,
    imageUrl: place.imageUrl,
    rawCategory: place.category,
  };
}

export function SelfPlacesStep({
  center,
  destinationName,
  dayCount,
  selectedRecommendations,
  onAssign,
  onRemove,
  onSubmit,
  submitDisabled,
}: {
  center: { lat: number; lng: number };
  destinationName?: string;
  // How many "วันที่ N" options to offer in the day-assignment sheet — the
  // real Day[] doesn't exist yet at this step (generation happens after),
  // so this is just the parsed duration from step 1.
  dayCount: number;
  selectedRecommendations: SelfSelectedRecommendation[];
  onAssign: (place: RecommendedPlace, dayIndex: number | null) => void;
  onRemove: (place: RecommendedPlace) => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
}) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [suggested, setSuggested] = useState<ExternalSearchPlace[] | null>(null);
  const [searchResults, setSearchResults] = useState<ExternalSearchPlace[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sheetPlace, setSheetPlace] = useState<EnrichedPlace | null>(null);
  const [showSelected, setShowSelected] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchExternalPlaceSuggestions(center.lat, center.lng, { limit: SUGGEST_LIMIT }).then((result) => {
      if (!cancelled) setSuggested(result);
    });
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(() => {
      searchExternalPlaces(trimmed, 20).then((results) => {
        setSearchResults(results);
        setSearching(false);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const isSearching = query.trim().length > 0;
  const sourcePlaces = isSearching ? searchResults : suggested;
  const filteredPlaces = useMemo(() => {
    if (!sourcePlaces) return null;
    const byCategory = category === "all" ? sourcePlaces : sourcePlaces.filter((p) => p.category === category);
    return byCategory.map((p) => enrichPlace(p, center));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcePlaces, category, center.lat, center.lng]);

  const selectedIds = new Set(selectedRecommendations.map((s) => s.place.googlePlaceId));

  function handleAddClick(place: EnrichedPlace) {
    // Optimistically marks it "Added" right away (save-for-later by
    // default) — the sheet then lets the traveler refine which day.
    if (!selectedIds.has(place.id)) onAssign(toRecommendedPlace(place), null);
    setSheetPlace(place);
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-6 sm:px-8">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">เลือกสถานที่เริ่มต้น</h2>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold"
          style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
        >
          PunGuide Recommend
        </span>
      </div>
      <p className="text-sm text-[var(--color-muted)]">
        เลือกสถานที่ที่อยากแวะ{destinationName ? `ใน${destinationName}` : ""} PunGuide จะช่วยจัดลงในแผนให้ (ข้ามได้
        ไม่บังคับเลือก)
      </p>

      <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
        <Search size={18} style={{ color: "var(--color-muted)" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search places in ${destinationName ?? "..."}`}
          className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--color-muted)] focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {SHORTCUT_CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = category === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
              style={
                isActive
                  ? {
                      backgroundColor: "var(--color-sel-bg)",
                      borderColor: "var(--color-brand-green)",
                      color: "var(--color-brand-green)",
                    }
                  : { borderColor: "var(--color-border)", color: "var(--foreground)" }
              }
            >
              <Icon size={14} />
              {c.label}
            </button>
          );
        })}
      </div>

      <div>
        <h3 className="mb-3 text-base font-bold">
          {isSearching ? `ผลการค้นหา “${query.trim()}”` : "Recommended Places"}
        </h3>

        {(isSearching ? searching : filteredPlaces === null) && (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">กำลังโหลด...</p>
        )}

        {filteredPlaces !== null && filteredPlaces.length === 0 && !(isSearching && searching) && (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">ไม่พบสถานที่</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlaces?.map((place) => (
            <PlaceRecommendationCard
              key={place.id}
              place={place}
              isAdded={selectedIds.has(place.id)}
              onAdd={() => handleAddClick(place)}
            />
          ))}
        </div>
      </div>

      {sheetPlace && (
        <AssignDaySheet
          place={sheetPlace}
          dayCount={dayCount}
          currentDayIndex={selectedRecommendations.find((s) => s.place.googlePlaceId === sheetPlace.id)?.dayIndex}
          onChoose={(dayIndex) => onAssign(toRecommendedPlace(sheetPlace), dayIndex)}
          onClose={() => setSheetPlace(null)}
        />
      )}

      {selectedRecommendations.length > 0 && (
        <div className="relative mt-2">
          {showSelected && (
            <>
              <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowSelected(false)} />
              <SelectedItemsSheet
                items={selectedRecommendations}
                dayCount={dayCount}
                onRemove={onRemove}
                onClose={() => setShowSelected(false)}
              />
            </>
          )}

          <div
            className="relative z-50 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-page-cream)" }}
          >
            <span className="text-sm">
              เพิ่มแล้ว <b style={{ color: "var(--color-accent-orange)" }}>{selectedRecommendations.length}</b>{" "}
              สถานที่
            </span>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSelected((v) => !v)}
                className="flex items-center gap-1 text-sm font-semibold underline"
                style={{ color: "var(--color-brand-green)" }}
              >
                ดูรายการที่เลือก
                {showSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitDisabled}
                className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: "var(--color-accent-orange)" }}
              >
                สร้างแพลน
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceRecommendationCard({
  place,
  isAdded,
  onAdd,
}: {
  place: EnrichedPlace;
  isAdded: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border shadow-sm" style={{ borderColor: "var(--color-border)" }}>
      <div className="relative h-36 w-full" style={{ backgroundColor: "var(--color-surface)" }}>
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <MapPin size={24} style={{ color: "var(--color-muted)" }} />
          </span>
        )}
        {place.rating !== undefined && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white">
            <Star size={11} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
            {place.rating.toFixed(1)}
            <span className="font-normal text-white/80">({place.reviewCount})</span>
          </span>
        )}
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white">
          <MapPin size={10} />
          {place.distanceKm} กม.
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{place.name}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">{CATEGORY_LABEL_TH[place.category]}</p>
        </div>

        <div className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="shrink-0" />
            {place.openingHoursLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet size={12} className="shrink-0" />
            {place.priceLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <Timer size={12} className="shrink-0" />
            แนะนำ {place.recommendedDurationLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-colors"
          style={
            isAdded
              ? {
                  backgroundColor: "var(--color-sel-bg)",
                  color: "var(--color-brand-green)",
                  border: "1px solid var(--color-sel-border)",
                }
              : { backgroundColor: "var(--color-accent-orange)", color: "#fff" }
          }
        >
          {isAdded ? <Check size={13} /> : <Plus size={13} />}
          {isAdded ? "Added" : "Add to trip"}
        </button>
      </div>
    </div>
  );
}

function AssignDaySheet({
  place,
  dayCount,
  currentDayIndex,
  onChoose,
  onClose,
}: {
  place: EnrichedPlace;
  dayCount: number;
  currentDayIndex?: number | null;
  onChoose: (dayIndex: number | null) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function choose(dayIndex: number | null) {
    onChoose(dayIndex);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-3xl bg-white p-6 shadow-2xl transition-transform duration-300 ease-out ${
          mounted ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{place.name}</p>
            <span
              className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
            >
              {suggestedTimeLabel(place.category)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-[var(--color-muted)]">เพิ่มไปวันไหนดี?</p>

        <div className="flex flex-col gap-2">
          {Array.from({ length: dayCount }, (_, i) => {
            const isSelected = currentDayIndex === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                className="flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors"
                style={
                  isSelected
                    ? {
                        borderColor: "var(--color-brand-green)",
                        backgroundColor: "var(--color-sel-bg)",
                        color: "var(--color-brand-green)",
                      }
                    : { borderColor: "var(--color-border)" }
                }
              >
                วันที่ {i + 1}
                {isSelected && <Check size={16} />}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => choose(null)}
            className="flex items-center justify-between rounded-2xl border border-dashed px-4 py-3 text-left text-sm font-semibold transition-colors"
            style={
              currentDayIndex === null
                ? { borderColor: "var(--color-accent-orange)", color: "var(--color-accent-orange)" }
                : { borderColor: "var(--color-border)", color: "var(--color-muted)" }
            }
          >
            บันทึกไว้ก่อน (ยังไม่กำหนดวัน)
            {currentDayIndex === null && <Check size={16} />}
          </button>
        </div>
      </div>
    </>
  );
}

function SelectedItemsSheet({
  items,
  dayCount,
  onRemove,
  onClose,
}: {
  items: SelfSelectedRecommendation[];
  dayCount: number;
  onRemove: (place: RecommendedPlace) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-full z-50 mb-3 flex max-h-[60vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-4">
        <p className="text-base font-bold">สถานที่ที่เลือกทั้งหมด ({items.length})</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
        {items.map(({ place, dayIndex }) => (
          <div
            key={place.googlePlaceId}
            className="flex items-center gap-3 rounded-2xl border p-2"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div
              className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              {place.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <MapPin size={18} style={{ color: "var(--color-muted)" }} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold">{place.name}</p>
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
                >
                  {dayIndex !== null && dayIndex < dayCount ? `วันที่ ${dayIndex + 1}` : "ไว้ทีหลัง"}
                </span>
              </div>
              {place.address && <p className="truncate text-xs text-[var(--color-muted)]">{place.address}</p>}
            </div>
            <button
              type="button"
              onClick={() => onRemove(place)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
