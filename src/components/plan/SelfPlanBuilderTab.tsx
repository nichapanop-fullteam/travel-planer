"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardPlus,
  Clock,
  Flag,
  LoaderCircle,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Search,
  Star,
  Trash2,
  TriangleAlert,
  Utensils,
  Wallet,
  Waves,
  Wifi,
  X,
} from "lucide-react";
import type { Activity, Day, GeneratedTrip, TravelFromPrevious, TravelType, TripAccommodation } from "@/types";
import {
  fetchExternalPlaceSuggestionSections,
  searchExternalPlaces,
  type ExternalPlaceCategory,
  type ExternalPlaceSuggestionSections,
} from "@/lib/external-places-api";
import { CATEGORY_LABEL_TH, enrichPlace, EXTERNAL_TO_ACTIVITY_CATEGORY, type EnrichedPlace } from "@/lib/place-mock-metadata";
import { DEFAULT_RECOMMENDATION_CENTER } from "@/lib/place-recommendations";
import { formatTHB, resolveNightlyRate } from "@/lib/trip-utils";
import { TRAVEL_TYPE_OPTIONS, travelTypeIcon, travelTypeLabel } from "@/lib/travel-styles";
import { HotelBookingButton } from "@/components/plan/HotelBookingButton";

// Matches the three carousels this tab always shows (แนะนำสถานที่ห้ามพลาด /
// ร้านอาหารแนะนำ / ที่พักแนะนำ) — see docs for GET /places/suggest/sections,
// built specifically for this "always exactly 3 sections" page. Replaces the
// old flat /places/suggest + client-side category filter, which had no
// per-category quota (could return e.g. 0 hotels) and was fetched 3x
// independently (once per accordion below) for the same coordinates.
const SECTION_LIMIT = 10; // per section (API default is 5) — within the 1-20 max
const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_RESULT_LIMIT = 8;

const sectionsCache = new Map<string, Promise<ExternalPlaceSuggestionSections>>();

function fetchSectionsForCenter(center: { lat: number; lng: number }): Promise<ExternalPlaceSuggestionSections> {
  const key = `${center.lat},${center.lng}`;
  let promise = sectionsCache.get(key);
  if (!promise) {
    promise = fetchExternalPlaceSuggestionSections(center.lat, center.lng, { limit: SECTION_LIMIT });
    sectionsCache.set(key, promise);
  }
  return promise;
}

function toActivity(place: EnrichedPlace, day: Day, title?: string, offset = 0): Activity {
  return {
    id: crypto.randomUUID(),
    time: `${String(Math.min(9 + day.activities.length + offset, 22)).padStart(2, "0")}:00`,
    title: title ?? place.name,
    category: EXTERNAL_TO_ACTIVITY_CATEGORY[place.category],
    location: {
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      rating: place.rating,
      imageUrl: place.imageUrl,
      googlePlaceId: place.id,
    },
    cost: 0,
  };
}

