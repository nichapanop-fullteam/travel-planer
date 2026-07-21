import { MapPin, Navigation } from "lucide-react";
import type { Day } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

interface MapPanelTrip {
  days: Day[];
  destination: string;
}

// Owned by: person B (Map + Budget)
// Decorative placeholder adapted from the Pluno App UI design (TripDetailView.MapPreview)
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
        <div
          className="relative h-40 overflow-hidden rounded-2xl"
          style={{ background: "linear-gradient(140deg, #c8dfca 0%, #b4cec4 45%, #c2d5ce 100%)" }}
        >
          <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.25 }}>
            <defs>
              <pattern id="pluno-map-grid" width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M22 0L0 0 0 22" fill="none" stroke="#2a7d50" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pluno-map-grid)" />
          </svg>
          <svg className="absolute inset-0 h-full w-full">
            <path d="M0 60 Q 90 45 200 55 T 400 50" stroke="white" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.7" />
            <path d="M0 85 Q 70 95 160 78 T 400 92" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.55" />
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
                  style={{ backgroundColor: "var(--color-accent-orange)", boxShadow: "0 0 0 3px rgba(232,154,95,0.25)" }}
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
