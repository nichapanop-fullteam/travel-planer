import Link from "next/link";
import { Bookmark, Star } from "lucide-react";
import type { RecommendDestination } from "@/lib/home-content";
import { formatTHB } from "@/lib/trip-utils";

export function RecommendDestinationCard({ dest }: { dest: RecommendDestination }) {
  const content = (
    <>
      <div className="aspect-[3/2] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dest.imageUrl} alt={dest.title} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-xl font-bold">{dest.title}</p>
          <p className="text-sm text-[var(--color-muted)]">{dest.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dest.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-[var(--color-border)]/50 px-4 py-2 text-sm">
              {tag}
            </span>
          ))}
        </div>
        <div className="border-t border-[var(--color-border)]/30 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-sm font-bold">
                <Star size={16} style={{ color: "var(--color-accent-orange)" }} fill="currentColor" />
                {dest.rating}
              </span>
              <span className="flex items-center gap-1 text-sm text-[var(--color-muted)]">
                <Bookmark size={16} />
                {dest.saves}
              </span>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
              {formatTHB(dest.priceFrom)}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  if (dest.href) {
    return (
      <Link
        href={dest.href}
        className="block overflow-hidden rounded-3xl bg-white shadow-md transition-transform hover:-translate-y-0.5"
      >
        {content}
      </Link>
    );
  }

  return <div className="overflow-hidden rounded-3xl bg-white shadow-md">{content}</div>;
}
