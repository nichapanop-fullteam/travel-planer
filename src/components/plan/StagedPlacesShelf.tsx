"use client";

// "สถานที่ที่ยังไม่ได้ลงวัน" — the trip's staging shelf, sitting above the day
// list in ตารางแพลน. Places land here from the "+" on a stop of someone else's
// trip (see AddPlaceToTripMenu), which asks only which trip; deciding which day
// happens here, where the whole plan is on screen.
//
// Deliberately not a day. It has no date, no travel legs and no position in the
// itinerary, and nothing that walks the plan — the budget, the map, a share, a
// remix — counts what is on it. It is a pile of intentions, and the shelf
// disappears the moment the last one is placed.
import { Trash2 } from "lucide-react";
import type { Activity, Day } from "@/types";
import { categoryColorVar, categoryIcon } from "@/lib/category-styles";
import { formatTHB } from "@/lib/trip-utils";
import { AssignToDayMenu } from "@/components/plan/AssignToDayMenu";

export function StagedPlacesShelf({
  places,
  days,
  pendingPlaceId,
  onAssign,
  onDelete,
}: {
  places: Activity[];
  // The days a place can be sent to, for the "ลงวันที่ N" menu on each row.
  days: Day[];
  // Which row is mid-write, if any.
  pendingPlaceId?: string | null;
  onAssign: (placeId: string, dayId: string) => void;
  onDelete: (placeId: string) => void;
}) {
  // Nothing on the shelf, nothing to explain. An empty box headed "places you
  // have not scheduled" is an accusation, not information.
  if (places.length === 0) return null;

  return (
    <section
      aria-label="สถานที่ที่ยังไม่ได้ลงวัน"
      className="flex flex-col gap-2.5 rounded-2xl border-2 border-dashed p-4"
      style={{ borderColor: "var(--color-accent-violet)", backgroundColor: "#F6F2FF" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-bold" style={{ color: "var(--color-accent-violet)" }}>
          ยังไม่ได้ลงวัน
        </h4>
        <span className="shrink-0 text-xs font-semibold text-[var(--color-muted)]">
          {places.length} ที่
        </span>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        กด + เพื่อเลือกวัน หรือลากการ์ดไปวางในวันที่ต้องการ
      </p>

      <div className="flex flex-col gap-2">
        {places.map((place) => (
          <StagedPlaceRow
            key={place.id}
            place={place}
            days={days}
            pending={pendingPlaceId === place.id}
            onAssign={(dayId) => onAssign(place.id, dayId)}
            onDelete={() => onDelete(place.id)}
          />
        ))}
      </div>
    </section>
  );
}

// One shelved place. Shaped after ItineraryRow on the plan page, minus what a
// stop with no day cannot have: no position badge (it is in no sequence), no
// time (it is on no day), and no edit pencil — the details are worth filling in
// once it has a day, and AddActivityDialog is a day's editor.
function StagedPlaceRow({
  place,
  days,
  pending,
  onAssign,
  onDelete,
}: {
  place: Activity;
  days: Day[];
  pending: boolean;
  onAssign: (dayId: string) => void;
  onDelete: () => void;
}) {
  const Icon = categoryIcon[place.category] ?? categoryIcon.other;
  const color = categoryColorVar[place.category];
  const imageUrl = place.images?.[0] ?? place.location?.imageUrl;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5">
      <div
        className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"
        style={{ backgroundColor: "var(--color-sel-bg)" }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon size={18} style={{ color }} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{place.title}</p>
        {place.notes && (
          <p className="truncate text-xs text-[var(--color-muted)]">{place.notes}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {place.cost > 0 && (
          <span
            className="flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{ borderColor: "var(--color-border)" }}
          >
            {formatTHB(place.cost)}
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label={`ลบ ${place.title} ออกจากรายการที่ยังไม่ได้ลงวัน`}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] disabled:opacity-60"
        >
          <Trash2 size={13} />
        </button>
        <AssignToDayMenu
          days={days}
          pending={pending}
          onAssign={onAssign}
          label={place.title}
        />
      </div>
    </div>
  );
}
