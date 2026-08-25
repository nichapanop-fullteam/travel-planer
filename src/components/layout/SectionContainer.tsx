import type { HTMLAttributes } from "react";

// Standardizes the vertical gap between page sections inside a
// PageContainer — /my-trips and /main each hand-rolled a slightly different
// flex-col gap for this before the refactor.
export function SectionContainer({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col gap-6 ${className}`} {...props} />;
}
