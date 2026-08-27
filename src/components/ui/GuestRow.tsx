"use client";

import { Minus, Plus } from "lucide-react";

// One "ผู้ใหญ่ / เด็ก" stepper row — label + age hint on the left, −/count/+
// on the right. Lifted out of consumer/GuestPickerDialog (where it started
// as a private helper) once RemixSetupDialog needed the same traveler
// breakdown, so the two share one control instead of drifting apart.
export function GuestRow({
  label,
  hint,
  value,
  disabled = false,
  onDecrement,
  onIncrement,
}: {
  label: string;
  hint: string;
  value: number;
  disabled?: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-[var(--color-muted)]">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabled}
          aria-label={`ลด${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-[var(--color-surface)] disabled:opacity-60"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Minus size={14} />
        </button>
        <span className="w-4 text-center text-sm font-semibold">{value}</span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={disabled}
          aria-label={`เพิ่ม${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-[var(--color-surface)] disabled:opacity-60"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
