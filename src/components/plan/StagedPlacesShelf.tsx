"use client";

// "สถานที่ที่ยังไม่ได้ลงวัน" — the trip's staging shelf, sitting above the day
// list in ตารางแพลน. Places land here from the "+" on a stop of someone else's
// trip (see AddPlaceToTripMenu), which asks only which trip; deciding which day
// happens here, where the whole plan is on screen.
//
// Deliberately not a day. It has no date, no travel legs and no position in the
// itinerary, and nothing that walks the plan — the budget, the map, a share, a
// remix — counts what is on it. It is a pile of intentions, and the shelf
// disappears the moment the last one is placed — except while something is
// being dragged, when it has to stay as a target (see dragInProgress).
//
// It is also a dnd-kit bucket: its rows can be dragged into any day, and a
// stop can be dragged out of a day and back onto it, which is the undo for
// every assign. Its own internal order is NOT sortable — there is no endpoint
// to persist it, and an order that resets on the next reload is worse than one
// that never moved.
import { GripVertical, Trash2 } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Activity, Day } from "@/types";
import { categoryColorVar, categoryIcon } from "@/lib/category-styles";
import { formatTHB } from "@/lib/trip-utils";
import { AssignToDayMenu } from "@/components/plan/AssignToDayMenu";

// This bucket's droppable id. Not a uuid, so it can never collide with a day's
// — and readable in a dnd-kit event when something goes wrong.
export const SHELF_ID = "staging-shelf";

export function StagedPlacesShelf({
  places,
  days,
  pendingPlaceId,
  dragInProgress = false,
  onAssign,
  onDelete,
}: {
  places: Activity[];
  // The days a place can be sent to, for the "ลงวันที่ N" menu on each row.
  days: Day[];
  // Which row is mid-write, if any.
  pendingPlaceId?: string | null;
  // Something is being dragged somewhere on the plan right now. An empty shelf
  // normally renders nothing, but while a card is in flight it has to exist —
  // otherwise dragging a stop OFF a day, the undo for every assign, would have
  // nowhere to land the first time it is needed.
  dragInProgress?: boolean;
  onAssign: (placeId: string, dayId: string) => void;
  onDelete: (placeId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: SHELF_ID });

  // Nothing on the shelf and nothing in flight, so nothing to explain. An empty
  // box headed "places you have not scheduled" is an accusation, not
  // information.
  if (places.length === 0 && !dragInProgress) return null;

  if (places.length === 0) {
    return (
      <section
        ref={setNodeRef}
        aria-label="สถานที่ที่ยังไม่ได้ลงวัน"
        className="flex min-h-16 items-center justify-center rounded-2xl border-2 border-dashed text-xs font-semibold"
        style={{
          borderColor: isOver ? "var(--color-accent-violet)" : "#D9CDEF",
          backgroundColor: isOver ? "#F6F2FF" : "transparent",
          color: "var(--color-muted)",
        }}
      >
        {isOver ? "วางที่นี่เพื่อเก็บไว้ก่อน" : "ลากมาวางเพื่อเก็บไว้ก่อน"}
      </section>
    );
  }

  return (
    <section
      ref={setNodeRef}
      aria-label="สถานที่ที่ยังไม่ได้ลงวัน"
      className="flex flex-col gap-2.5 rounded-2xl border-2 border-dashed p-4"
      style={{
        borderColor: "var(--color-accent-violet)",
        backgroundColor: isOver ? "#EDE4FF" : "#F6F2FF",
      }}
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

      <SortableContext items={places.map((p) => p.id)} strategy={verticalListSortingStrategy}>
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
      </SortableContext>
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 rounded-2xl bg-white p-2.5"
    >
      {/* The handle owns the drag, not the whole row — same as a stop on a day
          — so the delete and "ลงวันที่" buttons keep taking taps. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`ลาก ${place.title} ไปวางในวันที่ต้องการ`}
        className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-[var(--color-muted)] active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
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
