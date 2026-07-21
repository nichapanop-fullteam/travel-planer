import { notFound } from "next/navigation";
import { getTripById } from "@/lib/mock-data";
import { formatDateRange, formatTHB, getDayTotalCost } from "@/lib/trip-utils";
import { categoryColorVar, categoryLabel } from "@/lib/category-styles";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
                      <p className="text-xs text-[var(--color-muted)]">{activity.location.name}</p>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{categoryLabel[activity.category]}</p>
                </div>
              ))}
            </CardBody>
          </Card>
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