// The unified "overview" tab's place-building tools — attraction/restaurant
// discovery+staging, plus the accommodation gallery/search — shown for every
// trip regardless of planMode (previously self-mode-only; see page.tsx's
// OverviewTab, which renders this alongside its own stats/itinerary cards).
// Read-only (canEdit false) renders nothing but the accommodation gallery —
// there's nothing to pick until "แก้ไขแพลน" is tapped.
export function PlaceDiscoveryPanel({
  trip,
  canEdit,
  onAddActivityDirect,
  onRemoveActivity,
  onSaveAccommodation,
  onAddDay,
  onManualEditAccommodation,
}: {
  trip: GeneratedTrip;
  canEdit: boolean;
  onAddActivityDirect: (dayId: string, activity: Activity) => void;
  onRemoveActivity: (dayId: string, activityId: string) => void;
  onSaveAccommodation: (accommodation: TripAccommodation) => void;
  onAddDay: () => void;
  onManualEditAccommodation: () => void;
}) {
  const center = trip.destinationPlace
    ? { lat: trip.destinationPlace.latitude, lng: trip.destinationPlace.longitude }
    : DEFAULT_RECOMMENDATION_CENTER;

  // Which day each confirmed place's activity landed on — so "ล้างที่เลือก"
  // can undo the actual itinerary insertion, not just the staging-list entry.
  // Only the dayId is kept (not the activity's own id): a newly-added
  // activity gets synced to the backend and has its local id swapped for a
  // server-issued one shortly after (see replaceActivityId in page.tsx), so
  // an id captured here would go stale — the activity is instead re-found by
  // its stable location.googlePlaceId at removal time, straight off the
  // current `trip` prop.
  const [addedPlaces, setAddedPlaces] = useState<Map<string, { dayId: string }>>(new Map());
  const addedIds = useMemo(() => new Set(addedPlaces.keys()), [addedPlaces]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Same merged attractions+restaurants+hotels list the carousel below
  // slices to 5 of — fetched once (fetchSectionsForCenter caches by
  // center), reused here at full length for the "สำรวจเพิ่มเติม" drawer.
  const mixedPlaces = usePlaceSuggestions(center, ["mixed"]);

  // Shared staging list — attractions, restaurants, and hotels all stage into
  // this same list/checklist (rendered once, in the first accordion) instead
  // of each section keeping its own separate staged panel; a single "เพิ่มลง
  // แพลน" then opens the day picker for everything queued up so far.
  const [stagedPlaces, setStagedPlaces] = useState<EnrichedPlace[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [dayPickerRequest, setDayPickerRequest] = useState<{
    places: EnrichedPlace[];
    initialCheckedIds: Set<string>;
  } | null>(null);

  function stagePlace(place: EnrichedPlace) {
    setStagedPlaces((prev) => (prev.some((p) => p.id === place.id) ? prev : [...prev, place]));
    setCheckedIds((prev) => new Set(prev).add(place.id));
  }

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // "ล้างที่เลือก" — fully resets the checklist: unstages every place shown
  // here, and for any that were already confirmed onto a day, removes that
  // activity from the itinerary too (not just the staging-list entry), so
  // the card actually disappears instead of sitting there highlighted with
  // nothing left to clear.
  function clearChecked() {
    stagedPlaces.forEach((p) => {
      const added = addedPlaces.get(p.id);
      if (!added) return;
      const day = trip.days.find((d) => d.id === added.dayId);
      const activity = day?.activities.find((a) => a.location?.googlePlaceId === p.id);
      if (activity) onRemoveActivity(added.dayId, activity.id);
    });
    setAddedPlaces((prev) => {
      const next = new Map(prev);
      stagedPlaces.forEach((p) => next.delete(p.id));
      return next;
    });
    setStagedPlaces([]);
    setCheckedIds(new Set());
  }

  function openAddDialog() {
    if (stagedPlaces.length === 0) return;
    setDayPickerRequest({ places: stagedPlaces, initialCheckedIds: checkedIds });
  }

  // A staged place can be any mix of attraction/restaurant/hotel — a hotel
  // pick also saves it as the trip's accommodation + a check-in activity,
  // everything else becomes a plain activity on the chosen day.
  function handleConfirmAdd(day: Day, chosenPlaces: EnrichedPlace[]) {
    chosenPlaces.forEach((place, i) => {
      const activity =
        place.category === "hotel"
          ? toActivity(place, day, `เช็คอิน ${place.name}`, i)
          : toActivity(place, day, undefined, i);
      if (place.category === "hotel") {
        onSaveAccommodation({ name: place.name, imageUrl: place.imageUrl, amenities: [], description: place.priceLabel });
      }
      onAddActivityDirect(day.id, activity);
    });
    setAddedPlaces((prev) => {
      const next = new Map(prev);
      chosenPlaces.forEach((place) => next.set(place.id, { dayId: day.id }));
      return next;
    });
    setCheckedIds(new Set());
    setDayPickerRequest(null);
  }

  return (
    <>
      {canEdit && (
        <AddPlacesAccordion
          title="เพิ่มสถานที่คุณอยากไป"
          searchPlaceholder="เพิ่มสถานที่"
          recommendedLabel="แนะนำสถานที่ห้ามพลาด"
          categories={["mixed"]}
          center={center}
          destinationName={trip.destination}
          addLabel="เพิ่มแผน"
          addedIds={addedIds}
          stagedPlaces={stagedPlaces}
          checkedIds={checkedIds}
          onStage={stagePlace}
          onClearChecked={clearChecked}
          onConfirmStaged={openAddDialog}
          showStagedPanel
          enableSearchStaging
          maxVisible={5}
          onExploreMore={() => setDrawerOpen(true)}
        />
      )}

      {drawerOpen && (
        <CheckInPlacesDrawer
          destinationName={trip.destination}
          places={mixedPlaces}
          addedIds={addedIds}
          stagedPlaces={stagedPlaces}
          checkedIds={checkedIds}
          onStage={stagePlace}
          onToggleChecked={toggleChecked}
          onConfirm={() => {
            setDrawerOpen(false);
            openAddDialog();
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      <AccommodationAccordion trip={trip} canEdit={canEdit} onManualEdit={onManualEditAccommodation} />

      {dayPickerRequest && (
        <AddPlaceDialog
          places={dayPickerRequest.places}
          initialCheckedIds={dayPickerRequest.initialCheckedIds}
          days={trip.days}
          onAddDay={onAddDay}
          onConfirm={handleConfirmAdd}
          onClose={() => setDayPickerRequest(null)}
        />
      )}
    </>
  );
}

// Real category groups, not the vibe tags ("เข้าถึงได้ง่าย"/"วัฒนธรรม"/
// "ไนท์ไลฟ์") the design mock shows — there's no data behind those on any
// place this app fetches, and a filter that doesn't actually filter is worse
// than no filter. These three groups match the same split
// fetchExternalPlaceSuggestionSections already guarantees quota for.
const DRAWER_FILTERS: { key: string; label: string; icon?: typeof MapPin; categories: ExternalPlaceCategory[] }[] = [
  { key: "all", label: "ทั้งหมด", categories: [] },
  { key: "sightseeing", label: "ที่เที่ยว", icon: MapPin, categories: ["attraction", "activity", "shopping"] },
  { key: "food", label: "ร้านอาหาร", icon: Utensils, categories: ["restaurant", "cafe"] },
  { key: "hotel", label: "ที่พัก", icon: Building2, categories: ["hotel"] },
];

// Full-list version of the carousel's "แนะนำสถานที่ห้ามพลาด" — same merged
// attractions/restaurants/hotels data (see mixedPlaces in PlaceDiscoveryPanel),
// just unsliced and filterable, opened from "สำรวจเพิ่มเติม". Staging/confirm
// reuses the exact same shared state as the carousel and the day-picker
// dialog, so a place picked here funnels through the same "which day" flow.
function CheckInPlacesDrawer({
  destinationName,
  places,
  addedIds,
  stagedPlaces,
  checkedIds,
  onStage,
  onToggleChecked,
  onConfirm,
  onClose,
}: {
  destinationName: string;
  places: EnrichedPlace[] | null;
  addedIds: Set<string>;
  stagedPlaces: EnrichedPlace[];
  checkedIds: Set<string>;
  onStage: (place: EnrichedPlace) => void;
  onToggleChecked: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [filterKey, setFilterKey] = useState("all");
  const [editMode, setEditMode] = useState(false);
  const activeFilter = DRAWER_FILTERS.find((f) => f.key === filterKey) ?? DRAWER_FILTERS[0];
  const filtered = places?.filter(
    (p) => activeFilter.categories.length === 0 || activeFilter.categories.includes(p.category)
  ) ?? null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div
          className="flex items-center justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h3 className="text-lg font-bold">สถานที่เช็คอินที่ห้ามพลาด</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none]">
          {DRAWER_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterKey(f.key)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold"
              style={
                activeFilter.key === f.key
                  ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }
                  : { borderColor: "var(--color-border)" }
              }
            >
              {f.icon && <f.icon size={13} />}
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pb-2">
          <p className="text-xs font-semibold text-[var(--color-muted)]">
            ทั้งหมด {filtered?.length ?? 0} จุดใน{destinationName}
          </p>
          {checkedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className="flex shrink-0 items-center gap-1 text-xs font-bold underline"
              style={{ color: "var(--color-accent-orange)" }}
            >
              <Pencil size={12} />
              {editMode ? "เสร็จสิ้น" : "แก้ไข"}
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
          {filtered === null && <p className="py-8 text-center text-sm text-[var(--color-muted)]">กำลังโหลด...</p>}
          {filtered !== null && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-muted)]">ไม่พบสถานที่</p>
          )}
          {filtered?.map((place) => {
            const isStaged = stagedPlaces.some((p) => p.id === place.id);
            const checked = checkedIds.has(place.id);
            return (
              <DrawerPlaceCard
                key={place.id}
                place={place}
                checked={checked}
                confirmed={addedIds.has(place.id)}
                removing={editMode && checked}
                onToggle={() => (isStaged ? onToggleChecked(place.id) : onStage(place))}
              />
            );
          })}
        </div>

        <div
          className="flex items-center justify-between gap-3 border-t px-5 py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-sm text-[var(--color-muted)]">
            จำนวนที่เลือก <b style={{ color: "var(--color-brand-green)" }}>{checkedIds.size}</b> สถานที่
          </p>
          <button
            type="button"
            onClick={onConfirm}
            disabled={checkedIds.size === 0}
            className="rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </>
  );
}

// Drawer-only place row — visually distinct from the shared PlaceCheckCard
// (solid-orange "เพิ่มแล้ว" / outlined-cream "เพิ่มแผน" pill instead of a
// checkbox) to match this screen's design without touching the checklist
// panel or day-picker dialog that also reuse PlaceCheckCard.
function DrawerPlaceCard({
  place,
  checked,
  confirmed,
  removing,
  onToggle,
}: {
  place: EnrichedPlace;
  checked: boolean;
  confirmed: boolean;
  removing: boolean;
  onToggle: () => void;
}) {
  const isAdded = checked || confirmed;
  const clickable = !confirmed;
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onToggle : undefined}
      onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onToggle() : undefined}
      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${clickable ? "cursor-pointer" : ""}`}
      style={
        isAdded
          ? { backgroundColor: "var(--color-page-cream)", borderColor: "var(--color-accent-orange)" }
          : { borderColor: "var(--color-border)" }
      }
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: "var(--color-surface)" }}>
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <MapPin size={16} style={{ color: "var(--color-muted)" }} />
          </span>
        )}
        {place.rating !== undefined && (
          <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <Star size={8} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
            {place.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{place.name}</p>
        <p className="line-clamp-2 text-xs text-[var(--color-muted)]">{place.address}</p>
      </div>
      <span
        className="flex shrink-0 items-center justify-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold"
        style={
          removing
            ? { backgroundColor: "white", color: "var(--color-muted)", border: "1px solid var(--color-border)" }
            : isAdded
              ? { backgroundColor: "var(--color-accent-orange)", color: "#fff" }
              : { backgroundColor: "var(--color-page-cream)", color: "var(--color-accent-orange)", border: "1px solid var(--color-accent-orange)" }
        }
      >
        {removing ? <X size={13} /> : isAdded ? <Check size={13} /> : <Plus size={13} />}
        {removing ? "ลบ" : isAdded ? "เพิ่มแล้ว" : "เพิ่มแผน"}
      </span>
    </div>
  );
}

// Picks the one section bucket that covers this accordion's categories —
// "hotel" -> accommodations, "restaurant"/"cafe" -> restaurants (the API
// already folds cafe into that bucket), everything else (attraction/
// activity/shopping, this tab's main "แนะนำสถานที่ห้ามพลาด" section) ->
// attractions.
function sectionKeyFor(categories: string[]): keyof ExternalPlaceSuggestionSections {
  if (categories.includes("hotel")) return "accommodations";
  if (categories.includes("restaurant") || categories.includes("cafe")) return "restaurants";
  return "attractions";
}

// "mixed" is a sentinel categories value meaning "all three sections
// combined" — used for the single merged "แนะนำสถานที่ห้ามพลาด" carousel
// (attractions + restaurants/cafes + hotels together), instead of picking
// just one bucket like every other caller of sectionKeyFor.
function usePlaceSuggestions(center: { lat: number; lng: number }, categories: string[]) {
  const [sections, setSections] = useState<ExternalPlaceSuggestionSections | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSectionsForCenter(center).then((result) => {
      if (!cancelled) setSections(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  return useMemo(() => {
    if (!sections) return null;
    const rows = categories.includes("mixed")
      ? [...sections.attractions, ...sections.restaurants, ...sections.accommodations]
      : sections[sectionKeyFor(categories)];
    return rows.map((p) => enrichPlace(p, center));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, categories]);
}

function AddPlacesAccordion({
  title,
  searchPlaceholder,
  recommendedLabel,
  categories,
  center,
  destinationName,
  addLabel,
  addedIds,
  stagedPlaces,
  checkedIds,
  onStage,
  onClearChecked,
  onConfirmStaged,
  variant = "vertical",
  enableSearchStaging = false,
  showStagedPanel = false,
  maxVisible,
  onExploreMore,
}: {
  title: string;
  searchPlaceholder: string;
  recommendedLabel: string;
  categories: string[];
  center: { lat: number; lng: number };
  destinationName: string;
  addLabel: string;
  addedIds: Set<string>;
  // Staging state is shared/lifted to SelfPlanBuilderTab so attractions,
  // restaurants, and hotels all queue into the same list — see
  // showStagedPanel below for which accordion actually renders it.
  stagedPlaces: EnrichedPlace[];
  checkedIds: Set<string>;
  onStage: (place: EnrichedPlace) => void;
  onClearChecked: () => void;
  onConfirmStaged: () => void;
  variant?: "vertical" | "horizontal";
  enableSearchStaging?: boolean;
  // Only one accordion (the first, "เพิ่มสถานที่คุณอยากไป") actually renders
  // the shared checklist panel — the others still stage into the same list,
  // they just don't duplicate the panel UI.
  showStagedPanel?: boolean;
  // Caps the recommended carousel's visible row — "สำรวจเพิ่มเติม" (via
  // onExploreMore) is what shows the rest, in the full-list drawer.
  maxVisible?: number;
  // Opens CheckInPlacesDrawer instead of navigating to /discovery — omit to
  // keep the old link-out behavior.
  onExploreMore?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery] = useState("");
  const places = usePlaceSuggestions(center, categories);

  // Search-staging: typing debounce-searches the real POI API (not just the
  // pre-fetched recommendation list) and shows matches in a dropdown; picking
  // one stages it in the shared checklist so several searches (across every
  // section) can be queued up before a single "เพิ่มลงแพลน" opens the day
  // picker for all of them at once.
  const [dropdownResults, setDropdownResults] = useState<EnrichedPlace[] | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enableSearchStaging) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) return;
    debounceRef.current = window.setTimeout(() => {
      searchExternalPlaces(trimmed, SEARCH_RESULT_LIMIT).then((results) => {
        setDropdownResults(results.map((p) => enrichPlace(p, center)));
        setDropdownOpen(true);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, enableSearchStaging]);

  function pickDropdownResult(place: EnrichedPlace) {
    setQuery(`${place.name} (${destinationName})`);
    setDropdownOpen(false);
    onStage(place);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setDropdownResults(null);
      setDropdownOpen(false);
    }
  }

  // When search-staging is on, the search box drives the dropdown/API search
  // instead of filtering this recommended carousel — so it stays showing the
  // curated "ห้ามพลาด" set no matter what's typed.
  const filtered = useMemo(() => {
    if (!places) return null;
    if (enableSearchStaging) return places;
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return places;
    return places.filter((p) => p.name.toLowerCase().includes(trimmed));
  }, [places, query, enableSearchStaging]);

  const visible = maxVisible ? filtered?.slice(0, maxVisible) ?? null : filtered;

  // Cards in the recommended carousel: tapping "+" stages the place into the
  // shared checklist (rendered once, see showStagedPanel) instead of opening
  // the day-picker directly.
  const recommendedSection = (
    <>
      <div className="flex items-center justify-between gap-3 border-t border-[#e7dccb] pt-4">
        <p className="flex items-center gap-2 text-base font-bold text-[#2c7457]">
          <Flag size={16} />
          {recommendedLabel}
        </p>
        {onExploreMore ? (
          <button
            type="button"
            onClick={onExploreMore}
            className="shrink-0 rounded-full border border-[#a8d4c1] px-3 py-1.5 text-xs font-semibold text-[#2c7457] hover:bg-[#edf8f3]"
          >
            สำรวจเพิ่มเติม
            <ChevronRight size={11} className="ml-0.5 inline" />
          </button>
        ) : (
          <Link
            href={`/discovery?destination=${encodeURIComponent(destinationName)}`}
            className="shrink-0 rounded-full border border-[#a8d4c1] px-3 py-1.5 text-xs font-semibold text-[#2c7457] hover:bg-[#edf8f3]"
          >
            สำรวจเพิ่มเติม
            <ChevronRight size={11} className="ml-0.5 inline" />
          </Link>
        )}
      </div>

      {visible === null && <p className="py-8 text-center text-sm text-[var(--color-muted)]">กำลังโหลด...</p>}
      {visible !== null && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">ไม่พบสถานที่</p>
      )}

      <div className="flex gap-5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible?.map((place) => {
          const isStaged = stagedPlaces.some((p) => p.id === place.id);
          const isAdded = addedIds.has(place.id) || (isStaged && checkedIds.has(place.id));
          const handleAdd = () => onStage(place);
          return variant === "horizontal" ? (
            <HorizontalPlaceCard key={place.id} place={place} isAdded={isAdded} addLabel={addLabel} onAdd={handleAdd} />
          ) : (
            <VerticalPlaceCard
              key={place.id}
              place={place}
              isAdded={isAdded}
              addLabel={addLabel}
              onAdd={handleAdd}
            />
          );
        })}
      </div>
    </>
  );

  return (
    <div className="overflow-hidden rounded-[28px] bg-[#faf7f1]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-[#f7f1e7] px-6 py-5 text-left"
      >
        <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#2f755b] shadow-[0_6px_16px_rgba(33,55,47,0.14)]">
          {expanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 bg-[#fffdfb] px-6 pb-6 pt-6">
          <div className="relative">
            <div
              className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-4"
              style={{ borderColor: "#e2d7c7" }}
            >
              {enableSearchStaging ? <MapPin size={18} className="text-[#aaa69e]" /> : <Search size={18} className="text-[#aaa69e]" />}
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => dropdownResults && dropdownResults.length > 0 && setDropdownOpen(true)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-base placeholder:text-[#aab1bd] focus:outline-none"
              />
            </div>

            {enableSearchStaging && dropdownOpen && dropdownResults && dropdownResults.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute inset-x-0 top-full z-20 mt-2 flex flex-col overflow-hidden rounded-2xl border bg-white shadow-lg" style={{ borderColor: "var(--color-border)" }}>
                  {dropdownResults.map((place) => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => pickDropdownResult(place)}
                      className="px-4 py-3 text-left text-sm hover:bg-[var(--color-surface)]"
                    >
                      {place.name} <span className="text-[var(--color-muted)]">({destinationName})</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {recommendedSection}

          {showStagedPanel && checkedIds.size > 0 && (
            <div className="mt-3 flex flex-col gap-4 rounded-[24px] border border-[#eadfce] bg-white px-5 py-4 shadow-[0_7px_18px_rgba(40,35,27,0.10)] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff0e5] text-[#423c35]">
                  <ClipboardPlus size={22} />
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f57835] px-1 text-xs font-bold text-white">{checkedIds.size}</span>
                </span>
                <p className="text-sm font-bold leading-6 sm:text-base">คุณได้เลือกสถานที่ต้องการแล้ว ต่อไปกรุณาเพิ่มสถานที่ลงแพลนของคุณ</p>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-5">
                <button type="button" onClick={onClearChecked} className="text-sm font-bold text-[#302d29] hover:text-[#f26f2f]">
                  ล้างที่เลือก
                </button>
                <button
                  type="button"
                  onClick={onConfirmStaged}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f66f2f] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#e85e21]"
                >
                  <Plus size={16} />
                  เพิ่มลงแพลน
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Checkbox({
  checked,
  onClick,
  color = "var(--color-brand-green)",
}: {
  checked: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={checked}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
      style={checked ? { backgroundColor: color, borderColor: color } : { borderColor: "var(--color-border)" }}
    >
      {checked && <Check size={12} className="text-white" />}
    </button>
  );
}

// The "pick places" card used both in the staged checklist (เพิ่มสถานที่คุณ
// อยากไป) and in AddPlaceDialog below — same look in both places so a place
// reads the same whether it's still pending or already in the day-picker.
// `confirmed` is for places already added to a day (via the staged
// checklist's addedIds) — shown with a static checkmark instead of a
// toggleable one, since un-adding there isn't supported.
function PlaceCheckCard({
  place,
  checked,
  confirmed = false,
  onToggle,
}: {
  place: EnrichedPlace;
  checked: boolean;
  confirmed?: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role={confirmed ? undefined : "button"}
      tabIndex={confirmed ? undefined : 0}
      onClick={confirmed ? undefined : onToggle}
      onKeyDown={confirmed ? undefined : (e) => (e.key === "Enter" || e.key === " ") && onToggle()}
      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${confirmed ? "" : "cursor-pointer"}`}
      style={
        checked || confirmed
          ? { backgroundColor: "var(--color-page-cream)", borderColor: "var(--color-accent-orange)" }
          : { borderColor: "var(--color-border)" }
      }
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: "var(--color-surface)" }}>
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <MapPin size={16} style={{ color: "var(--color-muted)" }} />
          </span>
        )}
        {place.rating !== undefined && (
          <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <Star size={8} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
            {place.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{place.name}</p>
        <p className="line-clamp-2 text-xs text-[var(--color-muted)]">{place.address}</p>
      </div>
      {confirmed ? (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: "var(--color-accent-orange)" }}
        >
          <Check size={14} className="text-white" />
        </span>
      ) : (
        <Checkbox checked={checked} onClick={onToggle} color="var(--color-accent-orange)" />
      )}
    </div>
  );
}

