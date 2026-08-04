"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity as PulseIcon,
  Anchor,
  ArrowLeft,
  Asterisk,
  Beer,
  Bike,
  Bookmark,
  CalendarDays,
  Clock,
  Compass,
  Download,
  Footprints,
  LayoutGrid,
  Mountain,
  Menu,
  Minus,
  Navigation,
  PanelRightOpen,
  Pencil,
  Plus,
  RefreshCcw,
  Share2,
  Star,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import type { Activity, Day, GeneratedTrip } from "@/types";
import { categoryColorVar, categoryIcon } from "@/lib/category-styles";

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
  confirmGeneratedTrip,
  DEMO_LUANG_PRABANG_ID,
  generateTripFromDraft,
  getGeneratedTrip,
  getOrCreateDemoLuangPrabangTrip,
  saveGeneratedTrip,
} from "@/lib/generated-trips";
import { getTripDrafts } from "@/lib/trip-drafts";
import {
  formatDuration,
  formatTHB,
  getDayRouteEstimate,
  getDayTotalCost,
  getTripTotalCost,
} from "@/lib/trip-utils";
import { FakeMapBackground } from "@/components/plan/FakeMapBackground";
import { Sidebar } from "@/components/consumer/Sidebar";
import { Divider } from "@/components/ui/Divider";

type TabKey = "overview" | "plan" | "budget" | "chat";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "ภาพรวมทริป" },
  { key: "plan", label: "แพลนทริป" },
  { key: "budget", label: "สรุปงบ" },
  { key: "chat", label: "ห้องแชท" },
];

export default function GeneratedPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<GeneratedTrip | null | undefined>(undefined);
  const [tab, setTab] = useState<TabKey>("overview");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loaded =
      params.id === DEMO_LUANG_PRABANG_ID
        ? getOrCreateDemoLuangPrabangTrip()
        : getGeneratedTrip(params.id) ?? null;
    setTrip(loaded);
    if (loaded && loaded.status === "confirmed") setTab("plan");
  }, [params.id]);

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

  function handleConfirm() {
    confirmGeneratedTrip(trip!.id);
    setTrip({ ...trip!, status: "confirmed" });
    setTab("plan");
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

  const isConfirmed = trip.status === "confirmed";

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

      <Hero trip={trip} onMenuClick={() => setSidebarOpen(true)} />

      <div className="relative -mt-6 rounded-t-[32px] bg-white sm:-mt-8">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: "var(--color-brand-green)" }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-sel-bg)" }}
            >
              <ArrowLeft size={14} />
            </span>
            ย้อนกลับ
          </button>

          {!isConfirmed && !bannerDismissed && (
            <ConfirmBanner
              regenerating={regenerating}
              onDismiss={() => setBannerDismissed(true)}
              onRegenerate={handleRegenerate}
              onConfirm={handleConfirm}
            />
          )}

          <PlanTabs tab={tab} setTab={setTab} />

          {tab === "overview" && <OverviewTab trip={trip} />}
          {tab === "plan" && <PlanTab trip={trip} />}
          {tab === "budget" && <BudgetTab trip={trip} />}
          {tab === "chat" && <ChatTab />}
        </div>
      </div>
    </div>
  );
}

