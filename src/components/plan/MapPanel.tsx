import { MapPin, Navigation } from "lucide-react";
import type { Day } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FakeMapBackground } from "@/components/plan/FakeMapBackground";

interface MapPanelTrip {
  days: Day[];
  destination: string;
}

// Owned by: person B (Map + Budget)
// Decorative placeholder — see FakeMapBackground for the caveat.
// TODO: replace with an actual map (e.g. Leaflet/Google Maps) pinning each activity's location
export function MapPanel({ trip }: { trip: MapPanelTrip }) {
  const pinCount = new Set(
    trip.days
      .flatMap((day) => day.activities)
      .map((a) => a.location?.name)
      .filter((name): name is string => Boolean(name))
  ).size;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-[var(--color-muted)]">เส้นทางบนแผนที่</h2>
      </CardHeader>
      <CardBody>
        <div className="relative h-40 overflow-hidden rounded-2xl">
          <FakeMapBackground />
          <svg className="absolute inset-0 h-full w-full">
            <path
              d="M40 60 Q 130 40 220 55 T 360 50"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="7 6"
            />
          </svg>
          {[
            { x: "22%", y: "38%", primary: true },
            { x: "55%", y: "58%", primary: false },
            { x: "78%", y: "30%", primary: false },
          ].map((pin, i) => (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: pin.x, top: pin.y }}
            >
              {pin.primary ? (
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 0 0 4px rgba(42,158,100,0.25)" }}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                </div>
              ) : (
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 0 0 3px rgba(42,158,100,0.25)" }}
                />
              )}
            </div>
          ))}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur">
            <MapPin size={12} style={{ color: "var(--color-primary)" }} />
            <span className="text-xs font-medium text-[#1a1a1a]">{trip.destination}</span>
          </div>
          <button
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white shadow-lg"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Navigation size={12} />
            <span className="text-xs font-medium">Open Map</span>
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted)]">{pinCount} จุดบนเส้นทาง — รอเชื่อมต่อ map provider จริง</p>
      </CardBody>
    </Card>
  );
}
