"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Activity as PulseIcon,
  Anchor,
  ArrowLeft,
  Asterisk,
  Beer,
  Bike,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CloudSun,
  Coffee,
  Compass,
  Footprints,
  Globe2,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Lock,
  Mountain,
  Maximize2,
  MapPin,
  Menu,
  MessageSquare,
  Minus,
  MoreVertical,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  RefreshCcw,
  Repeat2,
  Share2,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Activity, ActivityCategory, Day, Destination, GeneratedTrip, TravelFromPrevious, TripAccommodation } from "@/types";
import { DestinationPickerDialog } from "@/components/consumer/DestinationPickerDialog";
import { DatePickerDialog } from "@/components/consumer/DatePickerDialog";
import { categoryBgVar, categoryColorVar, categoryIcon, categoryLabel } from "@/lib/category-styles";
import { searchExternalPlaces, type ExternalSearchPlace } from "@/lib/external-places-api";
import { EXTERNAL_TO_ACTIVITY_CATEGORY } from "@/lib/place-mock-metadata";
import { addTripMediaFromPlace, getTripGallery, resolveCoverImageUrl } from "@/lib/trip-media-api";
import { TripGalleryDialog } from "@/components/plan/TripGalleryDialog";

// Bespoke per-activity icons for the Luang Prabang demo itinerary — overrides
// the generic category icon when an activity sets `icon`.
const ACTIVITY_ICON_OVERRIDE: Record<string, typeof Anchor> = {
  anchor: Anchor,
  bike: Bike,
  mountain: Mountain,
  ticket: Ticket,
  beer: Beer,
  coffee: Coffee,
  pulse: PulseIcon,
};
import {
  buildGeneratedTripFromBackendTrip,
  confirmGeneratedTrip,
  DEMO_LUANG_PRABANG_ID,
  generateTripFromDraft,
  getGeneratedTrip,
  getOrCreateDemoLuangPrabangTrip,
  INTENSITY_TO_PACE,
  PACE_DESCRIPTION,
  replaceGeneratedTripId,
  saveGeneratedTrip,
  updateGeneratedTrip,
} from "@/lib/generated-trips";
import { PACE_TO_INTENSITY } from "@/lib/generate-plan-mapping";
import { buildActivity, createTripOnServer, reconcileTripWithServer } from "@/lib/trips-create-api";
import { getTrip } from "@/lib/trips-api";
import {
  createTripDayOnServer,
  createTripItemOnServer,
  reorderTripItemsOnServer,
  updateTripDayOnServer,
  updateTripItemOnServer,
  updateTripOnServer,
  type UpdateTripItemRequest,
} from "@/lib/trips-update-api";
import { getTripDrafts } from "@/lib/trip-drafts";
import {
  formatDuration,
  formatTHB,
  getDayRouteEstimate,
  getDayTotalCost,
  getGoogleMapsUrl,
  getTripDistanceKm,
  getTripPlaceStats,
  getTripTotalCost,
} from "@/lib/trip-utils";
import { FakeMapBackground } from "@/components/plan/FakeMapBackground";
import { BudgetManagementPanel } from "@/components/plan/BudgetManagementPanel";
import { HotelBookingButton } from "@/components/plan/HotelBookingButton";
import { PlaceDiscoveryPanel, DayTab, TravelConnectorRow } from "@/components/plan/SelfPlanBuilderTab";
import { RemixSetupDialog } from "@/components/plan/RemixSetupDialog";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRemixTrip, type RemixSourceMeta } from "@/hooks/useRemixTrip";
import { consumePendingRemixIntent, setPendingRemixIntent } from "@/lib/pending-remix";

type TabKey = "overview" | "plan" | "weather" | "budget" | "chat";

// One tab set for every trip regardless of planMode — the "overview" tab
// used to switch its whole layout (and these labels) based on a local-only
// "was this built in self mode" flag, which showed a different design to
// anyone who didn't create the trip in this same browser. See OverviewTab,
// which now renders the same accommodation/place-discovery/itinerary layout
// for every trip, gated only by canEdit/isOwner.
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "ภาพรวมทริป" },
  { key: "plan", label: "แพลนทริป" },
  { key: "weather", label: "สภาพอากาศ" },
  { key: "budget", label: "สรุปงบ" },
  { key: "chat", label: "ห้องแชท" },
];

// Adjusts the day list to a new nights count — used both by "แก้ไขทริป"
// (editing duration) and "เพิ่มวัน" (adding a single day). Never drops a day
// that still has activities, even if that means keeping more days than
// asked for — silently discarding part of the traveler's plan would be worse
// than a slightly-off count.
function resizeDays(days: Day[], nightsCount: number): Day[] {
  const dayCount = Math.max(nightsCount + 1, 1);
  if (dayCount === days.length) return days;

  if (dayCount > days.length) {
    const lastDate = days.length ? new Date(days[days.length - 1].date).getTime() : Date.now();
    const extraDays: Day[] = Array.from({ length: dayCount - days.length }, (_, i) => ({
      id: crypto.randomUUID(),
      dayNumber: days.length + i + 1,
      date: new Date(lastDate + (i + 1) * 86_400_000).toISOString().slice(0, 10),
      activities: [],
    }));
    return [...days, ...extraDays];
  }

  const lastNonEmptyIndex = days.reduce((acc, d, i) => (d.activities.length > 0 ? i : acc), 0);
  const keep = Math.max(dayCount, lastNonEmptyIndex + 1);
  return days.slice(0, keep);
}

function durationLabelFor(days: Day[]): string {
  return `${days.length} วัน ${Math.max(days.length - 1, 0)} คืน`;
}

// DatePickerDialog's result.label is always "X วัน Y คืน" (see nightsLabel
// there) regardless of which tab produced it — pull the nights count back
// out instead of re-deriving it from start/endDate, since the "จำนวนคืน" tab
// never sets those.
function parseNightsFromLabel(label: string): number {
  const match = label.match(/(\d+)\s*คืน/);
  return match ? Number(match[1]) : 0;
}

// Pulls the bare digits out of a "฿7,500 / วัน"-style budgetLabel for
// EditNumberField — "" (not "0") when there's nothing to parse (e.g.
// "ยังไม่ระบุ"), so the input starts empty instead of showing a false 0.
function parseBudgetAmount(label: string): string {
  const digits = label.replace(/[^\d]/g, "");
  return digits ? String(Number(digits)) : "";
}

// Only called when the user picked an explicit date range (DatePickerDialog's
// "ระบุวันที่" tab) — re-sequences each day's date from that start date while
// keeping dayNumber/activities untouched, so the itinerary's calendar actually
// reflects the dates just chosen instead of silently keeping the old ones.
function reanchorDayDates(days: Day[], startDateIso: string): Day[] {
  const start = new Date(`${startDateIso.slice(0, 10)}T00:00:00Z`).getTime();
  if (!Number.isFinite(start)) return days;
  return days.map((day, i) => ({ ...day, date: new Date(start + i * 86_400_000).toISOString().slice(0, 10) }));
}

// Quick-toggle presets for "เงื่อนไข / ข้อจำกัด" — same copy as the create-trip
// wizard's COND_OPTIONS/MORE_COND_OPTIONS (see app/create-trip/page.tsx), kept
// separate since that file doesn't export them. Chips just add/remove
// themselves from the comma-joined specialNotes text below; the free-text box
// still accepts anything not covered by a chip.
const EDIT_COND_OPTIONS = ["มีผู้สูงอายุ", "มีรถส่วนตัว", "เดินเยอะไม่ได้", "มีเด็กเล็ก", "ผู้ใช้รถเข็น"];
const EDIT_MORE_COND_OPTIONS = ["มังสวิรัติ", "ฮาลาล", "แพ้อาหารทะเล", "ไม่ขึ้นที่สูง", "งบจำกัดเข้ม", "เดินทางคนเดียว"];

// Free-text fallback for the older `travelNote` display spots — kept in sync
// with `travelFromPrevious` so both stay readable even where the structured
// object isn't rendered yet.
function summarizeTravelNote(travel: TravelFromPrevious): string {
  const parts: string[] = [];
  if (travel.durationMin !== undefined) parts.push(`~${travel.durationMin} นาที`);
  if (travel.distanceKm !== undefined) parts.push(`${travel.distanceKm} กม.`);
  return parts.join(" · ");
}

