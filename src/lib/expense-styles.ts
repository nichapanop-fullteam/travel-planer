import {
  Bus,
  Camera,
  Car,
  Fuel,
  Hotel,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { ActivityCategory, ExpenseCategory } from "@/types";

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  flight: "เที่ยวบิน",
  hotel: "ที่พัก",
  car_rental: "รถเช่า",
  transport: "การขนส่ง",
  food: "อาหาร",
  drinks: "เครื่องดื่ม",
  sightseeing: "ท่องเที่ยว",
  activity: "กิจกรรม",
  shopping: "ช้อปปิ้ง",
  fuel: "น้ำมัน",
  groceries: "ของชำ",
  other: "อื่นๆ",
};

export const expenseCategoryIcon: Record<ExpenseCategory, LucideIcon> = {
  flight: Plane,
  hotel: Hotel,
  car_rental: Car,
  transport: Bus,
  food: UtensilsCrossed,
  drinks: Wine,
  sightseeing: Camera,
  activity: Ticket,
  shopping: ShoppingBag,
  fuel: Fuel,
  groceries: ShoppingCart,
  other: Receipt,
};

// Grid order for the "หรือเลือกจากหมวดหมู่" picker.
export const EXPENSE_CATEGORY_GRID: ExpenseCategory[] = [
  "flight",
  "hotel",
  "car_rental",
  "transport",
  "food",
  "drinks",
  "sightseeing",
  "activity",
  "shopping",
  "fuel",
  "groceries",
  "other",
];

// Default expense category when a ledger entry is created from an existing
// itinerary stop — one-to-one for every ActivityCategory today.
export const ACTIVITY_TO_EXPENSE_CATEGORY: Record<ActivityCategory, ExpenseCategory> = {
  transport: "transport",
  food: "food",
  hotel: "hotel",
  sightseeing: "sightseeing",
  activity: "activity",
  other: "other",
};
