import type { ExternalPlaceCategory, ExternalSearchPlace } from "./external-places-api";
import type { ActivityCategory, PlaceCategory } from "@/types";

// This app's ActivityCategory/PlaceCategory enums predate the external API's
// 7-value taxonomy (see ExternalPlaceCategory) — these are the only two
// mapping tables needed to fold a fetched place into either shape.
export const EXTERNAL_TO_ACTIVITY_CATEGORY: Record<ExternalPlaceCategory, ActivityCategory> = {
  attraction: "sightseeing",
  activity: "activity",
  shopping: "other",
  restaurant: "food",
  cafe: "food",
  hotel: "hotel",
  transport: "transport",
};

export const EXTERNAL_TO_PLACE_CATEGORY: Record<ExternalPlaceCategory, PlaceCategory> = {
  attraction: "attraction",
  activity: "attraction",
  shopping: "attraction",
  restaurant: "restaurant",
  cafe: "restaurant",
  hotel: "hotel",
  transport: "attraction",
};

// None of these are available from the external Places API today — no
// opening-hours/price-level/review-count/recommended-duration field exists
// anywhere in lib/external-places-api.ts's response shapes. Deterministically
// derived from the place id (not Math.random()) so a card's numbers stay
// stable across re-renders and reloads instead of flickering.
export interface EnrichedPlace extends ExternalSearchPlace {
  distanceKm: number;
  reviewCount: number;
  openingHoursLabel: string;
  priceLabel: string;
  recommendedDurationLabel: string;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function pick<T>(options: T[], seed: number): T {
  return options[seed % options.length];
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

const OPENING_HOURS: Record<ExternalPlaceCategory, string[]> = {
  hotel: ["เปิดตลอด 24 ชม."],
  restaurant: ["08:00–21:00", "11:00–22:00", "07:00–20:00"],
  cafe: ["07:00–18:00", "08:00–19:00"],
  attraction: ["08:00–17:30", "06:00–18:00"],
  activity: ["06:00–18:00", "08:00–17:00"],
  shopping: ["10:00–20:00", "09:00–21:00"],
  transport: ["เปิดตลอด 24 ชม."],
};

const PRICE_LABEL: Record<ExternalPlaceCategory, string[]> = {
  hotel: ["฿900–1,500 / คืน", "฿1,500–2,500 / คืน", "฿2,500–4,500 / คืน"],
  restaurant: ["฿100–200 / คน", "฿150–300 / คน", "฿300–600 / คน"],
  cafe: ["฿60–100 / แก้ว", "฿90–150 / แก้ว"],
  attraction: ["ฟรี", "฿20–50 / คน", "฿50–100 / คน"],
  activity: ["ฟรี", "฿50–150 / คน"],
  shopping: ["แล้วแต่ร้าน"],
  transport: ["แล้วแต่ระยะทาง"],
};

const DURATION_LABEL: Record<ExternalPlaceCategory, string[]> = {
  hotel: ["~15 นาที"],
  restaurant: ["45–60 นาที"],
  cafe: ["30–45 นาที"],
  attraction: ["1–2 ชม."],
  activity: ["2–3 ชม."],
  shopping: ["1–2 ชม."],
  transport: ["15–30 นาที"],
};

export const CATEGORY_LABEL_TH: Record<ExternalPlaceCategory, string> = {
  attraction: "สถานที่ท่องเที่ยว",
  restaurant: "ร้านอาหาร",
  cafe: "คาเฟ่",
  hotel: "โรงแรม",
  shopping: "ช้อปปิ้ง",
  activity: "ธรรมชาติ / กิจกรรม",
  transport: "การเดินทาง",
};

export function enrichPlace(place: ExternalSearchPlace, center: { lat: number; lng: number }): EnrichedPlace {
  const seed = hashString(place.id);
  return {
    ...place,
    distanceKm: Math.round(haversineKm(center, place) * 10) / 10,
    reviewCount: 20 + (seed % 780),
    openingHoursLabel: pick(OPENING_HOURS[place.category], seed),
    priceLabel: pick(PRICE_LABEL[place.category], seed >> 3),
    recommendedDurationLabel: pick(DURATION_LABEL[place.category], seed >> 5),
  };
}

// English on purpose — matches the "Morning recommended" style copy called
// for in the Step 3B spec.
export function suggestedTimeLabel(category: ExternalPlaceCategory): string {
  switch (category) {
    case "attraction":
    case "activity":
      return "Morning recommended";
    case "cafe":
      return "Afternoon recommended";
    case "restaurant":
      return "Lunch or dinner recommended";
    case "shopping":
      return "Afternoon or evening recommended";
    case "hotel":
      return "Check in from afternoon";
    case "transport":
      return "Anytime works";
  }
}
