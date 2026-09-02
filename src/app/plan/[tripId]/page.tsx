import { notFound } from "next/navigation";
import Link from "next/link";
import { getTripById } from "@/lib/mock-data";
import { formatDateRange } from "@/lib/trip-utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BudgetPanel } from "@/components/plan/BudgetPanel";
import { MapPanel } from "@/components/plan/MapPanel";
import { DayCard } from "@/components/plan/DayCard";

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
        <Link href="/" className="text-sm text-[var(--color-muted)] hover:underline">
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
            <DayCard key={day.id} day={day} showCost />
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
