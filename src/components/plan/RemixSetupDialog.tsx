"use client";

import { useState } from "react";
import { LoaderCircle, Minus, Plus, X } from "lucide-react";
import { addDays } from "@/hooks/useRemixTrip";
import type { RemixFormValues, RemixStatus } from "@/hooks/useRemixTrip";

export interface RemixSourceSummary {
  title: string;
  creatorName?: string;
  durationDays: number;
}

const ERROR_STATUSES: RemixStatus[] = [
  "validation_error",
  "unauthorized",
  "forbidden",
  "not_found",
  "duration_mismatch",
  "conflict",
  "error",
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Centered modal on desktop, full-height bottom sheet on mobile — same
// overlay/backdrop convention as GuestPickerDialog/TripGalleryDialog (fixed
// inset-0 + backdrop-click-to-close + stopPropagation on the panel),
// extended with responsive alignment since no bottom-sheet variant existed
// in this codebase yet.
//
// Conditionally mounted by the caller (`{remixDialogOpen && <RemixSetupDialog
// .../>}`, matching EditTripDialog/AccommodationEditDialog's convention in
// generated-plan/[id]/page.tsx) rather than always-mounted-checks-isOpen —
// that gives every open a genuinely fresh mount, so form fields reset via
// plain useState initializers instead of an effect re-syncing them.
export function RemixSetupDialog({
  onClose,
  source,
  status,
  message,
  expectedDurationDays,
  onSubmit,
}: {
  onClose: () => void;
  source: RemixSourceSummary;
  status: RemixStatus;
  message?: string;
  expectedDurationDays?: number;
  onSubmit: (values: RemixFormValues) => void;
}) {
  const [title, setTitle] = useState(`${source.title} ของฉัน`);
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [travelerCount, setTravelerCount] = useState(1);
  const [copyNotes, setCopyNotes] = useState(true);
  const [copyBudget, setCopyBudget] = useState(true);

  const submitting = status === "submitting";
  const endDate = addDays(startDate, Math.max(source.durationDays - 1, 0));

  function handleSubmit() {
    if (submitting) return;
    onSubmit({ title, startDate, travelerCount, copyNotes, copyBudget });
  }

  const errorText =
    status === "duration_mismatch" && expectedDurationDays != null
      ? `จำนวนวันที่เลือกไม่ตรงกับแผนต้นฉบับ กรุณาเลือกช่วงเวลา ${expectedDurationDays} วัน`
      : ERROR_STATUSES.includes(status)
        ? message
        : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold">ตั้งค่าทริปของคุณ</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="ปิด"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] disabled:opacity-60"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="mt-3 rounded-2xl px-4 py-3 text-xs"
          style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--foreground)" }}
        >
          <p className="font-semibold">
            รีมิกซ์จาก &ldquo;{source.title}&rdquo;
            {source.creatorName ? ` โดย ${source.creatorName}` : ""}
          </p>
          <p className="mt-0.5 text-[var(--color-muted)]">{source.durationDays} วัน</p>
          <p className="mt-1.5">ระบบจะสร้างสำเนาเป็นทริปส่วนตัวของคุณ การแก้ไขจะไม่กระทบแผนต้นฉบับ</p>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-muted)]">ชื่อทริป</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              className="rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-muted)]">วันเริ่มต้น</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
                className="rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
                style={{ borderColor: "var(--color-border)" }}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-muted)]">วันสิ้นสุด (คำนวณอัตโนมัติ)</span>
              <input
                type="date"
                value={endDate}
                disabled
                readOnly
                className="rounded-xl border px-3.5 py-2.5 text-sm opacity-60"
                style={{ borderColor: "var(--color-border)" }}
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 py-1">
            <span className="text-xs font-semibold text-[var(--color-muted)]">จำนวนผู้เดินทาง</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTravelerCount((n) => Math.max(1, n - 1))}
                disabled={submitting}
                className="flex h-8 w-8 items-center justify-center rounded-full border disabled:opacity-60"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Minus size={14} />
              </button>
              <span className="w-4 text-center text-sm font-semibold">{travelerCount}</span>
              <button
                type="button"
                onClick={() => setTravelerCount((n) => n + 1)}
                disabled={submitting}
                className="flex h-8 w-8 items-center justify-center rounded-full border disabled:opacity-60"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={copyNotes}
              onChange={(e) => setCopyNotes(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4"
            />
            คัดลอกคำแนะนำและโน้ต
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={copyBudget}
              onChange={(e) => setCopyBudget(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4"
            />
            คัดลอกงบประมาณ
          </label>
        </div>

        {errorText && (
          <p
            className="mt-4 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
          >
            {errorText}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-full border py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: "var(--color-border)", color: "var(--foreground)" }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            {submitting && <LoaderCircle size={15} className="animate-spin" />}
            {submitting ? "กำลังสร้างทริป..." : "สร้างทริปของฉัน"}
          </button>
        </div>
      </div>
    </div>
  );
}
