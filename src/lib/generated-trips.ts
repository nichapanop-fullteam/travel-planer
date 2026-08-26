import type { Day, GeneratedTrip, TripDraft } from "@/types";
import type { GeneratePlanResponse, Intensity } from "./generate-plan-api";
import type { BackendTrip } from "./trips-api";
import {
  BUDGET_KEY_TO_TIER,
  CONDITION_TO_CONSTRAINT,
  PACE_TO_INTENSITY,
  STYLE_TAG_TO_ENUM,
} from "./generate-plan-mapping";
import { formatTHB } from "./trip-utils";

const STORAGE_KEY = "punguide.generatedTrips";

// No backend yet — generated plans are persisted client-side only, same
// pattern as lib/trip-drafts.ts.
function readAll(): GeneratedTrip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const trips = JSON.parse(raw) as GeneratedTrip[];
    // Self-heal any duplicate ids left over from before the double-submit
    // guard on the Create Trip page — keeps the first (most recent) copy.
    const seen = new Set<string>();
    const deduped = trips.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
    if (deduped.length !== trips.length) writeAll(deduped);
    return deduped;
  } catch {
    return [];
  }
}

function isQuotaExceededError(error: unknown): error is DOMException {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

// Locally-uploaded photos (raw base64 data URLs, see AddActivityDialog's
// "เพิ่มรูป") are the usual cause of blowing past localStorage's per-origin
// quota once a few trips carry a few images each — external URLs (place
// photos, or trip-media-api uploads once a trip has been saved server-side)
// are just short strings and aren't the problem, so only data: URLs are cut.
function stripHeavyImages(trips: GeneratedTrip[]): GeneratedTrip[] {
  return trips.map((trip) => ({
    ...trip,
    days: trip.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) =>
        activity.images?.some((img) => img.startsWith("data:"))
          ? { ...activity, images: undefined }
          : activity
      ),
    })),
  }));
}

// Fired after every write so any mounted component holding its own copy of
// the list (e.g. Sidebar's "ทริปของฉัน") can refresh — a plain useEffect on
// mount only ever sees the list as of whenever that component happened to
// load, so without this it goes stale the moment something elsewhere
// creates/updates/deletes a trip in the same tab (storage events don't fire
// for writes made by the tab that made them).
const TRIPS_CHANGED_EVENT = "punguide:generated-trips-changed";

function notifyTripsChanged(): void {
  if (typeof window === "undefined") return;
  // writeAll (and so this) can run synchronously inside a setTrip(prev => ...)
  // updater — e.g. updateGeneratedTrip called from generated-plan/[id]/page.tsx
  // — which React invokes during that component's render. Dispatching the
  // event straight from there makes Sidebar's listener call setState on a
  // *different* component mid-render ("Cannot update a component while
  // rendering a different component"). Deferring a tick lets that render
  // finish and commit first.
  queueMicrotask(() => window.dispatchEvent(new Event(TRIPS_CHANGED_EVENT)));
}

function writeAll(trips: GeneratedTrip[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error;
    console.warn("localStorage เต็ม — ตัดรูปที่แนบไว้ในเครื่องออกแล้วลองบันทึกอีกครั้ง");
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stripHeavyImages(trips)));
    } catch (retryError) {
      console.error("บันทึกทริปไม่สำเร็จแม้ตัดรูปออกแล้ว", retryError);
    }
  }
  notifyTripsChanged();
}

export function getGeneratedTrip(id: string): GeneratedTrip | undefined {
  return readAll().find((t) => t.id === id);
}

export function getGeneratedTrips(): GeneratedTrip[] {
  return readAll();
}

// Subscribe to local trip list changes (create/update/delete) — see
// TRIPS_CHANGED_EVENT above for why this is needed alongside a mount-time
// getGeneratedTrips() call. Returns an unsubscribe function.
export function onGeneratedTripsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(TRIPS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(TRIPS_CHANGED_EVENT, listener);
}

// Removes a trip from local storage — e.g. when "ลบทริป" on my-trips deletes
// the backend row, this keeps a self-mode trip's local copy (saved under the
// same id, see create-trip/page.tsx) from lingering in the "ทริปของฉัน"
// sidebar list afterward. A no-op if this id was never saved locally.
export function deleteGeneratedTrip(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id));
}

