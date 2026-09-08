"use client";

// The read-only trip detail page — where anyone (owner included) lands to
// browse a real trip's plan, as opposed to editing it on /generated-plan/[id].
// Deliberately its own component from the ground up rather than
// GeneratedPlanPage rendered with a `readOnly` flag, which is what this file
// used to be: that page's edit machinery — drag-and-drop reordering, every
// mutation handler, every dialog, autosave, localStorage reconciliation — all
// lives in one 5300-line file a colleague actively edits, and reusing it here
// meant any change to the editor risked breaking this page too (and did,
// twice, via merge conflicts). Everything below only ever reads `trip`;
// nothing here can write to it. Follows the same from-scratch pattern as
// /view/trip/[id] (the public share-link variant of this same idea), reusing
// several of its pieces verbatim, crossed with generated-plan's own
// components for the parts — Hero, the itinerary card, the map — that page
// never needed.
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Heart,
  LoaderCircle,
  Loader2,
  Menu,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Repeat2,
  Share2,
  TriangleAlert,
  X,
} from "lucide-react";
import type { Activity, ActivityCategory, GeneratedTrip, TravelSegment } from "@/types";
import { categoryIcon, categoryLabel } from "@/lib/category-styles";
import { fetchResolvedPlaceFullDetails } from "@/lib/external-places-api";
import { resolveCoverImageUrl, getTripGallery } from "@/lib/trip-media-api";
import { buildGeneratedTripFromBackendTrip } from "@/lib/generated-trips";
import { getTrip, likeTrip, unlikeTrip, saveTrip, unsaveTrip } from "@/lib/trips-api";
import { formatTHB, getGoogleMapsUrl } from "@/lib/trip-utils";
import { formatTimeDisplay } from "@/components/plan/ActivityFormFields";
import { TravelConnectorRow } from "@/components/plan/SelfPlanBuilderTab";
import { HotelBookingButton } from "@/components/plan/HotelBookingButton";
import { RemixSetupDialog } from "@/components/plan/RemixSetupDialog";
import { ShareTripDialog } from "@/components/plan/ShareTripDialog";
import { Logo } from "@/components/common/Logo";
import { RemixIcon } from "@/components/common/RemixIcon";
import { HERO_ILLUSTRATION } from "@/lib/hero-image";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRemixTrip, type RemixSourceMeta } from "@/hooks/useRemixTrip";
import { consumePendingRemixIntent, setPendingRemixIntent } from "@/lib/pending-remix";

// The one width grid for this whole route — every band lines up at the same
// left/right edge at every viewport width. Copied from generated-plan/[id],
// which is where this grid originates.
const SHELL = "mx-auto w-full max-w-[var(--container-max)] px-4 sm:px-6 lg:px-10";

