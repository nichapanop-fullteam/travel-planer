import type { Day, Trip } from "@/types";

export function getDayTotalCost(day: Day): number {
  return day.activities.reduce((sum, a) => sum + a.cost, 0);
}

export function getTripTotalCost(trip: Trip): number {
  return trip.days.reduce((sum, day) => sum + getDayTotalCost(day), 0);
}

export function formatTHB(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const fmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
