import { Bus, Camera, Hotel, Sparkles, Tent, UtensilsCrossed, type LucideIcon } from "lucide-react";
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

export const categoryBgVar: Record<ActivityCategory, string> = {
  transport: "var(--color-cat-transport-bg)",
  food: "var(--color-cat-food-bg)",
  hotel: "var(--color-cat-hotel-bg)",
  sightseeing: "var(--color-cat-sightseeing-bg)",
  activity: "var(--color-cat-activity-bg)",
  other: "var(--color-cat-other-bg)",
};

export const categoryIcon: Record<ActivityCategory, LucideIcon> = {
  transport: Bus,
  food: UtensilsCrossed,
  hotel: Hotel,
  sightseeing: Camera,
  activity: Tent,
  other: Sparkles,
};