function AddButton({ isAdded, label, onClick }: { isAdded: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors"
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
      {isAdded ? "เพิ่มแล้ว" : label}
    </button>
  );
}

function VerticalPlaceCard({
  place,
  isAdded,
  addLabel,
  onAdd,
}: {
  place: EnrichedPlace;
  isAdded: boolean;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <article className="flex w-[274px] shrink-0 flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_6px_14px_rgba(35,31,25,0.14)]">
      <div className="relative h-[178px] w-full" style={{ backgroundColor: "var(--color-surface)" }}>
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <MapPin size={22} style={{ color: "var(--color-muted)" }} />
          </span>
        )}
        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] gap-2">
          {place.rating !== undefined && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-bold text-white">
              <Star size={10} fill="currentColor" />
              {place.rating.toFixed(1)}
            </span>
          )}
          <span className="truncate rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white">
            {CATEGORY_LABEL_TH[place.category]}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h4 className="truncate text-base font-bold">{place.name}</h4>
        <p className="mt-1 line-clamp-1 text-xs text-[var(--color-muted)]">{place.address || place.priceLabel}</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#2f755b]/30"
          style={isAdded
            ? { borderColor: "var(--color-sel-border)", backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }
            : { borderColor: "#ffc290", backgroundColor: "#fff9f2", color: "#ff762f" }}
        >
          {isAdded ? <Check size={15} /> : <Plus size={15} />}
          {isAdded ? "เพิ่มแล้ว" : addLabel}
        </button>
      </div>
    </article>
  );
}

