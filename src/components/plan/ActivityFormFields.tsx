"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { ActivityCategory } from "@/types";
import { categoryBgVar, categoryColorVar, categoryIcon, categoryLabel } from "@/lib/category-styles";

// Shared "เวลา"/"ประเภท" fields used by both AddActivityDialog (generated-plan
// page) and the recommend-places review step (RecommendPlacesFlow) — moved
// out of page.tsx so both can import them without a circular dependency
// between the two files.

export const ACTIVITY_CATEGORY_OPTIONS: ActivityCategory[] = [
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
export function ActivityCategoryField({
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
        className="flex w-full items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm transition-colors"
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

export function formatTimeDisplay(time24: string): string {
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

export function TimePickerDialog({
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
