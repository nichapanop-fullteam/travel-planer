import type { ReactNode } from "react";

// Dashed-border "nothing here yet" placeholder — consolidates the
// structurally-identical blocks previously hand-rolled on /my-trips and
// /main (title + optional description + optional action).
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center"
      style={{ borderColor: "var(--color-border)" }}
    >
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-sm text-xs text-[var(--color-muted)]">{description}</p>}
      {action}
    </div>
  );
}
