// Turning a dnd-kit drop into what should happen to the plan.
//
// Pulled out of ItineraryAccordion because this is the part with actual rules
// in it — which bucket an id belongs to, whether a drop is a reorder or a
// move, and what position it landed at — while the component around it is
// wiring. It is also the part that is worth testing, and a component that owns
// a DndContext is not something a test can drop a card onto.
import type { Activity, GeneratedTrip } from "@/types";
import { SHELF_ID } from "@/components/plan/StagedPlacesShelf";

// Either a reorder inside one bucket, or a move between two. `null` means the
// drop changed nothing and the caller should do nothing — dropped on itself,
// dropped outside every bucket, or dropped somewhere this build refuses to
// act on.
export type DragOutcome =
  | { kind: "reorder"; dayId: string; activities: Activity[] }
  | { kind: "move"; placeId: string; toDayId: string | null; toIndex?: number };

// Which bucket an id belongs to — SHELF_ID or a day's id. A dnd-kit `over.id`
// may be either a card (dropped onto a specific position) or a bucket itself
// (dropped onto an empty day, or the shelf's own surface), so this answers
// both.
export function containerOf(trip: GeneratedTrip, id: string): string | null {
  if (id === SHELF_ID) return SHELF_ID;
  if (trip.days.some((d) => d.id === id)) return id;
  if ((trip.stagedPlaces ?? []).some((p) => p.id === id)) return SHELF_ID;
  return trip.days.find((d) => d.activities.some((a) => a.id === id))?.id ?? null;
}

export function itemsIn(trip: GeneratedTrip, container: string): Activity[] {
  if (container === SHELF_ID) return trip.stagedPlaces ?? [];
  return trip.days.find((d) => d.id === container)?.activities ?? [];
}

function arrayMove(items: Activity[], from: number, to: number): Activity[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function resolveDragEnd(
  trip: GeneratedTrip,
  activeId: string,
  overId: string | null
): DragOutcome | null {
  if (!overId) return null;

  const from = containerOf(trip, activeId);
  const to = containerOf(trip, overId);
  if (!from || !to) return null;

  if (from === to) {
    // The shelf is deliberately left out of reordering: its order is not
    // persisted anywhere (there is no reorder endpoint for it yet), and an
    // order that silently resets on the next reload is worse than one that
    // never moved.
    if (from === SHELF_ID || activeId === overId) return null;
    const items = itemsIn(trip, from);
    const oldIndex = items.findIndex((a) => a.id === activeId);
    const newIndex = items.findIndex((a) => a.id === overId);
    if (oldIndex === -1 || newIndex === -1) return null;
    return { kind: "reorder", dayId: from, activities: arrayMove(items, oldIndex, newIndex) };
  }

  // Dropped on a card means that card's position; dropped on the bucket itself
  // means the end of it.
  const overIndex = itemsIn(trip, to).findIndex((a) => a.id === overId);
  return {
    kind: "move",
    placeId: activeId,
    toDayId: to === SHELF_ID ? null : to,
    toIndex: overIndex === -1 ? undefined : overIndex,
  };
}
