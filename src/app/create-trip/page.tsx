"use client";

import { Suspense, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Compass,
  Coffee,
  Landmark,
  Mountain,
  Moon,
  Palmtree,
  Plus,
  ShoppingBag,
  TreePine,
  Users,
  UtensilsCrossed,
  MapPin,
} from "lucide-react";
import { HomeNavbar } from "@/components/consumer/HomeNavbar";
import { BookingBar } from "@/components/consumer/BookingBar";
import { saveTripDraft } from "@/lib/trip-drafts";
import type { TripCreationMode, TripDraft } from "@/types";

interface StyleOption {
  tag: string;
  icon: LucideIcon | null;
}

const STYLE_OPTIONS: StyleOption[] = [
  { tag: "ทะเล", icon: Palmtree },
  { tag: "ภูเขา", icon: Mountain },
  { tag: "ธรรมชาติ", icon: TreePine },
  { tag: "วัฒนธรรม", icon: Landmark },
  { tag: "อาหาร", icon: UtensilsCrossed },
  { tag: "คาเฟ่", icon: Coffee },
  { tag: "ไนท์ไลฟ์", icon: Moon },
  { tag: "ช้อปปิ้ง", icon: ShoppingBag },
  { tag: "ผจญภัย", icon: Compass },
];

const MORE_STYLE_OPTIONS: StyleOption[] = [
  { tag: "เมือง", icon: Building2 },
  { tag: "ประวัติศาสตร์", icon: null },
  { tag: "ถ่ายรูป", icon: null },
  { tag: "สปา / พักผ่อน", icon: null },
  { tag: "กีฬา / outdoor", icon: null },
];

const PACE_OPTIONS = ["Slow Life", "Chill", "Balance", "Active", "Hardcore"];

const BUDGET_OPTIONS = [
  { key: "Economy", label: "Economy", value: "<1,000฿" },
  { key: "Comfort", label: "Comfort", value: "฿1,000 - ฿5,000" },
  { key: "Premium", label: "Premium", value: "฿5,000 - ฿10,000" },
  { key: "Luxury", label: "Luxury", value: "฿10,000+" },
];

const COND_OPTIONS = ["มีผู้สูงอายุ", "มีรถส่วนตัว", "เดินเยอะไม่ได้", "มีเด็กเล็ก", "ผู้ใช้รถเข็น"];
const MORE_COND_OPTIONS = ["มังสวิรัติ", "ฮาลาล", "แพ้อาหารทะเล", "ไม่ขึ้นที่สูง", "งบจำกัดเข้ม", "เดินทางคนเดียว"];

export default function CreateTripPage() {
  return (
    <Suspense fallback={null}>
      <CreateTripForm />
    </Suspense>
  );
}

