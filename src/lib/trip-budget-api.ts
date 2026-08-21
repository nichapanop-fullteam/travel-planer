import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";
import type { ExpenseCategory } from "@/types";

// Backend's expense category enum is narrower than the frontend's
// ExpenseCategory (see types/index.ts) — the picker offers finer-grained
// categories (flight, car_rental, drinks, groceries) than the backend
// tracks, so those collapse onto their closest backend bucket when writing.
export type BackendExpenseCategory =
  | "transport"
  | "food"
  | "hotel"
  | "sightseeing"
  | "activity"
  | "fuel"
  | "shopping"
  | "other";

const TO_BACKEND_CATEGORY: Record<ExpenseCategory, BackendExpenseCategory> = {
  flight: "transport",
  car_rental: "transport",
  transport: "transport",
  food: "food",
  drinks: "food",
  hotel: "hotel",
  sightseeing: "sightseeing",
  activity: "activity",
  shopping: "shopping",
  groceries: "shopping",
  fuel: "fuel",
  other: "other",
};

export function toBackendExpenseCategory(category: ExpenseCategory): BackendExpenseCategory {
  return TO_BACKEND_CATEGORY[category];
}

export interface TripBudgetCategoryBreakdown {
  category: BackendExpenseCategory;
  amount: number;
  percentage: number;
  itemCount: number;
}

export interface TripBudgetDayBreakdown {
  dayId: string;
  dayNumber: number;
  date: string;
  amount: number;
}

export interface TripBudgetLineItem {
  id: string;
  title: string;
  category: BackendExpenseCategory;
  amount: number;
  date?: string;
  dayNumber?: number;
  paidBy?: string;
  splitLabel?: string;
  source: "activity" | "travel" | "accommodation" | "expense";
}

// GET /trips/:id/budget
export interface TripBudget {
  budgetLimit?: number; // absent = "ยังไม่ได้ตั้งงบ" — never treat missing as 0
  totalBudget: number;
  byCategory: TripBudgetCategoryBreakdown[];
  byDay: TripBudgetDayBreakdown[];
  items: TripBudgetLineItem[];
}

// Public like GET /trips/:id — goes through the /api proxy for the same
// CORS-workaround reason (see getTrip in trips-api.ts).
export async function getTripBudget(tripId: string): Promise<TripBudget> {
  const response = await fetch(`/api/trips/${tripId}/budget`);
  if (!response.ok) {
    throw new Error(`โหลดข้อมูลงบประมาณไม่สำเร็จ (${response.status} ${response.statusText})`);
  }
  return response.json();
}

export interface CreateExpenseRequest {
  title: string;
  amount: number;
  category?: BackendExpenseCategory;
  currency?: string;
  date?: string;
  paidBy?: string;
  splitLabel?: string;
}

async function throwOnError(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(`${action}ไม่สำเร็จ (${response.status} ${response.statusText}) ${body.slice(0, 300)}`);
}

// POST /trips/:tripId/expenses — a standalone cost with no itinerary stop of
// its own (e.g. fuel). A cost tied to an existing activity must go through
// updateTripItemOnServer (PATCH /items/:itemId) instead — posting it here
// too would double-count it in GET /trips/:id/budget.
export async function createExpense(tripId: string, request: CreateExpenseRequest): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/trips/${tripId}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  await throwOnError(response, "เพิ่มค่าใช้จ่าย");
}

export interface UpdateExpenseRequest {
  title?: string;
  amount?: number;
  category?: BackendExpenseCategory;
  currency?: string;
  date?: string;
  paidBy?: string;
  splitLabel?: string;
}

// PATCH /expenses/:expenseId — only for line items with source: "expense".
export async function updateExpense(expenseId: string, patch: UpdateExpenseRequest): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/expenses/${expenseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  await throwOnError(response, "แก้ไขค่าใช้จ่าย");
}

// DELETE /expenses/:expenseId — only for line items with source: "expense".
export async function deleteExpense(expenseId: string): Promise<void> {
  const response = await authenticatedFetch(`${BACKEND_URL}/expenses/${expenseId}`, {
    method: "DELETE",
  });
  await throwOnError(response, "ลบค่าใช้จ่าย");
}
