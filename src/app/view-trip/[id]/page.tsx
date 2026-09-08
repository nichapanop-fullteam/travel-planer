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
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CloudSun,
  Globe2,
  Heart,
  LoaderCircle,
  Loader2,
  Maximize2,
  Menu,
  Minus,
  MoreVertical,
  MapPin,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Phone,
  Plus,
  Repeat2,
  Share2,
  Star,
  TriangleAlert,
  X,
} from "lucide-react";
import type { Activity, ActivityCategory, Day, GeneratedTrip, TravelSegment } from "@/types";
import { categoryIcon, categoryLabel } from "@/lib/category-styles";
import { fetchResolvedPlaceFullDetails, type PlaceFullDetails } from "@/lib/external-places-api";
import { resolveCoverImageUrl, getTripGallery } from "@/lib/trip-media-api";
import { buildGeneratedTripFromBackendTrip } from "@/lib/generated-trips";
import { getTrip, likeTrip, unlikeTrip, saveTrip, unsaveTrip } from "@/lib/trips-api";
import {
  formatTHB,
  getDayRouteEstimate,
  getDayTotalCost,
  getGoogleMapsUrl,
  getTripDistanceKm,
  getTripPlaceStats,
  getTripTotalCost,
} from "@/lib/trip-utils";
import { formatTimeDisplay } from "@/components/plan/ActivityFormFields";
import { TravelConnectorRow } from "@/components/plan/SelfPlanBuilderTab";
import { FakeMapBackground } from "@/components/plan/FakeMapBackground";
import { BudgetManagementPanel } from "@/components/plan/BudgetManagementPanel";
import { HotelBookingButton } from "@/components/plan/HotelBookingButton";
import { RemixSetupDialog } from "@/components/plan/RemixSetupDialog";
import { ShareTripDialog } from "@/components/plan/ShareTripDialog";
import { Logo } from "@/components/common/Logo";
import { MapIcon } from "@/components/common/MapIcon";
import { RemixIcon } from "@/components/common/RemixIcon";
import { HERO_ILLUSTRATION } from "@/lib/hero-image";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRemixTrip, type RemixSourceMeta } from "@/hooks/useRemixTrip";
import { consumePendingRemixIntent, setPendingRemixIntent } from "@/lib/pending-remix";

type TabKey = "plan" | "weather" | "budget";

