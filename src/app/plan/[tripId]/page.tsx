import { notFound } from "next/navigation";
import Link from "next/link";
import { getTripById } from "@/lib/mock-data";
import { formatDateRange, formatTHB, getDayTotalCost } from "@/lib/trip-utils";
import { categoryColorVar, categoryLabel } from "@/lib/category-styles";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BudgetPanel } from "@/components/plan/BudgetPanel";
import { MapPanel } from "@/components/plan/MapPanel";

// Owned by: person A (Plan Builder)
export default async function PlanPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const trip = getTripById(tripId);
  if (!trip) notFound();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-[var(--color-muted)] hover:underline">
          ← ทริปทั้งหมด
        </Link>
        <Button variant="secondary">แชร์ให้ลูกค้า</Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <StatusBadge status={trip.status} />
          </div>
          <h1 className="text-2xl font-semibold">{trip.title}</h1>
          <p className="text-[var(--color-muted)]">
            {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)} · ลูกค้า{" "}
            {trip.customer.name} ({trip.customer.groupSize} คน)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {trip.days.map((day) => (
            <Card key={day.id}>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-semibold">
                  Day {day.dayNumber} · {day.date}
                </h2>
                <span className="text-sm text-[var(--color-muted)]">
                  {formatTHB(getDayTotalCost(day))}
                </span>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                {day.activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <span className="w-12 shrink-0 text-sm text-[var(--color-muted)]">
                      {activity.time}
                    </span>
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColorVar[activity.category] }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      {activity.location && (
                        <p className="text-xs text-[var(--color-muted)]">
                          {activity.location.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-[var(--color-muted)]">
                      <p>{categoryLabel[activity.category]}</p>
                      {activity.cost > 0 && <p>{formatTHB(activity.cost)}</p>}
                    </div>
                  </div>
                ))}
                <button className="self-start text-xs text-[var(--color-primary)] hover:underline">
                  + เพิ่มกิจกรรม
                </button>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <BudgetPanel trip={trip} />
          <MapPanel trip={trip} />
        </div>
      </div>
    </div>
  );
}
