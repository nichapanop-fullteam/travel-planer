import type { ActivityCategory, Day } from "@/types";
import { Card, CardBody } from "@/components/ui/Card";
import { getTripTotalCost, getTripCostByCategory, formatTHB } from "@/lib/trip-utils";
import { categoryBgVar, categoryColorVar, categoryIcon, categoryLabel } from "@/lib/category-styles";

const CATEGORY_ORDER: ActivityCategory[] = ["hotel", "food", "transport", "sightseeing", "activity", "other"];

interface BudgetPanelTrip {
  days: Day[];
  budgetLimit?: number;
}

// Hero card + category breakdown adapted from the Pluno App UI design (TripDetailView.BudgetTab)
export function BudgetPanel({ trip }: { trip: BudgetPanelTrip }) {
  const total = getTripTotalCost(trip);
  const overBudget = trip.budgetLimit != null && total > trip.budgetLimit;
  const byCategory = getTripCostByCategory(trip);
  const categories = CATEGORY_ORDER.filter((cat) => (byCategory[cat] ?? 0) > 0);

  return (
    <Card className="overflow-hidden">
      <div
        className="p-5 text-white"
        style={{
          background: "linear-gradient(135deg, var(--color-deep-green) 0%, var(--color-primary) 60%, var(--color-secondary-green) 100%)",
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">งบประมาณรวม</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">{formatTHB(total)}</p>
        {trip.budgetLimit != null && (
          <p className={`mt-1 text-xs ${overBudget ? "text-red-200" : "text-white/70"}`}>
            งบที่ตั้งไว้ {formatTHB(trip.budgetLimit)}
            {overBudget ? " — เกินงบ" : ""}
          </p>
        )}
        {categories.length > 0 && (
          <div className="mt-4 flex h-1.5 overflow-hidden rounded-full">
            {categories.map((cat) => (
              <div
                key={cat}
                style={{
                  width: `${((byCategory[cat] ?? 0) / total) * 100}%`,
                  backgroundColor: categoryColorVar[cat],
                }}
              />
            ))}
          </div>
        )}
      </div>

      <CardBody className="flex flex-col gap-3">
        {categories.map((cat) => {
          const Icon = categoryIcon[cat];
          const amount = byCategory[cat] ?? 0;
          const pct = Math.round((amount / total) * 100);
          return (
            <div key={cat} className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: categoryBgVar[cat] }}
              >
                <Icon size={15} style={{ color: categoryColorVar[cat] }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{categoryLabel[cat]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-muted)]">{pct}%</span>
                    <span className="text-sm font-bold">{formatTHB(amount)}</span>
                  </div>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[var(--color-border)]/25">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: categoryColorVar[cat] }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