export default function ViewTripPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { backendUser } = useAuth();
  const { showToast } = useToast();
  const remix = useRemixTrip();

  const [trip, setTrip] = useState<GeneratedTrip | null | undefined>(undefined);
  // buildGeneratedTripFromBackendTrip doesn't carry `isSaved` over onto
  // GeneratedTrip (only the public `saveCount` — see its doc comment in
  // lib/generated-trips.ts), because the viewer's own save state is not
  // something a shared GeneratedTrip needs in general. This page's bookmark
  // toggle does need it, so it's captured once, straight off the fetch
  // response, instead of carrying the whole BackendTrip around.
  const [initialSaved, setInitialSaved] = useState(false);
  const [saveOverride, setSaveOverride] = useState<{ saved: boolean; count: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [likeOverride, setLikeOverride] = useState<{ liked: boolean; count: number } | null>(null);
  const [liking, setLiking] = useState(false);

  const [dayIndex, setDayIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [remixDialogOpen, setRemixDialogOpen] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [generationNoticeDismissed, setGenerationNoticeDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTrip(params.id)
      .then((backendTrip) => {
        if (cancelled) return;
        if (!backendTrip) {
          setTrip(null);
          return;
        }
        setInitialSaved(backendTrip.isSaved);
        setTrip(buildGeneratedTripFromBackendTrip(backendTrip));
      })
      .catch((err) => {
        console.warn("โหลดทริปไม่สำเร็จ", err);
        if (!cancelled) setTrip(null);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Returning from the forced /login redirect below — reopens the Remix
  // dialog for the trip the visitor originally clicked "Remix" on. Same
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

  const activityCount = useMemo(
    () => (trip ? trip.days.reduce((total, day) => total + day.activities.length, 0) : 0),
    [trip]
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

  const saved = saveOverride?.saved ?? initialSaved;
  const saveCount = saveOverride?.count ?? trip.saveCount ?? 0;
  const liked = likeOverride?.liked ?? trip.isLiked ?? false;
  const likeCount = likeOverride?.count ?? trip.likeCount ?? 0;

  function requireLogin() {
    router.push(`/login?redirect=${encodeURIComponent(`/view-trip/${trip!.id}`)}`);
  }

  function handleToggleSave() {
    if (!backendUser) {
      requireLogin();
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

  function handleToggleLike() {
    if (!backendUser) {
      requireLogin();
      return;
    }
    if (liking) return;
    const next = !liked;
    const previous = { liked, count: likeCount };
    setLikeOverride({ liked: next, count: likeCount + (next ? 1 : -1) });
    setLiking(true);
    (next ? likeTrip(trip!.id) : unlikeTrip(trip!.id))
      .catch(() => {
        setLikeOverride(previous);
        showToast(next ? "กดถูกใจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "เอาถูกใจออกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      })
      .finally(() => setLiking(false));
  }

  // Share-link management (POST/PATCH/DELETE .../share) is owner-only — an
  // owner gets the manage-link dialog, everyone else gets the OS share sheet
  // where there is one, the clipboard otherwise.
  function handleShare() {
    if (isOwner) {
      setShowShareDialog(true);
      return;
    }
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
      requireLogin();
      return;
    }
    remix.reset();
    setRemixDialogOpen(true);
  }

  const remixSourceMeta: RemixSourceMeta = {
    sourceTripId: trip.id,
    sourceTitle: trip.title || trip.destination,
    sourceCreatorName: trip.creator?.name,
    sourceDurationDays: trip.days.length,
  };

  // Mirrors the pinned bottom bar's three-way branch on /view/trip/[id]: the
  // owner gets แก้ไขทริป, a non-owner who can remix gets Remix Trip, and a
  // non-owner who can't (a private trip somehow reached directly) gets
  // nothing here — TripSocialBar below still offers แชร์.
  const actionBar: MobileActionBarProps | null = isOwner
    ? {
        primary: {
          label: "แก้ไขทริป",
          icon: <Pencil size={15} />,
          color: "var(--color-accent-orange)",
          onClick: () => router.push(`/generated-plan/${trip.id}`),
        },
      }
    : canRemix
      ? {
          primary: {
            label: "Remix Trip",
            icon: <RemixIcon className="h-4 w-5 shrink-0" />,
            color: "var(--color-accent-violet)",
            onClick: handleRemixClick,
          },
          caption: "ระบบจะสร้างสำเนาเป็นทริปส่วนตัวของคุณ การแก้ไขจะไม่กระทบแผนต้นฉบับ",
        }
      : null;
  const bottomBarPadding = !actionBar ? "trip-page-bottom-bar--one-row" : "trip-page-bottom-bar--two-rows";

  return (
    <div className={`min-h-screen bg-white ${bottomBarPadding}`}>
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

      {showShareDialog && <ShareTripDialog tripId={trip.id} onClose={() => setShowShareDialog(false)} />}

      <Hero
        trip={trip}
        onBack={() => router.back()}
        onMenuClick={() => setSidebarOpen(true)}
        userAvatarUrl={backendUser?.avatarUrl}
        isOwner={isOwner}
      />

      <div className="relative rounded-t-[28px] bg-white">
        {/* Action row — bookmark, share, and the one primary CTA (Remix or
            แก้ไขทริป), same trio /view/trip/[id]'s equivalent row shows right
            under its hero. */}
        <div className={`${SHELL} flex flex-wrap items-center gap-2.5 pt-4 sm:pt-6`}>
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

        {/* Trip Overview — Remixes/Bookmark counts, a description sentence,
            then a divider. Same pattern already used on /view/trip/[id] and
            /shared-trips/[shareToken]. */}
        <div className={`${SHELL} flex flex-col gap-3 pt-5`}>
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

          <p className="text-base leading-relaxed text-[var(--color-muted)]">
            แพลนเที่ยว{trip.destination} {trip.durationLabel} รวม {activityCount} จุดเช็คอิน
            {trip.budgetGoal != null && <> งบประมาณรวม {formatTHB(trip.budgetGoal)} ต่อคน</>}
          </p>
        </div>

        <div className={`${SHELL} mt-4`}>
          <div className="h-px w-full" style={{ backgroundColor: "var(--color-border)" }} />
        </div>

        <div className={`${SHELL} py-5 sm:py-8`}>
          {trip.remixedFrom && <RemixSourceBanner remixedFrom={trip.remixedFrom} />}
          {trip.generationNotice && !generationNoticeDismissed && (
            <GenerationNoticeBanner
              notice={trip.generationNotice}
              onDismiss={() => setGenerationNoticeDismissed(true)}
            />
          )}

          <PlanTab trip={trip} dayIndex={dayIndex} onDayIndexChange={setDayIndex} />
        </div>
      </div>

      {/* Same fixed wrapper /view/trip/[id] and generated-plan's read-only
          mode use: one container for both rows so their heights never drift
          against each other. */}
      <div
        className="trip-compact-bottom-bar fixed inset-x-0 bottom-0 z-40 bg-white"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      >
        {actionBar && <MobileActionBar {...actionBar} />}
        <TripSocialBar
          likeCount={likeCount}
          liked={liked}
          liking={liking}
          onToggleLike={handleToggleLike}
          saveCount={saveCount}
          onShare={handleShare}
        />
      </div>
    </div>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────
// Cover photo (swipeable gallery once there's more than one image), the
// frosted top nav, and the title/creator/stat-row overlay. Adapted from
// generated-plan/[id]'s Hero: every `canEdit &&` block (the "จัดการรูปภาพ"
// cover-photo manager) is gone outright since this page never edits, and the
// creator avatar/name/follow row from /view/trip/[id]'s hero is folded in —
// generated-plan's own Hero never shows who made the trip at all.
function Hero({
  trip,
  onBack,
  onMenuClick,
  userAvatarUrl,
  isOwner,
}: {
  trip: GeneratedTrip;
  onBack: () => void;
  onMenuClick: () => void;
  userAvatarUrl?: string | null;
  isOwner: boolean;
}) {
  const [following, setFollowing] = useState(false);

  const dateRangeLabel =
    trip.days.length > 0 ? formatSlashDateRange(trip.days[0].date, trip.days[trip.days.length - 1].date) : "";
  const scheduleLabel = [dateRangeLabel, trip.durationLabel].filter(Boolean).join(" · ");

  // Same gallery lookup generated-plan's Hero does: the first photo flagged
  // as cover leads, the rest become swipeable slides. Only asked for once the
  // trip has a real backend row — this page never opens for anything else.
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!trip.backendSynced) return;
    getTripGallery(trip.id, { page: 1, limit: 12 })
      .then((gallery) => {
        if (cancelled) return;
        const coverIndex = gallery.items.findIndex((item) => item.isCover);
        const ordered =
          coverIndex > 0
            ? [gallery.items[coverIndex], ...gallery.items.filter((_, i) => i !== coverIndex)]
            : gallery.items;
        setGalleryImages(ordered.map((item) => item.urls.large));
      })
      .catch(() => {
        // No gallery yet (or the request failed) — the placeholder below
        // covers this silently.
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id, trip.backendSynced]);

  const fallback = trip.coverImage?.urls.large ?? resolveCoverImageUrl(trip, "large");
  const images = galleryImages && galleryImages.length > 0 ? galleryImages : fallback ? [fallback] : [];

  return (
    <div className="relative flex min-h-[340px] flex-col overflow-hidden rounded-b-[24px] sm:min-h-[380px] sm:rounded-b-[28px] lg:min-h-[440px]">
      {images.length <= 1 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[0] ?? HERO_ILLUSTRATION}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${
            images[0] ? "object-[80%_30%]" : "object-[50%_70%]"
          }`}
        />
      ) : (
        <HeroImageCarousel images={images} title={trip.title || trip.destination} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/55" />

      <div
        className="relative z-20 border-b border-white/40 bg-gradient-to-b from-white/65 via-white/45 to-white/25 backdrop-blur-2xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto w-full max-w-[var(--container-feed)] px-4 sm:px-6 lg:px-10 xl:px-14">
          <div className="relative flex min-h-8 items-center justify-between gap-3 py-1.5 sm:py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                aria-label="ย้อนกลับ"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white sm:h-8 sm:w-8"
                style={{ color: "var(--color-brand-green)" }}
              >
                <ChevronLeft size={17} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={onMenuClick}
                aria-label="เมนู"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white sm:h-8 sm:w-8"
                style={{ color: "var(--color-brand-green)" }}
              >
                <Menu size={17} strokeWidth={2.5} />
              </button>
            </div>

            <Logo className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base text-[var(--foreground)] sm:text-xl" />

            <div className="flex items-center gap-1 sm:gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={userAvatarUrl || "/images/profile-avatar.jpg"}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border-2 border-white object-cover shadow-sm sm:h-8 sm:w-8"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`relative z-10 mt-auto flex flex-col gap-2 pb-5 sm:pb-6 ${SHELL}`}>
        {trip.creator && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={trip.creator.avatarUrl || "/images/profile-avatar.jpg"}
              alt=""
              className="h-7 w-7 rounded-full border border-white/60 object-cover"
            />
            <span className="text-sm font-semibold text-white">{trip.creator.name}</span>
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

        <h1 className="line-clamp-2 text-2xl font-extrabold leading-tight text-white sm:text-4xl">
          {trip.title || trip.destination}
        </h1>

        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          <MapPin size={14} className="shrink-0" />
          {trip.destination}
        </p>

        {scheduleLabel && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-white">
            <CalendarDays size={16} className="shrink-0" />
            {scheduleLabel}
          </p>
        )}
      </div>
    </div>
  );
}

// "" when either end is missing or unparseable — new Date("") is an Invalid
// Date whose getDate()/getMonth()/getFullYear() are all NaN, which would
// otherwise render literally as "NaN/NaN/NaN - NaN/NaN/NaN".
function formatSlashDateRange(startDate: string, endDate: string): string {
  const start = formatSlashDate(startDate);
  const end = formatSlashDate(endDate);
  return start && end ? `${start} - ${end}` : "";
}

function formatSlashDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

// Snap-scrolling photo strip — same gesture as a story: swipe or tap the
// arrow to advance, dots at the bottom track position. Copied verbatim from
// generated-plan/[id]'s HeroImageCarousel.
function HeroImageCarousel({ images, title }: { images: string[]; title: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(next: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clampedIndex = (next + images.length) % images.length;
    const target = clampedIndex * el.clientWidth;
    el.scrollTo({ left: target, behavior: "smooth" });
    setIndex(clampedIndex);
    window.setTimeout(() => {
      if (Math.abs(el.scrollLeft - target) > el.clientWidth / 2) el.scrollLeft = target;
    }, 500);
  }

  return (
    <>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="ดูรูปเต็มจอ"
            className="h-full w-full shrink-0 snap-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover object-[80%_30%]" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo(index + 1)}
        aria-label="ดูรูปถัดไป"
        className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/45"
      >
        <ChevronRight size={18} />
      </button>

      <div className="pointer-events-none absolute left-1/2 top-16 z-10 flex -translate-x-1/2 items-center gap-1.5 sm:top-20">
        {images.map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === index ? "18px" : "6px",
              backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </div>

      {lightboxOpen && (
        <ImageLightbox title={title} images={images} initialIndex={index} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

// ─── Read-only footer: like + bookmark count + share ──────────────────────
// Copied verbatim from generated-plan/[id]'s TripSocialBar, which its own
// comment there already calls "the read-only page's footer".
function TripSocialBar({
  likeCount,
  liked,
  liking,
  onToggleLike,
  saveCount,
  onShare,
}: {
  likeCount: number;
  liked: boolean;
  liking: boolean;
  onToggleLike: () => void;
  saveCount: number;
  onShare: () => void;
}) {
  return (
    <div className="grid grid-cols-3 items-center border-t py-1" style={{ borderColor: "var(--color-border)" }}>
      <button
        type="button"
        onClick={onToggleLike}
        disabled={liking}
        aria-pressed={liked}
        aria-label={liked ? "เอาถูกใจออก" : "กดถูกใจทริปนี้"}
        className="flex min-h-11 items-center justify-center gap-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60"
        style={{ color: liked ? "var(--color-danger)" : "var(--foreground)" }}
      >
        <Heart size={16} fill={liked ? "currentColor" : "none"} />
        {likeCount.toLocaleString()} ถูกใจ
      </button>

      <div
        className="flex min-h-11 items-center justify-center gap-1.5 text-[13px] font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        <Bookmark size={16} />
        {saveCount.toLocaleString()} บันทึก
      </div>

      <button
        type="button"
        onClick={onShare}
        className="flex min-h-11 items-center justify-center gap-1.5 text-[13px] font-semibold transition-colors hover:bg-[var(--color-surface)]"
        style={{ color: "var(--foreground)" }}
      >
        <Share2 size={16} />
        แชร์ทริป
      </button>
    </div>
  );
}

// Mobile-only sticky bottom CTA. Copied verbatim from generated-plan/[id].
interface MobileActionBarProps {
  primary: { label: string; icon: ReactNode; color: string; onClick: () => void };
  secondary?: { label: string; icon: ReactNode; onClick: () => void };
  caption?: string;
}

function MobileActionBar({ primary, secondary, caption }: MobileActionBarProps) {
  return (
    <div className="flex flex-col gap-0.5 border-t px-4 py-2" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center gap-2">
        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            {secondary.icon}
            {secondary.label}
          </button>
        )}
        <button
          type="button"
          onClick={primary.onClick}
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: primary.color }}
        >
          {primary.icon}
          {primary.label}
        </button>
      </div>
      {caption && <p className="text-center text-[10px] text-[var(--color-muted)]">{caption}</p>}
    </div>
  );
}

function RemixSourceBanner({ remixedFrom }: { remixedFrom: NonNullable<GeneratedTrip["remixedFrom"]> }) {
  return (
    <div
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-sm"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <p>
        {remixedFrom.sourceTitle ? (
          <>
            Remix จาก &ldquo;{remixedFrom.sourceTitle}&rdquo;
            {remixedFrom.sourceCreatorName ? ` โดย ${remixedFrom.sourceCreatorName}` : ""}
          </>
        ) : (
          "Remix จากทริปอื่น"
        )}
      </p>
      <Link
        href={`/view-trip/${remixedFrom.sourceTripId}`}
        className="shrink-0 text-xs font-semibold underline"
        style={{ color: "var(--color-brand-green)" }}
      >
        ดูต้นฉบับ
      </Link>
    </div>
  );
}

// Only ever renders for a trip whose GeneratedTrip came straight off a fresh
// AI-generation response, which buildGeneratedTripFromBackendTrip (this
// page's only source of `trip`) never populates — kept anyway for parity
// with generated-plan/[id], in case that stops being true.
function GenerationNoticeBanner({
  notice,
  onDismiss,
}: {
  notice: NonNullable<GeneratedTrip["generationNotice"]>;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const errorCount = notice.violations.filter((v) => v.severity === "error").length;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border px-5 py-4" style={{ backgroundColor: "#FFF8E6", borderColor: "#F0D98C" }}>
      <div className="flex items-start gap-3">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" style={{ color: "#B8860B" }} />
        <div className="flex-1">
          <p className="text-sm font-bold">แผนนี้อาจมีจุดที่ต้องปรับ</p>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            ระบบพยายามซ่อมแผนให้อัตโนมัติแล้ว แต่ยังมี {errorCount} รายการที่อาจต้องแก้ไขเอง
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-sm font-semibold underline"
          style={{ color: "#B8860B" }}
        >
          {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="ปิดคำเตือนเกี่ยวกับแผนนี้"
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2"
          style={{ color: "#B8860B" }}
        >
          <X size={16} />
        </button>
      </div>

      {expanded && (
        <ul className="flex flex-col gap-1.5 pl-8 text-sm">
          {notice.violations.map((v, i) => (
            <li key={i} className="text-[var(--color-muted)]">
              <span
                className="mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase"
                style={
                  v.severity === "error"
                    ? { backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }
                    : { backgroundColor: "#FFF3D6", color: "#B8860B" }
                }
              >
                {v.severity}
              </span>
              {v.dayNumber !== undefined && <span className="font-semibold">วัน {v.dayNumber}: </span>}
              {v.message}
            </li>
          ))}
          {notice.modelWarnings.map((w, i) => (
            <li key={`model-${i}`} className="text-[var(--color-muted)]">
              <span className="mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}>
                AI
              </span>
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A leg's calculated travel segment is only shown when the trip has opted
// into automatic travel calculation, and only if the traveller hasn't
// dismissed it for this exact leg. Copied verbatim from generated-plan/[id].
function visibleTravelSegment(
  travelSegments: TravelSegment[] | undefined,
  fromActivity: Activity,
  toActivity: Activity
): TravelSegment | undefined {
  const segment = travelSegments?.find(
    (candidate) => candidate.fromPlaceId === fromActivity.id && candidate.toPlaceId === toActivity.id
  );
  return segment && toActivity.dismissedTravelSegmentId !== segment.id ? segment : undefined;
}

// The day switcher + itinerary list, adapted from generated-plan/[id]'s
// PlanTab: every canEdit branch (เพิ่มวัน, เพิ่มจุด, the editable
// PlanActivityRow, editable TravelConnectorRow handlers) is gone, since this
// page is always read-only — ReadOnlyPlanActivityCard renders every stop, and
// TravelConnectorRow gets no onSave/onDelete at all (both are optional; it
// renders read-only on its own when they're absent). No map here either —
// this page shows only the Trip Overview + itinerary detail, matching the
// shared-trips page's design; the map/place-popup live on generated-plan's
// own editor, not here.
function PlanTab({
  trip,
  dayIndex,
  onDayIndexChange,
}: {
  trip: GeneratedTrip;
  dayIndex: number;
  onDayIndexChange: (index: number) => void;
}) {
  const header = <h2 className="text-xl font-bold sm:text-2xl">แพลนเที่ยวของคุณ</h2>;

  if (trip.days.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl p-12 text-center" style={{ backgroundColor: "#FAF8F5" }}>
          <p className="text-sm text-[var(--color-muted)]">ทริปนี้ยังไม่มีวันเดินทาง</p>
        </div>
      </div>
    );
  }

  const day = trip.days[Math.min(dayIndex, trip.days.length - 1)];
  const showAutomaticTravel = trip.autoTravelCalculationEnabled ?? false;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {header}

      <div className="flex flex-col gap-4 rounded-2xl p-2.5 sm:gap-5 sm:rounded-3xl sm:p-5" style={{ backgroundColor: "#FAF8F5" }}>
        <div
          className="flex items-center gap-1.5 overflow-x-auto rounded-xl border bg-white p-1.5 [scrollbar-width:none] sm:gap-2 sm:rounded-2xl sm:p-2 [&::-webkit-scrollbar]:hidden"
          style={{ borderColor: "var(--color-border)" }}
        >
          {trip.days.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onDayIndexChange(i)}
              className="min-w-[88px] flex-none whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-bold sm:min-w-0 sm:flex-1 sm:rounded-xl sm:px-5"
              style={i === dayIndex ? { backgroundColor: "var(--color-brand-green)", color: "#fff" } : { color: "var(--color-muted)" }}
            >
              วันที่ {d.dayNumber}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {day.activities.map((a, i) => {
            const next = day.activities[i + 1];
            return (
              <div key={a.id} className="flex flex-col gap-3">
                <ReadOnlyPlanActivityCard activity={a} index={i + 1} />
                {next && (
                  <TravelConnectorRow
                    fromTitle={a.title}
                    toActivity={next}
                    travelSegment={showAutomaticTravel ? visibleTravelSegment(day.travelSegments, a, next) : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// The itinerary stop card. Copied verbatim from generated-plan/[id]'s
// ReadOnlyPlanActivityCard.
function ReadOnlyPlanActivityCard({ activity, index }: { activity: Activity; index: number }) {
  const CategoryIcon = categoryIcon[activity.category as ActivityCategory] ?? categoryIcon.other;
  const galleryImages = activity.images && activity.images.length > 0 ? activity.images : undefined;
  const imageUrl = galleryImages?.[0] ?? activity.location?.imageUrl ?? "/images/luang-prabang.jpg";
  const hasMetaRow = Boolean(activity.time || activity.cost > 0);
  const hasDetailBlock = Boolean(activity.location?.name || activity.notes);

  return (
    <div className="flex overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--color-border-tag)" }}>
      <div className="relative w-28 min-h-40 flex-none sm:w-44 md:w-52">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white">
          {index}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold sm:text-lg">{activity.title}</h3>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
          >
            <CategoryIcon size={12} />
            {categoryLabel[activity.category as ActivityCategory] ?? categoryLabel.other}
          </span>
        </div>

        {hasMetaRow && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--color-muted)]">
            {activity.time && <span style={{ color: "var(--color-accent-orange)" }}>{formatTimeDisplay(activity.time)}</span>}
            {activity.time && activity.cost > 0 && <span>·</span>}
            {activity.cost > 0 && (
              <span className="inline-flex items-center gap-1">
                <CircleDollarSign size={13} />
                {formatTHB(activity.cost)}
              </span>
            )}
          </div>
        )}

        {hasMetaRow && hasDetailBlock && <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />}

        {activity.location?.name && (
          <a
            href={getGoogleMapsUrl(activity.location)}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-1.5 text-sm text-[var(--color-muted)] hover:underline"
          >
            <MapPin size={14} className="mt-0.5 shrink-0" />
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

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {activity.category === "hotel" && (
            <HotelBookingButton
              name={activity.location?.name ?? activity.title}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
            />
          )}
          <ResolvedNavigationLink activity={activity} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white">
            <Navigation size={13} />
            นำทาง
          </ResolvedNavigationLink>
        </div>
      </div>
    </div>
  );
}

// Resolves legacy/generated activities to the places-table UUID only after
// the user asks to navigate, then replaces the fallback Maps search tab with
// Google's canonical place URI. Copied verbatim from generated-plan/[id].
function ResolvedNavigationLink({ activity, className, children }: { activity: Activity; className?: string; children: ReactNode }) {
  const [resolving, setResolving] = useState(false);
  const placeName = activity.location?.name || activity.title;
  const fallbackUrl = getGoogleMapsUrl({ name: placeName });

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (resolving) {
      event.preventDefault();
      return;
    }

    const navigationWindow = window.open(fallbackUrl, "_blank");
    if (!navigationWindow) return;

    event.preventDefault();
    navigationWindow.opener = null;
    setResolving(true);

    try {
      const details = await fetchResolvedPlaceFullDetails(activity.location?.googlePlaceId, placeName);
      if (details.googleMapsUri) navigationWindow.location.href = details.googleMapsUri;
    } catch {
      // The fallback search page is already open; leave it in place.
    } finally {
      setResolving(false);
    }
  }

  return (
    <a
      href={fallbackUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-busy={resolving}
      className={className}
      style={{ backgroundColor: "var(--color-accent-orange)" }}
    >
      {resolving ? <LoaderCircle size={11} className="animate-spin" /> : children}
    </a>
  );
}

// Full-screen photo viewer for HeroImageCarousel. Copied verbatim from
// generated-plan/[id].
function ImageLightbox({ title, images, initialIndex = 0, onClose }: { title: string; images: string[]; initialIndex?: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasMultiple) setIndex((current) => (current - 1 + images.length) % images.length);
      if (event.key === "ArrowRight" && hasMultiple) setIndex((current) => (current + 1) % images.length);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultiple, images.length, onClose]);

  function goTo(next: number) {
    setIndex((next + images.length) % images.length);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label={`รูปภาพของ ${title}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <p className="min-w-0 truncate text-sm font-bold text-white sm:text-base">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดรูปภาพ"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white sm:h-9 sm:w-9"
        >
          <X size={16} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-3 sm:px-6 sm:pb-4">
        {hasMultiple && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="รูปก่อนหน้า"
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm sm:left-8 sm:h-9 sm:w-9"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div className="relative flex max-h-full w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[index]} alt={`${title} รูปที่ ${index + 1}`} className="max-h-[calc(100dvh-11rem)] max-w-full object-contain sm:max-h-[70vh]" />
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
            {index + 1} / {images.length}
          </span>
        </div>

        {hasMultiple && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="รูปถัดไป"
            className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm sm:right-8 sm:h-9 sm:w-9"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="no-scrollbar flex shrink-0 items-center justify-start gap-2 overflow-x-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-center sm:px-6 sm:pb-6">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`ดูรูปที่ ${i + 1}`}
            className="h-12 w-16 shrink-0 overflow-hidden rounded-lg sm:h-16 sm:w-24 sm:rounded-xl"
            style={i === index ? { outline: "2px solid #fff", outlineOffset: "2px" } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
