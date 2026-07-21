import type { Trip } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

// Owned by: person B (Map + Budget)
// TODO: replace placeholder with an actual map (e.g. Leaflet/Google Maps) pinning each activity's location
export function MapPanel({ trip }: { trip: Trip }) {
  const pins = trip.days
    .flatMap((day) => day.activities)
    .filter((a) => a.location?.lat != null && a.location?.lng != null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-[var(--color-muted)]">เส้นทางบนแผนที่</h2>
      </CardHeader>
      <CardBody>
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-muted)]">
          แผนที่ ({pins.length} จุด) — รอเชื่อมต่อ map provider
        </div>
      </CardBody>
    </Card>
  );
}