function CreateTripForm() {
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<TripCreationMode>(
    searchParams.get("mode") === "self" ? "self" : "ai"
  );
  const [destination, setDestination] = useState(searchParams.get("destination") ?? "");
  const [duration, setDuration] = useState("");
  const [guests, setGuests] = useState("");

  const [extraStyles, setExtraStyles] = useState<StyleOption[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [pace, setPace] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [customBudget, setCustomBudget] = useState("");
  const [extraConds, setExtraConds] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [savedDraft, setSavedDraft] = useState<TripDraft | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const customBudgetInputRef = useRef<HTMLInputElement>(null);

  const allStyleOptions = [...STYLE_OPTIONS, ...extraStyles];
  const remainingStyleOptions = MORE_STYLE_OPTIONS.filter(
    (o) => !extraStyles.some((e) => e.tag === o.tag)
  );
  const allCondOptions = [...COND_OPTIONS, ...extraConds];
  const remainingCondOptions = MORE_COND_OPTIONS.filter((o) => !extraConds.includes(o));

  function toggleStyle(tag: string) {
    setStyles((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleCondition(tag: string) {
    setConditions((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function handleDestinationChange(value: string) {
    setDestination(value);
    if (status === "error" && value.trim()) setStatus("idle");
  }

  function selectBudget(key: string) {
    setBudget((prev) => (prev === key ? null : key));
  }

  function selectCustomBudget() {
    setBudget("custom");
    customBudgetInputRef.current?.focus();
  }

  function submit(isSkip: boolean) {
    if (!destination.trim()) {
      setStatus("error");
      return;
    }

    const finalStyles = isSkip ? [] : styles;
    const finalPace = isSkip ? null : pace;
    const finalBudget = isSkip ? null : budget;
    const finalCustomBudget = isSkip ? "" : customBudget;
    const finalConditions = isSkip ? [] : conditions;

    if (isSkip) {
      setStyles([]);
      setPace(null);
      setBudget(null);
      setCustomBudget("");
      setConditions([]);
    }

    setStatus("loading");
    window.setTimeout(() => {
      const draft: TripDraft = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        mode,
        destination: destination.trim(),
        duration: duration.trim(),
        guests: guests.trim(),
        styles: finalStyles,
        pace: finalPace,
        budget: finalBudget,
        customBudget: finalCustomBudget,
        conditions: finalConditions,
      };
      saveTripDraft(draft);
      setSavedDraft(draft);
      setStatus("idle");
      setShowSummary(true);
    }, 1200);
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Hero
        mode={mode}
        setMode={setMode}
        destination={destination}
        onDestinationChange={handleDestinationChange}
        duration={duration}
        onDurationChange={setDuration}
        guests={guests}
        onGuestsChange={setGuests}
        destinationHasError={status === "error"}
      />

      <div className="mx-auto max-w-7xl px-6 pb-16 sm:px-10">
        <div className="relative overflow-hidden rounded-b-3xl bg-white shadow-sm">
          {status === "error" && (
            <div className="mx-6 mt-6 rounded-2xl border px-4 py-3 text-sm sm:mx-8" style={{ backgroundColor: "var(--color-danger-bg)", borderColor: "var(--color-danger-border)", color: "var(--color-danger)" }}>
              <strong>กรอกไม่ครบ</strong> — กรุณาระบุปลายทางก่อนสร้างแพลน
            </div>
          )}
          {mode === "self" && (
            <div className="mx-6 mt-6 rounded-2xl border px-4 py-3 text-sm sm:mx-8" style={{ backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)" }}>
              โหมด <strong>สร้างด้วยตัวเอง</strong> — คุณจะเลือกสถานที่เองในขั้นถัดไป ตัวเลือกด้านล่างใช้เป็นตัวช่วยกรองเท่านั้น
            </div>
          )}

          <div className="flex flex-col gap-1 px-6 py-2 sm:px-8">
            <FormRow
              label="สไตล์การเที่ยว"
              hint="เลือกได้หลายอย่าง"
              dimmed={mode === "self"}
            >
              <div className="flex flex-wrap items-center gap-3">
                {allStyleOptions.map((opt) => (
                  <Chip
                    key={opt.tag}
                    label={opt.tag}
                    icon={opt.icon}
                    isOn={styles.includes(opt.tag)}
                    onClick={() => toggleStyle(opt.tag)}
                  />
                ))}
                {remainingStyleOptions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExtraStyles((prev) => [...prev, ...remainingStyleOptions])}
                    className="inline-flex items-center gap-1.5 rounded-[20px] border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-sel-bg)]"
                    style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }}
                  >
                    <Plus size={14} />
                    เพิ่มเติม
                  </button>
                ) : (
                  <span className="text-sm text-[var(--color-muted)]">เพิ่มครบแล้ว</span>
                )}
                {styles.length > 0 && (
                  <span className="ml-1 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    <b style={{ color: "var(--color-brand-green)" }}>{styles.length}</b> รายการ
                    <button
                      type="button"
                      onClick={() => setStyles([])}
                      className="text-[var(--color-muted)] underline hover:text-[var(--color-danger)]"
                    >
                      ล้าง
                    </button>
                  </span>
                )}
              </div>
              {styles.length === 0 && (
                <p className="mt-2.5 text-xs text-[var(--color-muted)]">
                  ยังไม่ได้เลือก — Pluno จะจัดทริปแบบทั่วไปให้ เลือกอย่างน้อย 1 อย่างเพื่อผลลัพธ์ที่ตรงใจกว่า
                </p>
              )}
            </FormRow>

            <Divider />

            <FormRow label="ความเข้มข้นของทริป" centerLabel dimmed={mode === "self"}>
              <div className="flex flex-wrap items-center gap-2.5">
                {PACE_OPTIONS.map((p) => (
                  <Tag key={p} label={p} isOn={pace === p} onClick={() => setPace((prev) => (prev === p ? null : p))} />
                ))}
              </div>
            </FormRow>

            <Divider />

            <FormRow label="งบต่อคน / วัน">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => selectBudget(b.key)}
                    className={`flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 ${
                      budget === b.key ? "" : "border-[var(--color-border)] bg-white"
                    }`}
                    style={
                      budget === b.key
                        ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)" }
                        : undefined
                    }
                  >
                    <span
                      className="text-sm font-bold"
                      style={budget === b.key ? { color: "var(--color-brand-green)" } : undefined}
                    >
                      {b.label}
                    </span>
                    <span
                      className="text-sm text-[var(--color-muted)]"
                      style={budget === b.key ? { color: "var(--color-brand-green)" } : undefined}
                    >
                      {b.value}
                    </span>
                  </button>
                ))}
                <div
                  onClick={selectCustomBudget}
                  className="flex cursor-text flex-col items-start gap-1.5 rounded-2xl border p-4 shadow-sm"
                  style={
                    budget === "custom"
                      ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)" }
                      : { borderColor: "var(--color-border)" }
                  }
                >
                  <span
                    className="text-sm font-bold"
                    style={budget === "custom" ? { color: "var(--color-brand-green)" } : undefined}
                  >
                    ระบุเอง
                  </span>
                  <span
                    className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5"
                    style={{ backgroundColor: budget === "custom" ? "rgba(255,255,255,0.7)" : "var(--color-surface)" }}
                  >
                    <span className="text-sm text-[var(--color-muted)]">฿</span>
                    <input
                      ref={customBudgetInputRef}
                      type="text"
                      inputMode="numeric"
                      placeholder="2,500"
                      value={customBudget}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        setCustomBudget(e.target.value);
                        if (e.target.value) setBudget("custom");
                      }}
                      className="w-full bg-transparent text-sm text-[var(--foreground)] focus:outline-none"
                    />
                  </span>
                </div>
              </div>
            </FormRow>

            <Divider />

            <FormRow label="เงื่อนไข / ข้อจำกัด" centerLabel>
              <div className="flex flex-wrap items-center gap-2.5">
                {allCondOptions.map((c) => (
                  <Tag key={c} label={c} isOn={conditions.includes(c)} onClick={() => toggleCondition(c)} />
                ))}
                {remainingCondOptions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExtraConds((prev) => [...prev, ...remainingCondOptions])}
                    className="inline-flex items-center gap-1.5 rounded-[20px] border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-sel-bg)]"
                    style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }}
                  >
                    <Plus size={14} />
                    เพิ่มเติม
                  </button>
                ) : (
                  <span className="text-sm text-[var(--color-muted)]">เพิ่มครบแล้ว</span>
                )}
              </div>
            </FormRow>
          </div>

          <div className="flex flex-col-reverse items-center gap-4 border-t border-[var(--color-border)]/40 px-6 py-5 sm:flex-row sm:justify-between sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-8 rounded-full" style={{ backgroundColor: "#f5a623" }} />
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#d5cdb8" }} />
              </div>
              <span className="text-sm text-[var(--color-muted)]">1 จาก 2</span>
            </div>
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={status === "loading"}
                className="text-sm text-[var(--color-muted)] underline hover:text-[var(--foreground)] disabled:opacity-50"
              >
                ข้ามไปก่อน
              </button>
              <button
                type="button"
                onClick={() => submit(false)}
                disabled={status === "loading"}
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: "var(--color-accent-orange)" }}
              >
                {mode === "self" ? "เริ่มจัดทริปเอง" : "สร้างแพลน"}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-b-3xl bg-white/85 backdrop-blur-sm">
              <div
                className="h-11 w-11 animate-spin rounded-full border-4"
                style={{ borderColor: "var(--color-sel-bg)", borderTopColor: "var(--color-brand-green)" }}
              />
              <p className="text-sm font-semibold" style={{ color: "var(--color-brand-green)" }}>
                กำลังสร้างแผนทริปของคุณ…
              </p>
            </div>
          )}
        </div>
      </div>

      {showSummary && savedDraft && (
        <SummarySheet draft={savedDraft} onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}

function Hero({
  mode,
  setMode,
  destination,
  onDestinationChange,
  duration,
  onDurationChange,
  guests,
  onGuestsChange,
  destinationHasError,
}: {
  mode: TripCreationMode;
  setMode: (m: TripCreationMode) => void;
  destination: string;
  onDestinationChange: (v: string) => void;
  duration: string;
  onDurationChange: (v: string) => void;
  guests: string;
  onGuestsChange: (v: string) => void;
  destinationHasError: boolean;
}) {
  return (
    <div className="relative flex min-h-[380px] flex-col items-center justify-center gap-6 overflow-hidden px-6 py-10 text-center sm:min-h-[420px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-mountain.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/45" />

      <HomeNavbar />

      <h1 className="relative text-3xl font-extrabold text-white drop-shadow-sm sm:text-4xl">
        สร้างทริปของคุณ
      </h1>

      <div className="relative flex items-center gap-1 rounded-full bg-black/25 p-1.5 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
            mode === "ai" ? "bg-white text-[var(--foreground)]" : "text-white/85 hover:bg-white/10"
          }`}
        >
          Pluno สร้างให้
        </button>
        <button
          type="button"
          onClick={() => setMode("self")}
          className={`rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
            mode === "self" ? "bg-white text-[var(--foreground)]" : "text-white/85 hover:bg-white/10"
          }`}
        >
          สร้างด้วยตัวเอง
        </button>
      </div>

      <BookingBar
        fields={[
          {
            icon: MapPin,
            label: "Destination",
            value: destination,
            placeholder: "City, country",
            onChange: onDestinationChange,
            hasError: destinationHasError,
          },
          {
            icon: CalendarDays,
            label: "Date",
            value: duration,
            placeholder: "วันเดินทางไป - วันกลับ",
            onChange: onDurationChange,
          },
          {
            icon: Users,
            label: "Guest",
            value: guests,
            placeholder: "ประเภท และจำนวนคน",
            onChange: onGuestsChange,
          },
        ]}
      />
    </div>
  );
}

function FormRow({
  label,
  hint,
  centerLabel,
  dimmed,
  children,
}: {
  label: string;
  hint?: string;
  centerLabel?: boolean;
  dimmed?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 py-6 sm:flex-row sm:gap-8 ${centerLabel ? "sm:items-center" : "sm:items-start"} ${
        dimmed ? "opacity-45 grayscale-[0.35] pointer-events-none" : ""
      }`}
    >
      <div className="w-full shrink-0 sm:w-[200px]">
        <p className="text-lg font-bold">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[var(--color-border)]/40" />;
}

