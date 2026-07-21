import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, GitFork, Share2, Bookmark, Star, Wallet } from "lucide-react";
import { getFeedTripById } from "@/lib/feed-data";
import { ConsumerShell } from "@/components/consumer/ConsumerShell";
import { TripDetailTabs } from "@/components/consumer/TripDetailTabs";
import { getTripDurationLabel, getTripTotalCost, formatTHB } from "@/lib/trip-utils";

// Owned by: person A + B (Itinerary/Budget reuse the Plan Builder components; Places is new)
export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = getFeedTripById(id);
  if (!trip) notFound();

  return (
    <ConsumerShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-5 p-6">
        <div className="relative aspect-[21/9] overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trip.coverImageUrl} alt={trip.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          <Link
            href="/dashboard"
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
              <Share2 size={15} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
              <Bookmark size={15} />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {trip.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl font-extrabold">{trip.title}</h1>
            <p className="text-sm text-white/85">{trip.destination}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)] text-lg">
              {trip.creator.avatar}
            </span>
            <div>
              <p className="text-sm font-semibold">{trip.creator.name}</p>
              <p className="text-xs text-[var(--color-muted)]">{trip.creator.handle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--color-muted)]">
            <span className="flex items-center gap-1.5">
              <Bookmark size={14} />
              {trip.saves.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <GitFork size={14} />
              {trip.remixes.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Clock} value={getTripDurationLabel(trip)} label="DURATION" />
          <StatCard icon={Wallet} value={formatTHB(getTripTotalCost(trip))} label="BUDGET" />
          <StatCard icon={Star} value={`${trip.rating}`} label="RATING" />
        </div>

        <p className="text-sm leading-relaxed text-[var(--foreground)]">{trip.description}</p>

        <TripDetailTabs trip={trip} />
      </div>
    </ConsumerShell>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--color-border)]/40 bg-white py-3">
      <Icon size={16} style={{ color: "var(--color-primary)" }} />
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] tracking-wide text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
