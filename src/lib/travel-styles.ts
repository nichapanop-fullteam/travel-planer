import {
  Bike,
  CarTaxiFront,
  Car,
  Footprints,
  MoreHorizontal,
  Plane,
  Ship,
  TrainFront,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { TravelType } from "@/types";

export const TRAVEL_TYPE_OPTIONS: TravelType[] = [
  "walk",
  "bicycle",
  "tuk_tuk",
  "private_transfer",
  "rental_car",
  "boat",
  "train",
  "airplane",
  "other",
];

export const travelTypeLabel: Record<TravelType, string> = {
  walk: "เดิน",
  bicycle: "จักรยาน",
  tuk_tuk: "ตุ๊กตุ๊ก",
  private_transfer: "รถรับส่งส่วนตัว",
  rental_car: "รถเช่า/รถส่วนตัว",
  boat: "เรือ",
  train: "รถไฟ",
  airplane: "เครื่องบิน",
  other: "อื่นๆ",
};

export const travelTypeIcon: Record<TravelType, LucideIcon> = {
  walk: Footprints,
  bicycle: Bike,
  tuk_tuk: CarTaxiFront,
  private_transfer: Users,
  rental_car: Car,
  boat: Ship,
  train: TrainFront,
  airplane: Plane,
  other: MoreHorizontal,
};
