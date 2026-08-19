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
  onFieldClick?: () => void;
  readOnly?: boolean;
  hasError?: boolean;
  disabled?: boolean;
}

export function BookingBar({
  fields,
  onSearch,
  showSearchButton = true,
  compact = false,
}: {
  fields: BookingFieldConfig[];
  onSearch?: () => void;
  showSearchButton?: boolean;
  // Smaller padding/icons/text — for tighter spots (e.g. the /main feed's
  // search shortcut) where the full-size bar (Create Trip's hero) overflows
  // and truncates every field's value.
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex w-full max-w-5xl flex-col items-stretch shadow-lg backdrop-blur-md sm:flex-row sm:items-center ${
        compact ? "gap-1.5 rounded-[20px] bg-white/20 p-1.5" : "gap-2 rounded-[28px] bg-white/20 p-2"
      }`}
    >
      <div
        className={`flex flex-1 flex-col overflow-hidden bg-white sm:flex-row sm:items-stretch ${
          compact ? "rounded-2xl" : "rounded-[22px]"
        }`}
      >
        {fields.map((field, i) => (
          <BookingField key={field.label} field={field} isLast={i === fields.length - 1} compact={compact} />
        ))}
      </div>
      {showSearchButton && (
        <button
          type="button"
          onClick={onSearch}
          className={`shrink-0 font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 ${
            compact ? "rounded-2xl px-5 py-2.5 text-sm" : "rounded-[20px] px-8 py-4 text-base"
          }`}
          style={{ backgroundColor: "var(--color-accent-orange)" }}
        >
          ค้นหา
        </button>
      )}
    </div>
  );
}

function BookingField({
  field,
  isLast,
  compact,
}: {
  field: BookingFieldConfig;
  isLast: boolean;
  compact: boolean;
}) {
  const Icon = field.icon;
  return (
    <>
      <label
        className={`flex flex-1 items-center text-left ${compact ? "gap-2 px-3.5 py-2.5" : "gap-3 px-6 py-4"}`}
        style={{
          backgroundColor: field.hasError ? "var(--color-danger-bg)" : undefined,
          cursor: field.onFieldClick ? "pointer" : undefined,
        }}
        onClick={field.onFieldClick}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--color-sel-bg)] ${
            compact ? "h-7 w-7" : "h-10 w-10"
          }`}
        >
          <Icon
            size={compact ? 14 : 18}
            style={{ color: field.hasError ? "var(--color-danger)" : "var(--color-brand-green)" }}
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span
            className={`font-bold ${compact ? "text-[10px]" : "text-xs"}`}
            style={{ color: field.hasError ? "var(--color-danger)" : "var(--color-brand-green)" }}
          >
            {field.label}
          </span>
          <input
            type="text"
            value={field.value}
            placeholder={field.placeholder}
            disabled={field.disabled}
            readOnly={field.readOnly}
            onChange={(e) => field.onChange?.(e.target.value)}
            className={`w-full truncate bg-transparent font-semibold text-[var(--foreground)] placeholder:font-medium placeholder:text-[var(--color-muted)] focus:outline-none ${
              compact ? "text-xs" : "text-base"
            } ${field.readOnly ? "cursor-pointer" : ""}`}
          />
        </span>
      </label>
      {!isLast && (
        <div
          className={`hidden shrink-0 self-stretch bg-[var(--color-border)]/30 sm:block ${
            compact ? "mx-1.5 my-2 w-px" : "mx-3 my-3 w-px"
          }`}
        />
      )}
    </>
  );
}
