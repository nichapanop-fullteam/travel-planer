"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BedDouble,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Flag,
  Info,
  Pencil,
  Plus,
  Star,
  Trash2,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { fetchPlaceRecommendations, type RecommendedPlace } from "@/lib/place-recommendations";
import type { ExternalPlaceCategory } from "@/lib/external-places-api";
import { enrichPlace, type EnrichedPlace } from "@/lib/place-mock-metadata";
import type { PlaceCategory } from "@/types";

// Thai labels for the raw taxonomy sub-filters shown in the "ดูทั้งหมด" view —
// only the ones that can actually occur within a PlaceCategory bucket need
// an entry (see EXTERNAL_TO_PLACE_CATEGORY in place-recommendations.ts).
const RAW_CATEGORY_LABEL: Partial<Record<ExternalPlaceCategory, string>> = {
  attraction: "สถานที่ท่องเที่ยว",
  activity: "กิจกรรม",
  shopping: "ช้อปปิ้ง",
  restaurant: "ร้านอาหาร",
  cafe: "คาเฟ่",
  hotel: "โรงแรม",
};

export interface SelectedRecommendation {
  place: RecommendedPlace;
  category: PlaceCategory;
}

interface CategorySectionConfig {
  key: PlaceCategory;
  label: string;
  countLabel: string; // shorter noun used in the selection-summary bar, e.g. "ที่เที่ยว"
  icon: LucideIcon;
}

const CATEGORY_SECTIONS: CategorySectionConfig[] = [
  { key: "attraction", label: "สถานที่เช็คอินห้ามพลาด", countLabel: "ที่เที่ยว", icon: Flag },
  { key: "restaurant", label: "ร้านอาหารแนะนำ", countLabel: "ร้านอาหาร", icon: UtensilsCrossed },
  { key: "hotel", label: "ที่พักแนะนำ", countLabel: "ที่พัก", icon: BedDouble },
];

// None of price/hours/distance/duration exist on RecommendedPlace (see
// lib/external-places-api.ts) — same mock enrichment used on the self-mode
// places step, adapted to RecommendedPlace's field names.
function enrichForDisplay(place: RecommendedPlace, center: { lat: number; lng: number }): EnrichedPlace {
  return enrichPlace(
    {
      id: place.googlePlaceId,
      name: place.name,
      address: place.address,
      category: place.rawCategory,
      lat: place.latitude,
      lng: place.longitude,
      rating: place.rating,
      imageUrl: place.imageUrl,
    },
    center
  );
}

// Hotel "location" / "style" tags shown over the thumbnail — also mocked
// (no such fields on RecommendedPlace), deterministically picked per place
// id so a card's tags stay stable across re-renders.
const HOTEL_LOCATION_TAGS = ["ใจกลางเมือง", "เขตนอกเมือง", "ริมแม่น้ำ"];
const HOTEL_STYLE_TAGS = ["Ultra-Luxury", "Boutique Luxury Resort", "Budget Friendly", "Family Resort"];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function hotelTags(placeId: string): [string, string] {
  const seed = hashString(placeId);
  return [HOTEL_LOCATION_TAGS[seed % HOTEL_LOCATION_TAGS.length], HOTEL_STYLE_TAGS[(seed >> 3) % HOTEL_STYLE_TAGS.length]];
}

