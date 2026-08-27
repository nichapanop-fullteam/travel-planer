"use client";

import { useState } from "react";
import { Check, LoaderCircle, Repeat2, X } from "lucide-react";
import { GuestRow } from "@/components/ui/GuestRow";
import { buildGuestsLabel } from "@/components/consumer/GuestPickerDialog";
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
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [copyNotes, setCopyNotes] = useState(true);
  const [copyBudget, setCopyBudget] = useState(true);

  // POST /trips/:id/remix takes a single travelerCount (see RemixFormValues),
  // so the adults/children split is a UI-level breakdown that gets summed on
  // submit. Adults floors at 1, so the total always clears the API's
  // "travelerCount must be > 0" check.
  const travelerCount = adults + children;

  // Fixed to today rather than useState now that the date picker is hidden
  // (see the note by the traveler count below) — still sent on submit.
  const startDate = todayIsoDate();

  const submitting = status === "submitting";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remix-setup-title"
        className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky so the title and the close affordance stay put once the
            form scrolls inside the sheet on short mobile viewports. */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--color-border)]/30 bg-white/95 px-5 pb-4 pt-5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-primary)" }}
            >
              <Repeat2 size={19} />
            </span>
            <div className="min-w-0">
              <h2 id="remix-setup-title" className="text-lg font-bold leading-tight">
                ตั้งค่าทริปของคุณ
              </h2>
              <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">ปรับให้เข้ากับสไตล์ของคุณก่อนเริ่ม</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="ปิด"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--foreground)] disabled:opacity-60"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <div
            className="rounded-2xl border px-4 py-3.5"
            style={{ backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sm font-bold leading-snug">{source.title}</p>
              <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-[var(--color-deep-green)]">
                {source.durationDays} วัน
              </span>
            </div>
            {source.creatorName && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">โดย {source.creatorName}</p>
            )}
            <p className="mt-2.5 border-t pt-2.5 text-xs leading-relaxed" style={{ borderColor: "var(--color-sel-border)" }}>
              ระบบจะสร้างสำเนาเป็นทริปส่วนตัวของคุณ การแก้ไขจะไม่กระทบแผนต้นฉบับ
            </p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">ชื่อทริป</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              className="rounded-2xl border px-4 py-3 text-sm transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 disabled:opacity-60"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>

          {/* The start/end date pickers are hidden for now — startDate is
              still required by POST /trips/:id/remix (see validateRemixForm
              in hooks/useRemixTrip.ts), so it keeps defaulting to today and
              is still submitted below; only the inputs are gone. The trip's
              dates stay editable afterwards on the plan itself. */}

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">ผู้เดินทาง</span>
              <span className="text-xs font-medium text-[var(--color-muted)]">{buildGuestsLabel(adults, children)}</span>
            </div>

            {/* Boxed to match the text field above, so the steppers read as
                part of the same form rather than loose rows on the sheet. */}
            <div className="rounded-2xl border px-4" style={{ borderColor: "var(--color-border)" }}>
              <GuestRow
                label="ผู้ใหญ่"
                hint="อายุ 18 ปีขึ้นไป"
                value={adults}
                disabled={submitting}
                onDecrement={() => setAdults((n) => Math.max(1, n - 1))}
                onIncrement={() => setAdults((n) => n + 1)}
              />

              <div className="h-px bg-[var(--color-border)]/50" />

              <GuestRow
                label="เด็ก"
                hint="อายุ 0-17 ปี"
                value={children}
                disabled={submitting}
                onDecrement={() => setChildren((n) => Math.max(0, n - 1))}
                onIncrement={() => setChildren((n) => n + 1)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">สิ่งที่จะคัดลอกมาด้วย</span>
            <CopyOption
              label="คำแนะนำและโน้ต"
              hint="ข้อความและเคล็ดลับจากผู้สร้างต้นฉบับ"
              checked={copyNotes}
              disabled={submitting}
              onChange={setCopyNotes}
            />
            <CopyOption
              label="งบประมาณ"
              hint="ราคาที่ตั้งไว้ในแต่ละกิจกรรม"
              checked={copyBudget}
              disabled={submitting}
              onChange={setCopyBudget}
            />
          </div>

          {errorText && (
            <p
              className="rounded-2xl px-4 py-3 text-xs font-semibold leading-relaxed"
              style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
            >
              {errorText}
            </p>
          )}
        </div>

        {/* Sticky footer — the primary action stays reachable no matter how
            far the form above has scrolled. */}
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-[var(--color-border)]/30 bg-white/95 px-5 pb-5 pt-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-full border py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: "var(--color-border)", color: "var(--foreground)" }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--color-deep-green)] hover:shadow-[0_6px_18px_-4px_rgba(42,158,100,0.5)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:shadow-none"
          >
            {submitting && <LoaderCircle size={15} className="animate-spin" />}
            {submitting ? "กำลังสร้างทริป..." : "สร้างทริปของฉัน"}
          </button>
        </div>
      </div>
    </div>
  );
}

// The two "copy this across" toggles, as tappable cards rather than the bare
// native checkboxes they used to be — the real input stays in the DOM (just
// visually hidden) so it keeps its checkbox role, label association and
// keyboard behaviour, with the square beside it drawn to match the rest of
// the sheet.
function CopyOption({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "hover:bg-[var(--color-surface)]"
      }`}
      style={{
        borderColor: checked ? "var(--color-sel-border)" : "var(--color-border)",
        backgroundColor: checked ? "var(--color-sel-bg)" : undefined,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primary)]/40 peer-focus-visible:ring-offset-2"
        style={{
          borderColor: checked ? "var(--color-primary)" : "var(--color-border)",
          backgroundColor: checked ? "var(--color-primary)" : "transparent",
          color: "#ffffff",
        }}
      >
        {checked && <Check size={13} strokeWidth={3.5} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-[var(--color-muted)]">{hint}</span>
      </span>
    </label>
  );
}
