import { Bell, Search, SlidersHorizontal } from "lucide-react";

// Visual only — search/filter/notifications aren't wired up in this demo.
export function Topbar() {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)]/40 bg-white px-6 py-3">
      <div className="flex max-w-lg flex-1 items-center gap-2 rounded-full bg-[var(--color-surface)] px-4 py-2.5">
        <Search size={16} className="shrink-0 text-[var(--color-muted)]" />
        <input
          type="text"
          placeholder="ค้นหาแผนเที่ยว สถานที่ หรือผู้ใช้..."
          disabled
          className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--color-muted)] focus:outline-none"
        />
        <SlidersHorizontal size={16} className="shrink-0 text-[var(--color-muted)]" />
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button className="relative rounded-full p-2 hover:bg-[var(--color-surface)]">
          <Bell size={18} className="text-[var(--color-muted)]" />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            S
          </div>
          <span className="text-sm font-medium">Sofia</span>
        </div>
      </div>
    </div>
  );
}
