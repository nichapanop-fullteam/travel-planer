import type { HTMLAttributes } from "react";

export function Divider({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`h-px bg-[var(--color-border)]/40 ${className}`} {...props} />;
}
