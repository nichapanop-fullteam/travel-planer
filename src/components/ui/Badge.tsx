import type { HTMLAttributes } from "react";
import type { TripStatus } from "@/types";

const statusLabel: Record<TripStatus, string> = {
  draft: "ร่างแผน",
  shared: "แชร์แล้ว",
  confirmed: "ยืนยันแล้ว",
  completed: "จบทริปแล้ว",
};

const statusClasses: Record<TripStatus, string> = {
  draft: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  shared: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  completed: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export function StatusBadge({ status }: { status: TripStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

export function Badge({ className = "", style, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${className}`}
      style={style}
      {...props}
    />
  );
}
