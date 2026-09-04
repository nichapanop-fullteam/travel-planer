"use client";

// Public "share this trip" page — a link anyone can open to browse a trip
// read-only, no login required. Deliberately its own component from the
// ground up rather than GeneratedPlanPage rendered with a readOnly flag
// (that's what /view-trip/[id] already does): that page's edit machinery —
// drag-and-drop reordering, autosave, every dialog — lives in one 4800-line
// file, and reusing it here would mean any future change to the editor risks
// this share page too. Everything below only ever reads `trip`; nothing here
// can write to it.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  ChevronDown,
  Loader2,
  Map as MapIcon,
  Menu,
  MapPin,
  Repeat2,
  Share2,
  User as UserIcon,
} from "lucide-react";
import type { Activity, ActivityCategory } from "@/types";
import { getTrip, saveTrip, unsaveTrip, type BackendTrip } from "@/lib/trips-api";
import { resolveCoverImageUrl } from "@/lib/trip-media-api";
import { formatTHB, getGoogleMapsUrl } from "@/lib/trip-utils";
import { categoryIcon, categoryLabel } from "@/lib/category-styles";
import { travelTypeIcon, travelTypeLabel } from "@/lib/travel-styles";
import { Logo } from "@/components/common/Logo";
import { RemixIcon } from "@/components/common/RemixIcon";
import { Sidebar } from "@/components/layout/Sidebar";
import { RemixSetupDialog } from "@/components/plan/RemixSetupDialog";
import { useRemixTrip, type RemixSourceMeta } from "@/hooks/useRemixTrip";
import { consumePendingRemixIntent, setPendingRemixIntent } from "@/lib/pending-remix";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

const FALLBACK_COVER = "/images/hero-mountain.jpg";

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

function activityImage(activity: Activity): string | undefined {
  return activity.images?.[0] ?? activity.location?.imageUrl;
}

