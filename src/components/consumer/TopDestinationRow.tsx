"use client";

import { useEffect, useState } from "react";
import { getTripGallery } from "@/lib/trip-media-api";
import type { TopDestination } from "@/lib/top-destinations";

// The horizontal destination rail. Tapping a tile puts the destination into the
// feed's own search box — the filter that already exists — rather than routing
// somewhere new: there is no per-destination page, and a tile that does nothing
// is worse than one that narrows the feed you are already looking at.
export function TopDestinationRow({
  destinations,
  loading,
  onSelect,
}: {
  destinations: TopDestination[];
  loading: boolean;
  onSelect: (label: string) => void;
}) {
  if (loading) {
    return (
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[104px] w-[150px] shrink-0 animate-pulse rounded-2xl bg-[var(--color-surface)] sm:w-auto sm:flex-1"
          />
        ))}
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-[var(--color-muted)]" style={{ borderColor: "var(--color-border)" }}>
        ยังไม่มีจุดหมายให้แนะนำ — จะขึ้นมาเมื่อมีคนเผยแพร่ทริป
      </p>
    );
  }

  return (
    // Scrolls on phones, splits the width evenly from sm up. The negative
    // margin lets the row bleed to the screen edge while the page keeps its
    // padding, so a half-visible tile signals there is more to the right.
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {destinations.map((destination) => (
        <DestinationTile key={destination.label} destination={destination} onSelect={onSelect} />
      ))}
    </div>
  );
}

function DestinationTile({
  destination,
  onSelect,
}: {
  destination: TopDestination;
  onSelect: (label: string) => void;
}) {
  // Same cover fallback a feed card runs (see RealTripCard): coverImage is only
  // set once PUT /trips/:id/cover has been called, which most trips never do,
  // so the representative trip's gallery is the real source most of the time.
  const [galleryCover, setGalleryCover] = useState<string | null>(null);
  useEffect(() => {
    if (destination.coverImage) return;
    let cancelled = false;
    getTripGallery(destination.coverTripId, { page: 1, limit: 12 })
      .then((gallery) => {
        if (cancelled) return;
        const cover = gallery.items.find((item) => item.isCover) ?? gallery.items[0];
        if (cover) setGalleryCover(cover.urls.large);
      })
      .catch(() => {
        // No gallery — the tile keeps its dark ground and just shows the label.
      });
    return () => {
      cancelled = true;
    };
  }, [destination.coverTripId, destination.coverImage]);

  const cover = destination.coverImage ?? galleryCover;

  return (
    <button
      type="button"
      onClick={() => onSelect(destination.label)}
      className="group relative h-[104px] w-[150px] shrink-0 overflow-hidden rounded-2xl bg-[var(--color-deep-green)] text-left shadow-[0_2px_10px_rgba(16,24,40,0.10)] sm:w-auto sm:flex-1"
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
      )}
      {/* Bottom-weighted so the white label stays readable on a bright photo
          while the top of the image is left alone. */}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <span className="absolute inset-x-3 bottom-2.5 flex items-baseline gap-1.5">
        <span className="truncate text-sm font-bold text-white">{destination.label}</span>
        <span className="shrink-0 text-[10px] font-semibold text-white/70">{destination.tripCount} ทริป</span>
      </span>
    </button>
  );
}
