import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Link2 } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { getSharedTrip } from "@/lib/share-api";
import { SharedTripPlan } from "@/app/shared-trips/[shareToken]/SharedTripPlan";

// The public read-only view behind a share link, laid out to match
// generated-plan/[id]: full-bleed hero with the title centred over the cover,
// the dark-green band, then the rounded-top white sheet the plan sits on.
//
// Server-rendered on purpose: the backend is called directly (no CORS off the
// browser, so no proxy route is needed), the plan is in the HTML for link
// previews, and GET /shared-trips/:token is hit exactly once per page load —
// the doc's 30 req/min/IP limit is generous but a client-side effect without a
// guard could still walk into it.
//
// No auth of any kind: the shareToken in the URL is the whole credential, and
// nothing here assumes a signed-in viewer.

type PageProps = { params: Promise<{ shareToken: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareToken } = await params;
  const trip = await getSharedTrip(shareToken);
  // Deliberately not derived from the trip when the link is dead — the title
  // itself shouldn't confirm a trip exists to someone holding a revoked link.
  if (!trip) return { title: "ลิงก์นี้ใช้ไม่ได้แล้ว", robots: { index: false, follow: false } };

  return {
    title: `${trip.title} · PunGuide`,
    description: `แผนเที่ยว ${trip.destination}${trip.owner ? ` โดย ${trip.owner.name}` : ""}`,
    // A share link is for the people the owner sent it to, not for search
    // results.
    robots: { index: false, follow: false },
    openGraph: {
      title: trip.title,
      description: `แผนเที่ยว ${trip.destination}`,
      images: trip.coverImage?.large ? [trip.coverImage.large] : undefined,
    },
  };
}