export default function GeneratedPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trip, setTrip] = useState<GeneratedTrip | null | undefined>(undefined);
  const [tab, setTab] = useState<TabKey>("overview");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [accommodationDialogOpen, setAccommodationDialogOpen] = useState(false);
  // undefined `activity` = add mode (AddActivityDialog starts blank); set =
  // edit mode (pre-filled, day-switching hidden, id preserved on save).
  const [activityDialogRequest, setActivityDialogRequest] = useState<{ dayId: string; activity?: Activity } | null>(
    null
  );
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [remixDialogOpen, setRemixDialogOpen] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const { backendUser } = useAuth();
  const { showToast } = useToast();
  const remix = useRemixTrip();
  // Every trip opens read-only (no add/delete/edit affordances) so it
  // doesn't look editable by accident — see canEdit below. The one
  // exception: arriving straight from "สร้างแพลน" on create-trip (?edit=1)
  // starts unlocked, since the traveler just created this trip and is about
  // to build it out. There's no visible "แก้ไขแพลน"/"เสร็จสิ้น" button
  // anymore (removed per product decision), but the underlying lock state
  // stays — a trip only ever unlocks via that one entry point.
  const [editUnlocked, setEditUnlocked] = useState(() => searchParams.get("edit") === "1");

  // Backend-wins once a trip has a real server row: a local-only draft
  // (never saved — see `backendSynced`) has nothing to reconcile against, so
  // it renders straight from localStorage. Otherwise this always refetches
  // GET /trips/:id fresh on every visit and replaces the localStorage cache
  // wholesale — days/activities, cover, and budget already write straight
  // through to the server the moment they're edited (see
  // createTripItemOnServer, setTripCover, trip-budget-api.ts), so the
  // server copy is authoritative and a stale local copy (e.g. from editing
  // this same trip on another device) should never keep winning just
  // because it got here first. The local copy (if any) is shown immediately
  // so the page isn't blank while the refetch is in flight.
  useEffect(() => {
    if (params.id === DEMO_LUANG_PRABANG_ID) {
      const loaded = getOrCreateDemoLuangPrabangTrip();
      setTrip(loaded);
      if (loaded.status === "confirmed") setTab("plan");
      return;
    }

    const local = getGeneratedTrip(params.id);

    if (local && !local.backendSynced) {
      setTrip(local);
      if (local.status === "confirmed") setTab("plan");
      return;
    }

    if (local) {
      setTrip(local);
      if (local.status === "confirmed") setTab("plan");
    }

    let cancelled = false;
    getTrip(params.id)
      .then((backendTrip) => {
        if (cancelled) return;
        if (!backendTrip) {
          // Gone server-side (e.g. deleted from another device) — keep
          // showing the stale local copy rather than a hard "not found" if
          // we have one; otherwise there was never anything to show.
          if (!local) setTrip(null);
          return;
        }
        const loaded = buildGeneratedTripFromBackendTrip(backendTrip, local?.remixedFrom);
        // draftId only ever exists locally (links back to the TripDraft this
        // trip was generated from, e.g. for handleRegenerate's "AI plan I can
        // redo from its original brief" lookup) — buildGeneratedTripFromBackendTrip
        // has no draft to read it from, so it defaults to the trip's own id.
        // Keep the real one instead of clobbering it on every reconcile.
        if (local) loaded.draftId = local.draftId;
        if (local) updateGeneratedTrip(loaded.id, loaded);
        setTrip(loaded);
        if (loaded.status === "confirmed") setTab("plan");
      })
      .catch((err) => {
        console.warn("รีเฟรชข้อมูลทริปจาก backend ไม่สำเร็จ", err);
        // Keep showing the local copy already set above over a transient
        // network error instead of blanking the page.
        if (!cancelled && !local) setTrip(null);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // GET/PATCH /trips/:id only ever carries the flat `sourceTripId` (see
  // BackendTrip in lib/trips-api.ts) — no source title or owner name. Those
  // only arrive once, in the remix response itself (buildRemixedTripShell in
  // useRemixTrip.ts), and buildGeneratedTripFromBackendTrip above carries
  // that forward across a refetch in *this* browser. Opening a remixed trip
  // fresh (another device, cleared storage, shared link) has no such shell
  // to carry forward, so this fills the banner in with one extra read of the
  // source trip — silently left with just the id/link if that read fails.
  useEffect(() => {
    if (!trip?.remixedFrom || trip.remixedFrom.sourceTitle) return;
    const sourceTripId = trip.remixedFrom.sourceTripId;
    let cancelled = false;
    getTrip(sourceTripId)
      .then((source) => {
        if (cancelled || !source) return;
        applyPatch({
          remixedFrom: {
            sourceTripId,
            sourceTitle: source.title || source.destination,
            sourceCreatorName: source.customer?.name,
          },
        });
      })
      .catch(() => {
        // No title to show — RemixSourceBanner falls back to a plain link.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id, trip?.remixedFrom?.sourceTripId, trip?.remixedFrom?.sourceTitle]);

  // Strip ?edit=1 once its one-time effect (unlocking editUnlocked's initial
  // state above) has been read — otherwise reloading/bookmarking this URL
  // would keep forcing edit mode back open.
  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      router.replace(`/generated-plan/${params.id}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Returning from the forced /login redirect (see handleRemixClick below) —
  // only consumes the stored intent once we actually know backendUser, so a
  // render where the session is still restoring never discards it.
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
    // Always the new trip's id — never the source trip's.
    router.push(`/generated-plan/${remix.newTripId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remix.status, remix.newTripId]);

  if (trip === undefined) return null;

  if (trip === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-bold">ไม่พบแผนทริปนี้</p>
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

  // Local-only/never-synced trips have no ownerId at all (see
  // buildGeneratedTripFromBackendTrip) and are always this browser's own —
  // default to owner in that case. Otherwise ownership is decided purely by
  // comparing against the signed-in backend user, never by edit-lock state.
  const isOwner = !trip.ownerId || (!!backendUser && backendUser.id === trip.ownerId);
  // Non-owners can only remix a trip once it's public — see PATCH /trips/:id
  // { visibility } and POST /trips/:sourceTripId/remix in lib/trip-remix-api.ts.
  // Owners can always remix their own trip regardless of visibility.
  const canRemix = isOwner || trip.visibility === "public";
  const remixSourceMeta: RemixSourceMeta = {
    sourceTripId: trip.id,
    sourceTitle: trip.title || trip.destination,
    sourceCreatorName: trip.creator?.name,
    sourceDurationDays: trip.days.length,
  };

  function handleRemixClick() {
    if (!backendUser) {
      // Never call the Remix API before auth is confirmed — send the
      // visitor through the existing login flow and remember which trip
      // they meant to remix so we can reopen this dialog on return.
      setPendingRemixIntent(trip!.id);
      router.push(`/login?redirect=${encodeURIComponent(`/generated-plan/${trip!.id}`)}`);
      return;
    }
    remix.reset();
    setRemixDialogOpen(true);
  }

  function handleConfirm() {
    confirmGeneratedTrip(trip!.id);
    setTrip({ ...trip!, status: "confirmed" });
    setTab("plan");
  }

  // Pushes the current in-memory trip to the granular PATCH endpoints
  // instead of POST /trips/create, for a trip that already has a real
  // backend row (see GeneratedTrip.backendSynced). There's no per-field
  // dirty-tracking, so this just re-sends the trip/day/item's full current
  // values each time — harmless since PATCH is idempotent, and simpler than
  // maintaining a diff. This is a catch-all fallback on top of the
  // per-action autosave in handleAddDay/handleSaveActivity/
  // handleUpdateActivityTravel above — days/items not yet in
  // backendDayIds/backendItemIds (that per-action sync hasn't caught up
  // with, e.g. because it's still in flight) stay local-only here too.
  async function syncTripUpdatesToServer(current: GeneratedTrip) {
    // Never sends `status` — this endpoint is shared with autosave, and the
    // contract is explicit that plan-level saves don't touch trip status.
    await updateTripOnServer(current.id, {
      title: current.title || current.destination,
      destination: current.destination,
      durationDays: current.days.length,
      durationNights: Math.max(current.days.length - 1, 0),
      pace: current.pace,
      budgetLimit: current.budgetGoal,
      specialNotes: current.conditionsLabel.slice(0, 2000),
    });

    const knownDayIds = new Set(current.backendDayIds ?? []);
    const knownItemIds = new Set(current.backendItemIds ?? []);

    await Promise.all([
      ...current.days
        .filter((day) => knownDayIds.has(day.id))
        .map((day) => updateTripDayOnServer(day.id, { dayNumber: day.dayNumber, date: day.date })),
      ...current.days
        .flatMap((day) => day.activities)
        .filter((activity) => knownItemIds.has(activity.id) && activity.travelFromPrevious)
        .map((activity) => updateTripItemOnServer(activity.id, travelPatch(activity.travelFromPrevious!))),
    ]);
  }

  // Fire-and-forget, same as every other per-action autosave in this file
  // (handleSaveActivity, handleUpdateActivityTravel, etc.) — called right
  // after EditTripDialog's onSave applies the patch locally, since there's
  // no more standalone "บันทึก" button to batch trip-level edits behind.
  async function syncTripToServer(nextTrip: GeneratedTrip) {
    try {
      if (nextTrip.backendSynced) {
        await syncTripUpdatesToServer(nextTrip);
      } else {
        const created = await createTripOnServer(nextTrip);
        const reconciled = reconcileTripWithServer(nextTrip, created);
        replaceGeneratedTripId(nextTrip.id, reconciled);
        setTrip(reconciled);
        // The URL still points at the old client-generated id — swap it for
        // the real one so a reload/bookmark doesn't 404 (getGeneratedTrip
        // can no longer find the old id; it was just renamed in storage).
        router.replace(`/generated-plan/${reconciled.id}`);
      }
    } catch (err) {
      console.warn("บันทึกทริปไปเซิร์ฟเวอร์ไม่สำเร็จ", err);
    }
  }

  // "ส่วนตัว"/"เผยแพร่" toggle in TripAttributionBar — a trip must be public
  // before anyone besides its owner can remix it (see canRemix above and
  // POST /trips/:sourceTripId/remix in lib/trip-remix-api.ts). Only ever
  // called for a trip that already has a real backend row (see
  // TripAttributionBar's onChangeVisibility guard) since PATCH /trips/:id
  // has nothing to target otherwise.
  async function handleChangeVisibility(next: "private" | "public") {
    if (!trip || visibilitySaving) return;
    setVisibilitySaving(true);
    try {
      await updateTripOnServer(trip.id, { visibility: next });
      applyPatch({ visibility: next, publishedAt: next === "public" ? new Date().toISOString() : trip.publishedAt });
      showToast(next === "public" ? "เผยแพร่ทริปนี้แล้ว คนอื่นนำไปทำสำเนาได้" : "เปลี่ยนเป็นทริปส่วนตัวแล้ว");
    } catch (err) {
      console.warn(err);
      showToast("เปลี่ยนสถานะการแชร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
    setVisibilitySaving(false);
  }

  // "แก้ไขทริป" — visible to the owner regardless of the current lock state
  // (see canEdit) since it's the only entry point left into "generate plan"
  // mode now that the standalone "แก้ไขแพลน" toggle is gone. Unlocks editing
  // for the whole page and opens the metadata dialog at the same time.
  function handleEditTripClick() {
    setEditUnlocked(true);
    setEditDialogOpen(true);
  }

  function handleRegenerate() {
    const draft = getTripDrafts().find((d) => d.id === trip!.draftId);
    if (!draft) return;
    setRegenerating(true);
    window.setTimeout(() => {
      const regenerated = generateTripFromDraft(draft);
      saveGeneratedTrip(regenerated);
      router.replace(`/generated-plan/${regenerated.id}`);
    }, 900);
  }

  function applyPatch(patch: Partial<GeneratedTrip>) {
    setTrip((prev) => {
      if (!prev) return prev;
      updateGeneratedTrip(prev.id, patch);
      return { ...prev, ...patch };
    });
  }

  // Swaps a locally-generated day/activity id for the real one the backend
  // just returned, via the same functional setTrip pattern as updateDay
  // below (safe against other edits landing in the same tick).
  function replaceDayId(localId: string, serverId: string) {
    setTrip((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d) => (d.id === localId ? { ...d, id: serverId } : d));
      const backendDayIds = [...(prev.backendDayIds ?? []), serverId];
      updateGeneratedTrip(prev.id, { days, backendDayIds });
      return { ...prev, days, backendDayIds };
    });
  }

  function replaceActivityId(dayId: string, localId: string, serverId: string) {
    setTrip((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d) =>
        d.id === dayId ? { ...d, activities: d.activities.map((a) => (a.id === localId ? { ...a, id: serverId } : a)) } : d
      );
      const backendItemIds = [...(prev.backendItemIds ?? []), serverId];
      updateGeneratedTrip(prev.id, { days, backendItemIds });
      return { ...prev, days, backendItemIds };
    });
  }

  function handleAddDay() {
    const days = trip!.days;
    const lastDate = days.length ? new Date(days[days.length - 1].date).getTime() : Date.now();
    const localId = crypto.randomUUID();
    const newDay: Day = {
      id: localId,
      dayNumber: days.length + 1,
      date: new Date(lastDate + 86_400_000).toISOString().slice(0, 10),
      activities: [],
    };
    const nextDays = [...days, newDay];
    applyPatch({ days: nextDays, durationLabel: durationLabelFor(nextDays) });

    // "เพิ่มวัน" — POST /trips/:planId/days, so this day has a real id to
    // add/edit activities and PATCH itself against right away.
    if (trip!.backendSynced) {
      createTripDayOnServer(trip!.id, { dayNumber: newDay.dayNumber, date: newDay.date })
        .then((created) => replaceDayId(localId, created.id))
        .catch((err) => console.warn("เพิ่มวันไปเซิร์ฟเวอร์ไม่สำเร็จ", err));
    }
  }

  // Reads/writes `prev.days` from the functional setTrip updater rather than
  // the `trip` closure — several of these can fire synchronously in one tick
  // (e.g. the self-mode plan builder's batch "เพิ่มสถานที่" add), and reading
  // the stale `trip!.days` closure in that case would make each call overwrite
  // the previous one's addition instead of accumulating.
  function updateDay(dayId: string, updater: (day: Day) => Day) {
    setTrip((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d) => (d.id === dayId ? updater(d) : d));
      updateGeneratedTrip(prev.id, { days });
      return { ...prev, days };
    });
  }

  function travelPatch(travel: TravelFromPrevious): UpdateTripItemRequest {
    return {
      travelTypeFromPrev: travel.type,
      travelCustomTypeFromPrev: travel.customType,
      travelTimeFromPrevMin: travel.durationMin,
      travelDistanceFromPrevKm: travel.distanceKm,
      travelCostFromPrevAmount: travel.costAmount,
      travelCostFromPrevCurrency: travel.costCurrency,
      travelNotesFromPrev: travel.notes,
    };
  }

  // Shared by both the "+เพิ่มสถานที่" flow (a brand-new id, never matches an
  // existing activity, so it's always appended) and AddActivityDialog's edit
  // mode (the id matches an existing activity, so it's replaced in place).
  function handleSaveActivity(dayId: string, activity: Activity) {
    const day = trip!.days.find((d) => d.id === dayId);
    const exists = day?.activities.some((a) => a.id === activity.id) ?? false;
    const orderIndex = day?.activities.length ?? 0;

    updateDay(dayId, (d) => ({
      ...d,
      activities: exists
        ? d.activities.map((a) => (a.id === activity.id ? activity : a))
        : [...d.activities, activity],
    }));

    if (!trip!.backendSynced) return;

    if (!exists && (trip!.backendDayIds ?? []).includes(dayId)) {
      // "เพิ่มสถานที่/กิจกรรม" — POST /days/:dayId/items.
      const localId = activity.id;
      const placeId = activity.location?.googlePlaceId;
      createTripItemOnServer(dayId, buildActivity(activity, orderIndex))
        .then((created) => {
          replaceActivityId(dayId, localId, created.id);
          // The place's own photo (activity.location.imageUrl) is only ever
          // a live link to the external API — it isn't part of this trip's
          // media gallery until explicitly attached here, so cover-image
          // fallback (see LemonCard on /main) and the gallery dialog can
          // actually find it later.
          if (placeId) {
            addTripMediaFromPlace(trip!.id, placeId, created.id).catch((err) =>
              console.warn("บันทึกรูปสถานที่ไปเซิร์ฟเวอร์ไม่สำเร็จ", err)
            );
          }
        })
        .catch((err) => console.warn("เพิ่มกิจกรรมไปเซิร์ฟเวอร์ไม่สำเร็จ", err));
    } else if (exists && (trip!.backendItemIds ?? []).includes(activity.id) && activity.travelFromPrevious) {
      // "แก้กิจกรรม" — PATCH /items/:itemId. Only the travel-from-previous
      // fields are confirmed accepted by the backend's UpdateItemDto (see
      // trips-update-api.ts) — other edited fields (title/time/cost/notes)
      // have no confirmed server-side path yet and stay local-only.
      updateTripItemOnServer(activity.id, travelPatch(activity.travelFromPrevious)).catch((err) =>
        console.warn("แก้ไขกิจกรรมไปเซิร์ฟเวอร์ไม่สำเร็จ", err)
      );
    }
  }

  function handleDeleteActivity(dayId: string, activityId: string) {
    updateDay(dayId, (d) => ({ ...d, activities: d.activities.filter((a) => a.id !== activityId) }));
  }

  // Drag-reordered stop order — PATCH /days/:dayId/items/order (see
  // reorderTripItemsOnServer's doc comment). The backend 400s unless itemIds
  // matches every item under that day exactly, so this only fires once the
  // whole day (and every activity in it) already has a real backend row —
  // otherwise it stays local-only, same as the other free-form edits above.
  function handleReorderActivities(dayId: string, activities: Activity[]) {
    updateDay(dayId, (d) => ({ ...d, activities }));

    if (!trip!.backendSynced || !(trip!.backendDayIds ?? []).includes(dayId)) return;
    const backendItemIds = trip!.backendItemIds ?? [];
    if (!activities.every((a) => backendItemIds.includes(a.id))) return;

    reorderTripItemsOnServer(
      dayId,
      activities.map((a) => a.id)
    ).catch((err) => console.warn("เรียงลำดับกิจกรรมไปเซิร์ฟเวอร์ไม่สำเร็จ", err));
  }

  function handleUpdateActivityTravel(dayId: string, activityId: string, travel: TravelFromPrevious) {
    updateDay(dayId, (d) => ({
      ...d,
      activities: d.activities.map((a) =>
        a.id === activityId ? { ...a, travelFromPrevious: travel, travelNote: summarizeTravelNote(travel) } : a
      ),
    }));

    // "แก้กิจกรรม" — PATCH /items/:itemId.
    if (trip!.backendSynced && (trip!.backendItemIds ?? []).includes(activityId)) {
      updateTripItemOnServer(activityId, travelPatch(travel)).catch((err) =>
        console.warn("แก้ไขเส้นทางไปเซิร์ฟเวอร์ไม่สำเร็จ", err)
      );
    }
  }

  const isConfirmed = trip.status === "confirmed";
  // Read-only by default regardless of draft/confirmed status. Viewing a
  // trip from /main never carries ?edit=1, so it always lands here
  // read-only; only arriving straight from create-trip, or clicking
  // "แก้ไขทริป" (see handleEditTripClick), unlocks it — and it stays unlocked
  // for the rest of the session now that every edit autosaves on its own,
  // with no more standalone "บันทึก" button to lock back down after.
  // isOwner-gated defensively so a non-owner can never end up with edit
  // affordances even via a stray ?edit=1 on a shared link.
  const canEdit = isOwner && editUnlocked;

  return (
    <div
      className={`min-h-screen bg-white ${!isOwner && canRemix ? "pb-28 sm:pb-0" : ""}`}
    >
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

      <Hero
        trip={trip}
        canEdit={canEdit}
        onManagePhotos={() => setGalleryDialogOpen(true)}
        onBack={() => router.back()}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {galleryDialogOpen && (
        <TripGalleryDialog
          tripId={trip.id}
          onClose={() => setGalleryDialogOpen(false)}
          onCoverChanged={(coverImage, mediaSummary) => applyPatch({ coverImage, mediaSummary })}
        />
      )}

      <div className="sticky top-0 z-40 px-4 py-3 sm:px-6" style={{ backgroundColor: "#0F2419" }}>
        <div className="mx-auto max-w-2xl">
          <PlanTabs tabs={TABS} tab={tab} setTab={setTab} />
        </div>
      </div>

      <div className="relative rounded-t-[28px] bg-white">
        <TripAttributionBar
          trip={trip}
          isOwner={isOwner}
          visibilitySaving={visibilitySaving}
          onChangeVisibility={trip.backendSynced ? handleChangeVisibility : undefined}
        />

        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
          {trip.remixedFrom && <RemixSourceBanner remixedFrom={trip.remixedFrom} />}
          {trip.generationNotice && <GenerationNoticeBanner notice={trip.generationNotice} />}

          {tab === "overview" && (
            <OverviewTab
              trip={trip}
              isConfirmed={isConfirmed}
              isOwner={isOwner}
              canRemix={canRemix}
              onRemixClick={handleRemixClick}
              canEdit={canEdit}
              bannerDismissed={bannerDismissed}
              regenerating={regenerating}
              onDismissBanner={() => setBannerDismissed(true)}
              onRegenerate={handleRegenerate}
              onConfirm={handleConfirm}
              onEditTrip={handleEditTripClick}
              onEditAccommodation={() => setAccommodationDialogOpen(true)}
              onAddActivity={(dayId) => setActivityDialogRequest({ dayId })}
              onEditActivity={(dayId, activity) => setActivityDialogRequest({ dayId, activity })}
              onDeleteActivity={handleDeleteActivity}
              onAddActivityDirect={handleSaveActivity}
              onSaveAccommodation={(accommodation) => applyPatch({ accommodation })}
              onAddDay={handleAddDay}
              onGoToPlanTab={() => setTab("plan")}
              onUpdateActivityTravel={handleUpdateActivityTravel}
              onReorderActivities={handleReorderActivities}
            />
          )}
          {tab === "plan" && (
            <PlanTab
              trip={trip}
              isOwner={isOwner}
              canRemix={canRemix}
              onRemixClick={handleRemixClick}
              canEdit={canEdit}
              onAddDay={handleAddDay}
              onAddActivity={(dayId) => setActivityDialogRequest({ dayId })}
              onEditActivity={(dayId, activity) => setActivityDialogRequest({ dayId, activity })}
              onDeleteActivity={handleDeleteActivity}
              onUpdateActivityTravel={handleUpdateActivityTravel}
            />
          )}
          {tab === "weather" && <WeatherTab />}
          {tab === "budget" && <BudgetManagementPanel trip={trip} onPatch={applyPatch} />}
          {tab === "chat" && <ChatTab />}
        </div>
      </div>

      {editDialogOpen && (
        <EditTripDialog
          trip={trip}
          onClose={() => setEditDialogOpen(false)}
          onSave={(patch) => {
            applyPatch(patch);
            syncTripToServer({ ...trip, ...patch });
          }}
        />
      )}
      {accommodationDialogOpen && (
        <AccommodationEditDialog
          trip={trip}
          onClose={() => setAccommodationDialogOpen(false)}
          onSave={(accommodation) => applyPatch({ accommodation })}
        />
      )}
      {activityDialogRequest && (
        <AddActivityDialog
          days={trip.days}
          initialDayId={activityDialogRequest.dayId}
          initialActivity={activityDialogRequest.activity}
          onAddDay={handleAddDay}
          onClose={() => setActivityDialogRequest(null)}
          onSave={handleSaveActivity}
        />
      )}

      {remixDialogOpen && (
        <RemixSetupDialog
          onClose={() => setRemixDialogOpen(false)}
          source={{
            title: remixSourceMeta.sourceTitle,
            creatorName: remixSourceMeta.sourceCreatorName,
            durationDays: remixSourceMeta.sourceDurationDays,
          }}
          status={remix.status}
          message={remix.message}
          expectedDurationDays={remix.expectedDurationDays}
          onSubmit={(values) => remix.submit(values, remixSourceMeta)}
        />
      )}

      {!isOwner && canRemix && <MobileRemixBar onRemixClick={handleRemixClick} />}
    </div>
  );
}

function Hero({
  trip,
  canEdit,
  onManagePhotos,
  onBack,
  onMenuClick,
}: {
  trip: GeneratedTrip;
  canEdit: boolean;
  onManagePhotos: () => void;
  onBack: () => void;
  onMenuClick: () => void;
}) {
  const placeStats = getTripPlaceStats(trip);
  const placeCount = placeStats.attractions + placeStats.restaurants + placeStats.cafes + placeStats.bars;
  const statLabel = placeCount > 0 ? `${placeCount} places` : trip.durationLabel;

  const updatedAtSource = trip.publishedAt ?? trip.createdAt;
  const updatedLabel = updatedAtSource
    ? new Date(updatedAtSource).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : undefined;

  const pills = [
    { key: "pace", icon: Footprints, label: trip.paceLabel },
    { key: "budget", icon: Wallet, label: trip.budgetLabel },
    { key: "conditions", icon: Asterisk, label: trip.conditionsLabel },
  ];

  // resolveCoverImageUrl falls back to the static /images/hero-mountain.jpg
  // placeholder (trip.coverImageUrl) whenever PUT /trips/:tripId/cover hasn't
  // been called yet — before giving up to that, check GET /trips/:tripId/media
  // for every real photo attached to the trip (e.g. via addTripMediaFromPlace
  // when a place was added to the itinerary): the one flagged as cover leads,
  // the rest become swipeable slides on the read-only detail view below.
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
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
        // No gallery yet (or the request failed) — resolveCoverImageUrl's own
        // placeholder below covers this silently.
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const fallback = trip.coverImage?.urls.large ?? resolveCoverImageUrl(trip, "large");
  const images = galleryImages && galleryImages.length > 0 ? galleryImages : fallback ? [fallback] : [];

  return (
    <div className="relative flex min-h-[440px] flex-col justify-between overflow-hidden sm:min-h-[560px]">
      {/* Editing keeps a single static cover — swiping through photos is a
          viewing affordance, and would fight with "จัดการรูปภาพ" for the same
          tap target. The read-only detail view (canEdit === false, i.e.
          opened from a trip card rather than "แก้ไขแพลน") gets the swipeable
          gallery instead. */}
      {canEdit || images.length <= 1 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[0] ?? "/images/hero-mountain.jpg"}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[80%_30%]"
        />
      ) : (
        <HeroImageCarousel images={images} title={trip.title || trip.destination} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-black/70" />

      {/* Top controls — back/menu on the left; the owner's photo-management
          affordance on the right while editing. */}
      <div className="relative z-20 flex items-center justify-between gap-3 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="ย้อนกลับ"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="เมนู"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <Menu size={18} />
          </button>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={onManagePhotos}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-xs font-semibold shadow-md"
          >
            <ImagePlus size={14} />
            จัดการรูปภาพ
          </button>
        )}
      </div>

      {/* Bottom overlay — title + creator/place-count + location + last
          updated, same layout as a Mindtrip-style guide header, with the
          existing pace/budget/conditions pills kept underneath since those
          carry real trip data the reference page has no equivalent for. */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 px-6 pb-8 text-center sm:pb-10">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-sm sm:text-6xl">
          {trip.title || trip.destination}
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-white sm:text-base">
          {trip.creator && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trip.creator.avatarUrl || "/images/profile-avatar.jpg"}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full object-cover"
              />
              <span>{trip.creator.name}</span>
              <span className="text-white/50">|</span>
            </>
          )}
          <span>{statLabel}</span>
        </div>

        <p className="flex items-center gap-1.5 text-sm text-white/85">
          <MapPin size={14} className="shrink-0" />
          {trip.destination}
        </p>

        {updatedLabel && <p className="text-xs text-white/60">Updated: {updatedLabel}</p>}

        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
          {pills.map((p) => (
            <span
              key={p.key}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold shadow-md sm:text-sm"
            >
              <p.icon size={14} style={{ color: "var(--color-brand-green)" }} />
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Snap-scrolling photo strip for the read-only trip detail view — same
// gesture as a Lemon8/IG story: swipe or tap the arrow to advance, dots at
// the bottom track position. Sits behind the title/pills overlay (Hero
// renders those on top, in normal document flow above this absolutely
// positioned strip) so they read as fixed chrome while photos scroll under it.
function HeroImageCarousel({ images, title }: { images: string[]; title: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // A swipe that actually scrolls the strip never fires a click on the image
  // underneath (standard browser drag-suppression) — so a plain onClick here
  // only ever fires for a genuine tap, no extra gesture-tracking needed to
  // tell "swiping" apart from "viewing full-size".
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
    // The active dot normally tracks the "scroll" event fired as the user
    // swipes or the smooth animation plays — set directly here too so the
    // arrow button doesn't depend on that event actually firing (seen to be
    // unreliable for programmatic scrollLeft changes in some webviews/this
    // project's own headless test harness).
    setIndex(clampedIndex);
    // Belt-and-suspenders for the same environments — if the smooth scrollTo
    // itself was a silent no-op, jump there directly once its animation
    // should be done instead of leaving the arrow looking broken.
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

      {/* Docked under the top back/menu/save row rather than at the bottom —
          Hero's title/creator/location block now sits bottom-anchored (see
          Hero) and would otherwise collide with the dots. */}
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
        <ImageLightbox
          title={title}
          images={images}
          initialIndex={index}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

// Creator identity + social proof + the primary Remix CTA (desktop/tablet
// inline variant — see MobileRemixBar below for the mobile sticky bar).
// Rendered for every trip; individual pieces degrade gracefully when their
// backing data is absent (no creator, no counts, owner viewing their own).
function TripAttributionBar({
  trip,
  isOwner,
  visibilitySaving,
  onChangeVisibility,
}: {
  trip: GeneratedTrip;
  isOwner: boolean;
  visibilitySaving: boolean;
  onChangeVisibility?: (next: "private" | "public") => void;
}) {
  const showRealExperienceBadge = !isOwner && (trip.planMode === "self" || trip.planMode === "manual");
  const hasCounts = trip.saveCount != null || trip.remixCount != null;

  if (!trip.creator && !showRealExperienceBadge && !hasCounts && isOwner && !onChangeVisibility) return null;

  return (
    <div className="mx-auto max-w-7xl px-6 pt-6 sm:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {trip.creator && (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trip.creator.avatarUrl || "/images/profile-avatar.jpg"}
                alt={trip.creator.name}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
              <div className="text-sm">
                <p className="font-semibold leading-tight">{trip.creator.name}</p>
                <p className="text-xs text-[var(--color-muted)]">ผู้สร้างทริปนี้</p>
              </div>
            </div>
          )}

          {showRealExperienceBadge && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--foreground)" }}
            >
              <Sparkles size={12} />
              ทริปจากประสบการณ์จริง
            </span>
          )}

          {hasCounts && (
            <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
              {trip.saveCount != null && (
                <span className="inline-flex items-center gap-1">
                  <Bookmark size={12} />
                  {trip.saveCount}
                </span>
              )}
              {trip.remixCount != null && (
                <span className="inline-flex items-center gap-1">
                  <Repeat2 size={12} />
                  {trip.remixCount}
                </span>
              )}
            </div>
          )}
        </div>

        {isOwner && onChangeVisibility && (
          <VisibilityControl
            visibility={trip.visibility ?? "private"}
            saving={visibilitySaving}
            onChange={onChangeVisibility}
          />
        )}
      </div>
    </div>
  );
}

// Owner-only "ส่วนตัว"/"เผยแพร่" segmented control — a trip must be flipped
// to public before anyone besides its owner can remix it (see canRemix in
// the page component and POST /trips/:sourceTripId/remix in
// lib/trip-remix-api.ts). Only rendered once the trip has a real backend row
// (onChangeVisibility is undefined until then — PATCH /trips/:id has
// nothing to target for a draft that's never been saved).
function VisibilityControl({
  visibility,
  saving,
  onChange,
}: {
  visibility: "private" | "public";
  saving: boolean;
  onChange: (next: "private" | "public") => void;
}) {
  const options: { value: "private" | "public"; label: string; icon: typeof Lock }[] = [
    { value: "private", label: "ส่วนตัว", icon: Lock },
    { value: "public", label: "เผยแพร่", icon: Globe2 },
  ];

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className="inline-flex items-center rounded-full border p-1"
        style={{ borderColor: "var(--color-border)" }}
        role="radiogroup"
        aria-label="สถานะการแชร์ทริปนี้"
      >
        {options.map(({ value, label, icon: Icon }) => {
          const active = visibility === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={saving || active}
              onClick={() => onChange(value)}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed"
              style={{
                backgroundColor: active ? "var(--color-brand-green)" : "transparent",
                color: active ? "#fff" : "var(--color-muted)",
              }}
            >
              {saving && active ? <LoaderCircle size={12} className="animate-spin" /> : <Icon size={12} />}
              {label}
            </button>
          );
        })}
      </div>
      <p className="max-w-[240px] text-right text-[11px] text-[var(--color-muted)]">
        {visibility === "public"
          ? "ทริปนี้เผยแพร่อยู่ ผู้อื่นที่เห็นสามารถนำไปทำสำเนาเป็นของตัวเองได้"
          : "ทริปนี้เป็นส่วนตัว มีแค่คุณที่เห็นและนำไปทำสำเนาได้"}
      </p>
    </div>
  );
}

// Shown on a remixed trip's own Planner — always the immediate source only,
// even if that source was itself a remix, so attribution never nests.
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
        href={`/generated-plan/${remixedFrom.sourceTripId}`}
        className="shrink-0 text-xs font-semibold underline"
        style={{ color: "var(--color-brand-green)" }}
      >
        ดูต้นฉบับ
      </Link>
    </div>
  );
}

