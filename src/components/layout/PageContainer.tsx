import type { HTMLAttributes } from "react";

// The one canonical page width/padding wrapper for AppShell-based routes —
// matches /trip-detail's pre-existing max-w-7xl (the widest, most complex
// page already using it), backed by the --container-max token. Replaces
// /my-trips's max-w-5xl and every ad hoc max-w-[...] value on /main.
export function PageContainer({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto w-full max-w-[var(--container-max)] px-6 py-10 sm:px-10 ${className}`} {...props} />;
}
