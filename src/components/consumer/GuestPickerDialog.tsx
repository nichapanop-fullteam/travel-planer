"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

export interface GuestPickerResult {
  adults: number;
  children: number;
  label: string; // "ผู้ใหญ่ 1 คน" or "ผู้ใหญ่ 2 คน, เด็ก 1 คน"
}

export function buildGuestsLabel(adults: number, children: number): string {
  const parts = [`ผู้ใหญ่ ${adults} คน`];
  if (children > 0) parts.push(`เด็ก ${children} คน`);
  return parts.join(", ");
}

export function GuestPickerDialog({
  isOpen,
  onClose,
  onConfirm,
  initialAdults = 1,
  initialChildren = 0,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: GuestPickerResult) => void;
  initialAdults?: number;
  initialChildren?: number;
}) {
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);

  if (!isOpen) return null;

  function handleConfirm() {
    onConfirm({ adults, children, label: buildGuestsLabel(adults, children) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <GuestRow
          label="ผู้ใหญ่"
          hint="อายุ 18 ปีขึ้นไป"
          value={adults}
          onDecrement={() => setAdults((n) => Math.max(1, n - 1))}
          onIncrement={() => setAdults((n) => n + 1)}
        />

        <div className="my-1 h-px bg-[var(--color-border)]/60" />

        <GuestRow
          label="เด็ก"
          hint="อายุ 0-17 ปี"
          value={children}
          onDecrement={() => setChildren((n) => Math.max(0, n - 1))}
          onIncrement={() => setChildren((n) => n + 1)}
        />

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
            className="flex-1 rounded-full py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestRow({
  label,
  hint,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  hint: string;
  value: number;
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
          className="flex h-8 w-8 items-center justify-center rounded-full border"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Minus size={14} />
        </button>
        <span className="w-4 text-center text-sm font-semibold">{value}</span>
        <button
          type="button"
          onClick={onIncrement}
          className="flex h-8 w-8 items-center justify-center rounded-full border"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
