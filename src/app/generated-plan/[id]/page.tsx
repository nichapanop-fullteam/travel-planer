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
  Car,
  Clock,
  CloudSun,
  Compass,
  Download,
  Footprints,
  ImagePlus,
  LoaderCircle,
  Mountain,
  Maximize2,
  MapPin,
  Menu,
  Minus,
  MoreVertical,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plane,
  Plus,
  RefreshCcw,
  Save,
  Share2,
  Star,
  Ticket,
  Trash2,
  TriangleAlert,
  Waves,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import type { Activity, ActivityCategory, Day, GeneratedTrip, TravelFromPrevious, TripAccommodation } from "@/types";
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
  pulse: PulseIcon,
};
import {
  buildGeneratedTripFromBackendTrip,
  confirmGeneratedTrip,
  DEMO_LUANG_PRABANG_ID,
  generateTripFromDraft,
  getGeneratedTrip,
  getOrCreateDemoLuangPrabangTrip,
  replaceGeneratedTripId,
  saveGeneratedTrip,
  updateGeneratedTrip,
} from "@/lib/generated-trips";
import { buildActivity, createTripOnServer, reconcileTripWithServer } from "@/lib/trips-create-api";
import { getTrip } from "@/lib/trips-api";
import {
  createTripDayOnServer,
  createTripItemOnServer,
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
} from "@/lib/trip-utils";
import { FakeMapBackground } from "@/components/plan/FakeMapBackground";
import { BudgetManagementPanel } from "@/components/plan/BudgetManagementPanel";
import { SelfPlanBuilderTab, DayTab, EditLockToggle, TravelConnectorRow } from "@/components/plan/SelfPlanBuilderTab";
import { Sidebar } from "@/components/consumer/Sidebar";

type TabKey = "overview" | "plan" | "weather" | "budget" | "chat";
type SaveState = "idle" | "saving" | "saved" | "error";

// "สร้างด้วยตัวเอง" (self mode) trips start from an empty shell and get built
// up on the "overview" tab instead of reviewing an AI-generated summary — so
// that tab (and the next one) are relabeled to match what's actually there.
const AI_TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "ภาพรวมทริป" },
  { key: "plan", label: "แพลนทริป" },
  { key: "weather", label: "สภาพอากาศ" },
  { key: "budget", label: "สรุปงบ" },
  { key: "chat", label: "ห้องแชท" },
];

