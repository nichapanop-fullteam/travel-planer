export interface PlaceCardData {
  id: string;
  title: string;
  imageUrl: string;
  tags: string[];
}

export function PlaceCard({ place }: { place: PlaceCardData }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.imageUrl} alt={place.title} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-col gap-2 p-3.5">
        <p className="text-sm font-bold">{place.title}</p>
        <div className="flex flex-wrap gap-1.5">
          {place.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--color-border)]/40 px-2.5 py-1 text-xs text-[var(--color-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