export default async function SharedTripPage({ params }: PageProps) {
  const { shareToken } = await params;
  const trip = await getSharedTrip(shareToken);

  // All four cases the API folds into a 404 (unknown token, revoked, expired,
  // trip deleted) land here. notFound() renders this segment's not-found.tsx
  // *with* a 404 status — returning the markup inline instead answered 200 OK,
  // so a revoked link looked like a live page to crawlers and unfurlers.
  if (!trip) notFound();

  const days = trip.days ?? [];
  const activityCount = days.reduce((total, day) => total + (day.activities?.length ?? 0), 0);

  // Mirrors Hero's statLabel in generated-plan: the place count when there is
  // one, otherwise fall back to the duration.
  const durationLabel =
    trip.schedule?.durationDays != null
      ? `${trip.schedule.durationDays} วัน${trip.schedule.durationNights != null ? ` ${trip.schedule.durationNights} คืน` : ""}`
      : null;
  const statLabel = activityCount > 0 ? `${activityCount} จุดเช็คอิน` : durationLabel;

  const dateRange = formatDateRange(trip.schedule?.startDate, trip.schedule?.endDate);
  const attractionCount = days.reduce(
    (total, day) => total + day.activities.filter((activity) => activity.category === "sightseeing").length,
    0,
  );
  const restaurantCount = days.reduce(
    (total, day) => total + day.activities.filter((activity) => activity.category === "food").length,
    0,
  );
  const stayCount = days.reduce(
    (total, day) => total + day.activities.filter((activity) => activity.category === "hotel").length,
    0,
  );
  const totalDistance = days.reduce(
    (total, day) =>
      total +
      day.activities.reduce((sum, activity) => sum + (activity.travelFromPrevious?.distanceKm ?? 0), 0),
    0,
  );
  const summaryStats = [
    { label: "ที่เที่ยว", value: attractionCount },
    { label: "ร้านอาหาร", value: restaurantCount },
    { label: "ที่พัก", value: stayCount },
    { label: "จุดเช็คอิน", value: activityCount },
    { label: "Total Distance", value: `${Math.round(totalDistance * 10) / 10} km` },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="relative flex min-h-[340px] flex-col overflow-hidden rounded-b-[24px] sm:min-h-[380px] sm:rounded-b-[28px] lg:min-h-[440px]">
        {/* coverImage is genuinely absent on plenty of shared trips (the field
            only appears once PUT /trips/:id/cover has run), and a flat colour
            fill behind the hero's dark gradients read as a broken image rather
            than a deliberate blank. Falls back to the same placeholder photo
            generated-plan's Hero uses, so the header always looks like a
            header. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.coverImage?.large ?? "/images/hero-mountain.jpg"}
          alt={trip.coverImage?.altText ?? ""}
          className="absolute inset-0 h-full w-full object-cover object-[80%_30%]"
        />

        {/* generated-plan's own hero gradient, plus a heavier band under the
            text. Plenty of trips use a generated share-card as their cover — an
            image with the trip name already set in huge type — and the base
            gradient alone left our title sitting on that baked-in text,
            illegible. The extra band keeps the heading readable over a busy
            photo and over a poster alike. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/55" />

        {/* Marks the page as something someone handed you — the real trip page
            has no equivalent, and it sits where Hero puts its back/menu row. */}
        <div className="relative z-20 border-b border-white/40 bg-gradient-to-b from-white/65 via-white/45 to-white/25 backdrop-blur-2xl">
          <div className="mx-auto w-full max-w-[var(--container-feed)] px-4 sm:px-6 lg:px-10 xl:px-14">
            <div className="relative flex min-h-8 items-center justify-between gap-3 py-1.5 sm:py-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold shadow-sm text-[var(--color-brand-green)]">
                <Link2 size={13} />
                แชร์กับคุณ
              </span>
              <Logo className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base text-[var(--foreground)] sm:text-xl" />
              {trip.owner?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trip.owner.avatarUrl} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm sm:h-8 sm:w-8" />
              ) : <span className="h-9 w-9 sm:h-8 sm:w-8" />}
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-auto flex w-full max-w-[var(--container-max)] flex-col gap-2 px-4 pb-5 sm:px-6 sm:pb-6 lg:px-10">
          <h1 className="line-clamp-2 text-2xl font-extrabold leading-tight text-white sm:text-4xl">{trip.title}</h1>

          {/* `owner` is absent entirely when the creator never set a display
              name — there's no username fallback by design, so the byline goes
              away rather than showing something like "@user_28f1". */}
          {(trip.owner || statLabel) && (
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
              {trip.owner && (
                <>
                  {trip.owner.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={trip.owner.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/25 text-[11px] font-bold">
                      {trip.owner.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>{trip.owner.name}</span>
                  {statLabel && <span className="text-white/50">|</span>}
                </>
              )}
              {statLabel && <span>{statLabel}</span>}
            </div>
          )}

          {dateRange && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-white">
              <CalendarDays size={16} className="shrink-0" />
              {dateRange}{durationLabel ? ` · ${durationLabel}` : ""}
            </p>
          )}

          <p className="text-xs font-medium text-white/90">{trip.destination}</p>
          <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-0.5 rounded-2xl bg-black/35 px-2 py-2 text-center text-white backdrop-blur-sm">
                <span className="text-sm font-extrabold sm:text-base">{stat.value}</span>
                <span className="text-[10px] font-medium text-white/85">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The dark-green band the white sheet curves up from — the signature
          seam on generated-plan. No section tabs here: weather, budget and chat
          all depend on fields the share payload deliberately withholds, so a
          tab row would promise content that cannot exist. */}
      <div className="relative bg-white">
        <div className="mx-auto w-full max-w-[var(--container-max)] px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
          <SharedTripPlan days={days} />

          <footer
            className="mt-12 flex flex-col items-center gap-3 border-t pt-8 text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p className="text-sm text-[var(--color-muted)]">อยากวางแผนทริปของตัวเอง?</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-deep-green)]"
            >
              เริ่มใช้ PunGuide
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}

function formatThaiDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateRange(start?: string, end?: string): string | null {
  if (!start) return null;
  const from = formatThaiDate(start);
  if (!end || end === start) return from;
  return `${from} – ${formatThaiDate(end)}`;
}
