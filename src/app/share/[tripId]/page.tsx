import { notFound } from "next/navigation";
import { getTripById } from "@/lib/mock-data";
import { formatDateRange } from "@/lib/trip-utils";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DayCard } from "@/components/plan/DayCard";

// Owned by: person C (Dashboard + Share)
// Public read-only view — this is what the organizer sends the customer instead of a PDF.
export default async function SharePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const trip = getTripById(tripId);
  if (!trip) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{trip.title}</h1>
        <p className="text-[var(--color-muted)]">
          {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {trip.days.map((day) => (
          <DayCard key={day.id} day={day} />
        ))}
      </div>

      <Card>
        <CardBody className="flex items-center justify-between">
          <p className="text-sm font-medium">ต้องการแก้ไขแผนนี้?</p>
          <Button variant="secondary">ขอแก้ไขแผน</Button>
        </CardBody>
      </Card>
    </div>
  );
}
