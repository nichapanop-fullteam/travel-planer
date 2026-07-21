import type { ActivityCategory } from "@/types";

export const categoryLabel: Record<ActivityCategory, string> = {
  transport: "เดินทาง",
  food: "อาหาร",
  hotel: "ที่พัก",
  sightseeing: "ท่องเที่ยว",
  activity: "กิจกรรม",
  other: "อื่นๆ",
};

export const categoryColorVar: Record<ActivityCategory, string> = {
  transport: "var(--color-cat-transport)",
  food: "var(--color-cat-food)",
  hotel: "var(--color-cat-hotel)",
  sightseeing: "var(--color-cat-sightseeing)",
  activity: "var(--color-cat-activity)",
  other: "var(--color-cat-other)",
};
