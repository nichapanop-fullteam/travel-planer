import { notFound } from "next/navigation";
import { getFeedTripById } from "@/lib/feed-data";
import { isMyGroupTrip } from "@/lib/groups";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { TripDetailView } from "@/components/consumer/TripDetailView";

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
            <TripDetailView trip={trip} isJoined={isJoined} />
          </SectionContainer>
        </PageContainer>
      </div>
    </AppShell>
  );
}