// Horizontal card — image left with a category-tag overlay, name/description/
// rating-price-hours stacked in the middle, add button pinned to the right.
// Matches the "ร้านอาหารแนะนำ" card spec, distinct from the vertical
// image-on-top cards used for "แนะนำสถานที่ห้ามพลาด".
function HorizontalPlaceCard({
  place,
  isAdded,
  addLabel,
  onAdd,
}: {
  place: EnrichedPlace;
  isAdded: boolean;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex w-[22rem] shrink-0 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: "var(--color-surface)" }}>
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <MapPin size={20} style={{ color: "var(--color-muted)" }} />
          </span>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
          {CATEGORY_LABEL_TH[place.category]}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-bold">{place.name}</p>
        <p className="line-clamp-2 text-xs text-[var(--color-muted)]">
          {place.address}
        </p>
        <p className="flex flex-wrap items-center gap-1 text-[11px] text-[var(--color-muted)]">
          <Star size={11} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
          {place.rating?.toFixed(1) ?? "—"}
          <span>·</span>
          <Wallet size={11} />
          {place.priceLabel}
          <span>·</span>
          <Clock size={11} />
          {place.openingHoursLabel}
        </p>
      </div>

      <AddButton isAdded={isAdded} label={addLabel} onClick={onAdd} />
    </div>
  );
}

