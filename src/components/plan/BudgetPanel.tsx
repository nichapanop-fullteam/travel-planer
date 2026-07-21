import type { Trip } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { getTripTotalCost, formatTHB } from "@/lib/trip-utils";

// Owned by: person B (Map + Budget)
// TODO: break down cost by category, show over/under budgetLimit warning
export function BudgetPanel({ trip }: { trip: Trip }) {
  const total = getTripTotalCost(trip);
  const overBudget = trip.budgetLimit != null && total > trip.budgetLimit;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-[var(--color-muted)]">งบประมาณรวม</h2>
      </CardHeader>
      <CardBody className="space-y-2">
        <p className="text-2xl font-semibold">{formatTHB(total)}</p>
        {trip.budgetLimit != null && (
          <p className={`text-xs ${overBudget ? "text-red-600" : "text-[var(--color-muted)]"}`}>
            งบที่ตั้งไว้ {formatTHB(trip.budgetLimit)}
            {overBudget ? " — เกินงบ" : ""}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
