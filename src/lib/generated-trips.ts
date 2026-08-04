import type { Day, GeneratedTrip, TripDraft } from "@/types";

const STORAGE_KEY = "pluno.generatedTrips";

// No backend yet — generated plans are persisted client-side only, same
// pattern as lib/trip-drafts.ts.
function readAll(): GeneratedTrip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GeneratedTrip[]) : [];
  } catch {
    return [];
  }
}

function writeAll(trips: GeneratedTrip[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

export function getGeneratedTrip(id: string): GeneratedTrip | undefined {
  return readAll().find((t) => t.id === id);
}

export function getGeneratedTrips(): GeneratedTrip[] {
  return readAll();
}

export function saveGeneratedTrip(trip: GeneratedTrip): void {
  const trips = readAll();
  trips.unshift(trip);
  writeAll(trips);
}

export function confirmGeneratedTrip(id: string): void {
  writeAll(readAll().map((t) => (t.id === id ? { ...t, status: "confirmed" as const } : t)));
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

function luangPrabangDays(): Day[] {
  return [
    {
      id: "gd1",
      dayNumber: 1,
      date: "2026-11-20",
      activities: [
        { id: "ga1", time: "14:00", title: "เช็คอินโรงแรม", category: "hotel", location: { name: "Xieng Thong Retreat Hotel", rating: 5.0, imageUrl: "/images/luang-prabang.jpg" }, cost: 0, travelNote: "จากสนามบิน ~15 นาที" },
        { id: "ga2", time: "15:00", title: "วัดเชียงทอง (Wat Xieng Thong)", category: "sightseeing", location: { name: "Wat Xieng Thong", rating: 4.8, imageUrl: "/images/wat-xieng-thong.png" }, cost: 100, travelNote: "เดิน ~8 นาที", icon: "anchor" },
        { id: "ga3", time: "16:30", title: "ปั่นจักรยานเลียบเมืองเก่า", category: "activity", location: { name: "Old Town" }, cost: 100, travelNote: "อยู่ย่านเดียวกัน", icon: "bike" },
        { id: "ga4", time: "17:30", title: "ขึ้นภูสี (Mount Phousi) ชมพระอาทิตย์ตก", category: "sightseeing", location: { name: "Mount Phousi" }, cost: 100, travelNote: "เดิน ~10 นาที", icon: "mountain" },
        { id: "ga5", time: "19:00", title: "ตลาดกลางคืน (Night Market)", category: "food", location: { name: "Luang Prabang Night Market", rating: 4.6, imageUrl: "/images/night-market.png" }, cost: 250, travelNote: "เดิน ~5 นาที", icon: "ticket" },
        { id: "ga6", time: "21:30", title: "บาร์ค็อกเทล Icon Klub", category: "food", location: { name: "Icon Klub" }, cost: 900, travelNote: "เดิน ~6 นาที", icon: "beer" },
        { id: "ga7", time: "00:00", title: "โบว์ลิ่งหลวงพระบาง", category: "activity", location: { name: "Luang Prabang Bowling Alley" }, cost: 400, travelNote: "ตุ๊กตุ๊ก ~10 นาที", icon: "pulse" },
      ],
    },
    {
      id: "gd2",
      dayNumber: 2,
      date: "2026-11-21",
      activities: [
        { id: "ga8", time: "08:00", title: "น้ำตกกวางสี", category: "activity", location: { name: "Kuang Si Falls" }, cost: 900, travelNote: "จากโรงแรม ~15 นาที" },
        { id: "ga9", time: "12:00", title: "สปาสมุนไพรลาว", category: "activity", location: { name: "Luang Prabang" }, cost: 550, travelNote: "เดิน ~10 นาที" },
        { id: "ga10", time: "17:00", title: "ล่องเรือแม่น้ำโขงยามเย็น", category: "food", location: { name: "Mekong River", rating: 4.7, imageUrl: "/images/mekong-boat.png" }, cost: 1300, travelNote: "เดิน ~10 นาที" },
        { id: "ga11", time: "20:00", title: "Lao Lao Garden", category: "food", location: { name: "Lao Lao Garden" }, cost: 450, travelNote: "เดิน ~10 นาที" },
      ],
    },
    {
      id: "gd3",
      dayNumber: 3,
      date: "2026-11-22",
      activities: [
        { id: "ga12", time: "08:00", title: "เช็คเอาท์โรงแรม", category: "hotel", location: { name: "Old Town, Luang Prabang" }, cost: 0 },
        { id: "ga13", time: "09:00", title: "คาเฟ่ริมโขง มื้อเช้า", category: "food", location: { name: "Luang Prabang" }, cost: 200, travelNote: "เดิน ~5 นาที" },
        { id: "ga14", time: "11:00", title: "เดินทางสู่สนามบิน", category: "transport", location: { name: "Luang Prabang Airport" }, cost: 0, travelNote: "รถส่วนตัว ~20 นาที" },
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
    coverImageUrl: luangPrabang ? "/images/luang-prabang-aerial.png" : "/images/hero-mountain.jpg",
    durationLabel: draft.duration || "ยังไม่ระบุ",
    paceLabel: paceLabel(draft),
    budgetLabel: budgetLabel(draft),
    conditionsLabel: conditionsLabel(draft),
    styles: draft.styles,
    status: "generated",
    days: luangPrabang ? luangPrabangDays() : genericDays(draft.destination),
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