function Hero({ trip, onMenuClick }: { trip: GeneratedTrip; onMenuClick: () => void }) {
  const pills = [
    { icon: CalendarDays, label: trip.durationLabel },
    { icon: Footprints, label: trip.paceLabel },
    { icon: Wallet, label: trip.budgetLabel },
    { icon: Asterisk, label: trip.conditionsLabel },
  ];

  return (
    <div className="relative flex min-h-[220px] flex-col items-center justify-center gap-4 overflow-hidden px-6 py-6 text-center sm:min-h-[260px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={trip.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-[80%_30%]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/50" />

      <button
        type="button"
        onClick={onMenuClick}
        className="absolute left-6 top-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/85 shadow-md backdrop-blur-sm sm:left-8"
      >
        <Menu size={16} />
      </button>

      <h1 className="relative text-4xl font-extrabold text-white drop-shadow-sm sm:text-[70px]">
        {trip.destination}
      </h1>

      <div className="relative flex flex-wrap items-center justify-center gap-2">
        {pills.map((p) => (
          <span
            key={p.label}
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
      className="mb-6 flex flex-col items-start gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
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

function PlanTabs({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  return (
    <div
      className="mb-6 flex items-center gap-2 overflow-x-auto rounded-full p-2"
      style={{ backgroundColor: "#FAF8F5" }}
    >
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setTab(t.key)}
          className="flex-1 whitespace-nowrap rounded-full py-3 text-sm font-bold transition-colors"
          style={
            tab === t.key
              ? { backgroundColor: "var(--color-brand-green)", color: "#fff" }
              : { color: "var(--foreground)" }
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function OverviewTab({ trip }: { trip: GeneratedTrip }) {
  const infoBoxes = [
    { icon: CalendarDays, label: "วัน / ระยะเวลา", value: trip.durationLabel },
    { icon: Footprints, label: "ความเข้มข้นของทริป", value: trip.paceLabel },
    { icon: Wallet, label: "งบ/คน", value: trip.budgetLabel },
    { icon: Asterisk, label: "เงื่อนไข / ข้อจำกัด", value: trip.conditionsLabel },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{trip.destination}</h2>
        {trip.styles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {trip.styles.map((s) => (
              <span
                key={s}
                className="rounded-full border px-3.5 py-1.5 text-xs font-semibold"
                style={{ borderColor: "var(--color-border-tag)" }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {infoBoxes.map((b) => (
          <div key={b.label} className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)" }}>
            <div className="mb-2 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <b.icon size={13} />
              {b.label}
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--color-brand-green)" }}>
              {b.value}
            </p>
          </div>
        ))}
      </div>

      <Divider />

      <div>
        <h3 className="mb-4 text-xl font-bold">สรุปภาพรวมแพลน</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {trip.days.map((day) => (
            <DaySummaryCard key={day.id} day={day} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DaySummaryCard({ day }: { day: Day }) {
  const total = getDayTotalCost(day);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl" style={{ backgroundColor: "#FAF8F5" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#EAF3EE" }}>
        <h4 className="text-base font-bold">วันที่ {day.dayNumber}</h4>
        <span className="text-xs font-semibold" style={{ color: "var(--color-brand-green)" }}>
          {formatTHB(total)}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {day.activities.map((a, i) => (
          <ActivityMiniRow key={a.id} activity={a} index={i + 1} />
        ))}
        <button
          type="button"
          className="rounded-xl border border-dashed border-[var(--color-border)]/40 py-2 text-xs font-semibold text-[var(--color-muted)]"
        >
          + เพิ่มจุด
        </button>
      </div>
    </div>
  );
}

function ActivityMiniRow({ activity, index }: { activity: Activity; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = (activity.icon && ACTIVITY_ICON_OVERRIDE[activity.icon]) || categoryIcon[activity.category];
  const color = categoryColorVar[activity.category];
  const name = activity.location?.name ?? activity.title;
  const rating = activity.location?.rating ?? 4.7;
  const imageUrl = activity.location?.imageUrl ?? "/images/luang-prabang.jpg";

  return (
    <div className="overflow-hidden rounded-xl bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: "var(--color-brand-green)" }}
        >
          {index}
        </span>
        <Icon size={15} style={{ color }} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{activity.title}</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            <span className="font-semibold" style={{ color: "var(--color-accent-orange)" }}>
              {activity.time}
            </span>
            {activity.travelNote && <> · {activity.travelNote}</>}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 px-3.5 pb-3.5">
          <div className="h-28 w-full overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <p className="text-sm font-bold">{name}</p>
          <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
            <Star size={12} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
            {rating.toFixed(1)}
            {activity.travelNote && <> · {activity.travelNote}</>}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex-1 rounded-full border border-[var(--color-border)]/40 py-2 text-xs font-semibold"
            >
              รายละเอียดสถานที่
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--color-brand-green)" }}
            >
              <Navigation size={12} />
              นำทาง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanTab({ trip }: { trip: GeneratedTrip }) {
  const [dayIndex, setDayIndex] = useState(0);
  const [tripMode, setTripMode] = useState(false);
  const day = trip.days[dayIndex];
  const route = getDayRouteEstimate(day);

  return (
    <div className="flex flex-col gap-6">
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
          <div className="h-6 w-px" style={{ backgroundColor: "var(--color-border)" }} />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            <Pencil size={14} />
            แก้ไขทริป
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl p-5" style={{ backgroundColor: "#FAF8F5" }}>
        <div
          className="flex items-center gap-2 overflow-x-auto rounded-2xl p-2"
          style={{ backgroundColor: "#F6F0E5" }}
        >
          {trip.days.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDayIndex(i)}
              className="flex-1 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold"
              style={
                i === dayIndex
                  ? { backgroundColor: "#fff", color: "var(--color-brand-green)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                  : { color: "var(--color-muted)" }
              }
            >
              วันที่ {d.dayNumber}
            </button>
          ))}
          <button
            type="button"
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Plus size={14} />
            เพิ่มวัน
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_3fr]">
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
                className="flex h-7 w-7 items-center justify-center rounded-lg border bg-white"
                style={{ borderColor: "var(--color-sel-border)" }}
              >
                <PanelRightOpen size={14} style={{ color: "var(--color-brand-green)" }} />
              </button>
            </div>
            <div className="flex flex-col gap-3 px-4 pb-4 pt-4">
              {day.activities.map((a, i) => (
                <ActivityMiniRow key={a.id} activity={a} index={i + 1} />
              ))}
            </div>
          </div>
          <TripMapPanel day={day} />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_3fr]">
          <div
            className="flex flex-wrap items-center gap-3 rounded-2xl p-4"
            style={{ backgroundColor: "var(--color-sel-bg)" }}
          >
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              icon={Compass}
              label="Total Distance"
              value={`${route.distanceKm} km`}
              iconColor="var(--color-cat-hotel)"
              iconBg="var(--color-cat-hotel-bg)"
            />
            <StatCard
              icon={Clock}
              label="Total Time"
              value={formatDuration(route.minutes)}
              iconColor="var(--color-brand-green)"
              iconBg="var(--color-sel-bg)"
            />
            <StatCard
              icon={Wallet}
              label="Est. Cost"
              value={formatTHB(getDayTotalCost(day))}
              iconColor="var(--color-accent-orange)"
              iconBg="var(--color-cat-food-bg)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)]/25 p-4"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ color: iconColor, backgroundColor: iconBg }}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-muted)]">{label}</p>
        <p className="text-sm font-bold">{value}</p>
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
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-md"
      >
        <LayoutGrid size={12} />
        All Places
      </button>

      {day.activities.map((a, i) => {
        const pos = MAP_PIN_POSITIONS[i % MAP_PIN_POSITIONS.length];
        const isSelected = selectedId === a.id;
        const openBelow = parseFloat(pos.y) < 45;
        return (
        <div
          key={a.id}
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${isSelected ? "z-20" : "z-0"}`}
          style={{ left: pos.x, top: pos.y }}
        >
          {selected && isSelected && (
            <PlacePopup activity={selected} onClose={() => setSelectedId(null)} openBelow={openBelow} />
          )}
          <button
            type="button"
            onClick={() => setSelectedId((prev) => (prev === a.id ? null : a.id))}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 py-1 shadow-md"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: "var(--color-brand-green)" }}
            >
              {i + 1}
            </span>
            <span className="text-[11px] font-semibold">{a.location?.name ?? a.title}</span>
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
      </div>
    </div>
  );
}

function PlacePopup({
  activity,
  onClose,
  openBelow,
}: {
  activity: Activity;
  onClose: () => void;
  openBelow?: boolean;
}) {
  const name = activity.location?.name ?? activity.title;
  const rating = activity.location?.rating ?? 4.7;
  const imageUrl = activity.location?.imageUrl ?? "/images/luang-prabang.jpg";

  return (
    <div
      className={`absolute left-1/2 z-20 w-64 -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-xl ${
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
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 rounded-full border border-[var(--color-border)]/40 py-2 text-xs font-semibold"
          >
            รายละเอียดสถานที่
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            <Navigation size={12} />
            นำทาง
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetTab({ trip }: { trip: GeneratedTrip }) {
  const total = getTripTotalCost(trip);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-6 text-white" style={{ backgroundColor: "var(--color-brand-green)" }}>
        <p className="text-xs font-bold uppercase tracking-wide text-white/70">งบประมาณรวมทั้งทริป</p>
        <p className="mt-1 text-3xl font-extrabold">{formatTHB(total)}</p>
      </div>
      {trip.days.map((day) => (
        <div
          key={day.id}
          className="flex items-center justify-between rounded-2xl border p-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span className="text-sm font-semibold">วันที่ {day.dayNumber}</span>
          <span className="text-sm font-bold" style={{ color: "var(--color-brand-green)" }}>
            {formatTHB(getDayTotalCost(day))}
          </span>
        </div>
      ))}
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