const TABS: { key: TabKey; label: string }[] = [
  { key: "plan", label: "แพลนทริป" },
  { key: "weather", label: "สภาพอากาศ" },
  { key: "budget", label: "สรุปงบ" },
];

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

  const [tab, setTab] = useState<TabKey>("plan");
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
        tab={tab}
        dayIndex={dayIndex}
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

        <div
          className="sticky top-0 z-30 mt-4 bg-white/85 backdrop-blur-md"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className={`${SHELL} py-3`}>
            <PlanTabs tabs={TABS} tab={tab} setTab={setTab} />
          </div>
        </div>

        <div className={`${SHELL} py-5 sm:py-8`}>
          {trip.remixedFrom && <RemixSourceBanner remixedFrom={trip.remixedFrom} />}
          {trip.generationNotice && !generationNoticeDismissed && (
            <GenerationNoticeBanner
              notice={trip.generationNotice}
              onDismiss={() => setGenerationNoticeDismissed(true)}
            />
          )}

          {tab === "plan" && <PlanTab trip={trip} dayIndex={dayIndex} onDayIndexChange={setDayIndex} />}
          {tab === "weather" && <WeatherTab />}
          {tab === "budget" && <BudgetManagementPanel trip={trip} onPatch={() => {}} readOnly />}
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
  tab,
  dayIndex,
}: {
  trip: GeneratedTrip;
  onBack: () => void;
  onMenuClick: () => void;
  userAvatarUrl?: string | null;
  isOwner: boolean;
  tab: TabKey;
  // Which day is selected in แพลนทริป — read only when tab is "plan", so the
  // stats reflect that one day's numbers there and the whole trip everywhere
  // else (สภาพอากาศ, สรุปงบ have no single day to summarise).
  dayIndex: number;
}) {
  const [following, setFollowing] = useState(false);

  const dateRangeLabel =
    trip.days.length > 0 ? formatSlashDateRange(trip.days[0].date, trip.days[trip.days.length - 1].date) : "";
  const scheduleLabel = [dateRangeLabel, trip.durationLabel].filter(Boolean).join(" · ");

  const selectedDay =
    tab === "plan" && trip.days.length > 0 ? trip.days[Math.min(dayIndex, trip.days.length - 1)] : undefined;
  const placeStats = useMemo(
    () => getTripPlaceStats(selectedDay ? { days: [selectedDay] } : trip),
    [trip, selectedDay]
  );
  const distanceKm = useMemo(
    () => (selectedDay ? getDayRouteEstimate(selectedDay).distanceKm : getTripDistanceKm(trip)),
    [trip, selectedDay]
  );
  const costPerDay = useMemo(() => {
    if (selectedDay) return getDayTotalCost(selectedDay);
    const plannedDays = trip.days.filter((d) => d.activities.length > 0).length;
    if (plannedDays === 0) return 0;
    const groupSize = trip.creator?.groupSize;
    const totalPerPerson =
      trip.totalBudget != null && groupSize && groupSize > 0
        ? trip.totalBudget / groupSize
        : (trip.totalBudget ?? getTripTotalCost(trip));
    return Math.round(totalPerPerson / plannedDays);
  }, [trip, selectedDay]);
  const staysCount = selectedDay
    ? selectedDay.activities.filter((a) => a.category === "hotel").length
    : trip.accommodation
      ? 1
      : 0;
  const summaryStats = [
    { key: "attractions", label: "ที่เที่ยว", value: `${placeStats.attractions}` },
    { key: "restaurants", label: "ร้านอาหาร", value: `${placeStats.restaurants}` },
    { key: "stays", label: "ที่พัก", value: `${staysCount}` },
    { key: "budget", label: "งบ/วัน/คน", value: formatTHB(costPerDay) },
    { key: "distance", label: "Total Distance", value: `${distanceKm} km` },
  ];

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
        <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5">
          {summaryStats.map((s) => (
            <div
              key={s.key}
              className="flex flex-col items-center gap-0.5 rounded-2xl bg-black/35 px-2 py-2 text-center text-white backdrop-blur-sm"
            >
              <span className="text-sm font-extrabold sm:text-base">{s.value}</span>
              <span className="text-[10px] font-medium text-white/85">{s.label}</span>
            </div>
          ))}
        </div>
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

function PlanTabs({ tabs, tab, setTab }: { tabs: { key: TabKey; label: string }[]; tab: TabKey; setTab: (t: TabKey) => void }) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + dir + tabs.length) % tabs.length;
    setTab(tabs[nextIndex].key);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="ส่วนต่าง ๆ ของแผนทริป"
      className="flex items-center gap-1 overflow-x-auto rounded-full p-1.5 shadow-md [scrollbar-width:none] sm:gap-2 sm:p-2 [&::-webkit-scrollbar]:hidden"
      style={{ backgroundColor: "#FAF8F5" }}
    >
      {tabs.map((t, i) => {
        const isActive = tab === t.key;
        return (
          <button
            key={t.key}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setTab(t.key)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className="min-w-[108px] flex-none whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-w-0 sm:flex-1 sm:py-3 sm:text-sm"
            style={{
              backgroundColor: isActive ? "var(--color-brand-green)" : "transparent",
              color: isActive ? "#fff" : "var(--foreground)",
              outlineColor: "var(--color-brand-green)",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function WeatherTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-16 text-center" style={{ borderColor: "var(--color-border)" }}>
      <CloudSun size={28} style={{ color: "var(--color-muted)" }} />
      <p className="text-sm font-semibold">ข้อมูลสภาพอากาศกำลังจะมาเร็วๆ นี้</p>
      <p className="text-xs text-[var(--color-muted)]">ดูพยากรณ์อากาศระหว่างทริปได้ที่นี่</p>
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

// The day switcher + itinerary list + map, adapted from generated-plan/[id]'s
// PlanTab: every canEdit branch (เพิ่มวัน, เพิ่มจุด, the editable PlanActivityRow,
// editable TravelConnectorRow handlers) is gone, since this page is always
// read-only — ReadOnlyPlanActivityCard renders every stop, and
// TravelConnectorRow gets no onSave/onDelete at all (both are optional; it
// renders read-only on its own when they're absent).
function PlanTab({
  trip,
  dayIndex,
  onDayIndexChange,
}: {
  trip: GeneratedTrip;
  dayIndex: number;
  onDayIndexChange: (index: number) => void;
}) {
  const [showMap, setShowMap] = useState(true);
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
        <div className={`trip-plan-layout ${showMap ? "" : "trip-plan-layout--no-map"}`}>
          <div
            className="trip-plan-layout__days flex items-center gap-1.5 overflow-x-auto rounded-xl border bg-white p-1.5 [scrollbar-width:none] sm:gap-2 sm:rounded-2xl sm:p-2 [&::-webkit-scrollbar]:hidden"
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

          <div className="trip-plan-layout__list min-w-0 overflow-hidden rounded-2xl" style={{ backgroundColor: "#FAF8F5" }}>
            <div className="trip-plan-list-header items-center justify-between rounded-t-2xl px-4 py-3" style={{ backgroundColor: "var(--color-sel-bg)" }}>
              <h3 className="text-base font-bold" style={{ color: "var(--color-brand-green)" }}>
                ลำดับแพลน
              </h3>
              <button
                type="button"
                onClick={() => setShowMap((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border bg-white"
                style={{ borderColor: "var(--color-sel-border)" }}
                title={showMap ? "ซ่อนแผนที่" : "แสดงแผนที่"}
              >
                {showMap ? (
                  <PanelRightClose size={14} style={{ color: "var(--color-brand-green)" }} />
                ) : (
                  <PanelRightOpen size={14} style={{ color: "var(--color-brand-green)" }} />
                )}
              </button>
            </div>
            <div className="flex flex-col gap-3 px-2 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
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
          {showMap && (
            <div className="trip-plan-layout__map min-w-0">
              <TripMapPanel day={day} />
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowMap((v) => !v)}
        aria-pressed={showMap}
        aria-label={showMap ? "ซ่อนแผนที่" : "แสดงแผนที่"}
        className="trip-plan-map-fab flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-accent-orange)" }}
      >
        <MapIcon className="h-6 w-6" />
      </button>
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

// Full-screen photo viewer used by both HeroImageCarousel and PlacePopup.
// Copied verbatim from generated-plan/[id].
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

const MAP_PIN_POSITIONS = [
  { x: "22%", y: "72%" },
  { x: "30%", y: "48%" },
  { x: "42%", y: "52%" },
  { x: "58%", y: "34%" },
  { x: "50%", y: "18%" },
  { x: "70%", y: "16%" },
  { x: "82%", y: "10%" },
];

// Fake-map pin layout + place popup. Copied verbatim from generated-plan/[id].
function TripMapPanel({ day }: { day: Day }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = day.activities.find((a) => a.id === selectedId);
  const selectedIndex = selected ? day.activities.findIndex((a) => a.id === selected.id) : -1;

  return (
    <div className="relative min-h-[280px] rounded-2xl border border-[var(--color-border)]/25 sm:min-h-[320px]">
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <FakeMapBackground />
      </div>

      <button type="button" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
        <MoreVertical size={14} />
      </button>

      {day.activities.map((a, i) => {
        const pos = MAP_PIN_POSITIONS[i % MAP_PIN_POSITIONS.length];
        const isSelected = selectedId === a.id;
        const xPercent = parseFloat(pos.x);
        const openBelow = parseFloat(pos.y) < 45;
        const horizontalAlign = xPercent > 65 ? "right" : xPercent < 25 ? "left" : "center";
        return (
          <div key={a.id} className={`absolute -translate-x-1/2 -translate-y-1/2 ${isSelected ? "z-20" : "z-0"}`} style={{ left: pos.x, top: pos.y }}>
            {selected && isSelected && (
              <div className="trip-place-anchored">
                <PlacePopup key={selected.id} activity={selected} index={i + 1} onClose={() => setSelectedId(null)} openBelow={openBelow} horizontalAlign={horizontalAlign} />
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedId((prev) => (prev === a.id ? null : a.id))}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md"
              style={{ backgroundColor: "var(--color-brand-green)" }}
            >
              {i + 1}
            </button>
          </div>
        );
      })}

      {selected && selectedIndex >= 0 && (
        <div className="trip-place-sheet">
          <button
            type="button"
            aria-label="ปิดข้อมูลสถานที่"
            onClick={() => setSelectedId(null)}
            className="fixed inset-0 z-10 bg-black/35 backdrop-blur-[1px]"
          />
          <PlacePopup key={selected.id} activity={selected} index={selectedIndex + 1} onClose={() => setSelectedId(null)} />
        </div>
      )}

      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
          <Plus size={14} />
        </button>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
          <Minus size={14} />
        </button>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
          <Navigation size={13} />
        </button>
      </div>
    </div>
  );
}

const PLACE_DETAIL_TABS = [
  { key: "about", label: "เกี่ยวกับ" },
  { key: "booking", label: "จอง" },
  { key: "reviews", label: "รีวิว" },
  { key: "photos", label: "รูปภาพ" },
  { key: "mentions", label: "การกล่าวถึง" },
] as const;
type PlaceDetailTab = (typeof PLACE_DETAIL_TABS)[number]["key"];

const PRICE_LEVEL_LABEL: Record<string, string> = {
  PRICE_LEVEL_FREE: "ฟรี",
  PRICE_LEVEL_INEXPENSIVE: "ราคาประหยัด",
  PRICE_LEVEL_MODERATE: "ราคาปานกลาง",
  PRICE_LEVEL_EXPENSIVE: "ราคาสูง",
  PRICE_LEVEL_VERY_EXPENSIVE: "ราคาสูงมาก",
};

// The map pin's detail sheet — same live Google-details lookup and tab set as
// generated-plan/[id]'s. Copied verbatim.
function PlacePopup({
  activity,
  index,
  onClose,
  openBelow,
  horizontalAlign = "center",
  variant = "anchored",
}: {
  activity: Activity;
  index: number;
  onClose: () => void;
  openBelow?: boolean;
  horizontalAlign?: "left" | "center" | "right";
  variant?: "anchored" | "modal";
}) {
  const placeId = activity.location?.googlePlaceId;
  const [details, setDetails] = useState<PlaceFullDetails | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [activeTab, setActiveTab] = useState<PlaceDetailTab>("about");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const isSheet = !window.matchMedia("(min-width: 1025px) and (hover: hover) and (pointer: fine)").matches;
    if (!isSheet) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const fallbackName = activity.location?.name || activity.title;

    fetchResolvedPlaceFullDetails(placeId, fallbackName, controller.signal)
      .then((payload) => {
        if (cancelled) return;
        setDetails(payload);
        setDetailsStatus("loaded");
      })
      .catch((error: unknown) => {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        setDetailsStatus("error");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activity.location?.name, activity.title, loadAttempt, placeId]);

  const name = details?.name || activity.location?.name || activity.title;
  const rating = details?.rating ?? activity.location?.rating;
  const description = details?.editorialSummary || activity.notes || activity.travelNote;
  const CategoryIcon = categoryIcon[activity.category];
  const categoryName = details?.primaryTypeDisplayName || categoryLabel[activity.category];
  const openingHours = details?.currentOpeningHours?.weekdayDescriptions.length
    ? details.currentOpeningHours.weekdayDescriptions
    : details?.regularOpeningHours?.weekdayDescriptions ?? [];
  const openNow = details?.currentOpeningHours?.openNow ?? details?.regularOpeningHours?.openNow;
  const phone = details?.internationalPhoneNumber || details?.nationalPhoneNumber;
  const telPhone = details?.internationalPhoneNumber || details?.nationalPhoneNumber;
  const photos = details?.photos.length
    ? details.photos
    : activity.images?.length
      ? activity.images
      : activity.location?.imageUrl
        ? [activity.location.imageUrl]
        : [];
  const mapsUrl = details?.googleMapsUri || getGoogleMapsUrl(activity.location ?? { name: activity.title });

  const isModal = variant === "modal";
  const horizontalClass =
    horizontalAlign === "right" ? "sm:right-0 sm:left-auto" : horizontalAlign === "left" ? "sm:left-0 sm:right-auto" : "sm:left-1/2 sm:right-auto sm:-translate-x-1/2";
  const verticalClass = openBelow ? "sm:top-full sm:bottom-auto sm:mt-2" : "sm:top-auto sm:bottom-full sm:mb-2";

  return (
    <div
      role="dialog"
      aria-modal={openBelow === undefined}
      aria-label={`ข้อมูลสถานที่ ${name}`}
      className={`fixed inset-x-0 bottom-0 z-20 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border-x-0 border-b-0 bg-white shadow-2xl ${
        isModal ? "trip-place-modal" : `sm:absolute sm:inset-x-auto sm:max-h-[min(38rem,calc(100vh-2rem))] sm:w-[min(34rem,calc(100vw-2rem))] sm:rounded-3xl sm:border ${horizontalClass} ${verticalClass}`
      }`}
      style={{ borderColor: "var(--color-border-tag)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative shrink-0 px-4 pb-3 pt-2 sm:px-6 sm:pt-5">
        <div className="relative mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--color-border-tag)] sm:hidden" aria-hidden="true" />

        <div className="relative flex items-start gap-2.5">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <MapPin size={30} fill="var(--color-brand-green)" strokeWidth={0} style={{ color: "var(--color-brand-green)" }} />
            <span className="absolute inset-x-0 top-[5px] text-center text-[11px] font-extrabold text-white">{index}</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted)] sm:text-[11px]">จุดหมายในแผนของคุณ</p>
            <h4 className="mt-0.5 min-w-0 break-words text-lg font-extrabold leading-6 sm:text-xl">{name}</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดข้อมูลสถานที่"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-white text-[var(--color-muted)] transition hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
            style={{ borderColor: "var(--color-border-tag)" }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="relative z-[1] shrink-0 border-b px-4 sm:px-6" style={{ borderColor: "var(--color-border-tag)" }}>
        <div className="no-scrollbar relative flex min-w-0 items-center gap-5 overflow-x-auto sm:gap-6">
          {PLACE_DETAIL_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              aria-pressed={activeTab === t.key}
              className="-mb-px shrink-0 border-b-2 pb-2.5 pt-1 text-sm font-bold transition-colors"
              style={activeTab === t.key ? { borderColor: "var(--color-accent-orange)", color: "var(--color-accent-orange)" } : { borderColor: "transparent", color: "var(--foreground)" }}
            >
              {t.label}
              {t.key === "reviews" && details?.reviews.length ? ` (${details.reviews.length})` : ""}
              {t.key === "photos" && photos.length ? ` (${photos.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-5">
        {detailsStatus === "loading" && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[var(--color-sel-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-brand-green)]">
            <LoaderCircle size={14} className="animate-spin" />
            กำลังโหลดข้อมูลสถานที่ล่าสุด…
          </div>
        )}

        {detailsStatus === "error" && (
          <div className="mb-3 flex flex-col items-start gap-2 rounded-2xl bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span>โหลดข้อมูลเต็มไม่สำเร็จ กำลังแสดงข้อมูลจากแผนแทน</span>
            <button
              type="button"
              onClick={() => {
                setDetailsStatus("loading");
                setLoadAttempt((attempt) => attempt + 1);
              }}
              className="shrink-0 rounded-full border border-[var(--color-danger-border)] bg-white px-2.5 py-1 font-bold"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {activeTab === "about" && (
          <div>
            <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-start">
              {description ? (
                <p className="min-w-0 flex-1 break-words text-sm leading-6 text-[var(--foreground)] sm:text-[15px] sm:leading-7">{description}</p>
              ) : (
                <p className="min-w-0 flex-1 text-sm text-[var(--color-muted)]">ยังไม่มีคำอธิบายสำหรับสถานที่นี้</p>
              )}
              {photos[0] && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(0)}
                  aria-label={`ดูรูปของ ${name} แบบเต็มจอ`}
                  className="group relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-[var(--color-sel-bg)] min-[380px]:h-28 min-[380px]:w-28"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photos[0]} alt={name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm">
                    <Maximize2 size={10} />
                  </span>
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {details?.priceLevel && PRICE_LEVEL_LABEL[details.priceLevel] && (
                <span className="rounded-md bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
                  {PRICE_LEVEL_LABEL[details.priceLevel]}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
                <CategoryIcon size={12} />
                {categoryName}
              </span>
              {activity.cost > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
                  <CircleDollarSign size={12} />
                  {formatTHB(activity.cost)}
                </span>
              )}
            </div>

            {rating != null && (
              <p className="mt-3 flex items-center gap-1.5 text-sm">
                <Star size={16} fill="currentColor" className="shrink-0 text-[var(--color-accent-orange)]" />
                <span className="font-extrabold text-[var(--foreground)]">{rating.toFixed(1)}</span>
                {details?.userRatingCount != null && <span className="text-[var(--color-muted)]">({details.userRatingCount.toLocaleString("th-TH")})</span>}
              </p>
            )}

            <div className="mt-3 grid gap-2.5 text-sm text-[var(--color-muted)]">
              {openNow != null && (
                <p className="flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 shrink-0" />
                  <span className={openNow ? "font-bold text-[var(--color-brand-green)]" : "font-bold text-[var(--color-danger)]"}>
                    {openNow ? "เปิดอยู่ตอนนี้" : "ปิดอยู่ตอนนี้"}
                  </span>
                </p>
              )}
              {details?.address && (
                <p className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span>{details.address}</span>
                </p>
              )}
              {phone && telPhone && (
                <a href={`tel:${telPhone}`} className="flex items-start gap-2 hover:text-[var(--color-brand-green)]">
                  <Phone size={16} className="mt-0.5 shrink-0" />
                  <span>{phone}</span>
                </a>
              )}
              {details?.websiteUri && (
                <a href={details.websiteUri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 hover:text-[var(--color-brand-green)]">
                  <Globe2 size={16} className="mt-0.5 shrink-0" />
                  <span className="truncate">เว็บไซต์ของสถานที่</span>
                </a>
              )}
            </div>

            {openingHours.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-[#1a73e8]">แสดงเวลาเปิด</summary>
                <div className="mt-2 grid gap-1 text-[var(--color-muted)]">
                  {openingHours.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {activeTab === "booking" && (
          <div className="rounded-2xl bg-[var(--color-page-cream)] p-3 text-xs sm:text-sm">
            <p className="font-bold text-[var(--color-brand-green)]">ข้อมูลการจอง</p>
            <p className="mt-1 text-[var(--color-muted)]">ตรวจสอบราคา เวลาให้บริการ หรือช่องทางจองจากเว็บไซต์ของสถานที่</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {details?.websiteUri && (
                <a href={details.websiteUri} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[var(--color-brand-green)] px-3 py-1.5 text-xs font-bold text-white">
                  ไปที่เว็บไซต์
                </a>
              )}
              {activity.category === "hotel" && <HotelBookingButton name={name} className="rounded-full border px-3 py-1.5 text-xs font-bold" />}
              {!details?.websiteUri && activity.category !== "hotel" && <span className="text-[var(--color-muted)]">ยังไม่มีข้อมูลการจองสำหรับสถานที่นี้</span>}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="grid gap-2 sm:max-h-64 sm:overflow-y-auto sm:pr-1">
            {details?.reviews.length ? (
              details.reviews.map((review, reviewIndex) => (
                <article key={`${review.authorName}-${review.publishTime ?? reviewIndex}`} className="rounded-2xl border p-3" style={{ borderColor: "var(--color-border-tag)" }}>
                  <div className="flex items-center gap-2">
                    {review.authorPhotoUri ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={review.authorPhotoUri} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-sel-bg)] text-xs font-bold text-[var(--color-brand-green)]">
                        {review.authorName.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{review.authorName}</p>
                      <p className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
                        <Star size={10} fill="currentColor" className="text-[var(--color-accent-orange)]" />
                        {review.rating.toFixed(1)}
                        {review.relativePublishTimeDescription && <> · {review.relativePublishTimeDescription}</>}
                      </p>
                    </div>
                  </div>
                  {review.text && <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">{review.text}</p>}
                </article>
              ))
            ) : (
              <p className="rounded-2xl bg-[var(--color-page-cream)] p-4 text-center text-xs text-[var(--color-muted)]">ยังไม่มีรีวิวที่แสดงได้</p>
            )}
          </div>
        )}

        {activeTab === "photos" &&
          (photos.length ? (
            <div className="grid grid-cols-2 gap-2 sm:max-h-64 sm:grid-cols-3 sm:overflow-y-auto sm:pr-1">
              {photos.map((src, photoIndex) => (
                <button
                  key={`${src}-${photoIndex}`}
                  type="button"
                  onClick={() => setLightboxIndex(photoIndex)}
                  aria-label={`ดูรูปของ ${name} รูปที่ ${photoIndex + 1} แบบเต็มจอ`}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-[var(--color-sel-bg)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${name} รูปที่ ${photoIndex + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                  <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100">
                    <Maximize2 size={11} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[var(--color-page-cream)] p-4 text-center text-xs text-[var(--color-muted)]">ยังไม่มีรูปภาพของสถานที่นี้</p>
          ))}

        {activeTab === "mentions" && (
          <div className="rounded-2xl bg-[var(--color-page-cream)] p-3 text-xs leading-5 text-[var(--color-muted)] sm:text-sm">
            {activity.notes || activity.travelNote || "ยังไม่มีการกล่าวถึงเพิ่มเติมในแผนนี้"}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5" style={{ borderColor: "var(--color-border-tag)" }}>
        <span className="hidden text-[11px] text-[var(--color-muted)] sm:inline">ดูตำแหน่งและเส้นทาง</span>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 sm:ml-auto sm:min-h-0 sm:w-auto"
          style={{ backgroundColor: "var(--color-accent-orange)" }}
        >
          <Navigation size={13} />
          เปิดใน Google Maps
        </a>
      </div>

      {lightboxIndex !== null &&
        photos.length > 0 &&
        createPortal(
          <ImageLightbox title={name} images={photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />,
          document.body
        )}
    </div>
  );
}
