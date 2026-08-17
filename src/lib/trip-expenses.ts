import type { GeneratedTrip, TripExpense } from "@/types";
import { ACTIVITY_TO_EXPENSE_CATEGORY } from "./expense-styles";

// Derives the initial ledger from itinerary/accommodation costs the first
// time the budget tab is opened for a trip. Once trip.expenses exists it's
// the single source of truth — this never re-runs, so edits/deletions stick.
export function seedExpensesFromTrip(trip: GeneratedTrip): TripExpense[] {
  const expenses: TripExpense[] = [];

  for (const day of trip.days) {
    for (const activity of day.activities) {
      if (activity.cost <= 0) continue;
      expenses.push({
        id: `exp-${activity.id}`,
        title: activity.title,
        amount: activity.cost,
        category: ACTIVITY_TO_EXPENSE_CATEGORY[activity.category],
        date: day.date,
        paidBy: "คุณ",
        splitLabel: "ไม่แบ่ง",
        linkedActivityId: activity.id,
      });
    }
  }

  if (trip.accommodation?.pricePerNight) {
    const nights = Math.max(trip.days.length - 1, 1);
    expenses.push({
      id: "exp-accommodation",
      title: trip.accommodation.name,
      amount: trip.accommodation.pricePerNight * nights,
      category: "hotel",
      date: trip.days[0]?.date,
      paidBy: "คุณ",
      splitLabel: "ไม่แบ่ง",
    });
  }

  return expenses;
}

export function getExpensesTotal(expenses: TripExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function formatExpenseTotal(amount: number): string {
  return `THB ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// "1 ส.ค." — day + abbreviated Thai month, used on expense rows/date pickers.
export function formatExpenseDate(isoDate: string): string {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(isoDate));
}
