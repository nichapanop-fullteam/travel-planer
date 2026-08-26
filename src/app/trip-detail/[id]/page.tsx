import { notFound } from "next/navigation";
import { getFeedTripById } from "@/lib/feed-data";
import { isMyGroupTrip } from "@/lib/groups";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { TripDetailHeader } from "@/components/consumer/TripDetailHeader";
import { TripDetailTabs } from "@/components/consumer/TripDetailTabs";
import { GroupChatPanel } from "@/components/consumer/GroupChatPanel";
import { TripInfoPanel } from "@/components/consumer/TripInfoPanel";

// Group trip detail — map-first layout adapted from the group-planning design
// reference (day pager + map on top, group chat and trip info on the side).
// Group Chat and the Members row only show up for trips the user has actually
// joined (isJoined) — a trip browsed from the public feed isn't your group yet.
export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = getFeedTripById(id);
  if (!trip) notFound();

  const isJoined = isMyGroupTrip(trip.id);

  return (
    <AppShell>
      <div className="min-h-screen bg-white">
        <PageContainer>
          <SectionContainer>
            <TripDetailHeader trip={trip} isJoined={isJoined} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
              <TripDetailTabs trip={trip} />
              <div className="flex flex-col gap-5">
                {isJoined && <GroupChatPanel members={trip.members} />}
                <TripInfoPanel trip={trip} isJoined={isJoined} />
              </div>
            </div>
          </SectionContainer>
        </PageContainer>
      </div>
    </AppShell>
  );
}
