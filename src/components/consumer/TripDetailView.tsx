"use client";

import { useState } from "react";
import type { FeedTrip } from "@/types";
import { TripDetailHeader } from "@/components/consumer/TripDetailHeader";
import { TripDetailTabs } from "@/components/consumer/TripDetailTabs";
import { GroupChatPanel } from "@/components/consumer/GroupChatPanel";
import { TripInfoPanel } from "@/components/consumer/TripInfoPanel";
import { EditTripInfoDialog } from "@/components/consumer/EditTripInfoDialog";

// Holds the editable trip state client-side so "Edit Trip Info" can update it
// in place — FeedTrip has no backend of its own (feed-data.ts is static mock
// data), so edits live only in this page's state, same as every other
// consumer-feed mock interaction (bookmark, join, invite).
export function TripDetailView({ trip: initialTrip, isJoined }: { trip: FeedTrip; isJoined: boolean }) {
  const [trip, setTrip] = useState(initialTrip);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <TripDetailHeader trip={trip} isJoined={isJoined} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <TripDetailTabs trip={trip} />
        <div className="flex flex-col gap-5">
          {isJoined && <GroupChatPanel members={trip.members} />}
          <TripInfoPanel trip={trip} isJoined={isJoined} onEditTrip={() => setEditOpen(true)} />
        </div>
      </div>

      {editOpen && (
        <EditTripInfoDialog
          trip={trip}
          onClose={() => setEditOpen(false)}
          onSave={(patch) => setTrip((t) => ({ ...t, ...patch }))}
        />
      )}
    </>
  );
}