export function RecommendedPlacesStep({
  center,
  destinationName,
  selectedIds,
  selectedRecommendations,
  onToggle,
  onEditPreferences,
  onSubmit,
  submitDisabled,
}: {
  center: { lat: number; lng: number };
  // Shown in the "ดูทั้งหมด" panel as "ทั้งหมด XX จุดใน{destinationName}" —
  // optional since not every caller has resolved a destination name yet.
  destinationName?: string;
  selectedIds: Set<string>;
  selectedRecommendations: SelectedRecommendation[];
  onToggle: (place: RecommendedPlace, category: PlaceCategory) => void;
  // "แก้ไขความชอบ" under ที่พักแนะนำ — jumps back to the accommodation
  // preferences filled in on step 1. Optional since not every caller needs it.
  onEditPreferences?: () => void;
  // Once there's at least one selection, this component renders its own
  // summary + "สร้างแพลน" bar (see below) in place of the page's generic
  // step footer — onSubmit is that same submit action, passed through.
  onSubmit: () => void;
  submitDisabled?: boolean;
}) {
  const [showSelected, setShowSelected] = useState(false);

  const countsBySection = CATEGORY_SECTIONS.map((section) => ({
    section,
    count: selectedRecommendations.filter((r) => r.category === section.key).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="flex flex-col gap-3 px-6 py-6 sm:px-8">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">สถานที่แนะนำ</h2>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold"
          style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
        >
          PunGuide Recommend
        </span>
      </div>
      <p className="text-sm text-[var(--color-muted)]">
        เลือกสถานที่ที่อยากแวะ PunGuide จะช่วยจัดลงในแผนให้อัตโนมัติ (ข้ามได้ ไม่บังคับเลือก)
      </p>

      <div className="mt-3 flex flex-col gap-7">
        {CATEGORY_SECTIONS.map((section) => (
          <CategorySection
            key={section.key}
            section={section}
            center={center}
            destinationName={destinationName}
            selectedIds={selectedIds}
            selectedCount={countsBySection.find((c) => c.section.key === section.key)?.count ?? 0}
            onToggle={onToggle}
            onEditPreferences={section.key === "hotel" ? onEditPreferences : undefined}
          />
        ))}
      </div>

      {countsBySection.length > 0 && (
        <div className="relative mt-2">
          {showSelected && (
            <>
              {/* Dims the rest of the page while leaving this bar and the
                  sheet above it bright — matches the reference, where the
                  summary bar stays fully lit as the sheet's anchor point. */}
              <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowSelected(false)} />
              <SelectedItemsSheet
                items={selectedRecommendations}
                onRemove={onToggle}
                onClose={() => setShowSelected(false)}
              />
            </>
          )}

          <div
            className="relative z-50 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-page-cream)" }}
          >
            <span className="text-sm">
              {countsBySection.map((c, i) => (
                <span key={c.section.key}>
                  {i > 0 && " · "}
                  <b style={{ color: "var(--color-accent-orange)" }}>{c.count}</b> {c.section.countLabel}
                </span>
              ))}
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

function CategorySection({
  section,
  center,
  destinationName,
  selectedIds,
  selectedCount,
  onToggle,
  onEditPreferences,
}: {
  section: CategorySectionConfig;
  center: { lat: number; lng: number };
  destinationName?: string;
  selectedIds: Set<string>;
  selectedCount: number;
  onToggle: (place: RecommendedPlace, category: PlaceCategory) => void;
  onEditPreferences?: () => void;
}) {
  const [places, setPlaces] = useState<RecommendedPlace[] | null>(null);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const Icon = section.icon;
  const isHotel = section.key === "hotel";

  useEffect(() => {
    let cancelled = false;
    fetchPlaceRecommendations(section.key, center).then((result) => {
      if (!cancelled) setPlaces(result);
    });
    return () => {
      cancelled = true;
    };
  }, [section.key, center.lat, center.lng]);

  const enrichedById = useMemo(() => {
    if (!places) return new Map<string, EnrichedPlace>();
    return new Map(places.map((p) => [p.googlePlaceId, enrichForDisplay(p, center)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, center.lat, center.lng]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: "var(--color-brand-green)" }} />
          <h3 className="text-base font-bold">{section.label}</h3>
          {isHotel && (
            <InfoTooltip text="คุณสามารถปรับแก้ไขข้อมูลที่พักภายหลังได้เสมอ" />
          )}
          {selectedCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold"
              style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
            >
              {selectedCount} สถานที่
            </span>
          )}
        </div>
        {places && places.length > 0 && (
          <button
            type="button"
            onClick={() => setViewAllOpen(true)}
            className="flex items-center gap-0.5 text-sm font-semibold"
            style={{ color: "var(--color-brand-green)" }}
          >
            ดูทั้งหมด
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {viewAllOpen && places && (
        <CategoryAllPanel
          section={section}
          places={places}
          destinationName={destinationName}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onClose={() => setViewAllOpen(false)}
        />
      )}

      {isHotel && onEditPreferences && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--color-muted)]">คัดจากที่คุณเลือกไว้ขั้นตอนก่อนหน้า :</span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold"
            style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
          >
            <Check size={12} />
            แนะนำมาให้เลย
          </span>
          <button
            type="button"
            onClick={onEditPreferences}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-semibold"
            style={{ borderColor: "var(--color-accent-orange)", color: "var(--color-accent-orange)" }}
          >
            <Pencil size={12} />
            แก้ไขความชอบ
          </button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {places === null && <p className="text-sm text-[var(--color-muted)]">กำลังโหลด...</p>}
        {places?.length === 0 && <p className="text-sm text-[var(--color-muted)]">ไม่พบสถานที่แนะนำ</p>}
        {places?.map((place) => {
          if (isHotel) {
            return (
              <HotelCard
                key={place.googlePlaceId}
                place={place}
                enriched={enrichedById.get(place.googlePlaceId)}
                isSelected={selectedIds.has(place.googlePlaceId)}
                onToggle={() => onToggle(place, section.key)}
              />
            );
          }
          if (section.key === "restaurant") {
            return (
              <RestaurantCard
                key={place.googlePlaceId}
                place={place}
                icon={Icon}
                enriched={enrichedById.get(place.googlePlaceId)}
                isSelected={selectedIds.has(place.googlePlaceId)}
                onToggle={() => onToggle(place, section.key)}
              />
            );
          }
          return (
            <PlaceCard
              key={place.googlePlaceId}
              place={place}
              icon={Icon}
              isSelected={selectedIds.has(place.googlePlaceId)}
              onToggle={() => onToggle(place, section.key)}
            />
          );
        })}
      </div>
    </section>
  );
}

// Click-to-toggle rather than hover-only — hover states don't work on touch,
// and this is the first time accommodation shows up as a selectable item
// alongside attractions/restaurants, so it's worth spelling out inline.
function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--color-muted)]"
      >
        <Info size={14} />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-xl bg-[#1a1a1a] px-3 py-2 text-center text-[11px] font-medium leading-snug text-white shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

function SelectedBadge() {
  return (
    <span
      className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: "var(--color-accent-orange)" }}
    >
      <Check size={12} strokeWidth={3} />
    </span>
  );
}

function AddButton({ isSelected, onToggle, small }: { isSelected: boolean; onToggle: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-center gap-1 rounded-full font-bold transition-colors ${
        small ? "h-7 shrink-0 px-2.5 text-[11px]" : "mt-auto py-2 text-xs"
      }`}
      style={
        isSelected
          ? { backgroundColor: "var(--color-accent-orange)", color: "#fff" }
          : { backgroundColor: "#fff", color: "var(--color-accent-orange)", border: "1px solid var(--color-accent-orange)" }
      }
    >
      {isSelected ? <Check size={small ? 11 : 12} /> : <Plus size={small ? 11 : 12} />}
      {isSelected ? "เพิ่มแล้ว" : "เพิ่มแผน"}
    </button>
  );
}

function PlaceCard({
  place,
  icon: Icon,
  isSelected,
  onToggle,
}: {
  place: RecommendedPlace;
  icon: LucideIcon;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex w-52 shrink-0 flex-col overflow-hidden rounded-2xl border shadow-sm"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="relative h-32 w-full" style={{ backgroundColor: "var(--color-surface)" }}>
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Icon size={24} style={{ color: "var(--color-muted)" }} />
          </span>
        )}
        {place.rating !== undefined && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white">
            <Star size={11} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
            {place.rating.toFixed(1)}
          </span>
        )}
        {isSelected && <SelectedBadge />}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="truncate text-sm font-bold">{place.name}</p>
        {place.address && <p className="line-clamp-2 text-xs text-[var(--color-muted)]">{place.address}</p>}
        <AddButton isSelected={isSelected} onToggle={onToggle} />
      </div>
    </div>
  );
}

function RestaurantCard({
  place,
  icon: Icon,
  enriched,
  isSelected,
  onToggle,
}: {
  place: RecommendedPlace;
  icon: LucideIcon;
  enriched?: EnrichedPlace;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex w-72 shrink-0 gap-3 rounded-2xl border p-2 shadow-sm"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: "var(--color-surface)" }}>
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Icon size={20} style={{ color: "var(--color-muted)" }} />
          </span>
        )}
        {isSelected && <SelectedBadge />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{place.name}</p>
          {place.address && <p className="line-clamp-2 text-xs text-[var(--color-muted)]">{place.address}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[var(--color-muted)]">
          {place.rating !== undefined && (
            <span className="flex items-center gap-1">
              <Star size={11} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
              {place.rating.toFixed(1)}
            </span>
          )}
          {enriched && (
            <>
              <span className="flex items-center gap-1">
                <Wallet size={11} />
                {enriched.priceLabel}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {enriched.openingHoursLabel}
              </span>
            </>
          )}
        </div>
      </div>
      <AddButton isSelected={isSelected} onToggle={onToggle} small />
    </div>
  );
}

// Hotels are selectable the same way attractions/restaurants are — the
// traveler can always fine-tune accommodation details later (see the
// InfoTooltip next to "ที่พักแนะนำ"), so adding one here just means "consider
// this hotel," same weight as any other pick.
function HotelCard({
  place,
  enriched,
  isSelected,
  onToggle,
}: {
  place: RecommendedPlace;
  enriched?: EnrichedPlace;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [locationTag, styleTag] = hotelTags(place.googlePlaceId);
  return (
    <div
      className="flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border shadow-sm"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="relative h-36 w-full" style={{ backgroundColor: "var(--color-surface)" }}>
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <BedDouble size={24} style={{ color: "var(--color-muted)" }} />
          </span>
        )}
        {place.rating !== undefined && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white">
            <Star size={11} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
            {place.rating.toFixed(1)}
          </span>
        )}
        {isSelected && <SelectedBadge />}
        <div className="absolute inset-x-2 bottom-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">{locationTag}</span>
          <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">{styleTag}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="truncate text-sm font-bold">{place.name}</p>
        {place.address && <p className="line-clamp-2 text-xs text-[var(--color-muted)]">{place.address}</p>}
        {enriched && (
          <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
            <Wallet size={11} />
            {enriched.priceLabel}
          </p>
        )}
        <AddButton isSelected={isSelected} onToggle={onToggle} />
      </div>
    </div>
  );
}

function SelectedItemsSheet({
  items,
  onRemove,
  onClose,
}: {
  items: SelectedRecommendation[];
  onRemove: (place: RecommendedPlace, category: PlaceCategory) => void;
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
        {items.map(({ place, category }) => {
          const section = CATEGORY_SECTIONS.find((s) => s.key === category);
          const Icon = section?.icon ?? Flag;
          return (
              <div
                key={place.googlePlaceId}
                className="flex items-center gap-3 rounded-2xl border p-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: "var(--color-surface)" }}>
                  {place.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Icon size={18} style={{ color: "var(--color-muted)" }} />
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
                      <Icon size={10} />
                      {section?.label.replace("แนะนำ", "")}
                    </span>
                  </div>
                  {place.address && <p className="truncate text-xs text-[var(--color-muted)]">{place.address}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(place, category)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function CategoryAllPanel({
  section,
  places,
  destinationName,
  selectedIds,
  onToggle,
  onClose,
}: {
  section: CategorySectionConfig;
  places: RecommendedPlace[];
  destinationName?: string;
  selectedIds: Set<string>;
  onToggle: (place: RecommendedPlace, category: PlaceCategory) => void;
  onClose: () => void;
}) {
  const [activeFilter, setActiveFilter] = useState<ExternalPlaceCategory | null>(null);
  const [hasChanged, setHasChanged] = useState(false);
  const Icon = section.icon;

  // Only offer sub-filters that genuinely exist among these results — e.g.
  // the "attraction" bucket can hold raw attraction/activity/shopping
  // places, but "hotel" never has more than one raw type, so it'll just be
  // "ทั้งหมด" alone.
  const rawCategories = Array.from(new Set(places.map((p) => p.rawCategory)));
  const filteredPlaces = activeFilter ? places.filter((p) => p.rawCategory === activeFilter) : places;
  const selectedCount = places.filter((p) => selectedIds.has(p.googlePlaceId)).length;

  function handleToggle(place: RecommendedPlace) {
    onToggle(place, section.key);
    setHasChanged(true);
  }

  return (
    <>
      {/* z-[60], above the page's own summary bar/sheet (z-50) — otherwise
          that bar (later in the DOM, same z-index) would poke through this
          backdrop instead of being dimmed by it. */}
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-6" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-xl font-bold">{section.label}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <X size={18} />
          </button>
        </div>

        {rawCategories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b p-4" style={{ borderColor: "var(--color-border)" }}>
            <Tag label="ทั้งหมด" isOn={activeFilter === null} onClick={() => setActiveFilter(null)} />
            {rawCategories.map((raw) => (
              <Tag
                key={raw}
                label={RAW_CATEGORY_LABEL[raw] ?? raw}
                isOn={activeFilter === raw}
                onClick={() => setActiveFilter(raw)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-3">
          <p className="text-sm text-[var(--color-muted)]">
            ทั้งหมด {filteredPlaces.length} จุด{destinationName ? `ใน${destinationName}` : ""}
          </p>
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--color-accent-orange)" }}
          >
            <Pencil size={13} />
            แก้ไข
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 pb-6">
          {filteredPlaces.map((place) => {
            const isSelected = selectedIds.has(place.googlePlaceId);
            return (
              <div
                key={place.googlePlaceId}
                className="group flex items-center gap-3 rounded-2xl border p-3"
                style={
                  isSelected
                    ? { borderColor: "var(--color-accent-orange)", backgroundColor: "rgba(243, 113, 48, 0.06)" }
                    : { borderColor: "var(--color-border)" }
                }
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: "var(--color-surface)" }}>
                  {place.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Icon size={20} style={{ color: "var(--color-muted)" }} />
                    </span>
                  )}
                  {place.rating !== undefined && (
                    <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      <Star size={9} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
                      {place.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{place.name}</p>
                  {place.address && <p className="line-clamp-2 text-xs text-[var(--color-muted)]">{place.address}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(place)}
                  className={
                    isSelected
                      ? "flex shrink-0 items-center gap-1 rounded-full px-4 py-2 text-xs font-bold text-white bg-[var(--color-accent-orange)] group-hover:bg-[var(--color-danger-bg)] group-hover:text-[var(--color-danger)]"
                      : "flex shrink-0 items-center gap-1 rounded-full border px-4 py-2 text-xs font-bold border-[var(--color-accent-orange)] text-[var(--color-accent-orange)]"
                  }
                >
                  {isSelected ? (
                    <>
                      <span className="inline-flex items-center gap-1 group-hover:hidden">
                        <Check size={12} />
                        เพิ่มแล้ว
                      </span>
                      <span className="hidden group-hover:inline-flex">เอาออก</span>
                    </>
                  ) : (
                    <>
                      <Plus size={12} />
                      เพิ่มแผน
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t p-6" style={{ borderColor: "var(--color-border)" }}>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-[var(--color-muted)]">จำนวนที่เลือก</span>
            <span className="font-bold" style={{ color: "var(--color-accent-orange)" }}>
              {selectedCount} สถานที่
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full py-3 text-sm font-bold text-white"
            style={{ backgroundColor: hasChanged ? "var(--color-brand-green)" : "var(--color-accent-orange)" }}
          >
            {hasChanged ? "บันทึกการแก้ไข" : "ยืนยัน"}
          </button>
        </div>
      </div>
    </>
  );
}

function Tag({ label, isOn, onClick }: { label: string; isOn: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
      style={
        isOn
          ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }
          : { borderColor: "var(--color-border)", color: "var(--foreground)" }
      }
    >
      {label}
    </button>
  );
}
