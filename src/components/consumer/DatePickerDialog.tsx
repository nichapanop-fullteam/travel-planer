"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export interface DatePickerResult {
  label: string; // "3 วัน 2 คืน"
  startDate?: string; // ISO date, only set in "ระบุวันที่" mode
  endDate?: string;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarDays(viewDate: Date): (Date | null)[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const days: (Date | null)[] = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

function nightsLabel(nights: number): string {
  return `${nights + 1} วัน ${nights} คืน`;
}

export function DatePickerDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: DatePickerResult) => void;
}) {
  const today = startOfDay(new Date());
  const [tab, setTab] = useState<"range" | "nights">("range");
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [nights, setNights] = useState(1);

  if (!isOpen) return null;

  function changeMonth(delta: number) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function handleDayClick(day: Date) {
    if (!rangeStart || rangeEnd) {
      setRangeStart(day);
      setRangeEnd(null);
      return;
    }
    if (day < rangeStart) {
      setRangeStart(day);
      return;
    }
    setRangeEnd(day);
  }

  function handleConfirm() {
    if (tab === "nights") {
      onConfirm({ label: nightsLabel(nights) });
      return;
    }
    if (!rangeStart) return;
    const end = rangeEnd ?? rangeStart;
    const nightsCount = Math.round((end.getTime() - rangeStart.getTime()) / 86_400_000);
    onConfirm({
      label: nightsLabel(nightsCount),
      startDate: rangeStart.toISOString(),
      endDate: end.toISOString(),
    });
  }

  const days = buildCalendarDays(viewDate);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex overflow-hidden rounded-full border" style={{ borderColor: "var(--color-border)" }}>
          <button
            type="button"
            onClick={() => setTab("range")}
            className="flex-1 py-2 text-sm font-bold transition-colors"
            style={
              tab === "range"
                ? { backgroundColor: "var(--color-brand-green)", color: "#fff" }
                : { color: "var(--foreground)" }
            }
          >
            ระบุวันที่
          </button>
          <button
            type="button"
            onClick={() => setTab("nights")}
            className="flex-1 py-2 text-sm font-bold transition-colors"
            style={
              tab === "nights"
                ? { backgroundColor: "var(--color-brand-green)", color: "#fff" }
                : { color: "var(--foreground)" }
            }
          >
            จำนวนคืน
          </button>
        </div>

        {tab === "range" ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-full p-1.5 hover:bg-[var(--color-sel-bg)]"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold">
                {THAI_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-full p-1.5 hover:bg-[var(--color-sel-bg)]"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-[var(--color-muted)]">
              {WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
              {days.map((day, i) => {
                if (!day) return <span key={i} />;

                const isPast = day < today;
                const isStart = rangeStart ? isSameDay(day, rangeStart) : false;
                const isEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
                const inRange = rangeStart && rangeEnd ? day > rangeStart && day < rangeEnd : false;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleDayClick(day)}
                    className="mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
                    style={
                      isStart || isEnd
                        ? { backgroundColor: "var(--color-brand-green)", color: "#fff", fontWeight: 700 }
                        : inRange
                          ? { backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }
                          : undefined
                    }
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-[var(--color-muted)]">เลือกจำนวนคืนที่ต้องการพัก</p>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setNights((n) => Math.max(1, n - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Minus size={16} />
              </button>
              <span className="w-20 text-center text-2xl font-extrabold" style={{ color: "var(--color-brand-green)" }}>
                {nights} คืน
              </span>
              <button
                type="button"
                onClick={() => setNights((n) => n + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border py-2.5 text-sm font-bold"
            style={{ borderColor: "var(--color-border)", color: "var(--foreground)" }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={tab === "range" && !rangeStart}
            className="flex-1 rounded-full py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