export function DayTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition-colors"
      style={
        isActive
          ? { backgroundColor: "white", color: "var(--foreground)", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
          : { color: "var(--color-muted)" }
      }
    >
      {label}
    </button>
  );
}

// "เพิ่มสถานที่" modal — shown after tapping เพิ่มแผน/เพิ่ม on a recommendation
// card (single place) or "เพิ่มลงแพลน" on the search-staging panel (multiple
// places at once). Combines day-picking and final place selection into one
// step, against this trip's real Day[]/dayId — replaces the old two-stage
// bottom-sheet flow (day-only picker, then a separate staging confirm).
function AddPlaceDialog({
  places,
  initialCheckedIds,
  days,
  onAddDay,
  onConfirm,
  onClose,
}: {
  places: EnrichedPlace[];
  initialCheckedIds: Set<string>;
  days: Day[];
  onAddDay: () => void;
  onConfirm: (day: Day, places: EnrichedPlace[]) => void;
  onClose: () => void;
}) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(days[0]?.id ?? null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(initialCheckedIds);
  const prevDayCountRef = useRef(days.length);

  // Jump to the newly-created day once "+เพิ่มวัน" resolves — trip.days only
  // grows via the parent page's state update, so this reacts to that instead
  // of trying to read the new id back from onAddDay() directly.
  useEffect(() => {
    if (days.length > prevDayCountRef.current) {
      setSelectedDayId(days[days.length - 1].id);
    }
    prevDayCountRef.current = days.length;
  }, [days]);

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    const day = days.find((d) => d.id === selectedDayId);
    const chosen = places.filter((p) => checkedIds.has(p.id));
    if (!day || chosen.length === 0) return;
    onConfirm(day, chosen);
  }

  const canConfirm = selectedDayId !== null && checkedIds.size > 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">เพิ่มสถานที่</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-[var(--color-muted)]">เลือกวันที่ต้องการเพิ่มแพลน</p>
            <div
              className="flex items-center gap-1.5 overflow-x-auto rounded-2xl p-1.5"
              style={{ backgroundColor: "var(--color-page-cream)" }}
            >
              <DayTab label="ทุกวัน" isActive={selectedDayId === null} onClick={() => setSelectedDayId(null)} />
              {days.map((day) => (
                <DayTab
                  key={day.id}
                  label={`วันที่ ${day.dayNumber}`}
                  isActive={selectedDayId === day.id}
                  onClick={() => setSelectedDayId(day.id)}
                />
              ))}
              <button
                type="button"
                onClick={onAddDay}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold"
                style={{ borderColor: "var(--color-accent-orange)", color: "var(--color-accent-orange)" }}
              >
                <Plus size={14} />
                เพิ่มวัน
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-[var(--color-muted)]">สถานที่ต้องการเพิ่ม</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {places.map((place) => (
                <PlaceCheckCard
                  key={place.id}
                  place={place}
                  checked={checkedIds.has(place.id)}
                  onToggle={() => toggleChecked(place.id)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "var(--color-accent-orange)" }}
              >
                {checkedIds.size}
              </span>
              {checkedIds.size > 0 ? "สถานที่ที่เลือก" : "ยังไม่ได้เลือกสถานที่"}
            </span>
            <button
              type="button"
              onClick={() => setCheckedIds(new Set())}
              className="text-sm font-semibold underline text-[var(--color-muted)]"
            >
              ล้างที่เลือก
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border py-3 text-sm font-bold"
              style={{ borderColor: "var(--color-border)" }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 rounded-full py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "var(--color-accent-orange)" }}
            >
              เพิ่มสถานที่
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