export default function ViewTripPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { backendUser } = useAuth();
  const { showToast } = useToast();
  const remix = useRemixTrip();

  const [trip, setTrip] = useState<BackendTrip | null | undefined>(undefined);
  const [dayIndex, setDayIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [remixDialogOpen, setRemixDialogOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  // Optimistic override over trip.isSaved/saveCount, same shape as the like
  // button elsewhere in the app (generated-plan's TripSocialBar) — the click
  // is the newer truth than whatever GET /trips/:id last answered, and a
  // background refetch shouldn't stomp it back.
  const [saveOverride, setSaveOverride] = useState<{ saved: boolean; count: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTrip(params.id)
      .then((loaded) => {
        if (!cancelled) setTrip(loaded);
      })
      .catch((err) => {
        console.warn("โหลดทริปสำหรับหน้าแชร์ไม่สำเร็จ", err);
        if (!cancelled) setTrip(null);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Returning from the forced /login redirect below — reopens the Remix
  // dialog for the trip the visitor originally clicked "Remix" on, same
  // one-shot sessionStorage handoff generated-plan/[id]/page.tsx uses.
  useEffect(() => {
    if (!trip || !backendUser) return;
    const pendingSourceTripId = consumePendingRemixIntent();
    if (pendingSourceTripId === trip.id) {
      remix.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a one-shot sessionStorage flag left by a prior page, not to React state
      setRemixDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, backendUser]);

  useEffect(() => {
    if (remix.status !== "success" || !remix.newTripId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the dialog is a one-time reaction to the hook's async result landing, not a render-time derivation
    setRemixDialogOpen(false);
    showToast("สร้างทริปของคุณแล้ว แก้ไขได้โดยไม่กระทบแผนต้นฉบับ");
    router.push(`/generated-plan/${remix.newTripId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remix.status, remix.newTripId]);

  const days = useMemo(() => trip?.days ?? [], [trip]);
  const activeDay = days[dayIndex] ?? days[0];
  const activityCount = useMemo(
    () => days.reduce((total, day) => total + day.activities.length, 0),
    [days]
  );

  if (trip === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-muted)]" size={28} />
      </div>
    );
  }

  if (trip === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-bold">ไม่พบทริปนี้</p>
        <p className="text-sm text-[var(--color-muted)]">ลิงก์นี้อาจไม่ถูกต้องหรือทริปถูกลบไปแล้ว</p>
        <Link
          href="/main"
          className="rounded-full px-6 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--color-brand-green)" }}
        >
          กลับหน้าแรก
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(backendUser && backendUser.id === trip.ownerId);
  const canRemix = isOwner || trip.visibility === "public";

  const saved = saveOverride?.saved ?? trip.isSaved;
  const saveCount = saveOverride?.count ?? trip.saveCount ?? 0;

  const durationDays = trip.schedule?.durationDays ?? days.length;
  const durationNights = trip.schedule?.durationNights ?? Math.max(days.length - 1, 0);
  const dateRange = formatDateRange(trip.schedule?.startDate, trip.schedule?.endDate);
  const groupSize = trip.customer?.groupSize;
  const perPersonBudget =
    trip.budgetLimit ??
    (groupSize && trip.totalBudget ? Math.round(trip.totalBudget / groupSize) : trip.totalBudget || undefined);
  const coverUrl = resolveCoverImageUrl(trip) ?? FALLBACK_COVER;

  function requireLogin(redirectTo: string) {
    router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  function handleToggleSave() {
    if (!backendUser) {
      requireLogin(`/view/trip/${trip!.id}`);
      return;
    }
    if (saving) return;
    const next = !saved;
    const previous = { saved, count: saveCount };
    setSaveOverride({ saved: next, count: saveCount + (next ? 1 : -1) });
    setSaving(true);
    (next ? saveTrip(trip!.id) : unsaveTrip(trip!.id))
      .catch(() => {
        setSaveOverride(previous);
        showToast(next ? "บันทึกทริปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "เอาออกจากรายการบันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      })
      .finally(() => setSaving(false));
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: trip!.title || trip!.destination, url }).catch(() => {});
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => showToast("คัดลอกลิงก์ทริปแล้ว"))
      .catch(() => showToast("คัดลอกลิงก์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  }

  function handleRemixClick() {
    if (!backendUser) {
      setPendingRemixIntent(trip!.id);
      requireLogin(`/view/trip/${trip!.id}`);
      return;
    }
    remix.reset();
    setRemixDialogOpen(true);
  }

  const remixSourceMeta: RemixSourceMeta = {
    sourceTripId: trip.id,
    sourceTitle: trip.title || trip.destination,
    sourceCreatorName: trip.customer?.name,
    sourceDurationDays: durationDays,
  };

  return (
    <div className="min-h-screen bg-white pb-24 sm:pb-0">
      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
        <div
          className={`relative z-10 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar active="home" onClose={() => setSidebarOpen(false)} />
        </div>
      </div>

      {remixDialogOpen && (
        <RemixSetupDialog
          source={{
            title: remixSourceMeta.sourceTitle,
            creatorName: remixSourceMeta.sourceCreatorName,
            durationDays: remixSourceMeta.sourceDurationDays,
          }}
          status={remix.status}
          message={remix.message}
          expectedDurationDays={remix.expectedDurationDays}
          onClose={() => setRemixDialogOpen(false)}
          onSubmit={(values) => remix.submit(values, remixSourceMeta)}
        />
      )}

      {/* ─── Hero ─── */}
      <div className="relative flex min-h-[320px] flex-col overflow-hidden rounded-b-[24px] sm:min-h-[380px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60" />

        {/* Same frosted app bar as generated-plan's Hero (and /main's
            FrostedTopNav it was lifted from) — a pale, blurred panel the photo
            reads through softly, not icons floating directly on the image. */}
        <div
          className="relative z-20 border-b border-white/40 bg-gradient-to-b from-white/65 via-white/45 to-white/25 backdrop-blur-2xl"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto w-full max-w-[var(--container-feed)] px-4 sm:px-6 lg:px-10 xl:px-14">
            <div className="relative flex min-h-8 items-center justify-between gap-3 py-1.5 sm:py-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  aria-label="ย้อนกลับ"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white sm:h-8 sm:w-8"
                  style={{ color: "var(--color-brand-green)" }}
                >
                  <ArrowLeft size={17} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="เมนู"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white sm:h-8 sm:w-8"
                  style={{ color: "var(--color-brand-green)" }}
                >
                  <Menu size={17} strokeWidth={2.5} />
                </button>
              </div>

              <Logo className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base text-[var(--foreground)] sm:text-xl" />

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleToggleSave}
                  aria-pressed={saved}
                  aria-label={saved ? "เอาออกจากรายการบันทึก" : "บันทึกทริปนี้"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white sm:h-8 sm:w-8"
                >
                  <Bookmark
                    size={16}
                    fill={saved ? "var(--color-brand-green)" : "none"}
                    color={saved ? "var(--color-brand-green)" : "var(--foreground)"}
                  />
                </button>
                {backendUser?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={backendUser.avatarUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border-2 border-white object-cover shadow-sm sm:h-8 sm:w-8"
                  />
                ) : (
                  <Link
                    href="/login"
                    aria-label="เข้าสู่ระบบ"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white sm:h-8 sm:w-8"
                    style={{ color: "var(--color-brand-green)" }}
                  >
                    <UserIcon size={16} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-auto flex w-full max-w-5xl flex-col gap-2.5 px-4 pb-5 sm:px-6">
          {trip.customer && (
            <div className="flex items-center gap-2">
              {trip.customer.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trip.customer.avatarUrl} alt="" className="h-7 w-7 rounded-full border border-white/60 object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-xs font-bold text-white">
                  {trip.customer.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm font-semibold text-white">{trip.customer.name}</span>
              {!isOwner && (
                <button
                  type="button"
                  onClick={() => setFollowing((v) => !v)}
                  className="ml-1 rounded-full px-3 py-1 text-xs font-bold"
                  style={
                    following
                      ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.6)" }
                      : { backgroundColor: "white", color: "var(--foreground)" }
                  }
                >
                  {following ? "กำลังติดตาม" : "ติดตาม"}
                </button>
              )}
            </div>
          )}

          <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            {trip.title || trip.destination}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-white/90 sm:text-sm">
            <span className="flex items-center gap-1">
              <MapPin size={14} className="shrink-0" />
              {trip.destination}
            </span>
            <span>
              {durationDays} วัน {durationNights} คืน
            </span>
            <span>{activityCount} สถานที่</span>
            {perPersonBudget != null && <span>{formatTHB(perPersonBudget)} /คน</span>}
          </div>
          {dateRange && (
            <p className="flex items-center gap-1.5 text-xs text-white/80 sm:text-sm">
              <CalendarDays size={14} className="shrink-0" />
              {dateRange}
            </p>
          )}
        </div>
      </div>

      {/* ─── Action row ─── */}
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2.5 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={handleToggleSave}
          aria-pressed={saved}
          aria-label={saved ? "เอาออกจากรายการบันทึก" : "บันทึกทริปนี้"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Bookmark
            size={16}
            fill={saved ? "var(--color-brand-green)" : "none"}
            color={saved ? "var(--color-brand-green)" : "currentColor"}
          />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Share2 size={15} />
          แชร์
        </button>

        {isOwner ? (
          <Link
            href={`/generated-plan/${trip.id}`}
            className="flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            แก้ไขทริป
          </Link>
        ) : (
          canRemix && (
            <button
              type="button"
              onClick={handleRemixClick}
              className="flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-accent-violet)" }}
            >
              <RemixIcon className="h-4 w-5 shrink-0" />
              Remix Trip
              <ChevronDown size={14} />
            </button>
          )
        )}
      </div>

      {/* ─── Trip Overview ─── */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Trip Overview</h2>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-[var(--color-muted)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Repeat2 size={13} />
              {new Intl.NumberFormat("th-TH").format(trip.remixCount ?? 0)} Remixes
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-[var(--color-muted)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Bookmark size={13} />
              {new Intl.NumberFormat("th-TH").format(saveCount)} Bookmark
            </span>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          แพลนเที่ยว{trip.destination} {durationDays} วัน {durationNights} คืน รวม {activityCount} จุดเช็คอิน
          {perPersonBudget != null && <> งบประมาณรวม {formatTHB(perPersonBudget)} ต่อคน</>}
        </p>
      </div>

      {/* ─── Day tabs ─── */}
      {days.length > 0 && (
        <div className="sticky top-0 z-30 mt-4 border-b bg-white/90 backdrop-blur-md" style={{ borderColor: "var(--color-border)" }}>
          <div className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
            {days.map((day, index) => (
              <button
                key={day.id}
                type="button"
                onClick={() => setDayIndex(index)}
                className="shrink-0 border-b-2 px-4 py-3 text-sm font-semibold"
                style={
                  index === dayIndex
                    ? { borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }
                    : { borderColor: "transparent", color: "var(--color-muted)" }
                }
              >
                วันที่ {day.dayNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Itinerary ─── */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6">
        {!activeDay || activeDay.activities.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">
            {activeDay ? "วันนี้ยังไม่มีสถานที่" : "ทริปนี้ยังไม่มีวันเดินทาง"}
          </p>
        ) : (
          activeDay.activities.map((activity, index) => (
            <ActivityCard key={activity.id} activity={activity} index={index + 1} />
          ))
        )}
      </div>

      {/* ─── Mobile pinned action bar ─── */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t bg-white px-4 py-3 sm:hidden"
        style={{ borderColor: "var(--color-border)", paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        {isOwner ? (
          <Link
            href={`/generated-plan/${trip.id}`}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            แก้ไขทริป
          </Link>
        ) : canRemix ? (
          <button
            type="button"
            onClick={handleRemixClick}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-accent-violet)" }}
          >
            <RemixIcon className="h-4 w-5 shrink-0" />
            Remix Trip
          </button>
        ) : (
          <button
            type="button"
            onClick={handleShare}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            <Share2 size={15} />
            แชร์ทริปนี้
          </button>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ activity, index }: { activity: Activity; index: number }) {
  const CategoryIcon = categoryIcon[activity.category as ActivityCategory] ?? categoryIcon.other;
  const image = activityImage(activity);
  const travel = activity.travelFromPrevious;
  const TravelIcon = travel ? travelTypeIcon[travel.type] : undefined;

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--color-border)" }}>
      <div className="relative h-40 w-full sm:h-48">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#FAF8F5]">
            <CategoryIcon size={28} className="text-[var(--color-muted)]" />
          </div>
        )}
        <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white">
          {index}
        </span>
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur"
          style={{ color: "var(--color-brand-green)" }}
        >
          <CategoryIcon size={12} />
          {categoryLabel[activity.category as ActivityCategory] ?? categoryLabel.other}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--color-muted)]">
          {activity.time && <span>{activity.time}</span>}
          {travel && TravelIcon && (
            <span className="flex items-center gap-1">
              <TravelIcon size={13} />
              {travelTypeLabel[travel.type]}
              {travel.durationMin != null && ` · ${travel.durationMin} นาที`}
            </span>
          )}
        </div>

        <h3 className="text-base font-bold sm:text-lg">{activity.title}</h3>

        {activity.location?.name && (
          <a
            href={getGoogleMapsUrl(activity.location)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:underline"
          >
            <MapPin size={14} className="shrink-0" />
            {activity.location.name}
          </a>
        )}

        {activity.notes && <p className="text-sm leading-relaxed">{activity.notes}</p>}

        {activity.travelNote && (
          <div className="rounded-xl px-3 py-2 text-xs font-medium" style={{ backgroundColor: "var(--color-cat-sightseeing-bg, #EAF6EE)", color: "var(--color-brand-green)" }}>
            <span className="font-bold">Trip hack </span>
            {activity.travelNote}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          {activity.cost > 0 && <span className="text-sm font-semibold">{formatTHB(activity.cost)}</span>}
          {activity.location?.name && (
            <a
              href={getGoogleMapsUrl(activity.location)}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#1F2A24] px-3 py-1.5 text-xs font-semibold text-white"
            >
              <MapIcon size={13} />
              Map
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
