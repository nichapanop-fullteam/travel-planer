// Simple underline tab row — used by /main's feed tabs. /trip-detail's
// TripDetailTabs is a different, richer tab set (routes to distinct panels
// with their own data-loading) and keeps its own implementation.
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: T[];
  active: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div className="flex">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`relative flex-1 py-3.5 text-sm font-semibold transition sm:py-4 ${
            active === tab ? "text-[var(--color-brand-green)]" : "text-[var(--color-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {tab}
          {active === tab && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-[var(--color-primary)]" />}
        </button>
      ))}
    </div>
  );
}
