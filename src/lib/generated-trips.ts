import type { Day, GeneratedTrip, TripAccommodation, TripDraft } from "@/types";
import type { GeneratePlanResponse } from "./generate-plan-api";
import type { BackendTrip } from "./trips-api";
import {
  BUDGET_KEY_TO_TIER,
  CONDITION_TO_CONSTRAINT,
  PACE_TO_INTENSITY,
  STYLE_TAG_TO_ENUM,
} from "./generate-plan-mapping";

const STORAGE_KEY = "pluno.generatedTrips";

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
const TRIPS_CHANGED_EVENT = "pluno:generated-trips-changed";

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

const PACE_DESCRIPTION: Record<string, string> = {
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

function conditionsLabel(draft: TripDraft): string {
  return draft.conditions.length ? draft.conditions.join(", ") : "ไม่มีเงื่อนไขพิเศษ";
}

function isLuangPrabang(destination: string): boolean {
  return destination.includes("หลวงพระบาง");
}

// The hand-authored Luang Prabang demo itinerary — the one plan in this app
// that has to look like a finished, real trip (it's what the demo walks
// through), so every stop carries its actual figures: what it costs, and the
// structured `travelFromPrevious` leg that gets it from the previous stop.
//
// Two rules to keep when editing this:
//  • No place appears twice. The only repeat is the hotel, on purpose — the
//    check-out stop reuses the exact check-in name so the accommodation card
//    dedupes them into one stay instead of showing two.
//  • Travel legs carry distance/duration only, never costAmount — every baht
//    already sits in the stop's own `cost` (a ride to a stop is priced into
//    that stop), and counting it twice would inflate the budget summary.
//
// `travelNote` repeats the leg in words because that's what the itinerary
// rows render today; the structured object is what the distance figures are
// summed from (see getDayRouteEstimate in lib/trip-utils.ts).
const LUANG_PRABANG_HOTEL = "Xieng Thong Retreat Hotel";

export const LUANG_PRABANG_ACCOMMODATION: TripAccommodation = {
  name: LUANG_PRABANG_HOTEL,
  imageUrl: "/images/luang-prabang.jpg",
  pricePerNight: 4200,
  amenities: ["อินเทอร์เน็ตฟรี", "รถรับส่งสนามบินฟรี", "สระว่ายน้ำ", "อาหารเช้าบุฟเฟ่ต์"],
  checkIn: "14:00",
  checkOut: "12:00",
  description: "Boutique Luxury Resort · ริมน้ำคาน · เดินถึงวัดเชียงทอง 8 นาที · ตลาดมืด 5 นาที",
};

function luangPrabangDays(): Day[] {
  return [
    {
      id: "gd1",
      dayNumber: 1,
      date: "2026-11-20",
      activities: [
        {
          id: "ga1",
          time: "14:00",
          title: "เช็คอินโรงแรม",
          category: "hotel",
          location: { name: LUANG_PRABANG_HOTEL, rating: 4.8, imageUrl: "/images/luang-prabang.jpg" },
          cost: 8400,
          notes: "ห้อง River View 2 คืน (฿4,200/คืน) รวมอาหารเช้า",
          travelNote: "รถรับส่งโรงแรมจากสนามบิน ~15 นาที · 4.2 กม.",
          travelFromPrevious: { type: "private_transfer", durationMin: 15, distanceKm: 4.2, notes: "รถรับส่งสนามบินฟรีของโรงแรม" },
        },
        {
          id: "ga2",
          time: "15:00",
          title: "วัดเชียงทอง (Wat Xieng Thong)",
          category: "sightseeing",
          location: { name: "Wat Xieng Thong", rating: 4.8, imageUrl: "/images/wat-xieng-thong.png" },
          cost: 100,
          notes: "ค่าเข้า 20,000 กีบ/คน (~฿50 × 2 คน)",
          travelNote: "เดิน ~8 นาที · 0.6 กม.",
          travelFromPrevious: { type: "walk", durationMin: 8, distanceKm: 0.6 },
          icon: "anchor",
        },
        {
          id: "ga3",
          time: "16:30",
          title: "ปั่นจักรยานเลียบเมืองเก่า",
          category: "activity",
          location: { name: "Sakkaline Road (เมืองเก่า)", rating: 4.6 },
          cost: 120,
          notes: "เช่าจักรยาน ฿60/คัน/วัน × 2 คัน",
          travelNote: "เดิน ~5 นาที · 0.4 กม.",
          travelFromPrevious: { type: "walk", durationMin: 5, distanceKm: 0.4 },
          icon: "bike",
        },
        {
          id: "ga4",
          time: "17:30",
          title: "ขึ้นภูสี (Mount Phousi) ชมพระอาทิตย์ตก",
          category: "sightseeing",
          location: { name: "Mount Phousi", rating: 4.7 },
          cost: 100,
          notes: "ค่าขึ้น 25,000 กีบ/คน (~฿50 × 2 คน) · บันได 328 ขั้น",
          travelNote: "ปั่นจักรยาน ~6 นาที · 0.8 กม.",
          travelFromPrevious: { type: "bicycle", durationMin: 6, distanceKm: 0.8 },
          icon: "mountain",
        },
        {
          id: "ga5",
          time: "18:45",
          title: "คาเฟ่ริมโขง Joma Bakery Café",
          category: "food",
          location: { name: "Joma Bakery Café", rating: 4.5, imageUrl: "/images/joma-cafe.png" },
          cost: 180,
          notes: "กาแฟลาว + เบเกอรี่ ~฿90/คน",
          travelNote: "เดิน ~6 นาที · 0.5 กม.",
          travelFromPrevious: { type: "walk", durationMin: 6, distanceKm: 0.5 },
          icon: "coffee",
        },
        {
          id: "ga6",
          time: "19:30",
          title: "ตลาดกลางคืน (Night Market)",
          category: "food",
          location: { name: "Luang Prabang Night Market", rating: 4.6, imageUrl: "/images/night-market.png" },
          cost: 250,
          notes: "มื้อเย็นข้าวเหนียวไก่ย่าง + ของหวาน ~฿125/คน",
          travelNote: "เดิน ~5 นาที · 0.3 กม.",
          travelFromPrevious: { type: "walk", durationMin: 5, distanceKm: 0.3 },
          icon: "ticket",
        },
        {
          id: "ga7",
          time: "21:30",
          title: "บาร์ค็อกเทล Icon Klub",
          category: "food",
          location: { name: "Icon Klub", rating: 4.6 },
          cost: 900,
          notes: "ค็อกเทลซิกเนเจอร์ ~฿225/แก้ว × 4",
          travelNote: "เดิน ~6 นาที · 0.5 กม.",
          travelFromPrevious: { type: "walk", durationMin: 6, distanceKm: 0.5 },
          icon: "beer",
        },
        {
          id: "ga8",
          time: "23:00",
          title: "โบว์ลิ่งหลวงพระบาง",
          category: "activity",
          location: { name: "Luang Prabang Bowling Alley", rating: 4.3 },
          cost: 520,
          notes: "ค่าเลน 2 เกม ฿400 + ตุ๊กตุ๊กไป-กลับ ฿120",
          travelNote: "ตุ๊กตุ๊ก ~10 นาที · 3.4 กม.",
          travelFromPrevious: { type: "tuk_tuk", durationMin: 10, distanceKm: 3.4 },
          icon: "pulse",
        },
      ],
    },
    {
      id: "gd2",
      dayNumber: 2,
      date: "2026-11-21",
      activities: [
        {
          id: "ga9",
          time: "06:00",
          title: "ตักบาตรข้าวเหนียว ถนนสีสะหว่างวง",
          category: "sightseeing",
          location: { name: "Sisavangvong Road", rating: 4.7 },
          cost: 100,
          notes: "ชุดข้าวเหนียวใส่บาตร ฿50/ชุด × 2",
          travelNote: "เดินจากโรงแรม ~7 นาที · 0.6 กม.",
          travelFromPrevious: { type: "walk", durationMin: 7, distanceKm: 0.6 },
        },
        {
          id: "ga10",
          time: "07:30",
          title: "มื้อเช้าตลาดเช้าหลวงพระบาง",
          category: "food",
          location: { name: "Luang Prabang Morning Market", rating: 4.4 },
          cost: 160,
          notes: "ข้าวเปียกเส้น + ปาท่องโก๋ ~฿80/คน",
          travelNote: "เดิน ~5 นาที · 0.4 กม.",
          travelFromPrevious: { type: "walk", durationMin: 5, distanceKm: 0.4 },
        },
        {
          id: "ga11",
          time: "09:30",
          title: "น้ำตกกวางสี (Kuang Si Falls)",
          category: "activity",
          location: { name: "Kuang Si Falls", rating: 4.9 },
          cost: 900,
          notes: "เหมารถตู้ไป-กลับ ฿600 + ค่าเข้า ฿150/คน",
          travelNote: "รถส่วนตัว ~45 นาที · 29.5 กม.",
          travelFromPrevious: { type: "private_transfer", durationMin: 45, distanceKm: 29.5 },
        },
        {
          id: "ga12",
          time: "12:30",
          title: "มื้อกลางวัน Kuang Si Buffalo Dairy",
          category: "food",
          location: { name: "Kuang Si Buffalo Dairy", rating: 4.7 },
          cost: 350,
          notes: "เซ็ตอาหาร + ไอศกรีมนมควาย ฿175/คน",
          travelNote: "รถส่วนตัว ~10 นาที · 3.6 กม.",
          travelFromPrevious: { type: "private_transfer", durationMin: 10, distanceKm: 3.6 },
        },
        {
          id: "ga13",
          time: "15:30",
          title: "สปาสมุนไพรลาว Lao Red Cross",
          category: "activity",
          location: { name: "Lao Red Cross Herbal Sauna", rating: 4.5 },
          cost: 550,
          notes: "อบสมุนไพร + นวดลาว 60 นาที ฿275/คน",
          travelNote: "รถส่วนตัว ~40 นาที · 27.8 กม.",
          travelFromPrevious: { type: "private_transfer", durationMin: 40, distanceKm: 27.8 },
        },
        {
          id: "ga14",
          time: "17:30",
          title: "ล่องเรือแม่น้ำโขงยามเย็น",
          category: "activity",
          location: { name: "Mekong River", rating: 4.7, imageUrl: "/images/mekong-boat.png" },
          cost: 1300,
          notes: "เรือเหมา 2 ชั่วโมง พร้อมของว่างและเครื่องดื่ม",
          travelNote: "เดิน ~12 นาที · 0.9 กม.",
          travelFromPrevious: { type: "walk", durationMin: 12, distanceKm: 0.9 },
        },
        {
          id: "ga15",
          time: "20:00",
          title: "มื้อเย็น Lao Lao Garden",
          category: "food",
          location: { name: "Lao Lao Garden", rating: 4.5 },
          cost: 450,
          notes: "ปิ้งย่างลาว + ลาบปลา ~฿225/คน",
          travelNote: "เดิน ~10 นาที · 0.7 กม.",
          travelFromPrevious: { type: "walk", durationMin: 10, distanceKm: 0.7 },
        },
        {
          id: "ga16",
          time: "21:30",
          title: "บาร์ริมน้ำคาน Utopia",
          category: "food",
          location: { name: "Utopia Bar", rating: 4.4 },
          cost: 380,
          notes: "เบียร์ลาว + เมาเทนวิว ~฿190/คน",
          travelNote: "เดิน ~6 นาที · 0.4 กม.",
          travelFromPrevious: { type: "walk", durationMin: 6, distanceKm: 0.4 },
          icon: "beer",
        },
      ],
    },
    {
      id: "gd3",
      dayNumber: 3,
      date: "2026-11-22",
      activities: [
        {
          id: "ga17",
          time: "07:30",
          title: "มื้อเช้าคาเฟ่ Le Banneton",
          category: "food",
          location: { name: "Le Banneton Café", rating: 4.6 },
          cost: 220,
          notes: "ครัวซองต์ + กาแฟฝรั่งเศส ~฿110/คน",
          travelNote: "เดินจากโรงแรม ~5 นาที · 0.4 กม.",
          travelFromPrevious: { type: "walk", durationMin: 5, distanceKm: 0.4 },
          icon: "coffee",
        },
        {
          id: "ga18",
          time: "09:00",
          title: "วัดวิชุนราช & พระธาตุหมากโม",
          category: "sightseeing",
          location: { name: "Wat Visounnarath", rating: 4.5 },
          cost: 100,
          notes: "ค่าเข้า 20,000 กีบ/คน (~฿50 × 2 คน)",
          travelNote: "เดิน ~14 นาที · 1.1 กม.",
          travelFromPrevious: { type: "walk", durationMin: 14, distanceKm: 1.1 },
        },
        {
          id: "ga19",
          time: "10:30",
          title: "ซื้อของฝาก Ock Pop Tok Living Crafts Centre",
          category: "activity",
          location: { name: "Ock Pop Tok Living Crafts Centre", rating: 4.8 },
          cost: 300,
          notes: "ชมสาธิตทอผ้า (ฟรี) + ผ้าพันคอทอมือ ฿300",
          travelNote: "ตุ๊กตุ๊ก ~8 นาที · 1.8 กม.",
          travelFromPrevious: { type: "tuk_tuk", durationMin: 8, distanceKm: 1.8 },
        },
        {
          id: "ga20",
          time: "11:45",
          title: "เช็คเอาท์โรงแรม",
          category: "hotel",
          location: { name: LUANG_PRABANG_HOTEL, rating: 4.8, imageUrl: "/images/luang-prabang.jpg" },
          cost: 0,
          notes: "ฝากกระเป๋าที่ล็อบบี้ได้ถึงเย็น",
          travelNote: "ตุ๊กตุ๊ก ~9 นาที · 2.0 กม.",
          travelFromPrevious: { type: "tuk_tuk", durationMin: 9, distanceKm: 2 },
        },
        {
          id: "ga21",
          time: "12:30",
          title: "มื้อกลางวัน Tamarind Restaurant",
          category: "food",
          location: { name: "Tamarind Restaurant", rating: 4.6 },
          cost: 480,
          notes: "เซ็ตอาหารลาว 5 อย่าง ฿240/คน",
          travelNote: "เดิน ~6 นาที · 0.4 กม.",
          travelFromPrevious: { type: "walk", durationMin: 6, distanceKm: 0.4 },
        },
        {
          id: "ga22",
          time: "14:30",
          title: "เดินทางสู่สนามบิน",
          category: "transport",
          location: { name: "Luang Prabang International Airport" },
          cost: 150,
          notes: "ตุ๊กตุ๊กเหมา ฿150 · เช็คอินก่อนบิน 1 ชั่วโมง",
          travelNote: "ตุ๊กตุ๊ก ~20 นาที · 4.6 กม.",
          travelFromPrevious: { type: "tuk_tuk", durationMin: 20, distanceKm: 4.6 },
        },
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
    budgetLabel: budgetLabel(draft),
    conditionsLabel: conditionsLabel(draft),
    styles: draft.styles,
    status: "generated",
    days: luangPrabang ? luangPrabangDays() : genericDays(draft.destination),
    accommodation: luangPrabang ? LUANG_PRABANG_ACCOMMODATION : undefined,
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
const INTENSITY_TO_PACE = invert(PACE_TO_INTENSITY);
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

  const pace = brief?.intensity ? INTENSITY_TO_PACE[brief.intensity] : undefined;
  const budgetKey = trip.budgetTier ? TIER_TO_BUDGET_KEY[trip.budgetTier] : undefined;

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
    budgetLabel: budgetKey ? BUDGET_PRESET_LABEL[budgetKey] ?? budgetKey : "ยังไม่ระบุ",
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

// A copy saved before this itinerary carried its real figures (per-stop
// travel legs + accommodation pricing) is re-seeded instead of shown as-is:
// the demo trip is only ever written on first open, so without this a browser
// that opened it once would keep showing the old figure-less version forever.
function hasRealFigures(trip: GeneratedTrip): boolean {
  return (
    trip.accommodation?.pricePerNight !== undefined &&
    trip.days.some((d) => d.activities.some((a) => a.travelFromPrevious?.distanceKm !== undefined))
  );
}

export function getOrCreateDemoLuangPrabangTrip(): GeneratedTrip {
  const existing = getGeneratedTrip(DEMO_LUANG_PRABANG_ID);
  if (existing && hasRealFigures(existing)) return existing;

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
    accommodation: LUANG_PRABANG_ACCOMMODATION,
  };
  if (existing) replaceGeneratedTripId(DEMO_LUANG_PRABANG_ID, trip);
  else saveGeneratedTrip(trip);
  return trip;
}