const SELF_TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "จัดแพลน" },
  { key: "plan", label: "ทริปของฉัน" },
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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [accommodationDialogOpen, setAccommodationDialogOpen] = useState(false);
  // undefined `activity` = add mode (AddActivityDialog starts blank); set =
  // edit mode (pre-filled, day-switching hidden, id preserved on save).
  const [activityDialogRequest, setActivityDialogRequest] = useState<{ dayId: string; activity?: Activity } | null>(
    null
  );
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  // Every trip opens read-only (no add/delete/edit affordances) so it
  // doesn't look editable by accident — "แก้ไขแพลน"/"แก้ไขทริป" reveals them
  // again — see canEdit below. The one exception: arriving straight from
  // "สร้างแพลน" on create-trip (?edit=1) starts unlocked, since the traveler
  // just created this trip and is about to build it out.
  const [editUnlocked, setEditUnlocked] = useState(() => searchParams.get("edit") === "1");

  // Local-first: a trip this browser created (draft in progress, or an
  // already-confirmed one saved earlier) always renders from localStorage.
  // Only once that lookup misses does this reach for the backend — covers a
  // trip saved via createTripOnServer (see trips-create-api.ts) and opened
  // from /main's "ทริปล่าสุดจากระบบ" list or a shared link, neither of which
  // has ever touched this browser's localStorage.
  useEffect(() => {
    if (params.id === DEMO_LUANG_PRABANG_ID) {
      const loaded = getOrCreateDemoLuangPrabangTrip();
      setTrip(loaded);
      if (loaded.status === "confirmed") setTab("plan");
      return;
    }

    const local = getGeneratedTrip(params.id);
    if (local) {
      setTrip(local);
      if (local.status === "confirmed") setTab("plan");
      return;
    }

    let cancelled = false;
    getTrip(params.id)
      .then((backendTrip) => {
        if (cancelled) return;
        const loaded = backendTrip ? buildGeneratedTripFromBackendTrip(backendTrip) : null;
        setTrip(loaded);
        if (loaded && loaded.status === "confirmed") setTab("plan");
      })
      .catch((err) => {
        console.warn(err);
        if (!cancelled) setTrip(null);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Strip ?edit=1 once its one-time effect (unlocking editUnlocked's initial
  // state above) has been read — otherwise reloading/bookmarking this URL
  // would keep forcing edit mode back open regardless of the traveler having
  // since pressed "เสร็จสิ้น".
  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      router.replace(`/generated-plan/${params.id}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const isSelfMode = getTripDrafts().find((d) => d.id === trip.draftId)?.mode === "self";
  const tabs = isSelfMode ? SELF_TABS : AI_TABS;

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
      budgetLimit: current.budgetGoal,
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

  async function handleSaveToServer() {
    setSaveState("saving");
    try {
      if (trip!.backendSynced) {
        await syncTripUpdatesToServer(trip!);
      } else {
        const created = await createTripOnServer(trip!);
        const reconciled = reconcileTripWithServer(trip!, created);
        replaceGeneratedTripId(trip!.id, reconciled);
        setTrip(reconciled);
        // The URL still points at the old client-generated id — swap it for
        // the real one so a reload/bookmark doesn't 404 (getGeneratedTrip
        // can no longer find the old id; it was just renamed in storage).
        router.replace(`/generated-plan/${reconciled.id}`);
      }
      setSaveState("saved");
      // Saving is the "I'm done editing for now" gesture — lock back to
      // read-only afterward instead of leaving edit affordances open, same
      // as pressing "เสร็จสิ้น" directly. Left unlocked on error/failure
      // since nothing was actually persisted.
      setEditUnlocked(false);
    } catch (err) {
      console.warn(err);
      setSaveState("error");
    }
    window.setTimeout(() => setSaveState("idle"), 2500);
  }

  // "แก้ไขแพลน"/"เสร็จสิ้น" toggle — unlocking is just local state (nothing
  // to push yet), but locking back down ("เสร็จสิ้น") means the traveler is
  // done editing, so it pushes this session's changes to the backend the
  // same way "บันทึก" does (handleSaveToServer already locks on success and
  // stays unlocked on failure, so a failed sync doesn't silently drop edits).
  function handleToggleEditLock() {
    if (editUnlocked) {
      handleSaveToServer();
    } else {
      setEditUnlocked(true);
    }
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
  // Read-only by default regardless of draft/confirmed status — "แก้ไขทริป"/
  // "แก้ไขแพลน" must be pressed to unlock editing, same gesture either way.
  // Viewing a trip from /main never carries ?edit=1, so it always lands here
  // read-only; only arriving straight from create-trip starts unlocked. Self
  // mode still autosaves every add/edit once unlocked (see
  // handleAddDay/handleSaveActivity/handleUpdateActivityTravel above) — it
  // just has no "เสร็จสิ้น"/"บันทึก" step to lock back down with (see
  // SelfPlanBuilderTab's and PlanTab's `!canEdit` gate on EditLockToggle).
  const canEdit = editUnlocked;

  return (
    <div className="min-h-screen bg-white">
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

      <TopBar
        onBack={() => router.back()}
        onMenuClick={() => setSidebarOpen(true)}
        onSave={handleSaveToServer}
        saveState={saveState}
        hideSaveButton={isSelfMode}
      />

      <div
        className="sticky top-0 z-40 border-b bg-[#FAF8F5]/95 px-4 py-3 backdrop-blur-sm sm:px-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="mx-auto max-w-2xl">
          <PlanTabs tabs={tabs} tab={tab} setTab={setTab} />
        </div>
      </div>

      <Hero trip={trip} onManagePhotos={() => setGalleryDialogOpen(true)} />

      {galleryDialogOpen && (
        <TripGalleryDialog
          tripId={trip.id}
          onClose={() => setGalleryDialogOpen(false)}
          onCoverChanged={(coverImage, mediaSummary) => applyPatch({ coverImage, mediaSummary })}
        />
      )}

      <div className="relative -mt-6 rounded-t-[32px] bg-white sm:-mt-8">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
          {trip.generationNotice && <GenerationNoticeBanner notice={trip.generationNotice} />}

          {tab === "overview" && isSelfMode && (
            <SelfPlanBuilderTab
              trip={trip}
              canEdit={canEdit}
              onToggleEditLock={handleToggleEditLock}
              onAddActivityDirect={handleSaveActivity}
              onOpenAddActivity={(dayId) => setActivityDialogRequest({ dayId })}
              onEditActivity={(dayId, activity) => setActivityDialogRequest({ dayId, activity })}
              onSaveAccommodation={(accommodation) => applyPatch({ accommodation })}
              onAddDay={handleAddDay}
              onGoToPlanTab={() => setTab("plan")}
              onUpdateActivityTravel={handleUpdateActivityTravel}
            />
          )}
          {tab === "overview" && !isSelfMode && (
            <OverviewTab
              trip={trip}
              isConfirmed={isConfirmed}
              canEdit={canEdit}
              onToggleEditLock={handleToggleEditLock}
              bannerDismissed={bannerDismissed}
              regenerating={regenerating}
              onDismissBanner={() => setBannerDismissed(true)}
              onRegenerate={handleRegenerate}
              onConfirm={handleConfirm}
              onEditTrip={() => setEditDialogOpen(true)}
              onEditAccommodation={() => setAccommodationDialogOpen(true)}
              onAddActivity={(dayId) => setActivityDialogRequest({ dayId })}
              onEditActivity={(dayId, activity) => setActivityDialogRequest({ dayId, activity })}
              onDeleteActivity={handleDeleteActivity}
              onSaveTrip={handleSaveToServer}
              saveState={saveState}
            />
          )}
          {tab === "plan" && (
            <PlanTab
              trip={trip}
              canEdit={canEdit}
              onToggleEditLock={handleToggleEditLock}
              onAddDay={handleAddDay}
              onAddActivity={(dayId) => setActivityDialogRequest({ dayId })}
              onEditActivity={(dayId, activity) => setActivityDialogRequest({ dayId, activity })}
              onDeleteActivity={handleDeleteActivity}
              onUpdateActivityTravel={handleUpdateActivityTravel}
              onSaveTrip={handleSaveToServer}
              saveState={saveState}
              hideManualControls={isSelfMode}
            />
          )}
          {tab === "weather" && <WeatherTab />}
          {tab === "budget" && <BudgetManagementPanel trip={trip} onPatch={applyPatch} />}
          {tab === "chat" && <ChatTab />}
        </div>
      </div>

      {editDialogOpen && (
        <EditTripDialog trip={trip} onClose={() => setEditDialogOpen(false)} onSave={applyPatch} />
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
    </div>
  );
}

function TopBar({
  onBack,
  onMenuClick,
  onSave,
  saveState,
  hideSaveButton,
}: {
  onBack: () => void;
  onMenuClick: () => void;
  onSave: () => void;
  saveState: SaveState;
  hideSaveButton?: boolean;
}) {
  const SaveIcon = saveState === "saving" ? LoaderCircle : saveState === "saved" ? Check : Save;
  const saveLabel =
    saveState === "saving" ? "กำลังบันทึก..." : saveState === "saved" ? "บันทึกแล้ว" : saveState === "error" ? "บันทึกไม่สำเร็จ" : "บันทึก";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6" style={{ backgroundColor: "#0F2419" }}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold sm:text-sm"
        >
          <ArrowLeft size={14} />
          ย้อนกลับ
        </button>
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <Menu size={16} />
        </button>
      </div>

      <p className="hidden text-base font-extrabold text-white sm:block sm:text-lg">PunGuide</p>

      <div className="flex shrink-0 items-center gap-2">
        {!hideSaveButton && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveState === "saving"}
            title={saveState === "error" ? "บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง" : undefined}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
            style={{
              backgroundColor:
                saveState === "saved"
                  ? "var(--color-brand-green)"
                  : saveState === "error"
                    ? "var(--color-danger)"
                    : "rgba(255,255,255,0.15)",
            }}
          >
            <SaveIcon size={14} className={saveState === "saving" ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{saveLabel}</span>
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/profile-avatar.jpg" alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      </div>
    </div>
  );
}

// Same save action as TopBar's button, styled as an outline pill to match
// the แชร์/บันทึกรูป row on the overview/plan tabs instead of the dark topbar.
function SaveTripButton({ onSave, saveState }: { onSave: () => void; saveState: SaveState }) {
  const Icon = saveState === "saving" ? LoaderCircle : saveState === "saved" ? Check : Save;
  const label =
    saveState === "saving" ? "กำลังบันทึก..." : saveState === "saved" ? "บันทึกแล้ว" : saveState === "error" ? "บันทึกไม่สำเร็จ" : "บันทึก";

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saveState === "saving"}
      title={saveState === "error" ? "บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง" : undefined}
      className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        borderColor: saveState === "error" ? "var(--color-danger)" : "var(--color-border)",
        color:
          saveState === "saved" ? "var(--color-brand-green)" : saveState === "error" ? "var(--color-danger)" : undefined,
      }}
    >
      <Icon size={14} className={saveState === "saving" ? "animate-spin" : ""} />
      {label}
    </button>
  );
}

function Hero({ trip, onManagePhotos }: { trip: GeneratedTrip; onManagePhotos: () => void }) {
  const pills = [
    { key: "duration", icon: CalendarDays, label: trip.durationLabel },
    { key: "pace", icon: Footprints, label: trip.paceLabel },
    { key: "budget", icon: Wallet, label: trip.budgetLabel },
    { key: "conditions", icon: Asterisk, label: trip.conditionsLabel },
  ];

  // resolveCoverImageUrl falls back to the static /images/hero-mountain.jpg
  // placeholder (trip.coverImageUrl) whenever PUT /trips/:tripId/cover hasn't
  // been called yet — before giving up to that, check GET /trips/:tripId/media
  // for a real photo (e.g. one attached via addTripMediaFromPlace when a place
  // was added to the itinerary) and use whichever it flags as the cover.
  const [galleryCover, setGalleryCover] = useState<string | null>(null);
  useEffect(() => {
    if (trip.coverImage) return;
    let cancelled = false;
    getTripGallery(trip.id, { page: 1, limit: 12 })
      .then((gallery) => {
        if (cancelled) return;
        const cover = gallery.items.find((item) => item.isCover) ?? gallery.items[0];
        if (cover) setGalleryCover(cover.urls.large);
      })
      .catch(() => {
        // No gallery yet (or the request failed) — resolveCoverImageUrl's own
        // placeholder below covers this silently.
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id, trip.coverImage]);

  return (
    <div className="relative flex min-h-[220px] flex-col items-center justify-center gap-5 overflow-hidden px-6 py-6 text-center sm:min-h-[260px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={galleryCover ?? resolveCoverImageUrl(trip, "large")}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[80%_30%]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/50" />

      <button
        type="button"
        onClick={onManagePhotos}
        className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-xs font-semibold shadow-md"
      >
        <ImagePlus size={14} />
        จัดการรูปภาพ
      </button>

      <h1 className="relative text-4xl font-extrabold text-white drop-shadow-sm sm:text-[70px]">
        {trip.title || trip.destination}
      </h1>

      <div className="relative flex flex-wrap items-center justify-center gap-2">
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
          ใช้แพลนนี้เลย
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
  canEdit,
  onToggleEditLock,
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
  onSaveTrip,
  saveState,
}: {
  trip: GeneratedTrip;
  isConfirmed: boolean;
  canEdit: boolean;
  onToggleEditLock: () => void;
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
  onSaveTrip: () => void;
  saveState: SaveState;
}) {
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
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Download size={14} />
            บันทึกรูป
          </button>
          <SaveTripButton onSave={onSaveTrip} saveState={saveState} />
          <EditLockToggle canEdit={canEdit} onToggle={onToggleEditLock} />
          {canEdit && (
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

      {!isConfirmed && !bannerDismissed && (
        <ConfirmBanner
          regenerating={regenerating}
          onDismiss={onDismissBanner}
          onRegenerate={onRegenerate}
          onConfirm={onConfirm}
        />
      )}

      <TripStatsCard trip={trip} />
      <AccommodationAccordion trip={trip} canEdit={canEdit} onEdit={onEditAccommodation} />
      <ItineraryAccordion
        trip={trip}
        canEdit={canEdit}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
        onDeleteActivity={onDeleteActivity}
      />
      <TripModeBar />
    </div>
  );
}

// The four category counts and the cost/distance figures aren't derivable from
// today's data model (ActivityCategory has no cafe/bar split, and distance is
// only ever a per-day estimate) — shown as placeholders until that's wired up.
function TripStatsCard({ trip }: { trip: GeneratedTrip }) {
  const stats = [
    { label: "ที่เที่ยว", value: "XX" },
    { label: "ร้านอาหาร", value: "XX" },
    { label: "คาเฟ่", value: "XX" },
    { label: "บาร์ / ผับ", value: "X" },
    { label: "รวมงบ/วัน", value: "฿XX" },
    { label: "Total Distance", value: "XXX km" },
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

interface AccommodationOption {
  key: string;
  dayNumber: number;
  hotel: Activity;
}

// One entry per day that actually has a hotel-category stop, deduped by
// place name — a trip staying at the same hotel for several nights in a row
// only gets one chip, not one per day.
function collectAccommodationOptions(trip: GeneratedTrip): AccommodationOption[] {
  const seen = new Set<string>();
  const options: AccommodationOption[] = [];
  for (const day of trip.days) {
    const hotel = day.activities.find((a) => a.category === "hotel");
    if (!hotel) continue;
    const key = hotel.location?.name || hotel.title;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ key, dayNumber: day.dayNumber, hotel });
  }
  return options;
}

// Falls back to the first hotel-category Activity (and static placeholder
// copy) when `trip.accommodation` hasn't been set via "เปลี่ยนที่พัก" yet —
// keeps older trips saved before this field existed looking the same as
// before. When more than one day has its own hotel stop, a chip row lets the
// traveler flip through each one instead of only ever seeing the first.
function AccommodationAccordion({
  trip,
  canEdit,
  onEdit,
}: {
  trip: GeneratedTrip;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const options = useMemo(() => collectAccommodationOptions(trip), [trip]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedOption = options.find((o) => o.key === selectedKey) ?? options[0];
  const hotel = selectedOption?.hotel ?? findHotelActivity(trip);

  // trip.accommodation (set via "เปลี่ยนที่พัก") only ever describes one,
  // trip-wide stay — it only overrides name/image/description when there's
  // just a single accommodation option, so switching chips always reflects
  // that day's actual hotel instead of getting stuck on the same override.
  const acc = options.length <= 1 ? trip.accommodation : undefined;
  const name = acc?.name || hotel?.location?.name || "ที่พัก";
  const imageUrl = acc?.imageUrl || hotel?.location?.imageUrl || "/images/luang-prabang.jpg";
  const description = acc?.description || "Boutique Luxury Resort · เขตนอกเมือง · ท่าเรือกลางเมือง · ตลาดมืดตรงข้าม · เดินถึงภูสี";
  const checkInOutLabel =
    acc?.checkIn || acc?.checkOut
      ? `เช็คอิน ${acc?.checkIn ?? "-"} · เช็คเอาท์ ${acc?.checkOut ?? "-"}`
      : "เช็คอิน 14:00 · เช็คเอาท์ 12:00 — ฝากกระเป๋าได้";

  const amenities =
    acc?.amenities && acc.amenities.length > 0
      ? acc.amenities.map((label) => ({ icon: Check, label }))
      : [
          { icon: Wifi, label: "อินเทอร์เน็ตฟรี" },
          { icon: Car, label: "รถรับส่งฟรี" },
          { icon: Waves, label: "สระ 82 ฟุต" },
          { icon: Plane, label: "สนามบิน 15 นาที" },
        ];

  return (
    <div className="overflow-hidden rounded-3xl" style={{ backgroundColor: "#FAF8F5" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4"
      >
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold sm:text-lg">ข้อมูลที่พัก</h3>
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)" }}
          >
            {name}
          </span>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {expanded && (
        <>
          {options.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none]">
              {options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedKey(option.key)}
                  className="shrink-0 overflow-hidden rounded-2xl border-2 text-left transition"
                  style={{
                    borderColor: option.key === selectedOption?.key ? "var(--color-brand-green)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-2 bg-white px-3 py-2">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#edf0ee]">
                      {option.hotel.location?.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={option.hotel.location.imageUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="whitespace-nowrap text-xs font-bold">{option.hotel.location?.name || option.hotel.title}</p>
                      <p className="text-[10px] text-[var(--color-muted)]">วันที่ {option.dayNumber}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row">
            <div className="h-40 w-full shrink-0 overflow-hidden rounded-2xl sm:h-auto sm:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span
                  className="mb-1.5 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
                  style={{ backgroundColor: "#FFF3D6", color: "#B8860B" }}
                >
                  Recommend
                </span>
                <p className="text-base font-bold sm:text-lg">{name}</p>
                <p className="text-xs text-[var(--color-muted)] sm:text-sm">{description}</p>
              </div>
              <div className="shrink-0 text-right">
                {acc?.pricePerNight ? (
                  <p className="text-lg font-extrabold sm:text-xl">{formatTHB(acc.pricePerNight)}/คืน</p>
                ) : (
                  <>
                    <p className="text-lg font-extrabold sm:text-xl">$XXXXX</p>
                    <p className="text-xs text-[var(--color-muted)]">฿XXXXXX/คืน</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {amenities.map((a) => (
                <span
                  key={a.label}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <a.icon size={11} />
                  {a.label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                <Clock size={13} />
                {checkInOutLabel}
              </p>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <RefreshCcw size={12} />
                    เปลี่ยนที่พัก
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
                  style={{ backgroundColor: "var(--color-accent-orange)" }}
                >
                  ดูรายละเอียด
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
}

function ItineraryAccordion({
  trip,
  canEdit,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
}: {
  trip: GeneratedTrip;
  canEdit: boolean;
  onAddActivity: (dayId: string) => void;
  onEditActivity: (dayId: string, activity: Activity) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="overflow-hidden rounded-3xl" style={{ backgroundColor: "#FAF8F5" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4"
      >
        <h3 className="text-base font-bold sm:text-lg">ตารางแพลนทั้งหมด</h3>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {expanded && (
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
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onAddActivity(day.id)}
                    className="mt-1 rounded-xl border-2 border-dashed py-2.5 text-xs font-bold"
                    style={{ borderColor: "var(--color-accent-orange)", color: "var(--color-accent-orange)", backgroundColor: "white" }}
                  >
                    + เพิ่มสถานที่
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItineraryRow({
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
  const Icon = (activity.icon && ACTIVITY_ICON_OVERRIDE[activity.icon]) || categoryIcon[activity.category];
  const color = categoryColorVar[activity.category];

  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
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
          <span className="font-semibold" style={{ color: "var(--color-accent-orange)" }}>
            {activity.time}
          </span>
          {activity.travelNote && <> · {activity.travelNote}</>}
          {activity.cost > 0 && <> · {formatTHB(activity.cost)}</>}
        </p>
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
  canEdit,
  onToggleEditLock,
  onAddDay,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onUpdateActivityTravel,
  onSaveTrip,
  saveState,
  hideManualControls,
}: {
  trip: GeneratedTrip;
  canEdit: boolean;
  onToggleEditLock: () => void;
  onAddDay: () => void;
  onAddActivity: (dayId: string) => void;
  onEditActivity: (dayId: string, activity: Activity) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  onUpdateActivityTravel: (dayId: string, activityId: string, travel: TravelFromPrevious) => void;
  onSaveTrip: () => void;
  saveState: SaveState;
  // Self mode autosaves every add/edit immediately — no manual "บันทึก" or
  // "เสร็จสิ้น"/"แก้ไขแพลน" lock toggle to show there (see canEdit in the page
  // component, which is always true for self mode).
  hideManualControls?: boolean;
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
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Download size={14} />
          บันทึกรูป
        </button>
        {!hideManualControls ? (
          <>
            <SaveTripButton onSave={onSaveTrip} saveState={saveState} />
            <div className="h-6 w-px" style={{ backgroundColor: "var(--color-border)" }} />
            <EditLockToggle canEdit={canEdit} onToggle={onToggleEditLock} />
          </>
        ) : (
          // Self mode autosaves every add/edit once unlocked — no "เสร็จสิ้น"
          // step to lock back down with, so this only ever offers the way in.
          !canEdit && <EditLockToggle canEdit={canEdit} onToggle={onToggleEditLock} />
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
          <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: "#FAF8F5" }}>
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
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold">{activity.title}</p>
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
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
              <span style={{ color: "var(--color-accent-orange)" }}>{activity.time}</span>
              {activity.travelNote ? (
                <span className="font-semibold text-[var(--color-muted)]">· {activity.travelNote}</span>
              ) : (
                activity.cost > 0 && (
                  <span className="font-semibold text-[var(--color-muted)]">· {formatTHB(activity.cost)}</span>
                )
              )}
            </p>
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
  onClose,
}: {
  title: string;
  images: string[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
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
    <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-[var(--color-border)]/25">
      <FakeMapBackground />

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

// Covers trip name / destination / dates (as a nights count, since
// GeneratedTrip has no date-range field — see resizeDays) / pace / budget /
// conditions in one dialog, shared by both tabs' "แก้ไขทริป" buttons.
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
  const [nights, setNights] = useState(Math.max(trip.days.length - 1, 0));
  const [pace, setPace] = useState(trip.paceLabel);
  const [budget, setBudget] = useState(trip.budgetLabel);
  const [conditions, setConditions] = useState(trip.conditionsLabel);

  function handleSave() {
    const days = resizeDays(trip.days, nights);
    onSave({
      title: title.trim() || destination.trim() || trip.destination,
      destination: destination.trim() || trip.destination,
      days,
      durationLabel: durationLabelFor(days),
      paceLabel: pace.trim(),
      budgetLabel: budget.trim(),
      conditionsLabel: conditions.trim(),
    });
    onClose();
  }

  return (
    <EditDialogShell title="แก้ไขทริป" onClose={onClose} onSave={handleSave}>
      <EditField label="ชื่อทริป" value={title} onChange={setTitle} placeholder="ตั้งชื่อทริปของคุณ" />
      <EditField label="ปลายทาง" value={destination} onChange={setDestination} />

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ระยะเวลา</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNights((n) => Math.max(n - 1, 0))}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[96px] text-center text-sm font-bold">
            {nights + 1} วัน {nights} คืน
          </span>
          <button
            type="button"
            onClick={() => setNights((n) => n + 1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <EditField label="ความเข้มข้นของทริป" value={pace} onChange={setPace} />
      <EditField label="งบประมาณ" value={budget} onChange={setBudget} />
      <EditField label="เงื่อนไข / ข้อจำกัด" value={conditions} onChange={setConditions} />
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
  const [time, setTime] = useState(initialActivity?.time ?? "09:00");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [title, setTitle] = useState(initialActivity?.title ?? "");
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[200px_1fr]">
            <ActivityImagesField images={images} onChange={setImages} />

            <div className="flex flex-col gap-4">
              <ActivityPlaceSearchField value={title} onChange={handleTitleChange} onSelectPlace={handleSelectPlace} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">เวลา</label>
                  <button
                    type="button"
                    onClick={() => setShowTimePicker(true)}
                    className="flex w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm focus:outline-none"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <Clock size={14} style={{ color: "var(--color-muted)" }} />
                    {formatTimeDisplay(time)}
                  </button>
                </div>
                <ActivityCategoryField value={category} onChange={setCategory} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ค่าใช้จ่าย (บาท)</label>
                <div className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5" style={{ borderColor: "var(--color-border)" }}>
                  <input
                    type="text"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
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
        <TimePickerDialog value={time} onConfirm={setTime} onClose={() => setShowTimePicker(false)} />
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