export function saveGeneratedTrip(trip: GeneratedTrip): void {
  const trips = readAll();
  trips.unshift(trip);
  writeAll(trips);
}

export function confirmGeneratedTrip(id: string): void {
  writeAll(readAll().map((t) => (t.id === id ? { ...t, status: "confirmed" as const } : t)));
}

// Partial update for the "แก้ไขทริป" edit flows on the trip detail page —
// name/destination/dates/pace/budget/conditions/accommodation/itinerary
// edits all go through this rather than a full saveGeneratedTrip() rewrite.
export function updateGeneratedTrip(id: string, patch: Partial<GeneratedTrip>): void {
  writeAll(readAll().map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

// Swaps a trip's storage entry onto its new (backend-assigned) id — used
// once after the first successful createTripOnServer, since the local copy
// was keyed by a client-generated UUID up to that point (see
// reconcileTripWithServer in trips-create-api.ts). A plain updateGeneratedTrip
// can't do this: it looks the row up by the *old* id but `next.id` no longer
// matches it, so the row would keep its stale id forever.
export function replaceGeneratedTripId(oldId: string, next: GeneratedTrip): void {
  writeAll(readAll().map((t) => (t.id === oldId ? next : t)));
}

const BUDGET_PRESET_LABEL: Record<string, string> = {
  Economy: "฿800 / วัน",
  Comfort: "฿3,000 / วัน",
  Premium: "฿7,500 / วัน",
  Luxury: "฿12,000 / วัน",
};

function budgetLabel(draft: TripDraft): string {
  if (draft.budget === "custom") return draft.customBudget ? `฿${draft.customBudget} / วัน` : "ยังไม่ระบุ";
  if (draft.budget && BUDGET_PRESET_LABEL[draft.budget]) return BUDGET_PRESET_LABEL[draft.budget];
  return "ยังไม่ระบุ";
}

// Exported so EditTripDialog (generated-plan/[id]/page.tsx) can build the
// same "Chill เที่ยวสบาย"-style label after the user picks a different pace
// chip, instead of duplicating this copy.
export const PACE_DESCRIPTION: Record<string, string> = {
  "Slow Life": "เที่ยวช้าๆ ไม่รีบ",
  Chill: "เที่ยวสบาย",
  Balance: "สมดุลพักผ่อน-กิจกรรม",
  Active: "เที่ยวเยอะ กระฉับกระเฉง",
  Hardcore: "อัดกิจกรรมเต็มวัน",
};

function paceLabel(draft: TripDraft): string {
  if (!draft.pace) return "ยังไม่ระบุ";
  const description = PACE_DESCRIPTION[draft.pace];
  return description ? `${draft.pace} ${description}` : draft.pace;
}

function paceFromDraft(draft: TripDraft): Intensity | undefined {
  return draft.pace ? PACE_TO_INTENSITY[draft.pace] : undefined;
}

function conditionsLabel(draft: TripDraft): string {
  return draft.conditions.length ? draft.conditions.join(", ") : "ไม่มีเงื่อนไขพิเศษ";
}

function isLuangPrabang(destination: string): boolean {
  return destination.includes("หลวงพระบาง");
}

function luangPrabangDays(): Day[] {
  return [
    {
      id: "gd1",
      dayNumber: 1,
      date: "2026-11-20",
      activities: [
        { id: "ga1", time: "14:00", title: "เช็คอินโรงแรม", category: "hotel", location: { name: "Xieng Thong Retreat Hotel", rating: 5.0, imageUrl: "/images/luang-prabang.jpg" }, cost: 0, travelNote: "จากสนามบิน ~15 นาที", travelFromPrevious: { type: "private_transfer", durationMin: 15, distanceKm: 4.5 } },
        { id: "ga2", time: "15:00", title: "วัดเชียงทอง (Wat Xieng Thong)", category: "sightseeing", location: { name: "Wat Xieng Thong", rating: 4.8, imageUrl: "/images/wat-xieng-thong.png" }, cost: 100, travelNote: "เดิน ~8 นาที", icon: "anchor", travelFromPrevious: { type: "walk", durationMin: 8, distanceKm: 0.6 } },
        { id: "ga3", time: "16:30", title: "ปั่นจักรยานเลียบเมืองเก่า", category: "activity", location: { name: "Old Town" }, cost: 100, travelNote: "อยู่ย่านเดียวกัน", icon: "bike", travelFromPrevious: { type: "walk", durationMin: 3, distanceKm: 0.2 } },
        { id: "ga4", time: "17:30", title: "ขึ้นภูสี (Mount Phousi) ชมพระอาทิตย์ตก", category: "sightseeing", location: { name: "Mount Phousi" }, cost: 100, travelNote: "เดิน ~10 นาที", icon: "mountain", travelFromPrevious: { type: "walk", durationMin: 10, distanceKm: 0.7 } },
        { id: "ga5", time: "19:00", title: "ตลาดกลางคืน (Night Market)", category: "food", location: { name: "Luang Prabang Night Market", rating: 4.6, imageUrl: "/images/night-market.png" }, cost: 250, travelNote: "เดิน ~5 นาที", icon: "ticket", travelFromPrevious: { type: "walk", durationMin: 5, distanceKm: 0.4 } },
        { id: "ga6", time: "21:30", title: "บาร์ค็อกเทล Icon Klub", category: "food", location: { name: "Icon Klub" }, cost: 900, travelNote: "เดิน ~6 นาที", icon: "beer", travelFromPrevious: { type: "walk", durationMin: 6, distanceKm: 0.4 } },
        { id: "ga7", time: "00:00", title: "โบว์ลิ่งหลวงพระบาง", category: "activity", location: { name: "Luang Prabang Bowling Alley" }, cost: 400, travelNote: "ตุ๊กตุ๊ก ~10 นาที", icon: "pulse", travelFromPrevious: { type: "tuk_tuk", durationMin: 10, distanceKm: 3.0 } },
      ],
    },
    {
      id: "gd2",
      dayNumber: 2,
      date: "2026-11-21",
      activities: [
        { id: "ga8", time: "08:00", title: "น้ำตกกวางสี", category: "activity", location: { name: "Kuang Si Falls" }, cost: 900, travelNote: "จากโรงแรม ~15 นาที", travelFromPrevious: { type: "private_transfer", durationMin: 15, distanceKm: 8.0 } },
        { id: "ga9", time: "12:00", title: "สปาสมุนไพรลาว", category: "activity", location: { name: "Luang Prabang Traditional Herbal Sauna" }, cost: 550, travelNote: "เดิน ~10 นาที", travelFromPrevious: { type: "walk", durationMin: 10, distanceKm: 0.7 } },
        { id: "ga10", time: "17:00", title: "ล่องเรือแม่น้ำโขงยามเย็น", category: "food", location: { name: "Mekong River", rating: 4.7, imageUrl: "/images/mekong-boat.png" }, cost: 1300, travelNote: "เดิน ~10 นาที", travelFromPrevious: { type: "walk", durationMin: 10, distanceKm: 0.7 } },
        { id: "ga11", time: "20:00", title: "Lao Lao Garden", category: "food", location: { name: "Lao Lao Garden" }, cost: 450, travelNote: "เดิน ~10 นาที", travelFromPrevious: { type: "walk", durationMin: 10, distanceKm: 0.7 } },
      ],
    },
    {
      id: "gd3",
      dayNumber: 3,
      date: "2026-11-22",
      activities: [
        { id: "ga12", time: "08:00", title: "เช็คเอาท์โรงแรม", category: "hotel", location: { name: "Old Town" }, cost: 0 },
        { id: "ga13", time: "09:00", title: "คาเฟ่ริมโขง มื้อเช้า", category: "food", location: { name: "Mekong Riverside Café" }, cost: 200, travelNote: "เดิน ~5 นาที", travelFromPrevious: { type: "walk", durationMin: 5, distanceKm: 0.4 } },
        { id: "ga14", time: "11:00", title: "เดินทางสู่สนามบิน", category: "transport", location: { name: "Luang Prabang Airport" }, cost: 0, travelNote: "รถส่วนตัว ~20 นาที", travelFromPrevious: { type: "private_transfer", durationMin: 20, distanceKm: 4.5 } },
      ],
    },
  ];
}

function genericDays(destination: string): Day[] {
  return [
    {
      id: "gd1",
      dayNumber: 1,
      date: "2026-11-20",
      activities: [
        { id: "ga1", time: "14:00", title: `เช็คอินโรงแรมใน${destination}`, category: "hotel", location: { name: destination }, cost: 0 },
        { id: "ga2", time: "16:00", title: "เดินสำรวจย่านเมืองเก่า", category: "sightseeing", location: { name: destination }, cost: 0, travelNote: "เดิน ~10 นาที" },
        { id: "ga3", time: "19:00", title: "มื้อเย็นร้านเด็ดประจำเมือง", category: "food", location: { name: destination }, cost: 500, travelNote: "เดิน ~5 นาที" },
      ],
    },
  ];
}

function parseDurationDays(durationLabel: string): number {
  const match = durationLabel.match(/(\d+)\s*วัน/);
  const days = match ? Number(match[1]) : NaN;
  return Number.isFinite(days) && days > 0 ? days : 1;
}

// Exported for reuse by create-trip/page.tsx — POST /trips (self mode) only
// creates the trip row itself, with no day rows even when startDate/endDate
// imply a duration, so the same placeholder-days-per-duration this shell
// always started with get built there too before syncing each to the
// backend via POST /trips/:planId/days.
export function emptyDays(durationLabel: string, startDate?: string): Day[] {
  const dayCount = parseDurationDays(durationLabel);
  const parsedStart = startDate ? new Date(`${startDate.slice(0, 10)}T00:00:00Z`).getTime() : NaN;
  const start = Number.isFinite(parsedStart) ? parsedStart : Date.now();
  return Array.from({ length: dayCount }, (_, i) => ({
    id: crypto.randomUUID(),
    dayNumber: i + 1,
    date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
    activities: [],
  }));
}

// "สร้างด้วยตัวเอง" (self mode) Trip Shell — empty days only, no pre-baked
// mock activities, so Step 3B (pick starting places) has real empty days to
// fill instead of content the traveler didn't ask for.
export function createEmptyTripShell(draft: TripDraft): GeneratedTrip {
  return {
    id: crypto.randomUUID(),
    draftId: draft.id,
    createdAt: new Date().toISOString(),
    destination: draft.destination,
    destinationPlace: draft.destinationPlace,
    coverImageUrl: isLuangPrabang(draft.destination) ? "/images/luang-prabang-aerial.png" : "/images/hero-mountain.jpg",
    durationLabel: draft.duration || "ยังไม่ระบุ",
    paceLabel: paceLabel(draft),
    pace: paceFromDraft(draft),
    budgetLabel: budgetLabel(draft),
    conditionsLabel: conditionsLabel(draft),
    styles: draft.styles,
    status: "generated",
    days: emptyDays(draft.duration, draft.startDate),
  };
}

// Mock "AI generation" — real generation would call a backend; today it just
// picks a hand-authored itinerary for known destinations (Luang Prabang) and
// falls back to a bare-bones single-day template otherwise.
export function generateTripFromDraft(draft: TripDraft): GeneratedTrip {
  const luangPrabang = isLuangPrabang(draft.destination);
  return {
    id: crypto.randomUUID(),
    draftId: draft.id,
    createdAt: new Date().toISOString(),
    destination: draft.destination,
    destinationPlace: draft.destinationPlace,
    coverImageUrl: luangPrabang ? "/images/luang-prabang-aerial.png" : "/images/hero-mountain.jpg",
    durationLabel: draft.duration || "ยังไม่ระบุ",
    paceLabel: paceLabel(draft),
    pace: paceFromDraft(draft),
    budgetLabel: budgetLabel(draft),
    conditionsLabel: conditionsLabel(draft),
    styles: draft.styles,
    status: "generated",
    days: luangPrabang ? luangPrabangDays() : genericDays(draft.destination),
  };
}

// Real AI generation via POST /trips/plan/generate (see lib/generate-plan-api.ts).
// The label fields (durationLabel/paceLabel/etc.) are still derived from the
// draft, same as the mocked path above — the API's resolvedBrief has the
// authoritative numbers it actually used, but this app doesn't have a
// "resolved brief" UI yet, so the draft-derived labels stay the source of
// truth for display for now.
export function buildGeneratedTripFromApiResponse(draft: TripDraft, response: GeneratePlanResponse): GeneratedTrip {
  const { draft: apiDraft, generation } = response;
  const days: Day[] = apiDraft.days.map((day) => ({
    id: crypto.randomUUID(),
    dayNumber: day.dayNumber,
    date: day.date ?? "",
    activities: day.items.map((item) => ({
      id: crypto.randomUUID(),
      time: item.startTime ?? "",
      title: item.title ?? item.customName ?? "สถานที่แนะนำ",
      category: item.category ?? "activity",
      location: item.location
        ? { ...item.location, googlePlaceId: item.placeId }
        : item.placeId
          ? { name: item.title ?? "สถานที่แนะนำ", googlePlaceId: item.placeId }
          : undefined,
      notes: item.notes,
      cost: item.costAmount ?? 0,
      travelNote:
        item.travelTimeFromPrevMin != null
          ? `~${item.travelTimeFromPrevMin} นาที${item.travelDistanceFromPrevKm != null ? ` · ${item.travelDistanceFromPrevKm} กม.` : ""}`
          : undefined,
    })),
  }));
  const firstActivityImage = days.flatMap((d) => d.activities).find((a) => a.location?.imageUrl)?.location
    ?.imageUrl;
  const nights = Math.max(response.resolvedBrief.durationDays - 1, 0);

  return {
    id: crypto.randomUUID(),
    draftId: draft.id,
    createdAt: new Date().toISOString(),
    title: apiDraft.title,
    destination: draft.destination,
    destinationPlace: draft.destinationPlace,
    coverImageUrl: firstActivityImage ?? "/images/hero-mountain.jpg",
    durationLabel: `${response.resolvedBrief.durationDays} วัน ${nights} คืน`,
    paceLabel: paceLabel(draft),
    pace: paceFromDraft(draft),
    budgetLabel: budgetLabel(draft),
    conditionsLabel: conditionsLabel(draft),
    styles: draft.styles,
    status: "generated",
    days,
    generationNotice: generation.resolvedWithoutErrors
      ? undefined
      : {
          resolvedWithoutErrors: generation.resolvedWithoutErrors,
          modelWarnings: generation.modelWarnings,
          violations: generation.violations,
        },
  };
}

function invert(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
}

const ENUM_TO_STYLE_TAG = invert(STYLE_TAG_TO_ENUM);
// Exported for EditTripDialog to preselect the right pace chip from a
// backend-sourced trip's raw trip.pace.
export const INTENSITY_TO_PACE = invert(PACE_TO_INTENSITY) as Record<Intensity, string>;
const TIER_TO_BUDGET_KEY = invert(BUDGET_KEY_TO_TIER);
const CONSTRAINT_TO_CONDITION = invert(CONDITION_TO_CONSTRAINT);

// Maps a trip fetched from GET /trips (real backend, no TripDraft behind it)
// onto the same GeneratedTrip shape the rest of this app renders — lets
// generated-plan/[id]/page.tsx show a trip it didn't create locally (e.g.
// one saved via createTripOnServer, or created by another browser/session)
// once lib/generated-trips.ts's own localStorage lookup comes up empty.
//
// `draftId` has no real draft behind it, so isSelfMode on the detail page
// always resolves to false for these — a backend trip always renders as a
// regular (non-"build it yourself") plan, regardless of its planMode.
// `existingRemixedFrom` lets a caller carry forward the richer
// sourceTitle/sourceCreatorName captured right after a remix (see
// useRemixTrip's buildRemixedTripShell) across a later GET/PATCH refetch —
// the backend's own trip response only ever has the flat `sourceTripId`
// (see BackendTrip in trips-api.ts), never the source's title or owner.
export function buildGeneratedTripFromBackendTrip(
  trip: BackendTrip,
  existingRemixedFrom?: GeneratedTrip["remixedFrom"]
): GeneratedTrip {
  const { schedule, brief } = trip;
  const nights = schedule.durationNights ?? Math.max((schedule.durationDays ?? trip.days.length) - 1, 0);
  const durationDays = schedule.durationDays ?? trip.days.length;

  const styles = [
    ...(brief?.styles ?? []).map((s) => ENUM_TO_STYLE_TAG[s] ?? s),
    ...(brief?.customStyles ?? []),
  ];

  const pace = brief?.intensity ? INTENSITY_TO_PACE[brief.intensity as Intensity] : undefined;
  const budgetKey = trip.budgetTier ? TIER_TO_BUDGET_KEY[trip.budgetTier] : undefined;
  // budgetLimit (the numeric cap set via EditTripDialog's "งบประมาณ" field)
  // wins over the preset budgetTier — it's the more specific, more recently
  // editable value; a tier is just what create-trip's wizard started from.
  const budgetLabel = trip.budgetLimit
    ? `${formatTHB(trip.budgetLimit)} / วัน`
    : budgetKey
      ? (BUDGET_PRESET_LABEL[budgetKey] ?? budgetKey)
      : "ยังไม่ระบุ";

  const conditions = [
    ...(brief?.constraints ?? []).map((c) => CONSTRAINT_TO_CONDITION[c] ?? c),
    ...(brief?.customConstraints ?? []),
  ];

  const firstActivityImage = trip.days.flatMap((d) => d.activities).find((a) => a.location?.imageUrl)?.location
    ?.imageUrl;

  return {
    id: trip.id,
    draftId: trip.id,
    createdAt: trip.createdAt,
    title: trip.title,
    destination: trip.destination,
    coverImageUrl: firstActivityImage ?? "/images/hero-mountain.jpg",
    coverImage: trip.coverImage,
    mediaSummary: trip.mediaSummary,
    durationLabel: `${durationDays} วัน ${nights} คืน`,
    paceLabel: pace ? `${pace} ${PACE_DESCRIPTION[pace] ?? ""}`.trim() : "ยังไม่ระบุ",
    pace: brief?.intensity as Intensity | undefined,
    budgetLabel,
    budgetGoal: trip.budgetLimit,
    conditionsLabel: conditions.length ? conditions.join(", ") : "ไม่มีเงื่อนไขพิเศษ",
    styles,
    status: trip.status === "confirmed" ? "confirmed" : "generated",
    days: trip.days,
    backendSynced: true,
    backendDayIds: trip.days.map((d) => d.id),
    backendItemIds: trip.days.flatMap((d) => d.activities.map((a) => a.id)),
    ownerId: trip.ownerId,
    creator: trip.customer
      ? { id: trip.customer.id, name: trip.customer.name, avatarUrl: trip.customer.avatarUrl }
      : undefined,
    planMode: trip.planMode,
    saveCount: trip.saveCount,
    remixCount: trip.remixCount,
    remixedFrom: trip.sourceTripId
      ? existingRemixedFrom?.sourceTripId === trip.sourceTripId
        ? existingRemixedFrom
        : { sourceTripId: trip.sourceTripId }
      : undefined,
    visibility: trip.visibility,
    publishedAt: trip.publishedAt,
    totalBudget: trip.totalBudget,
  };
}

// Fixed id for the Luang Prabang mock-data card on the Home page — lets that
// card link straight to a confirmed detail page without going through the
// create-trip form first.
export const DEMO_LUANG_PRABANG_ID = "demo-luang-prabang";

export function getOrCreateDemoLuangPrabangTrip(): GeneratedTrip {
  const existing = getGeneratedTrip(DEMO_LUANG_PRABANG_ID);
  if (existing) return existing;

  const trip: GeneratedTrip = {
    id: DEMO_LUANG_PRABANG_ID,
    draftId: DEMO_LUANG_PRABANG_ID,
    createdAt: new Date().toISOString(),
    destination: "หลวงพระบาง, ลาว",
    coverImageUrl: "/images/luang-prabang-aerial.png",
    durationLabel: "3 วัน 2 คืน",
    paceLabel: "Chill เที่ยวสบาย",
    budgetLabel: "฿7,500 / วัน",
    conditionsLabel: "มีรถส่วนตัว, เดินเยอะไม่ได้",
    styles: ["วัฒนธรรม", "อาหาร", "ไนท์ไลฟ์"],
    status: "confirmed",
    days: luangPrabangDays(),
  };
  saveGeneratedTrip(trip);
  return trip;
}