// Mobile-only sticky bottom CTA — kept visible without scrolling, per the
// requirement that the primary action never requires scrolling to reach.
function MobileRemixBar({ onRemixClick }: { onRemixClick: () => void }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-1 border-t bg-white px-4 py-3 sm:hidden"
      style={{ borderColor: "var(--color-border)", paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <button
        type="button"
        onClick={onRemixClick}
        className="flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-sm font-bold text-white"
        style={{ backgroundColor: "var(--color-brand-green)" }}
      >
        <Repeat2 size={15} />
        นำไปปรับเป็นทริปของฉัน
      </button>
      <p className="text-center text-[11px] text-[var(--color-muted)]">
        ระบบจะสร้างสำเนาเป็นทริปส่วนตัวของคุณ การแก้ไขจะไม่กระทบแผนต้นฉบับ
      </p>
    </div>
  );
}

function ConfirmBanner({
  regenerating,
  onDismiss,
  onRegenerate,
  onConfirm,
}: {
  regenerating: boolean;
  onDismiss: () => void;
  onRegenerate: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="flex flex-col items-start gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)" }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onDismiss}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70"
        >
          <X size={14} />
        </button>
        <p className="text-sm">
          <strong className="font-bold">ชอบแผนนี้ไหม?</strong> ถ้ายัง เราสร้างใหม่ให้ทั้งแผนได้เลย
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 rounded-full border bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{ borderColor: "var(--color-border)" }}
        >
          <RefreshCcw size={14} className={regenerating ? "animate-spin" : ""} />
          สร้างใหม่ทั้งหมด
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--color-brand-green)" }}
        >
          นำไปปรับเป็นทริปของฉัน
        </button>
      </div>
    </div>
  );
}

