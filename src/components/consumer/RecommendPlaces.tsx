"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BedDouble,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  Flag,
  Search,
  Star,
  Trash2,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { fetchPlaceRecommendations, type RecommendedPlace } from "@/lib/place-recommendations";
import type { ExternalPlaceCategory } from "@/lib/external-places-api";
import { CATEGORY_LABEL_TH } from "@/lib/place-mock-metadata";
import type { PlaceCategory } from "@/types";

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

// The step-1 entry point: a single row above "สไตล์การเที่ยว" that opens
// RecommendPlacesDrawer. Two states, per the design — an empty invitation
// until something is picked, then a live count of what's in the basket.
// Replaces the standalone step 2 this whole flow used to be.
export function RecommendPlacesBanner({
  selectedRecommendations,
  onExplore,
  onRemove,
}: {
  selectedRecommendations: SelectedRecommendation[];
  onExplore: () => void;
  // "ดูรายการที่เลือก" opens the same sheet the old step-2 summary bar used,
  // where a place can be dropped again without reopening the drawer.
  onRemove: (place: RecommendedPlace, category: PlaceCategory) => void;
}) {
  const [showSelected, setShowSelected] = useState(false);
  const countsBySection = countSelectionsBySection(selectedRecommendations);
  const hasSelection = countsBySection.length > 0;

  // Dropping the last place from the sheet leaves nothing to list and no
  // trigger to close it with — the banner falls back to its empty state,
  // whose "ดูรายการที่เลือก" button is gone. Close it in the same event that
  // empties it rather than reconciling in an effect afterwards.
  function handleRemove(place: RecommendedPlace, category: PlaceCategory) {
    onRemove(place, category);
    if (selectedRecommendations.length <= 1) setShowSelected(false);
  }

  return (
    <div className="relative mx-4 mt-5 sm:mx-6 sm:mt-6 lg:mx-8">
      {showSelected && hasSelection && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowSelected(false)} />
          <SelectedItemsSheet
            items={selectedRecommendations}
            onRemove={handleRemove}
            onClose={() => setShowSelected(false)}
          />
        </>
      )}

      <div
        // z-50 only while this banner's own sheet is open, to stay lit above
        // that sheet's z-40 backdrop. Holding it permanently put the banner
        // above the destination/date/guest picker dialogs, which are also
        // z-50 but earlier in the DOM — it painted straight through them.
        className={`relative flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 ${
          showSelected && hasSelection ? "z-50" : ""
        } ${hasSelection ? "border" : "border border-dashed"}`}
        style={
          hasSelection
            ? { backgroundColor: "var(--color-page-cream)", borderColor: "var(--color-border)" }
            : { backgroundColor: "#fdeee8", borderColor: "var(--color-accent-orange)" }
        }
      >
        {hasSelection ? (
          <span className="text-sm">
            {countsBySection.map((c, i) => (
              <span key={c.section.key}>
                {i > 0 && " · "}
                <b style={{ color: "var(--color-accent-orange)" }}>{c.count}</b> {c.section.countLabel}
              </span>
            ))}
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: "var(--color-accent-orange)" }}
            >
              <Compass size={18} />
            </span>
            <span className="text-base font-bold">สำรวจสถานที่แนะนำ</span>
          </span>
        )}

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {hasSelection && (
            <button
              type="button"
              onClick={() => setShowSelected((v) => !v)}
              className="flex items-center gap-1 text-sm font-semibold underline"
              style={{ color: "var(--color-brand-green)" }}
            >
              ดูรายการที่เลือก
              {showSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={onExplore}
            className="group inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            สำรวจ
            <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function countSelectionsBySection(selected: SelectedRecommendation[]) {
  return CATEGORY_SECTIONS.map((section) => ({
    section,
    count: selected.filter((r) => r.category === section.key).length,
  })).filter((c) => c.count > 0);
}

// The recommended-places browser. A centred dialog (it was a right-hand
// drawer, and three stacked carousels before that): one flat searchable grid
// with category chips, so a traveler looking for one specific place doesn't
// have to guess which of three sections it was filed under.
//
// Selections are staged locally and only handed back on "ยืนยัน" — the
// dialog's own ยกเลิก/ยืนยัน pair is a promise that backing out changes
// nothing, which live-toggling straight into the parent's state would break.
export function RecommendPlacesDialog({
  center,
  selectedRecommendations,
  onConfirm,
  onClose,
}: {
  center: { lat: number; lng: number };
  selectedRecommendations: SelectedRecommendation[];
  onConfirm: (next: SelectedRecommendation[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<SelectedRecommendation[]>(selectedRecommendations);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ExternalPlaceCategory | null>(null);
  const [places, setPlaces] = useState<RecommendedPlace[] | null>(null);
  // Which of the three API buckets each place arrived in, kept out of state
  // because nothing renders from it — it only labels a place when it's picked.
  const bucketByPlaceId = useRef<Map<string, PlaceCategory>>(new Map());

  // A dialog that scrolls its own body has to stop the page behind it from
  // scrolling too, or the form keeps moving under the traveler's finger.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // One flat list out of the three quota-guaranteed buckets the API returns
  // (see fetchPlaceRecommendations). The bucket each place came from is kept
  // as its PlaceCategory — that's what the summary counts on the form behind
  // this dialog are grouped by — while `rawCategory` drives the chips, since
  // it's the finer of the two taxonomies.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      CATEGORY_SECTIONS.map((section) =>
        fetchPlaceRecommendations(section.key, center).then((result) =>
          result.map((place) => ({ place, category: section.key }))
        )
      )
    ).then((buckets) => {
      if (cancelled) return;
      const seen = new Set<string>();
      const flat: RecommendedPlace[] = [];
      const bucketOf = new Map<string, PlaceCategory>();
      for (const { place, category } of buckets.flat()) {
        if (seen.has(place.googlePlaceId)) continue;
        seen.add(place.googlePlaceId);
        bucketOf.set(place.googlePlaceId, category);
        flat.push(place);
      }
      bucketByPlaceId.current = bucketOf;
      setPlaces(flat);
    });
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng]);

  const draftIds = new Set(draft.map((s) => s.place.googlePlaceId));

  // Only offer chips for taxonomies actually present in these results — a
  // "คาเฟ่" filter that matches nothing is worse than no filter at all.
  const chips = useMemo(() => {
    const present = new Set((places ?? []).map((p) => p.rawCategory));
    return CHIP_ORDER.filter((c) => present.has(c));
  }, [places]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (places ?? []).filter((place) => {
      if (activeFilter && place.rawCategory !== activeFilter) return false;
      if (!needle) return true;
      return (
        place.name.toLowerCase().includes(needle) ||
        place.address.toLowerCase().includes(needle) ||
        CATEGORY_LABEL_TH[place.rawCategory].toLowerCase().includes(needle)
      );
    });
  }, [places, activeFilter, query]);

  function toggle(place: RecommendedPlace) {
    setDraft((prev) =>
      prev.some((s) => s.place.googlePlaceId === place.googlePlaceId)
        ? prev.filter((s) => s.place.googlePlaceId !== place.googlePlaceId)
        : [...prev, { place, category: bucketByPlaceId.current.get(place.googlePlaceId) ?? "attraction" }]
    );
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="แนะนำสถานที่"
        className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
      >
        <div className="relative shrink-0 px-5 pb-4 pt-5 sm:px-8 sm:pt-6">
          <h2 className="text-center text-xl font-bold sm:text-2xl">แนะนำสถานที่</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full sm:right-6 sm:top-6"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Same field chrome as the destination search on the form behind this
            dialog (see DestinationSearch): magnifier, then a clear button that
            only appears once there's something to clear. No submit affordance —
            the grid below filters as you type, so there is nothing to submit
            to, and an arrow button that did nothing would just invite a click. */}
        <div
          className="mx-5 flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 sm:mx-8"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Search size={18} className="shrink-0" style={{ color: "var(--color-muted)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อที่ ย่าน หรือประเภท"
            className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--color-muted)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="ล้างการค้นหา"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--foreground)]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex shrink-0 gap-2 overflow-x-auto px-5 py-4 sm:px-8">
          <Chip label="ทั้งหมด" isOn={activeFilter === null} onClick={() => setActiveFilter(null)} />
          {chips.map((raw) => (
            <Chip
              key={raw}
              label={CATEGORY_LABEL_TH[raw]}
              isOn={activeFilter === raw}
              onClick={() => setActiveFilter(raw)}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-8">
          {places === null ? (
            <p className="py-10 text-center text-sm text-[var(--color-muted)]">กำลังโหลด…</p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-muted)]">
              ไม่พบสถานที่ที่ตรงกับที่ค้นหา
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((place) => (
                <SuggestionCard
                  key={place.googlePlaceId}
                  place={place}
                  isSelected={draftIds.has(place.googlePlaceId)}
                  onToggle={() => toggle(place)}
                />
              ))}
            </div>
          )}
        </div>

        {draft.length > 0 && (
          <div
            className="mx-5 mb-4 flex shrink-0 flex-col gap-2 rounded-2xl border px-4 py-3 sm:mx-8 sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: "var(--color-page-cream)", borderColor: "var(--color-border)" }}
          >
            <span className="flex items-center gap-3 text-sm">
              <b
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: "var(--color-accent-orange)" }}
              >
                {draft.length}
              </b>
              คุณได้เลือกสถานที่แล้ว กด “เริ่มจัดทริป” เพื่อใส่รายละเอียดแพลน
            </span>
            <button
              type="button"
              onClick={() => setDraft([])}
              className="shrink-0 self-start text-sm font-semibold underline sm:self-auto"
              style={{ color: "var(--color-brand-green)" }}
            >
              ล้างที่เลือก
            </button>
          </div>
        )}

        <div
          className="flex shrink-0 gap-3 border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8"
          style={{ borderColor: "var(--color-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border py-3 text-sm font-semibold"
            style={{ borderColor: "var(--color-border)" }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(draft);
              onClose();
            }}
            className="flex-1 rounded-full py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: "#4a3230" }}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// Chip order follows the design's row; entries with no place of that raw
// category in the current results are dropped (see `chips` above). The
// design also shows "แลนด์มาร์ค" and "วัฒนธรรม" chips, which have no
// equivalent in the API's taxonomy (ExternalPlaceCategory) and so can't be
// filtered on — they're absent rather than present-and-always-empty.
const CHIP_ORDER: ExternalPlaceCategory[] = [
  "attraction",
  "activity",
  "restaurant",
  "cafe",
  "shopping",
  "hotel",
  "transport",
];

function Chip({ label, isOn, onClick }: { label: string; isOn: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
      style={
        isOn
          ? {
              backgroundColor: "var(--color-sel-bg)",
              borderColor: "var(--color-sel-border)",
              color: "var(--color-brand-green)",
            }
          : { borderColor: "var(--color-border)" }
      }
    >
      {label}
    </button>
  );
}

function SuggestionCard({
  place,
  isSelected,
  onToggle,
}: {
  place: RecommendedPlace;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border transition-colors"
      style={
        isSelected
          ? { borderColor: "var(--color-accent-orange)", backgroundColor: "#fdf6f2" }
          : { borderColor: "var(--color-border)" }
      }
    >
      <div
        className="relative aspect-[4/3] w-full overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {place.imageUrl && (
          // Absolutely positioned, not just `h-full w-full`: `height: 100%`
          // resolves against a *definite* parent height, and a height that
          // comes from aspect-ratio isn't one — so it fell back to auto and a
          // portrait photo rendered at its own intrinsic height, stretching
          // this box past 4/3 and knocking that card out of line with the rest
          // of its row. Taking the image out of flow leaves the ratio in
          // charge and object-cover crops to it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt={place.name} className="absolute inset-0 h-full w-full object-cover" />
        )}
        {isSelected && (
          <span
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1.5">
          {place.rating != null && (
            <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
              <Star size={10} className="fill-current" />
              {place.rating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            {CATEGORY_LABEL_TH[place.rawCategory]}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-bold">{place.name}</p>
        {/* No description field exists on a place (see RecommendedPlace) —
            the address is the only prose the API returns for one. */}
        <p className="line-clamp-2 text-xs text-[var(--color-muted)]">{place.address}</p>
        <button
          type="button"
          onClick={onToggle}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold"
          style={
            isSelected
              ? { backgroundColor: "var(--color-accent-orange)", color: "#ffffff" }
              : { backgroundColor: "#fdeee8", color: "var(--color-accent-orange)" }
          }
        >
          {isSelected && <Check size={14} strokeWidth={3} />}
          {isSelected ? "เพิ่มแล้ว" : "เลือก"}
        </button>
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
  const sheetRef = useRef<HTMLDivElement>(null);

  // Opening downwards puts the sheet below the banner, which sits high enough
  // in the form that a full-height list runs past the bottom of the viewport —
  // so bring it into view instead of leaving the traveler to scroll for the
  // list they just asked to see. "nearest" so an already-visible sheet doesn't
  // jump the page around. Deliberately not `behavior: "smooth"`: that animates
  // over requestAnimationFrame, which doesn't tick while the tab isn't being
  // painted, and the scroll is then silently dropped.
  useEffect(() => {
    sheetRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    // Drops below the banner rather than above it: the banner sits near the
    // top of the form, so opening upwards ran the list off the top of the
    // viewport and hid the newest picks behind the hero.
    <div
      ref={sheetRef}
      className="absolute inset-x-0 top-full z-50 mt-3 flex max-h-[60vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
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