function Chip({
  label,
  icon: Icon,
  isOn,
  onClick,
}: {
  label: string;
  icon: LucideIcon | null;
  isOn: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[20px] border px-4 py-2.5 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style={
        isOn
          ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)", fontWeight: 700 }
          : { borderColor: "var(--color-border-chip)", color: "var(--foreground)" }
      }
    >
      {Icon && <Icon size={15} style={{ color: isOn ? "var(--color-brand-green)" : "var(--color-muted)" }} />}
      {label}
    </button>
  );
}

function Tag({ label, isOn, onClick }: { label: string; isOn: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-[20px] border px-4 py-2.5 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style={
        isOn
          ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)", fontWeight: 700 }
          : { borderColor: "var(--color-border-tag)", color: "var(--foreground)" }
      }
    >
      {label}
    </button>
  );
}

function SummarySheet({ draft, onClose }: { draft: TripDraft; onClose: () => void }) {
  const budgetLabel =
    draft.budget === "custom"
      ? draft.customBudget
        ? `฿${draft.customBudget}`
        : "ระบุเอง (ยังไม่กรอก)"
      : draft.budget || "—";

  const rows: [string, string][] = [
    ["โหมด", draft.mode === "ai" ? "Pluno สร้างให้" : "สร้างด้วยตัวเอง"],
    ["ปลายทาง", draft.destination || "—"],
    ["ระยะเวลา", draft.duration || "—"],
    ["ผู้ร่วมทริป", draft.guests || "—"],
    ["สไตล์", draft.styles.length ? draft.styles.join(", ") : "—"],
    ["ความเข้มข้น", draft.pace || "—"],
    ["งบ/คน/วัน", budgetLabel],
    ["เงื่อนไข", draft.conditions.length ? draft.conditions.join(", ") : "—"],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold">บันทึกแพลนไว้แล้ว</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          ข้อมูลนี้ถูกเก็บไว้ในเครื่อง (ยังไม่เชื่อมกับระบบสร้างแผนจริง)
        </p>
        <dl className="mt-5 grid grid-cols-[110px_1fr] gap-x-4 gap-y-2.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[var(--color-muted)]">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--color-brand-green)" }}
        >
          เข้าใจแล้ว
        </button>
      </div>
    </div>
  );
}