interface AccommodationOption {
  key: string;
  dayNumber: number;
  hotel: Activity;
}

// One entry per day that actually has a hotel-category stop, deduped by
// place name — a trip staying at the same hotel for several nights in a row
// only gets one chip, not one per day. Mirrors the same helper on
// generated-plan/[id]/page.tsx's AI-mode AccommodationAccordion.
function collectAccommodationOptions(trip: GeneratedTrip): AccommodationOption[] {
  const seen = new Set<string>();
  const options: AccommodationOption[] = [];
  for (const day of trip.days) {
    const hotel = day.activities.find((a) => a.category === "hotel");
    if (!hotel) continue;
    const key = hotel.location?.name || hotel.title;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ key, dayNumber: day.dayNumber, hotel });
  }
  return options;
}

// Read-only gallery of the hotel stops already sitting in the itinerary —
// separate from the booking form below it, which is for describing/adding
// one. Renders nothing until at least one day actually has a hotel stop.
function AccommodationGallery({ trip }: { trip: GeneratedTrip }) {
  const options = useMemo(() => collectAccommodationOptions(trip), [trip]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = options.find((o) => o.key === selectedKey) ?? options[0];

  if (!selected) return null;

  // trip.accommodation (set via the booking form below) only ever describes
  // one, trip-wide stay — it only overrides name/image/description when
  // there's just a single accommodation option, so switching chips always
  // reflects that day's actual hotel instead of getting stuck on the override.
  const acc = options.length <= 1 ? trip.accommodation : undefined;
  const { pricePerNight, nights } = resolveNightlyRate(trip, acc, selected.hotel);
  const name = acc?.name || selected.hotel.location?.name || selected.hotel.title;
  const imageUrl = acc?.imageUrl || selected.hotel.location?.imageUrl || "/images/luang-prabang.jpg";
  const description =
    acc?.description || "Boutique Luxury Resort · เขตนอกเมือง · ท่าเรือกลางเมือง · ตลาดมืดตรงข้าม · เดินถึงภูสี";
  const checkInOutLabel =
    acc?.checkIn || acc?.checkOut
      ? `เช็คอิน ${acc?.checkIn ?? "-"} · เช็คเอาท์ ${acc?.checkOut ?? "-"}`
      : "เช็คอิน 14:00 · เช็คเอาท์ 12:00 — ฝากกระเป๋าได้";
  const amenities =
    acc?.amenities && acc.amenities.length > 0
      ? acc.amenities.map((label) => ({ icon: Check, label }))
      : [
          { icon: Wifi, label: "อินเทอร์เน็ตฟรี" },
          { icon: Car, label: "รถรับส่งฟรี" },
          { icon: Waves, label: "สระ 82 ฟุต" },
          { icon: Plane, label: "สนามบิน 15 นาที" },
        ];

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-4">
      {options.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelectedKey(option.key)}
              className="shrink-0 overflow-hidden rounded-2xl border-2 text-left transition"
              style={{ borderColor: option.key === selected.key ? "var(--color-brand-green)" : "transparent" }}
            >
              <div className="flex items-center gap-2 bg-[#FAF8F5] px-3 py-2">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#edf0ee]">
                  {option.hotel.location?.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={option.hotel.location.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-xs font-bold">{option.hotel.location?.name || option.hotel.title}</p>
                  <p className="text-[10px] text-[var(--color-muted)]">วันที่ {option.dayNumber}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-40 w-full shrink-0 overflow-hidden rounded-2xl sm:h-auto sm:w-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span
                className="mb-1.5 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
                style={{ backgroundColor: "#FFF3D6", color: "#B8860B" }}
              >
                Recommend
              </span>
              <p className="text-base font-bold sm:text-lg">{name}</p>
              <p className="text-xs text-[var(--color-muted)] sm:text-sm">{description}</p>
            </div>
            <div className="shrink-0 text-right">
              {pricePerNight ? (
                <>
                  <p className="text-lg font-extrabold sm:text-xl">{formatTHB(pricePerNight)}/คืน</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {nights} คืน · รวม {formatTHB(pricePerNight * nights)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-[var(--color-muted)]">ราคาตามช่วงวันที่เข้าพัก</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {amenities.map((a) => (
              <span
                key={a.label}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={{ borderColor: "var(--color-border)" }}
              >
                <a.icon size={11} />
                {a.label}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <Clock size={13} />
              {checkInOutLabel}
            </p>
            <div className="flex items-center gap-2">
              <HotelBookingButton
                name={name}
                className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold"
              />
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
                style={{ backgroundColor: "var(--color-accent-orange)" }}
              >
                ดูรายละเอียด
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Always shows the gallery of whatever hotel stops are already in the
// itinerary (or a manual override, see AccommodationGallery) — the
// search-to-add carousel below it is an editing tool, so it's hidden once
// "แก้ไขแพลน" is off, same as every other add-a-place control on this panel.
function AccommodationAccordion({
  trip,
  canEdit,
  onManualEdit,
}: {
  trip: GeneratedTrip;
  canEdit: boolean;
  // Opens the free-text "แก้ไขที่พัก" dialog (generated-plan/[id]/page.tsx's
  // AccommodationEditDialog) for overriding name/description/amenities/price
  // manually. Hotel search/recommendations used to live here too, but they're
  // now folded into the unified "เพิ่มสถานที่คุณอยากไป" carousel/drawer above
  // (see PlaceDiscoveryPanel) — picking a hotel there already sets this same
  // accommodation via onSaveAccommodation, so this card just shows it.
  onManualEdit?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  // Nothing to show — no hotel stop in the itinerary yet and no manual
  // override set via "แก้ไขรายละเอียด" — so hide the whole card instead of
  // an accordion whose body (AccommodationGallery) renders empty anyway.
  const hasData = collectAccommodationOptions(trip).length > 0 || !!trip.accommodation;
  if (!hasData) return null;

  return (
    <div className="overflow-hidden rounded-3xl" style={{ backgroundColor: "#FAF8F5" }}>
      <div className="flex w-full items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center justify-between gap-3 text-left"
        >
          <h3 className="text-base font-bold sm:text-lg">โรงแรม หรือที่พักของคุณ</h3>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && onManualEdit && (
            <button
              type="button"
              onClick={onManualEdit}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Pencil size={12} />
              แก้ไขรายละเอียด
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 px-5 pb-5">
          <AccommodationGallery trip={trip} />
        </div>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  icon?: typeof Pencil;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[var(--color-muted)]">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5" style={{ borderColor: "var(--color-border)" }}>
        {Icon && <Icon size={14} style={{ color: "var(--color-muted)" }} />}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>
    </div>
  );
}

// Sits between two stop rows — a small dot (the timeline node hanging off
// the numbered badges above/below it) plus a full-width dashed pill.
// Empty state is a plain "+ เพิ่มการเดินทาง" prompt; once `toActivity` has a
// travelFromPrevious leg attached, it instead shows every available piece of
// travel information and reopens the same dialog to edit it.
export function TravelConnectorRow({
  toActivity,
  canEdit,
  onSave,
  onDelete,
}: {
  toActivity: Activity;
  canEdit: boolean;
  onSave: (travel: TravelFromPrevious) => void;
  onDelete?: () => Promise<void>;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const travel = toActivity.travelFromPrevious;
  const TypeIcon = travel ? travelTypeIcon[travel.type] : null;
  const travelLabel = travel
    ? travel.type === "other" && travel.customType
      ? travel.customType
      : travelTypeLabel[travel.type]
    : undefined;

  // Read-only: nothing to add, so hide the placeholder prompt entirely; an
  // already-attached leg still shows (travelers should be able to see how
  // they get between stops) but as plain text, not a clickable edit target.
  if (!canEdit && !travel) return null;

  const content =
    travel && TypeIcon && travelLabel ? (
      <>
        <TypeIcon size={11} className="shrink-0" />
        <span>{travelLabel}</span>
        {travel.durationMin !== undefined && <> · ~{travel.durationMin} นาที</>}
        {travel.distanceKm !== undefined && <> · {travel.distanceKm} กม.</>}
        {travel.costAmount !== undefined && travel.costAmount > 0 && <> · {formatTHB(travel.costAmount)}</>}
        {travel.notes && <span className="min-w-0 truncate text-[var(--color-muted)]">· {travel.notes}</span>}
      </>
    ) : (
      <>
        <Plus size={11} className="shrink-0" />
        เพิ่มการเดินทาง
      </>
    );

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete();
      setShowDeleteDialog(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "ลบข้อมูลการเดินทางไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex min-h-11 items-stretch gap-1.5 py-1">
        <div className="relative w-3.5 shrink-0" aria-hidden="true">
          <span
            className="absolute bottom-1 left-1/2 top-0 -translate-x-1/2 border-l border-dashed"
            style={{ borderColor: "var(--color-brand-green)" }}
          />
          <span
            className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          />
        </div>
        {canEdit ? travel && onDelete ? (
          <div
            className="my-auto flex min-h-8 min-w-0 flex-1 items-center rounded-full border border-dashed pl-3 pr-1"
            style={{ borderColor: "var(--color-sel-border)", backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
          >
            <button
              type="button"
              onClick={() => setShowDialog(true)}
              aria-label={`แก้ไขการเดินทางไป ${toActivity.title}`}
              className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-x-1 gap-y-0.5 py-1.5 text-left text-[10px] font-semibold outline-none"
            >
              {content}
            </button>
            <button
              type="button"
              onClick={() => { setDeleteError(""); setShowDeleteDialog(true); }}
              aria-label={`ลบข้อมูลการเดินทางไป ${toActivity.title}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-danger)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)]/25"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDialog(true)}
            aria-label={`เพิ่มการเดินทางไป ${toActivity.title}`}
            className="my-auto flex min-h-7 min-w-0 flex-1 flex-wrap items-center justify-start gap-x-1 gap-y-0.5 rounded-full border border-dashed px-3 py-1.5 text-left text-[10px] font-semibold"
            style={{ borderColor: "var(--color-sel-border)", backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
          >
            {content}
          </button>
        ) : (
          <div
            className="my-auto flex min-h-7 min-w-0 flex-1 flex-wrap items-center justify-start gap-x-1 gap-y-0.5 rounded-full border border-dashed px-3 py-1.5 text-[10px] font-semibold"
            style={{ borderColor: "var(--color-sel-border)", backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
          >
            {content}
          </div>
        )}
      </div>

      {showDialog && (
        <TravelLegDialog
          destinationTitle={toActivity.title}
          initial={travel}
          onSave={(next) => {
            onSave(next);
            setShowDialog(false);
          }}
          onClose={() => setShowDialog(false)}
        />
      )}

      {showDeleteDialog && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[1px]" />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => !deleting && setShowDeleteDialog(false)}>
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-travel-title"
              aria-describedby="delete-travel-description"
              className="w-full max-w-[420px] rounded-3xl border border-[#f0d8d2] bg-white p-6 text-center shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                <Trash2 size={23} />
              </div>
              <h3 id="delete-travel-title" className="mt-4 text-xl font-bold">ลบข้อมูลการเดินทาง?</h3>
              <p id="delete-travel-description" className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                ข้อมูลการเดินทางไป “{toActivity.title}” จะถูกลบออกจากแพลนและข้อมูลหลังบ้าน
              </p>
              {deleteError && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-[var(--color-danger-bg)] px-4 py-3 text-left text-sm text-[var(--color-danger)]">
                  <TriangleAlert size={17} className="mt-0.5 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowDeleteDialog(false)} disabled={deleting} className="rounded-full border border-[var(--color-border)] px-4 py-3 text-sm font-semibold hover:bg-[var(--color-surface)] disabled:opacity-50">
                  ยกเลิก
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting} className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-danger)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {deleting ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {deleting ? "กำลังลบ..." : "ลบข้อมูล"}
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}

// "เพิ่มการเดินทาง" — how the traveler gets from the previous stop to
// `destinationTitle`. Saved onto the destination activity as
// travelFromPrevious (see types/index.ts), matching the
// travelTypeFromPrev/travelTimeFromPrevMin/etc. fields the backend accepts.
function TravelLegDialog({
  destinationTitle,
  initial,
  onSave,
  onClose,
}: {
  destinationTitle: string;
  initial?: TravelFromPrevious;
  onSave: (travel: TravelFromPrevious) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<TravelType>(initial?.type ?? "walk");
  const [customType, setCustomType] = useState(initial?.customType ?? "");
  const [durationMin, setDurationMin] = useState(initial?.durationMin?.toString() ?? "");
  const [distanceKm, setDistanceKm] = useState(initial?.distanceKm?.toString() ?? "");
  const [costAmount, setCostAmount] = useState(initial?.costAmount?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSave() {
    onSave({
      type,
      customType: type === "other" ? customType.trim() || undefined : undefined,
      durationMin: durationMin.trim() ? Number(durationMin) : undefined,
      distanceKm: distanceKm.trim() ? Number(distanceKm) : undefined,
      costAmount: costAmount.trim() ? Number(costAmount) : undefined,
      costCurrency: costAmount.trim() ? "THB" : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">เพิ่มการเดินทาง</h3>
              <p className="truncate text-xs text-[var(--color-muted)]">ไปยัง {destinationTitle}</p>
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

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--color-muted)]">ประเภทการเดินทาง</label>
            <div className="grid grid-cols-3 gap-2">
              {TRAVEL_TYPE_OPTIONS.map((t) => {
                const Icon = travelTypeIcon[t];
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="flex flex-col items-center gap-1 rounded-xl border p-2.5 text-[11px] font-semibold transition-colors"
                    style={
                      isSelected
                        ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }
                        : { borderColor: "var(--color-border)", color: "var(--foreground)" }
                    }
                  >
                    <Icon size={16} />
                    {travelTypeLabel[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {type === "other" && (
            <LabeledInput label="ระบุประเภทการเดินทาง" value={customType} onChange={setCustomType} placeholder="เช่น สองแถว" />
          )}

          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="ใช้เวลา (นาที)" value={durationMin} onChange={setDurationMin} placeholder="15" />
            <LabeledInput label="ระยะทาง (กม.)" value={distanceKm} onChange={setDistanceKm} placeholder="1.2" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ค่าใช้จ่าย (บาท)</label>
            <div className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5" style={{ borderColor: "var(--color-border)" }}>
              <input
                type="text"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-sm focus:outline-none"
              />
              <span className="shrink-0 text-xs font-semibold text-[var(--color-muted)]">THB</span>
            </div>
          </div>

          <LabeledInput label="หมายเหตุ" value={notes} onChange={setNotes} placeholder="เช่น ขึ้นรถที่หน้าคาเฟ่" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border py-3 text-sm font-bold"
              style={{ borderColor: "var(--color-border)" }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-full py-3 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--color-accent-orange)" }}
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
