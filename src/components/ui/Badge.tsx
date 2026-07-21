import type { HTMLAttributes } from "react";
import type { TripStatus } from "@/types";

const statusLabel: Record<TripStatus, string> = {
  draft: "ร่างแผน",
  shared: "แชร์แล้ว",
  confirmed: "ยืนยันแล้ว",
  completed: "จบทริปแล้ว",
};

const statusStyle: Record<TripStatus, { background: string; color: string }> = {
  draft: { background: "var(--color-neutral-gray)", color: "#ffffff" },
  shared: { background: "var(--color-accent-orange)", color: "#ffffff" },
  confirmed: { background: "var(--color-primary)", color: "#ffffff" },
  completed: { background: "var(--color-deep-green)", color: "#ffffff" },
};

export function StatusBadge({ status }: { status: TripStatus }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={statusStyle[status]}
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
