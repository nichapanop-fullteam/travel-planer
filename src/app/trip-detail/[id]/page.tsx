import { notFound } from "next/navigation";
import { getFeedTripById } from "@/lib/feed-data";
import { ConsumerShell } from "@/components/consumer/ConsumerShell";
import { TripDetailHeader } from "@/components/consumer/TripDetailHeader";
import { TripDetailTabs } from "@/components/consumer/TripDetailTabs";
import { GroupChatPanel } from "@/components/consumer/GroupChatPanel";
import { TripInfoPanel } from "@/components/consumer/TripInfoPanel";

// Group trip detail — map-first layout adapted from the group-planning design
// reference (day pager + map on top, group chat and trip info on the side).
export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = getFeedTripById(id);
  if (!trip) notFound();

  return (
    <ConsumerShell activeGroupId={trip.id}>
      <div className="min-h-screen bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 p-6">
          <TripDetailHeader trip={trip} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
            <TripDetailTabs trip={trip} />
            <div className="flex flex-col gap-5">
              <GroupChatPanel members={trip.members} />
              <TripInfoPanel trip={trip} />
            </div>
          </div>
        </div>
      </div>
    </ConsumerShell>
  );
}
