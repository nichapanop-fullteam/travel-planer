import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, Link2Off, MapPin, Star } from "lucide-react";
import { getSharedTrip, type SharedTripActivity } from "@/lib/share-api";

// The public read-only view behind a share link. Server-rendered on purpose:
// the backend is called directly (no CORS off the browser, so no proxy route
// is needed), the plan is in the HTML for link previews, and GET
// /shared-trips/:token is hit exactly once per page load — the doc's
// 30 req/min/IP limit is generous but a client-side effect without a guard
// could still walk into it.
//
// No auth of any kind: the shareToken in the URL is the whole credential, and
// nothing on this page assumes a signed-in viewer.

type PageProps = { params: Promise<{ shareToken: string }> };

// Deliberately minimal, and deliberately not derived from the trip when the
// link is dead — the title itself shouldn't confirm that a trip exists to
// someone holding a revoked link.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareToken } = await params;
  const trip = await getSharedTrip(shareToken);
  if (!trip) return { title: "ลิงก์นี้ใช้ไม่ได้แล้ว", robots: { index: false, follow: false } };

  return {
    title: `${trip.title} · PunGuide`,
    description: `แผนเที่ยว ${trip.destination}${trip.owner ? ` โดย ${trip.owner.name}` : ""}`,
    // A share link is meant for the people the owner sent it to, not for
    // search results.
    robots: { index: false, follow: false },
    openGraph: {
      title: trip.title,
      description: `แผนเที่ยว ${trip.destination}`,
      images: trip.coverImage?.large ? [trip.coverImage.large] : undefined,
    },
  };
}

const CATEGORY_LABEL: Record<string, string> = {
  transport: "การเดินทาง",
  food: "อาหาร",
  hotel: "ที่พัก",
  sightseeing: "เที่ยวชม",
  activity: "กิจกรรม",
  other: "อื่นๆ",
};

const CATEGORY_COLOR: Record<string, string> = {
  transport: "var(--color-cat-transport)",
  food: "var(--color-cat-food)",
  hotel: "var(--color-cat-hotel)",
  sightseeing: "var(--color-cat-sightseeing)",
  activity: "var(--color-cat-activity)",
  other: "var(--color-cat-other)",
};

export default async function SharedTripPage({ params }: PageProps) {
  const { shareToken } = await params;
  const trip = await getSharedTrip(shareToken);

  // One neutral page for all four cases the API folds into a 404 (unknown
  // token, revoked, expired, trip deleted). It must not guess which — the API
  // hides that on purpose so an ex-recipient can't tell whether the trip still
  // exists or whether they were singled out.
  if (!trip) return <DeadLink />;

  const days = trip.days ?? [];
  const dateRange = formatDateRange(trip.schedule?.startDate, trip.schedule?.endDate);
  const durationLabel =
    trip.schedule?.durationDays != null
      ? `${trip.schedule.durationDays} วัน${trip.schedule.durationNights != null ? ` ${trip.schedule.durationNights} คืน` : ""}`
      : null;

  return (
    <div className="min-h-screen bg-white">
      <header className="relative flex min-h-[320px] flex-col justify-end overflow-hidden sm:min-h-[420px]">
        {trip.coverImage?.large ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.coverImage.large}
            alt={trip.coverImage.altText ?? ""}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-surface)]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />

        <div className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-10 pt-16 text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">แผนเที่ยวที่แชร์กับคุณ</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight drop-shadow-sm sm:text-4xl">{trip.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} className="shrink-0" />
              {trip.destination}
            </span>
            {durationLabel && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={15} className="shrink-0" />
                {durationLabel}
              </span>
            )}
            {dateRange && <span className="text-white/75">{dateRange}</span>}
          </div>

          {/* `owner` is absent entirely when the creator never set a display
              name — there's no username fallback, so the byline just goes away
              rather than showing something like "@user_28f1". */}
          {trip.owner && (
            <div className="mt-5 flex items-center gap-2.5">
              {trip.owner.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trip.owner.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-sm font-bold">
                  {trip.owner.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold">แผนโดย {trip.owner.name}</span>
            </div>
          )}

          {trip.tags && trip.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {trip.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
        {days.length === 0 ? (
          <p className="rounded-2xl bg-[var(--color-surface)] p-10 text-center text-sm text-[var(--color-muted)]">
            แผนนี้ยังไม่มีรายละเอียดกิจกรรม
          </p>
        ) : (
          <ol className="flex flex-col gap-8">
            {/* Keyed by dayNumber / order — this payload carries no ids at all,
                by design (see SharedTrip's doc comment). */}
            {days.map((day) => (
              <li key={day.dayNumber}>
                <div className="mb-4 flex items-baseline gap-3">
                  <h2 className="text-xl font-extrabold">วันที่ {day.dayNumber}</h2>
                  {day.date && <span className="text-sm text-[var(--color-muted)]">{formatThaiDate(day.date)}</span>}
                </div>

                {day.activities.length === 0 ? (
                  <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-xs text-[var(--color-muted)]" style={{ borderColor: "var(--color-border)" }}>
                    ยังไม่มีกิจกรรมในวันนี้
                  </p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {day.activities.map((activity) => (
                      <ActivityRow key={activity.order} activity={activity} />
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        )}

        <footer className="mt-12 flex flex-col items-center gap-3 border-t pt-8 text-center" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-sm text-[var(--color-muted)]">อยากวางแผนทริปของตัวเอง?</p>
          <Link
            href="/main"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-deep-green)]"
          >
            เริ่มใช้ PunGuide
          </Link>
        </footer>
      </main>
    </div>
  );
}

function ActivityRow({ activity }: { activity: SharedTripActivity }) {
  const color = CATEGORY_COLOR[activity.category] ?? "var(--color-cat-other)";
  const label = CATEGORY_LABEL[activity.category] ?? activity.category;

  return (
    <li className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--color-border)" }}>
      {activity.travelFromPrevious && (
        <p className="mb-2.5 text-xs text-[var(--color-muted)]">
          {activity.travelNote ??
            [
              activity.travelFromPrevious.durationMin != null ? `~${activity.travelFromPrevious.durationMin} นาที` : null,
              activity.travelFromPrevious.distanceKm != null ? `${activity.travelFromPrevious.distanceKm} กม.` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
        </p>
      )}

      <div className="flex items-start gap-3">
        {activity.time ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--color-surface)] px-2 py-1 text-xs font-bold">
            <Clock size={12} />
            {activity.time}
          </span>
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        )}

        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{activity.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <span className="font-semibold" style={{ color }}>
              {label}
            </span>
            {activity.place?.name && activity.place.name !== activity.title && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} />
                {activity.place.name}
              </span>
            )}
            {activity.place?.rating != null && (
              <span className="inline-flex items-center gap-1">
                <Star size={11} />
                {activity.place.rating}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function DeadLink() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-muted)]">
        <Link2Off size={28} />
      </div>
      <h1 className="text-2xl font-extrabold">ลิงก์นี้ใช้ไม่ได้แล้ว</h1>
      {/* Intentionally vague: the API doesn't say whether the link was
          revoked, expired, never existed, or the trip was deleted, so this
          page must not invent a reason. */}
      <p className="max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
        ลิงก์อาจถูกยกเลิก หมดอายุ หรือไม่ถูกต้อง ลองขอลิงก์ใหม่จากผู้ที่แชร์ให้คุณ
      </p>
      <Link
        href="/main"
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-deep-green)]"
      >
        ไปหน้าสำรวจทริป
      </Link>
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
