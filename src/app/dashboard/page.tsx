import Link from "next/link";
import { mockTrips } from "@/lib/mock-data";
import { formatDateRange, formatTHB, getTripTotalCost } from "@/lib/trip-utils";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

// Owned by: person C (Dashboard + Share)
export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ทริปทั้งหมด</h1>
        <span className="text-sm text-[var(--color-muted)]">{mockTrips.length} ทริป</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockTrips.map((trip) => (
          <Link key={trip.id} href={`/plan/${trip.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{trip.title}</h2>
                  <StatusBadge status={trip.status} />
                </div>
                <p className="text-sm text-[var(--color-muted)]">
                  {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
                </p>
                <p className="text-sm text-[var(--color-muted)]">
                  ลูกค้า {trip.customer.name} · {trip.customer.groupSize} คน
                </p>
                <p className="mt-2 text-sm font-medium">{formatTHB(getTripTotalCost(trip))}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
