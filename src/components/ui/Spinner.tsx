import { LoaderCircle } from "lucide-react";

// Centered loading spinner — consolidates the repeated
// `<LoaderCircle className="animate-spin" />` block used for page/section
// loading states.
export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <LoaderCircle size={size} className="animate-spin text-[var(--color-muted)]" />
    </div>
  );
}