function GenerationNoticeBanner({ notice }: { notice: NonNullable<GeneratedTrip["generationNotice"]> }) {
  const [expanded, setExpanded] = useState(false);
  const errorCount = notice.violations.filter((v) => v.severity === "error").length;

  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-2xl border px-5 py-4"
      style={{ backgroundColor: "#FFF8E6", borderColor: "#F0D98C" }}
    >
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
              <span
                className="mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
              >
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

function PlanTabs({
  tabs,
  tab,
  setTab,
}: {
  tabs: { key: TabKey; label: string }[];
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Roving-tabindex pattern: only the active tab is Tab-reachable, arrow keys
  // move both selection and focus between the others — standard keyboard
  // behavior for an ARIA tablist.
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
      className="flex items-center gap-1 overflow-x-auto rounded-full p-1.5 shadow-md sm:gap-2 sm:p-2"
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
            className="flex-1 whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:py-3 sm:text-sm"
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

function OverviewTab({
  trip,
  isConfirmed,
  isOwner,
  canRemix,
  onRemixClick,
  canEdit,
  bannerDismissed,
  regenerating,
  onDismissBanner,
  onRegenerate,
  onConfirm,
  onEditTrip,
  onEditAccommodation,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onAddActivityDirect,
  onSaveAccommodation,
  onAddDay,
  onGoToPlanTab,
  onUpdateActivityTravel,
  onReorderActivities,
}: {
  trip: GeneratedTrip;
  isConfirmed: boolean;
  isOwner: boolean;
  canRemix: boolean;
  onRemixClick: () => void;
  canEdit: boolean;
  bannerDismissed: boolean;
  regenerating: boolean;
  onDismissBanner: () => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  onEditTrip: () => void;
  onEditAccommodation: () => void;
  onAddActivity: (dayId: string) => void;
  onEditActivity: (dayId: string, activity: Activity) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  onAddActivityDirect: (dayId: string, activity: Activity) => void;
  onSaveAccommodation: (accommodation: TripAccommodation) => void;
  onAddDay: () => void;
  onGoToPlanTab: () => void;
  onUpdateActivityTravel: (dayId: string, activityId: string, travel: TravelFromPrevious) => void;
  onReorderActivities: (dayId: string, activities: Activity[]) => void;
}) {
  // "ยอมรับแพลนนี้ไหม?" only makes sense for a plan the AI actually
  // generated — a self-built/manual trip (or a remix, whose days were copied
  // verbatim from its source) has nothing to "regenerate" against (see
  // handleRegenerate's TripDraft lookup, which only ever exists for "ai").
  const showConfirmBanner = trip.planMode !== "manual" && trip.planMode !== "remixed";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">สรุปภาพรวมแพลน</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Share2 size={14} />
            แชร์
          </button>
          {!isOwner && canRemix && (
            <button
              type="button"
              onClick={onRemixClick}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--color-brand-green)" }}
            >
              <Repeat2 size={14} />
              นำไปปรับเป็นทริปของฉัน
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={onEditTrip}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-accent-orange)" }}
            >
              <Pencil size={14} />
              แก้ไขทริป
            </button>
          )}
        </div>
      </div>

      {showConfirmBanner && !isConfirmed && !bannerDismissed && (
        <ConfirmBanner
          regenerating={regenerating}
          onDismiss={onDismissBanner}
          onRegenerate={onRegenerate}
          onConfirm={onConfirm}
        />
      )}

      {/* Moved to the top of "ตารางแพลน" while actively editing — see
          ItineraryAccordion — so it reads as that section's header instead
          of floating disconnected above the accommodation/discovery panels. */}
      {!canEdit && <TripStatsCard trip={trip} />}
      <PlaceDiscoveryPanel
        trip={trip}
        canEdit={canEdit}
        onAddActivityDirect={onAddActivityDirect}
        onSaveAccommodation={onSaveAccommodation}
        onAddDay={onAddDay}
        onManualEditAccommodation={onEditAccommodation}
      />
      <ItineraryAccordion
        trip={trip}
        canEdit={canEdit}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
        onDeleteActivity={onDeleteActivity}
        onGoToPlanTab={onGoToPlanTab}
        onUpdateActivityTravel={onUpdateActivityTravel}
        onReorderActivities={onReorderActivities}
      />
      <TripModeBar />
    </div>
  );
}

