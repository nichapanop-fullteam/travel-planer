import type { ReactNode } from "react";

// Title (+ optional subtitle) with an optional right-aligned actions slot —
// the "ทริปของฉัน" + "New Trip" row on /my-trips and /main's equivalent
// section heading both use this instead of hand-rolled flex rows.
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
