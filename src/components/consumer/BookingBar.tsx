"use client";

import type { LucideIcon } from "lucide-react";

// Shared "Destination / Date / Guest" search bar used on both the Home hero
// and the Create Trip hero, so the two stay visually in sync.
export interface BookingFieldConfig {
  icon: LucideIcon;
  label: string;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
}

export function BookingBar({
  fields,
  onSearch,
}: {
  fields: BookingFieldConfig[];
  onSearch?: () => void;
}) {
  return (
    <div className="relative flex w-full max-w-5xl items-center gap-2 rounded-[28px] bg-white/20 p-2 shadow-lg backdrop-blur-md">
      <div className="flex flex-1 flex-col overflow-hidden rounded-[22px] bg-white sm:flex-row sm:items-stretch">
        {fields.map((field, i) => (
          <BookingField key={field.label} field={field} isLast={i === fields.length - 1} />
        ))}
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="shrink-0 rounded-[20px] px-8 py-4 text-base font-bold text-white shadow-md transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: "var(--color-accent-orange)" }}
      >
        ค้นหา
      </button>
    </div>
  );
}

function BookingField({ field, isLast }: { field: BookingFieldConfig; isLast: boolean }) {
  const Icon = field.icon;
  return (
    <>
      <label
        className="flex flex-1 items-center gap-3 px-6 py-4 text-left"
        style={{ backgroundColor: field.hasError ? "var(--color-danger-bg)" : undefined }}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-sel-bg)]">
          <Icon size={18} style={{ color: field.hasError ? "var(--color-danger)" : "var(--color-brand-green)" }} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span
            className="text-xs font-bold"
            style={{ color: field.hasError ? "var(--color-danger)" : "var(--color-brand-green)" }}
          >
            {field.label}
          </span>
          <input
            type="text"
            value={field.value}
            placeholder={field.placeholder}
            disabled={field.disabled}
            onChange={(e) => field.onChange?.(e.target.value)}
            className="w-full bg-transparent text-base font-semibold text-[var(--foreground)] placeholder:font-medium placeholder:text-[var(--color-muted)] focus:outline-none"
          />
        </span>
      </label>
      {!isLast && (
        <div className="mx-3 hidden w-px shrink-0 self-stretch bg-[var(--color-border)]/30 sm:my-3 sm:block" />
      )}
    </>
  );
}
