import { MapPin } from "lucide-react";
import type { Activity, Day } from "@/types";
import { categoryBgVar, categoryColorVar, categoryIcon, categoryLabel } from "@/lib/category-styles";
import { formatTHB, getGoogleMapsUrl } from "@/lib/trip-utils";

// Timeline layout adapted from the PunGuide App UI design (TripDetailView.ActivityRow)
export function ActivityTimeline({ day, showCost = false }: { day: Day; showCost?: boolean }) {
  return (
    <div className="flex flex-col">
      {day.activities.map((activity, i) => (
        <ActivityRow
          key={activity.id}
          activity={activity}
          isLast={i === day.activities.length - 1}
          showCost={showCost}
        />
      ))}
    </div>
  );
}

function ActivityRow({
  activity,
  isLast,
  showCost,
}: {
  activity: Activity;
  isLast: boolean;
  showCost: boolean;
}) {
  const Icon = categoryIcon[activity.category];
  const color = categoryColorVar[activity.category];
  const bg = categoryBgVar[activity.category];

  return (
    <div className="flex gap-3">
      <div className="flex w-12 shrink-0 flex-col items-center">
        <span className="mb-1.5 whitespace-nowrap text-[10px] font-semibold text-[var(--color-muted)]">
          {activity.time}
        </span>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${bg}` }}
        />
        {!isLast && (
          <span className="mt-1 min-h-[28px] flex-1" style={{ width: 1.5, backgroundColor: "var(--color-border)" }} />
        )}
      </div>

      <div className="mb-3 flex-1 rounded-2xl border border-[var(--color-border)]/40 bg-[var(--color-surface)] p-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: bg }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{activity.title}</p>
            {activity.location && (
              <a
                href={getGoogleMapsUrl(activity.location)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 flex items-center gap-1 hover:underline"
              >
                <MapPin size={10} className="text-[var(--color-muted)]" />
                <span className="truncate text-xs text-[var(--color-muted)]">{activity.location.name}</span>
              </a>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ color, backgroundColor: bg }}
            >
              {categoryLabel[activity.category]}
            </span>
            {showCost && activity.cost > 0 && (
              <span className="text-[11px] text-[var(--color-muted)]">{formatTHB(activity.cost)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