// All six figures are derived from the itinerary itself — see
// getTripPlaceStats (distinct places per kind, so a hotel or market visited
// twice isn't double-counted) and getTripDistanceKm in lib/trip-utils.ts.
function TripStatsCard({ trip }: { trip: GeneratedTrip }) {
  const places = useMemo(() => getTripPlaceStats(trip), [trip]);
  const distanceKm = useMemo(() => getTripDistanceKm(trip), [trip]);
  // Prefer the backend's own total (activity/travel costs × travelers, plus
  // accommodation and standalone trip_expenses rows — see
  // BackendTrip.totalBudget) over summing just activity.cost client-side,
  // which under-counts as soon as anything's logged straight into the budget
  // tab instead of an itinerary stop. Only a never-synced local draft (no
  // totalBudget from a server response yet) falls back to the local sum —
  // same "planned days only" divisor as getAverageDailyCost.
  const costPerDay = useMemo(() => {
    const plannedDays = trip.days.filter((d) => d.activities.length > 0).length;
    if (plannedDays === 0) return 0;
    return Math.round((trip.totalBudget ?? getTripTotalCost(trip)) / plannedDays);
  }, [trip]);

  const stats = [
    { label: "ที่เที่ยว", value: `${places.attractions}` },
    { label: "ร้านอาหาร", value: `${places.restaurants}` },
    { label: "คาเฟ่", value: `${places.cafes}` },
    { label: "บาร์ / ผับ", value: `${places.bars}` },
    { label: "รวมงบ/วัน", value: formatTHB(costPerDay) },
    { label: "Total Distance", value: `${distanceKm} km` },
  ];

  return (
    <div className="rounded-3xl p-5 text-white sm:p-6" style={{ backgroundColor: "var(--color-brand-green)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
        <h3 className="text-lg font-bold">{trip.destination}</h3>
        {trip.styles.length > 0 && (
          <p className="text-xs font-medium text-white/80 sm:text-sm">{trip.styles.join(" · ")}</p>
        )}
      </div>
      <div className="h-px w-full bg-white/20" />
      <div className="grid grid-cols-3 gap-2.5 pt-4 sm:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 rounded-2xl bg-white px-2 py-3 text-center">
            <p className="text-base font-extrabold text-[var(--foreground)]">{s.value}</p>
            <p className="text-[11px] text-[var(--color-muted)]">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function findHotelActivity(trip: GeneratedTrip): Activity | undefined {
  return trip.days.flatMap((d) => d.activities).find((a) => a.category === "hotel" && a.location?.imageUrl);
}

// AI-mode's own accommodation card lived here before it was folded into
// PlaceDiscoveryPanel's unified overview (see that panel's own
// AccommodationAccordion in components/plan/SelfPlanBuilderTab.tsx, which
// every trip — self-built or AI-generated — renders now) — kept only
// dayDateLabel, which the itinerary card below still needs.
function dayDateLabel(day: Day): string {
  const date = new Date(day.date);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", day: "2-digit", month: "short" }).format(date);
}

function ItineraryAccordion({
  trip,
  canEdit,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onGoToPlanTab,
  onUpdateActivityTravel,
  onReorderActivities,
}: {
  trip: GeneratedTrip;
  canEdit: boolean;
  onAddActivity: (dayId: string) => void;
  onEditActivity: (dayId: string, activity: Activity) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  onGoToPlanTab: () => void;
  onUpdateActivityTravel: (dayId: string, activityId: string, travel: TravelFromPrevious) => void;
  onReorderActivities: (dayId: string, activities: Activity[]) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="overflow-hidden rounded-3xl" style={{ backgroundColor: "#FAF8F5" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4"
      >
        <h3 className="text-base font-bold sm:text-lg">{canEdit ? "ตารางแพลน" : "ตารางแพลนทั้งหมด"}</h3>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {expanded && canEdit && (
        // Fuller, one-column day list while actively building/editing — place
        // count + date per day, plus a jump straight to the Plan tab for the
        // per-day travel-connector view, which this compact card doesn't have.
        <div className="flex flex-col gap-3 px-5 pb-5">
          <TripStatsCard trip={trip} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onGoToPlanTab}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: "var(--color-border)" }}
            >
              ดูแพลนรายวัน
              <ChevronRight size={11} className="ml-0.5 inline" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {trip.days.map((day) => (
              <div key={day.id} className="flex flex-col overflow-hidden rounded-2xl bg-white">
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ backgroundColor: "var(--color-sel-bg)" }}
                >
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold">วันที่ {day.dayNumber}</h4>
                    <span
                      className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold"
                      style={{ color: "var(--color-muted)" }}
                    >
                      <MapPin size={10} />
                      {day.activities.length} จุด
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-muted)]">{dayDateLabel(day)}</span>
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <button
                    type="button"
                    onClick={() => onAddActivity(day.id)}
                    className="mb-1 rounded-xl border-2 border-dashed py-2.5 text-xs font-bold"
                    style={{ borderColor: "var(--color-accent-orange)", color: "var(--color-accent-orange)", backgroundColor: "white" }}
                  >
                    + เพิ่มสถานที่
                  </button>
                  <SortableItineraryList
                    activities={day.activities}
                    canEdit={canEdit}
                    onEdit={(a) => onEditActivity(day.id, a)}
                    onDelete={(a) => onDeleteActivity(day.id, a.id)}
                    onSaveTravel={(activityId, travel) => onUpdateActivityTravel(day.id, activityId, travel)}
                    onReorder={(activities) => onReorderActivities(day.id, activities)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && !canEdit && (
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-3">
          {trip.days.map((day) => (
            <div key={day.id} className="flex flex-col overflow-hidden rounded-2xl bg-white">
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: "var(--color-sel-bg)" }}
              >
                <h4 className="text-sm font-bold">วันที่ {day.dayNumber}</h4>
                <span className="text-xs font-semibold" style={{ color: "var(--color-brand-green)" }}>
                  {formatTHB(getDayTotalCost(day))}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3">
                {day.activities.map((a, i) => (
                  <ItineraryRow
                    key={a.id}
                    activity={a}
                    index={i + 1}
                    canEdit={canEdit}
                    onEdit={() => onEditActivity(day.id, a)}
                    onDelete={() => onDeleteActivity(day.id, a.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Drag-and-drop reordering for one day's stop list (see ItineraryAccordion's
// "ตารางแพลน" card) — @dnd-kit rather than native HTML5 drag/drop since the
// latter has no real touch support, and this list needs to work on mobile.
// The grip handle (not the whole row) owns the drag listeners so taps on the
// title, edit, and delete buttons keep working normally.
function SortableItineraryList({
  activities,
  canEdit,
  onEdit,
  onDelete,
  onSaveTravel,
  onReorder,
}: {
  activities: Activity[];
  canEdit: boolean;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onSaveTravel: (activityId: string, travel: TravelFromPrevious) => void;
  onReorder: (activities: Activity[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activities.findIndex((a) => a.id === active.id);
    const newIndex = activities.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(activities, oldIndex, newIndex));
  }

  if (!canEdit) {
    return (
      <>
        {activities.map((a, i) => {
          const next = activities[i + 1];
          return (
            <div key={a.id}>
              <ItineraryRow activity={a} index={i + 1} canEdit={canEdit} onEdit={() => onEdit(a)} onDelete={() => onDelete(a)} />
              {next && <TravelConnectorRow toActivity={next} canEdit={canEdit} onSave={(travel) => onSaveTravel(next.id, travel)} />}
            </div>
          );
        })}
      </>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        {activities.map((a, i) => {
          const next = activities[i + 1];
          return (
            <SortableItineraryEntry
              key={a.id}
              activity={a}
              index={i + 1}
              next={next}
              onEdit={() => onEdit(a)}
              onDelete={() => onDelete(a)}
              onSaveTravel={next ? (travel) => onSaveTravel(next.id, travel) : undefined}
            />
          );
        })}
      </SortableContext>
    </DndContext>
  );
}

function SortableItineraryEntry({
  activity,
  index,
  next,
  onEdit,
  onDelete,
  onSaveTravel,
}: {
  activity: Activity;
  index: number;
  next?: Activity;
  onEdit: () => void;
  onDelete: () => void;
  onSaveTravel?: (travel: TravelFromPrevious) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ItineraryRow
        activity={activity}
        index={index}
        canEdit
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ attributes, listeners }}
      />
      {next && onSaveTravel && <TravelConnectorRow toActivity={next} canEdit onSave={onSaveTravel} />}
    </div>
  );
}

function ItineraryRow({
  activity,
  index,
  canEdit,
  onEdit,
  onDelete,
  dragHandleProps,
}: {
  activity: Activity;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  dragHandleProps?: { attributes: DraggableAttributes; listeners: SyntheticListenerMap | undefined };
}) {
  const Icon = (activity.icon && ACTIVITY_ICON_OVERRIDE[activity.icon]) || categoryIcon[activity.category];
  const color = categoryColorVar[activity.category];

  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
      {dragHandleProps && (
        <button
          type="button"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          className="flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-[var(--color-muted)] active:cursor-grabbing"
          aria-label={`ลากเพื่อจัดลำดับ ${activity.title}`}
        >
          <GripVertical size={14} />
        </button>
      )}
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ backgroundColor: "var(--color-brand-green)" }}
      >
        {index}
      </span>
      <Icon size={13} style={{ color }} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{activity.title}</p>
        <p className="text-[11px] text-[var(--color-muted)]">
          {activity.time && (
            <span className="font-semibold" style={{ color: "var(--color-accent-orange)" }}>
              {activity.time}
            </span>
          )}
          {activity.travelNote && <> {activity.time && "· "}{activity.travelNote}</>}
          {activity.cost > 0 && <> {(activity.time || activity.travelNote) && "· "}{formatTHB(activity.cost)}</>}
        </p>
        {activity.notes && <p className="truncate text-[11px] text-[var(--color-muted)]">{activity.notes}</p>}
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-sel-bg)] hover:text-[var(--color-brand-green)]"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function TripModeBar() {
  const [tripMode, setTripMode] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl p-4" style={{ backgroundColor: "var(--color-sel-bg)" }}>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white"
        style={{ color: "var(--color-brand-green)" }}
      >
        <Navigation size={16} />
      </span>
      <div className="min-w-[160px] flex-1">
        <p className="text-sm font-bold" style={{ color: "var(--color-brand-green)" }}>
          เปิดโหมดนำทางท่องเที่ยว
        </p>
        <p className="text-xs text-[var(--color-muted)]">นำทางแบบเรียลไทม์ระหว่างเดินทาง</p>
      </div>
      <button
        type="button"
        onClick={() => setTripMode((v) => !v)}
        className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white"
        style={{ backgroundColor: "var(--color-brand-green)" }}
      >
        {tripMode ? "ปิด" : "เปิด"} Trip Mode
      </button>
    </div>
  );
}

function WeatherTab() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-16 text-center"
      style={{ borderColor: "var(--color-border)" }}
    >
      <CloudSun size={28} style={{ color: "var(--color-muted)" }} />
      <p className="text-sm font-semibold">ข้อมูลสภาพอากาศกำลังจะมาเร็วๆ นี้</p>
      <p className="text-xs text-[var(--color-muted)]">ดูพยากรณ์อากาศระหว่างทริปได้ที่นี่</p>
    </div>
  );
}

function PlanTab({
  trip,
  isOwner,
  canRemix,
  onRemixClick,
  canEdit,
  onAddDay,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onUpdateActivityTravel,
}: {
  trip: GeneratedTrip;
  isOwner: boolean;
  canRemix: boolean;
  onRemixClick: () => void;
  canEdit: boolean;
  onAddDay: () => void;
  onAddActivity: (dayId: string) => void;
  onEditActivity: (dayId: string, activity: Activity) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  onUpdateActivityTravel: (dayId: string, activityId: string, travel: TravelFromPrevious) => void;
}) {
  const [dayIndex, setDayIndex] = useState(0);
  const [showMap, setShowMap] = useState(true);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-2xl font-bold">แพลนเที่ยวของคุณ</h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Share2 size={14} />
          แชร์
        </button>
        {!isOwner && canRemix && (
          <button
            type="button"
            onClick={onRemixClick}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            <Repeat2 size={14} />
            นำไปปรับเป็นทริปของฉัน
          </button>
        )}
      </div>
    </div>
  );

  // A freshly-created backend trip can arrive with `days: []` (no itinerary
  // yet) — everything below assumes a current day exists, so bail out to an
  // "add your first day" prompt instead of crashing on trip.days[-1].
  if (trip.days.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-3xl p-12 text-center"
          style={{ backgroundColor: "#FAF8F5" }}
        >
          <p className="text-sm text-[var(--color-muted)]">ทริปนี้ยังไม่มีวันเดินทาง</p>
          {canEdit && (
            <button
              type="button"
              onClick={onAddDay}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed px-4 py-2.5 text-sm font-bold"
              style={{ borderColor: "var(--color-accent-orange)", color: "var(--color-accent-orange)" }}
            >
              <Plus size={14} />
              เพิ่มวันแรก
            </button>
          )}
        </div>
      </div>
    );
  }

  const day = trip.days[Math.min(dayIndex, trip.days.length - 1)];
  const route = getDayRouteEstimate(day);

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="flex flex-col gap-5 rounded-3xl p-5" style={{ backgroundColor: "#FAF8F5" }}>
        <div
          className="flex items-center gap-2 overflow-x-auto rounded-2xl border bg-white p-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          {trip.days.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDayIndex(i)}
              className="flex-1 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold"
              style={
                i === dayIndex
                  ? { backgroundColor: "var(--color-brand-green)", color: "#fff" }
                  : { color: "var(--color-muted)" }
              }
            >
              วันที่ {d.dayNumber}
            </button>
          ))}
          {canEdit && (
            <button
              type="button"
              onClick={onAddDay}
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Plus size={14} />
              เพิ่มวัน
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_3fr]">
          <TripModeBar />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard icon={Compass} label="Total Distance" value={`${route.distanceKm} km`} />
            <StatCard icon={Clock} label="Total Time" value={formatDuration(route.minutes)} />
            <StatCard icon={Wallet} label="Est. Cost" value={formatTHB(getDayTotalCost(day))} />
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-5 ${showMap ? "lg:grid-cols-[2fr_3fr]" : ""}`}>
          <div className="min-w-0 overflow-hidden rounded-2xl" style={{ backgroundColor: "#FAF8F5" }}>
            <div
              className="flex items-center justify-between rounded-t-2xl px-4 py-3"
              style={{ backgroundColor: "var(--color-sel-bg)" }}
            >
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
            <div className="flex flex-col gap-3 px-4 pb-4 pt-4">
              {day.activities.map((a, i) => {
                const next = day.activities[i + 1];
                return (
                  <div key={a.id} className="flex flex-col gap-3">
                    <PlanActivityRow
                      activity={a}
                      index={i + 1}
                      canEdit={canEdit}
                      onEdit={() => onEditActivity(day.id, a)}
                      onDelete={() => onDeleteActivity(day.id, a.id)}
                    />
                    {next && (
                      <TravelConnectorRow
                        toActivity={next}
                        canEdit={canEdit}
                        onSave={(travel) => onUpdateActivityTravel(day.id, next.id, travel)}
                      />
                    )}
                  </div>
                );
              })}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onAddActivity(day.id)}
                  className="rounded-xl border border-dashed border-[var(--color-border)]/40 py-2 text-xs font-semibold text-[var(--color-muted)]"
                >
                  + เพิ่มจุด
                </button>
              )}
            </div>
          </div>
          {showMap && <TripMapPanel day={day} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div
      className="flex flex-col justify-center gap-1.5 rounded-2xl border border-[var(--color-border)]/25 p-4"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
        <Icon size={13} />
        {label}
      </span>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}

// Itinerary row for the "ลำดับแพลน" list — always shows its thumbnail and
// travel-note line inline, no expand/collapse interaction.
function PlanActivityRow({
  activity,
  index,
  canEdit,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const Icon = (activity.icon && ACTIVITY_ICON_OVERRIDE[activity.icon]) || categoryIcon[activity.category];
  const color = categoryColorVar[activity.category];
  // Photos added via AddActivityDialog's "เพิ่มรูป" (activity.images) take
  // priority over the place's single stock photo — fall back to that, then
  // a generic placeholder, only when nothing was uploaded for this stop.
  const galleryImages = activity.images && activity.images.length > 0 ? activity.images : undefined;
  const imageUrl = galleryImages?.[0] ?? activity.location?.imageUrl ?? "/images/luang-prabang.jpg";
  const isHighlight = activity.category === "sightseeing";

  return (
    <div className="flex items-start gap-3 rounded-xl bg-white p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            {index}
          </span>
          <Icon size={15} style={{ color }} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <p className="min-w-0 break-words text-sm font-semibold">{activity.title}</p>
                {isHighlight && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: "var(--color-accent-orange)" }}
                  >
                    สถานที่ห้ามพลาด
                  </span>
                )}
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-full p-1 text-[var(--color-muted)] hover:bg-[var(--color-sel-bg)] hover:text-[var(--color-brand-green)]"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="rounded-full p-1 text-[var(--color-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-semibold">
              {activity.time && (
                <span className="shrink-0" style={{ color: "var(--color-accent-orange)" }}>
                  {activity.time}
                </span>
              )}
              {/* travelNote and cost are independent facts (how to get here vs.
                  what it costs) — shown together instead of either/or, which
                  used to silently drop the cost whenever a travel note was set.
                  Time is optional (see AddActivityDialog) — only lead with "· "
                  when something actually precedes this piece. */}
              {activity.travelNote && (
                <span className="font-semibold text-[var(--color-muted)]">
                  {activity.time && "· "}
                  {activity.travelNote}
                </span>
              )}
              {activity.cost > 0 && (
                <span className="shrink-0 font-semibold text-[var(--color-muted)]">
                  {(activity.time || activity.travelNote) && "· "}
                  {formatTHB(activity.cost)}
                </span>
              )}
            </div>
            {activity.notes && (
              <p className="mt-1 break-words text-xs font-normal text-[var(--color-muted)]">{activity.notes}</p>
            )}
            {activity.category === "hotel" && (
              <HotelBookingButton
                name={activity.location?.name ?? activity.title}
                className="mt-1.5 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
              />
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        {galleryImages && galleryImages.length > 1 ? (
          <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
            +{galleryImages.length - 1}
          </span>
        ) : (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90">
            <Maximize2 size={10} />
          </span>
        )}
      </button>

      {lightboxOpen && (
        <ImageLightbox
          title={activity.location?.name ?? activity.title}
          images={galleryImages ?? [imageUrl]}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

// Now genuinely multi-image when a stop has uploaded photos (activity.images
// from AddActivityDialog) — falls back to the single location.imageUrl
// otherwise, same as before.
function ImageLightbox({
  title,
  images,
  initialIndex = 0,
  onClose,
}: {
  title: string;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const hasMultiple = images.length > 1;

  function goTo(next: number) {
    setIndex((next + images.length) % images.length);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-base font-bold text-white">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <X size={16} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 pb-4">
        {hasMultiple && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white sm:left-8"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div className="relative max-h-full max-w-4xl overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[index]} alt="" className="max-h-[70vh] w-full object-cover" />
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
            {index + 1} / {images.length}
          </span>
        </div>

        {hasMultiple && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="absolute right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white sm:right-8"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 overflow-x-auto px-6 pb-6">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setIndex(i)}
            className="h-16 w-24 shrink-0 overflow-hidden rounded-xl"
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

function TripMapPanel({ day }: { day: Day }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = day.activities.find((a) => a.id === selectedId);

  return (
    // overflow-hidden lives on the background wrapper below, not this outer
    // div — PlacePopup positions itself relative to a pin here, and clipping
    // the whole panel was cutting the popup off at the map's own edges
    // instead of letting it float over whatever's next to the map.
    <div className="relative min-h-[320px] rounded-2xl border border-[var(--color-border)]/25">
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <FakeMapBackground />
      </div>

      <button
        type="button"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md"
      >
        <MoreVertical size={14} />
      </button>

      {day.activities.map((a, i) => {
        const pos = MAP_PIN_POSITIONS[i % MAP_PIN_POSITIONS.length];
        const isSelected = selectedId === a.id;
        const xPercent = parseFloat(pos.x);
        const openBelow = parseFloat(pos.y) < 45;
        // Near an edge, anchor to that side of the pin instead of centering —
        // the 256px popup on a pin at 82% would otherwise hang off the map
        // panel (and viewport) on the right.
        const horizontalAlign = xPercent > 65 ? "right" : xPercent < 25 ? "left" : "center";
        return (
        <div
          key={a.id}
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${isSelected ? "z-20" : "z-0"}`}
          style={{ left: pos.x, top: pos.y }}
        >
          {selected && isSelected && (
            <PlacePopup
              activity={selected}
              onClose={() => setSelectedId(null)}
              openBelow={openBelow}
              horizontalAlign={horizontalAlign}
            />
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

function PlacePopup({
  activity,
  onClose,
  openBelow,
  horizontalAlign = "center",
}: {
  activity: Activity;
  onClose: () => void;
  openBelow?: boolean;
  horizontalAlign?: "left" | "center" | "right";
}) {
  const name = activity.location?.name ?? activity.title;
  const rating = activity.location?.rating ?? 4.7;
  const imageUrl = activity.location?.imageUrl ?? "/images/luang-prabang.jpg";

  const horizontalClass =
    horizontalAlign === "right" ? "right-0" : horizontalAlign === "left" ? "left-0" : "left-1/2 -translate-x-1/2";

  return (
    <div
      className={`absolute z-20 w-56 overflow-hidden rounded-2xl bg-white shadow-xl sm:w-64 ${horizontalClass} ${
        openBelow ? "top-full mt-2" : "bottom-full mb-2"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative h-28 w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md"
        >
          <Bookmark size={13} style={{ color: "var(--color-brand-green)" }} />
        </button>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <p className="truncate text-sm font-bold">{name}</p>
        <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
          <Star size={12} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
          {rating.toFixed(1)}
          {activity.travelNote && <> · {activity.travelNote}</>}
          {activity.cost > 0 && <> · {formatTHB(activity.cost)}</>}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 rounded-full border border-[var(--color-border)]/40 py-2 text-xs font-semibold"
          >
            รายละเอียดสถานที่
          </button>
          <a
            href={getGoogleMapsUrl(activity.location ?? { name: activity.title })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            <Navigation size={12} />
            นำทาง
          </a>
        </div>
      </div>
    </div>
  );
}

function ChatTab() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-16 text-center"
      style={{ borderColor: "var(--color-border)" }}
    >
      <p className="text-sm font-semibold">ห้องแชทกำลังจะมาเร็วๆ นี้</p>
      <p className="text-xs text-[var(--color-muted)]">ชวนเพื่อนมาคุยแผนทริปนี้ด้วยกันได้ที่นี่</p>
    </div>
  );
}

// Shared centered-modal shell for the edit dialogs below — matches the
// existing DatePickerDialog/DestinationPickerDialog/GuestPickerDialog pattern
// (fixed backdrop, click-outside-to-close, stopPropagation on the card).
function EditDialogShell({
  title,
  onClose,
  children,
  onSave,
  saveLabel = "บันทึก",
  saveDisabled,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  onSave: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4">{children}</div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border py-2.5 text-sm font-bold"
            style={{ borderColor: "var(--color-border)" }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="flex-1 rounded-full py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
        style={{ borderColor: "var(--color-border)" }}
      />
    </div>
  );
}

// Digits-only variant for "งบประมาณ" — a bare number, no "฿"/"/ วัน" formatting
// (that's reassembled around it on save, see EditTripDialog's handleSave).
function EditNumberField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5" style={{ borderColor: "var(--color-border)" }}>
        <span className="shrink-0 text-sm text-[var(--color-muted)]">฿</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm focus:outline-none"
        />
        {suffix && <span className="shrink-0 text-xs text-[var(--color-muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

// Small pill toggle shared by the pace/conditions pickers below — same
// selected/unselected look as create-trip/page.tsx's private Tag component,
// duplicated locally since that file doesn't export it.
function EditTag({ label, isOn, onClick }: { label: string; isOn: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-[20px] border px-3.5 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style={
        isOn
          ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)", fontWeight: 700 }
          : { borderColor: "var(--color-border)", color: "var(--foreground)" }
      }
    >
      {label}
    </button>
  );
}

// A field that opens a picker dialog instead of editing inline — same shape
// as the read-only fields on create-trip's Hero (destination/date), reused
// here so "แก้ไขทริป" doesn't need its own bespoke input styles for these.
function EditPickerField({
  label,
  value,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string;
  icon: typeof MapPin;
  onClick: () => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">{label}</label>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Icon size={15} style={{ color: "var(--color-muted)" }} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <ChevronRight size={15} style={{ color: "var(--color-muted)" }} className="shrink-0" />
      </button>
    </div>
  );
}

// Covers trip name / destination / duration / pace / budget / conditions in
// one dialog, shared by both tabs' "แก้ไขทริป" buttons. Destination and
// duration reuse the same picker dialogs as create-trip's Hero (consistent
// look, and duration gets the full "ระบุวันที่ / จำนวนคืน" picker instead of a
// bare +/- stepper); pace and conditions reuse create-trip's chip pattern.
function EditTripDialog({
  trip,
  onClose,
  onSave,
}: {
  trip: GeneratedTrip;
  onClose: () => void;
  onSave: (patch: Partial<GeneratedTrip>) => void;
}) {
  const [title, setTitle] = useState(trip.title ?? trip.destination);
  const [destination, setDestination] = useState(trip.destination);
  const [destinationPlace, setDestinationPlace] = useState<Destination | undefined>(trip.destinationPlace);
  const [destDialogOpen, setDestDialogOpen] = useState(false);
  const [nights, setNights] = useState(Math.max(trip.days.length - 1, 0));
  const [pendingStartDate, setPendingStartDate] = useState<string | undefined>(undefined);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [paceWord, setPaceWord] = useState<string | null>(trip.pace ? (INTENSITY_TO_PACE[trip.pace] ?? null) : null);
  const [budgetAmount, setBudgetAmount] = useState(() => parseBudgetAmount(trip.budgetLabel));
  const [conditionsText, setConditionsText] = useState(
    trip.conditionsLabel === "ไม่มีเงื่อนไขพิเศษ" ? "" : trip.conditionsLabel
  );
  const [showMoreConds, setShowMoreConds] = useState(false);

  const selectedConditions = conditionsText
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const condOptions = Array.from(
    new Set([
      ...EDIT_COND_OPTIONS,
      ...(showMoreConds ? EDIT_MORE_COND_OPTIONS : []),
      ...selectedConditions.filter((c) => !EDIT_COND_OPTIONS.includes(c) && !EDIT_MORE_COND_OPTIONS.includes(c)),
    ])
  );

  function toggleCondition(tag: string) {
    setConditionsText(
      selectedConditions.includes(tag)
        ? selectedConditions.filter((c) => c !== tag).join(", ")
        : [...selectedConditions, tag].join(", ")
    );
  }

  function handleSave() {
    let days = resizeDays(trip.days, nights);
    if (pendingStartDate) days = reanchorDayDates(days, pendingStartDate);
    const pace = paceWord ? PACE_TO_INTENSITY[paceWord] : trip.pace;
    const paceLabel = paceWord ? `${paceWord} ${PACE_DESCRIPTION[paceWord] ?? ""}`.trim() : trip.paceLabel;
    onSave({
      title: title.trim() || destination.trim() || trip.destination,
      destination: destination.trim() || trip.destination,
      destinationPlace,
      days,
      durationLabel: durationLabelFor(days),
      pace,
      paceLabel,
      budgetLabel: budgetAmount ? `${formatTHB(Number(budgetAmount))} / วัน` : "ยังไม่ระบุ",
      conditionsLabel: conditionsText.trim() || "ไม่มีเงื่อนไขพิเศษ",
    });
    onClose();
  }

  return (
    <EditDialogShell title="แก้ไขทริป" onClose={onClose} onSave={handleSave}>
      <EditField label="ชื่อทริป" value={title} onChange={setTitle} placeholder="ตั้งชื่อทริปของคุณ" />

      <EditPickerField
        label="ปลายทาง"
        value={destination || "เลือกปลายทาง"}
        icon={MapPin}
        onClick={() => setDestDialogOpen(true)}
      />

      <EditPickerField
        label="ระยะเวลา"
        value={`${nights + 1} วัน ${nights} คืน`}
        icon={CalendarDays}
        onClick={() => setDateDialogOpen(true)}
      />

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ความเข้มข้นของทริป</label>
        <div className="flex flex-wrap items-center gap-2">
          {Object.keys(PACE_TO_INTENSITY).map((p) => (
            <EditTag key={p} label={p} isOn={paceWord === p} onClick={() => setPaceWord((prev) => (prev === p ? null : p))} />
          ))}
        </div>
      </div>

      <EditNumberField label="งบประมาณ" value={budgetAmount} onChange={setBudgetAmount} placeholder="เช่น 3000" suffix="/ วัน" />

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">เงื่อนไข / ข้อจำกัด</label>
        <div className="flex flex-wrap items-center gap-2">
          {condOptions.map((c) => (
            <EditTag key={c} label={c} isOn={selectedConditions.includes(c)} onClick={() => toggleCondition(c)} />
          ))}
          {!showMoreConds && (
            <button
              type="button"
              onClick={() => setShowMoreConds(true)}
              className="inline-flex items-center gap-1 rounded-[20px] border px-3.5 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }}
            >
              <Plus size={13} />
              เพิ่มเติม
            </button>
          )}
        </div>
        <textarea
          value={conditionsText}
          onChange={(e) => setConditionsText(e.target.value)}
          placeholder="พิมพ์เงื่อนไขอื่นๆ เพิ่มเติม เช่น แพ้อาหารทะเล"
          rows={2}
          className="mt-2.5 w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
          style={{ borderColor: "var(--color-border)" }}
        />
      </div>

      <DestinationPickerDialog
        isOpen={destDialogOpen}
        onClose={() => setDestDialogOpen(false)}
        onConfirm={(result) => {
          setDestination(result.label);
          setDestinationPlace(result.destination);
          setDestDialogOpen(false);
        }}
      />

      <DatePickerDialog
        isOpen={dateDialogOpen}
        initialStartDate={trip.days[0]?.date}
        initialEndDate={trip.days[trip.days.length - 1]?.date}
        onClose={() => setDateDialogOpen(false)}
        onConfirm={(result) => {
          setNights(parseNightsFromLabel(result.label));
          setPendingStartDate(result.startDate);
          setDateDialogOpen(false);
        }}
      />
    </EditDialogShell>
  );
}

function AccommodationEditDialog({
  trip,
  onClose,
  onSave,
}: {
  trip: GeneratedTrip;
  onClose: () => void;
  onSave: (accommodation: TripAccommodation) => void;
}) {
  const hotel = findHotelActivity(trip);
  const current = trip.accommodation;
  const [name, setName] = useState(current?.name ?? hotel?.location?.name ?? "");
  const [imageUrl, setImageUrl] = useState(current?.imageUrl ?? hotel?.location?.imageUrl ?? "");
  const [price, setPrice] = useState(current?.pricePerNight ? String(current.pricePerNight) : "");
  const [amenities, setAmenities] = useState(current?.amenities?.join(", ") ?? "");
  const [checkIn, setCheckIn] = useState(current?.checkIn ?? "14:00");
  const [checkOut, setCheckOut] = useState(current?.checkOut ?? "12:00");
  const [description, setDescription] = useState(current?.description ?? "");

  function handleSave() {
    onSave({
      name: name.trim() || "ที่พัก",
      imageUrl: imageUrl.trim() || undefined,
      pricePerNight: price.trim() ? Number(price.replace(/[^\d]/g, "")) || undefined : undefined,
      amenities: amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      checkIn: checkIn.trim() || undefined,
      checkOut: checkOut.trim() || undefined,
      description: description.trim() || undefined,
    });
    onClose();
  }

  return (
    <EditDialogShell title="แก้ไขที่พัก" onClose={onClose} onSave={handleSave}>
      <EditField label="ชื่อที่พัก" value={name} onChange={setName} placeholder="เช่น Avani+ Luang Prabang" />
      <EditField label="ลิงก์รูปภาพ" value={imageUrl} onChange={setImageUrl} placeholder="https://..." />
      <EditField label="ราคา/คืน (บาท)" value={price} onChange={setPrice} placeholder="เช่น 3500" />
      <EditField
        label="สิ่งอำนวยความสะดวก (คั่นด้วยจุลภาค)"
        value={amenities}
        onChange={setAmenities}
        placeholder="เช่น Wi-Fi ฟรี, สระว่ายน้ำ, รถรับส่ง"
      />
      <div className="grid grid-cols-2 gap-3">
        <EditField label="เช็คอิน" value={checkIn} onChange={setCheckIn} placeholder="14:00" />
        <EditField label="เช็คเอาท์" value={checkOut} onChange={setCheckOut} placeholder="12:00" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">รายละเอียดที่พัก</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
          style={{ borderColor: "var(--color-border)" }}
        />
      </div>
    </EditDialogShell>
  );
}

const ACTIVITY_CATEGORY_OPTIONS: ActivityCategory[] = [
  "sightseeing",
  "food",
  "hotel",
  "activity",
  "transport",
  "other",
];

// Replaces the native <select> for "ประเภท" — a dropdown panel of category
// rows (colored icon badge + label), styled consistently with
// ActivityPlaceSearchField's suggestion dropdown (same focus-border,
// selected-row highlight, and click-outside-to-close behavior) instead of
// deferring to the browser's own <select> UI.
function ActivityCategoryField({
  value,
  onChange,
}: {
  value: ActivityCategory;
  onChange: (category: ActivityCategory) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const Icon = categoryIcon[value];

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ประเภท</label>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-left text-sm transition-colors"
        style={{ borderColor: isOpen ? "var(--color-brand-green)" : "var(--color-border)" }}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: categoryBgVar[value] }}
        >
          <Icon size={11} style={{ color: categoryColorVar[value] }} />
        </span>
        <span className="flex-1 truncate">{categoryLabel[value]}</span>
        <ChevronDown size={14} className="shrink-0" style={{ color: "var(--color-muted)" }} />
      </button>

      {isOpen && (
        <div
          className="absolute inset-x-0 top-[calc(100%+4px)] z-10 max-h-64 overflow-y-auto rounded-xl border bg-white py-1.5 shadow-lg"
          style={{ borderColor: "var(--color-border)" }}
        >
          {ACTIVITY_CATEGORY_OPTIONS.map((c) => {
            const OptionIcon = categoryIcon[c];
            const isSelected = c === value;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-[var(--color-sel-bg)]"
                style={isSelected ? { backgroundColor: "var(--color-sel-bg)" } : undefined}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: categoryBgVar[c] }}
                >
                  <OptionIcon size={12} style={{ color: categoryColorVar[c] }} />
                </span>
                <span className="flex-1 truncate font-medium">{categoryLabel[c]}</span>
                {isSelected && <Check size={14} style={{ color: "var(--color-brand-green)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PLACE_SEARCH_DEBOUNCE_MS = 350;

// Free-text POI search + dropdown for the activity name field — picking a
// result attaches real lat/lng/rating/imageUrl (so the new stop shows up
// properly on the map and image lightbox) and pre-fills the category;
// typing without picking anything still works, just as a plain custom stop.
function ActivityPlaceSearchField({
  value,
  onChange,
  onSelectPlace,
}: {
  value: string;
  onChange: (title: string) => void;
  onSelectPlace: (place: ExternalSearchPlace) => void;
}) {
  const [suggestions, setSuggestions] = useState<ExternalSearchPlace[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (!trimmed) {
      setSuggestions(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(() => {
      searchExternalPlaces(trimmed, 6).then((results) => {
        setSuggestions(results);
        setSearching(false);
        setIsOpen(true);
      });
    }, PLACE_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  function handleSelect(place: ExternalSearchPlace) {
    onSelectPlace(place);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ชื่อสถานที่ / กิจกรรม</label>
      <div
        className="flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 transition-colors"
        style={{ borderColor: isOpen ? "var(--color-brand-green)" : "var(--color-border)" }}
      >
        <MapPin size={15} className="shrink-0" style={{ color: "var(--color-muted)" }} />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value.trim()) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          placeholder="เช่น ตลาดเช้า"
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      {isOpen && (searching || (suggestions && suggestions.length > 0)) && (
        <div
          className="absolute inset-x-0 top-[calc(100%+4px)] z-10 max-h-56 overflow-y-auto rounded-xl border bg-white py-1.5 shadow-lg"
          style={{ borderColor: "var(--color-border)" }}
        >
          {searching && <p className="px-3.5 py-2 text-sm text-[var(--color-muted)]">กำลังค้นหา...</p>}
          {!searching &&
            suggestions?.map((place, i) => (
              <button
                key={place.id}
                type="button"
                onClick={() => handleSelect(place)}
                className="block w-full truncate px-3.5 py-2.5 text-left text-sm hover:bg-[var(--color-sel-bg)]"
                style={i === 0 ? { backgroundColor: "var(--color-sel-bg)" } : undefined}
              >
                <span className="font-semibold">{place.name}</span>{" "}
                <span className="text-[var(--color-muted)]">({place.address})</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

const MAX_ACTIVITY_IMAGES = 6;

function filesToDataUrls(files: FileList): Promise<string[]> {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

function ActivityImagesField({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remainingSlots = MAX_ACTIVITY_IMAGES - images.length;

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newUrls = await filesToDataUrls(files);
    onChange([...images, ...newUrls].slice(0, MAX_ACTIVITY_IMAGES));
  }

  function handleRemove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {remainingSlots > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border text-[var(--color-muted)]"
          style={{ borderColor: "var(--color-border)", borderStyle: "dashed" }}
        >
          <ImagePlus size={26} />
          <span className="text-xs font-semibold">เพิ่มรูป</span>
        </button>
      )}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, index) => (
            <div key={index} className="group relative h-16 w-16 overflow-hidden rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label="ลบรูปภาพ"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// "เพิ่มสถานที่" — adds one new stop to a day. Day tabs at the top let the
// day be changed/picked at add-time instead of being locked to whichever
// day's "+เพิ่มสถานที่" button opened this (matches AddPlaceDialog in
// components/plan/SelfPlanBuilderTab.tsx — same day-tabs pattern, same
// "ทุกวัน" placeholder that disables save since there's no single day to
// attach a bespoke stop to).
function AddActivityDialog({
  days,
  initialDayId,
  initialActivity,
  onAddDay,
  onClose,
  onSave,
}: {
  days: Day[];
  initialDayId: string;
  // Set = editing this existing stop in place (pre-filled, id preserved,
  // day-switching hidden since it isn't going anywhere); undefined = adding
  // a brand-new one.
  initialActivity?: Activity;
  onAddDay: () => void;
  onClose: () => void;
  onSave: (dayId: string, activity: Activity) => void;
}) {
  const isEditing = initialActivity !== undefined;
  const [selectedDayId, setSelectedDayId] = useState<string | null>(initialDayId);
  // Optional — an empty string means "no time set" (already the convention
  // trips-create-api.ts's buildActivity expects: `time || undefined`).
  const [time, setTime] = useState(initialActivity?.time ?? "");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [title, setTitle] = useState(initialActivity?.title ?? "");
  const [notes, setNotes] = useState(initialActivity?.notes ?? "");
  const [category, setCategory] = useState<ActivityCategory>(initialActivity?.category ?? "sightseeing");
  const [cost, setCost] = useState(initialActivity?.cost ? String(initialActivity.cost) : "");
  const [travelNote, setTravelNote] = useState(initialActivity?.travelNote ?? "");
  const [images, setImages] = useState<string[]>(initialActivity?.images ?? []);
  const [selectedPlace, setSelectedPlace] = useState<ExternalSearchPlace | null>(null);
  const prevDayCountRef = useRef(days.length);

  // Jump to the newly-created day once "+เพิ่มวัน" resolves — see the same
  // pattern in AddPlaceDialog.
  useEffect(() => {
    if (days.length > prevDayCountRef.current) {
      setSelectedDayId(days[days.length - 1].id);
    }
    prevDayCountRef.current = days.length;
  }, [days]);

  function handleTitleChange(next: string) {
    setTitle(next);
    // Editing the name after picking a result invalidates the attached
    // geo data — fall back to a plain custom stop rather than keep stale
    // lat/lng under a now-mismatched title.
    if (selectedPlace && next !== selectedPlace.name) setSelectedPlace(null);
  }

  function handleSelectPlace(place: ExternalSearchPlace) {
    setTitle(place.name);
    setSelectedPlace(place);
    setCategory(EXTERNAL_TO_ACTIVITY_CATEGORY[place.category]);
  }

  function handleSave() {
    if (!title.trim() || !selectedDayId) return;
    const location = selectedPlace
      ? {
          name: selectedPlace.name,
          lat: selectedPlace.lat,
          lng: selectedPlace.lng,
          rating: selectedPlace.rating,
          imageUrl: selectedPlace.imageUrl,
          googlePlaceId: selectedPlace.id,
        }
      : // Keep the original geo data when editing without touching the name —
        // only fall back to a plain custom stop once the title diverges from it.
        initialActivity && initialActivity.title === title.trim()
        ? initialActivity.location
        : { name: title.trim() };

    onSave(selectedDayId, {
      id: initialActivity?.id ?? crypto.randomUUID(),
      time,
      title: title.trim(),
      category,
      notes: notes.trim() || undefined,
      cost: cost.trim() ? Number(cost.replace(/[^\d]/g, "")) || 0 : 0,
      travelNote: travelNote.trim() || undefined,
      // Not editable from this dialog — carry over untouched so saving a
      // title/time/cost tweak doesn't wipe out the travel-leg-from-previous
      // data set separately via TravelConnectorRow.
      travelFromPrevious: initialActivity?.travelFromPrevious,
      icon: initialActivity?.icon,
      images: images.length > 0 ? images : undefined,
      location,
    });
    onClose();
  }

  const canSave = title.trim().length > 0 && selectedDayId !== null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">{isEditing ? "แก้ไขสถานที่" : "เพิ่มสถานที่"}</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <X size={16} />
            </button>
          </div>

          {!isEditing && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-[var(--color-muted)]">เลือกวันที่ต้องการเพิ่มแพลน</p>
              <div
                className="flex items-center gap-1.5 overflow-x-auto rounded-2xl p-1.5"
                style={{ backgroundColor: "var(--color-page-cream)" }}
              >
                <DayTab label="ทุกวัน" isActive={selectedDayId === null} onClick={() => setSelectedDayId(null)} />
                {days.map((day) => (
                  <DayTab
                    key={day.id}
                    label={`วันที่ ${day.dayNumber}`}
                    isActive={selectedDayId === day.id}
                    onClick={() => setSelectedDayId(day.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={onAddDay}
                  className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold"
                  style={{ borderColor: "var(--color-accent-orange)", color: "var(--color-accent-orange)" }}
                >
                  <Plus size={14} />
                  เพิ่มวัน
                </button>
              </div>
            </div>
          )}

          {/* Optional — a free-text note/heading about the stop, shown on the
              itinerary list (PlanActivityRow) under the time/cost line when set. */}
          <label
            className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <MessageSquare size={16} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เพิ่มหัวข้อเรื่อง หรือรายละเอียดเพิ่มเติม (ไม่บังคับ)"
              rows={1}
              className="w-full resize-none bg-transparent text-sm focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[200px_1fr]">
            <ActivityImagesField images={images} onChange={setImages} />

            <div className="flex flex-col gap-4">
              <ActivityPlaceSearchField value={title} onChange={handleTitleChange} onSelectPlace={handleSelectPlace} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">
                    เวลา <span className="font-normal text-[var(--color-muted)]">(ไม่บังคับ)</span>
                  </label>
                  <div
                    className="flex w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowTimePicker(true)}
                      className="flex flex-1 items-center gap-2 text-left focus:outline-none"
                    >
                      <Clock size={14} style={{ color: "var(--color-muted)" }} />
                      {time ? (
                        formatTimeDisplay(time)
                      ) : (
                        <span className="text-[var(--color-muted)]">ไม่ระบุเวลา</span>
                      )}
                    </button>
                    {time && (
                      <button
                        type="button"
                        onClick={() => setTime("")}
                        aria-label="ล้างเวลา"
                        className="shrink-0 rounded-full p-0.5 text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <ActivityCategoryField value={category} onChange={setCategory} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ค่าใช้จ่าย (บาท)</label>
                <div className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5" style={{ borderColor: "var(--color-border)" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cost}
                    onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="0"
                    className="w-full bg-transparent text-sm focus:outline-none"
                  />
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-muted)]">THB</span>
                </div>
              </div>

              <EditField label="หมายเหตุการเดินทาง" value={travelNote} onChange={setTravelNote} placeholder="เช่น ออกก่อนเวลา ~5 นาที" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border py-3 text-sm font-bold"
              style={{ borderColor: "var(--color-border)" }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 rounded-full py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "var(--color-accent-orange)" }}
            >
              {isEditing ? "บันทึก" : "เพิ่มสถานที่"}
            </button>
          </div>
        </div>
      </div>

      {showTimePicker && (
        <TimePickerDialog value={time || "09:00"} onConfirm={setTime} onClose={() => setShowTimePicker(false)} />
      )}
    </>
  );
}

// Custom wheel-style "เลือกเวลา" picker (matches the Figma spec) that opens
// on top of AddActivityDialog when the "เวลา" field is tapped — replaces the
// browser-native <input type="time"> so the look is consistent across
// platforms instead of deferring to each OS's own time picker UI.
const WHEEL_HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const WHEEL_MINUTES_60 = Array.from({ length: 60 }, (_, i) => i);
const WHEEL_ITEM_HEIGHT = 44;

function parseTime12(time24: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr) || 0;
  const minute = Number(mStr) || 0;
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute, period };
}

function toTime24(hour12: number, minute: number, period: "AM" | "PM"): string {
  const h = period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTimeDisplay(time24: string): string {
  const { hour12, minute, period } = parseTime12(time24);
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

// One scrollable wheel column (hour or minute) — snaps to the nearest value
// on scroll-end and centers the picked value, matching the reference's
// 3-row wheel (dimmed neighbors above/below a bold, larger selected row).
function TimeWheelColumn({
  values,
  selectedIndex,
  onChange,
}: {
  values: number[];
  selectedIndex: number;
  onChange: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = selectedIndex * WHEEL_ITEM_HEIGHT;
    // Only run once on mount — later scrollTop updates come from the user's
    // own scroll/click, not from selectedIndex changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function settleToIndex(index: number) {
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    onChange(clamped);
    containerRef.current?.scrollTo({ top: clamped * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
  }

  function handleScroll() {
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      settleToIndex(Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT));
    }, 100);
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative overflow-y-scroll [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: WHEEL_ITEM_HEIGHT * 3, scrollSnapType: "y mandatory" }}
    >
      <div style={{ height: WHEEL_ITEM_HEIGHT }} />
      {values.map((v, i) => (
        <button
          key={v}
          type="button"
          onClick={() => settleToIndex(i)}
          className="flex w-16 items-center justify-center transition-colors"
          style={{
            height: WHEEL_ITEM_HEIGHT,
            scrollSnapAlign: "center",
            fontSize: i === selectedIndex ? "1.375rem" : "1rem",
            fontWeight: i === selectedIndex ? 700 : 500,
            color: i === selectedIndex ? "var(--foreground)" : "var(--color-muted)",
          }}
        >
          {String(v).padStart(2, "0")}
        </button>
      ))}
      <div style={{ height: WHEEL_ITEM_HEIGHT }} />
    </div>
  );
}

function TimePickerDialog({
  value,
  onConfirm,
  onClose,
}: {
  value: string;
  onConfirm: (time24: string) => void;
  onClose: () => void;
}) {
  const initial = parseTime12(value);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);
  const [hourIndex, setHourIndex] = useState(WHEEL_HOURS_12.indexOf(initial.hour12));
  const [minuteIndex, setMinuteIndex] = useState(initial.minute);

  function handleConfirm() {
    onConfirm(toTime24(WHEEL_HOURS_12[hourIndex], WHEEL_MINUTES_60[minuteIndex], period));
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="flex w-full max-w-sm flex-col gap-5 rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">เลือกเวลา</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl p-1.5" style={{ backgroundColor: "var(--color-page-cream)" }}>
            <button
              type="button"
              onClick={() => setPeriod("AM")}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors"
              style={
                period === "AM"
                  ? { backgroundColor: "white", color: "var(--foreground)", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                  : { color: "var(--color-muted)" }
              }
            >
              ก่อนเที่ยง (AM)
            </button>
            <button
              type="button"
              onClick={() => setPeriod("PM")}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors"
              style={
                period === "PM"
                  ? { backgroundColor: "white", color: "var(--foreground)", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                  : { color: "var(--color-muted)" }
              }
            >
              หลังเที่ยง (PM)
            </button>
          </div>

          <div className="relative flex items-center justify-center gap-2">
            <div
              className="pointer-events-none absolute inset-x-0 rounded-2xl"
              style={{ top: WHEEL_ITEM_HEIGHT, height: WHEEL_ITEM_HEIGHT, backgroundColor: "var(--color-page-cream)" }}
            />
            <TimeWheelColumn values={WHEEL_HOURS_12} selectedIndex={hourIndex} onChange={setHourIndex} />
            <span className="text-xl font-bold">:</span>
            <TimeWheelColumn values={WHEEL_MINUTES_60} selectedIndex={minuteIndex} onChange={setMinuteIndex} />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border py-3 text-sm font-bold"
              style={{ borderColor: "var(--color-border)" }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-full py-3 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--color-accent-orange)" }}
            >
              ตกลง
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
