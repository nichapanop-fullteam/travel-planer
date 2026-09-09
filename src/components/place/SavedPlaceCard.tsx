"use client";

// One bookmarked place on /saved. Sibling of RealTripCard on the trips tab of
// the same page, and deliberately quieter: a place has no owner, no budget and
// no plan behind it, so the card carries the two things you actually do with a
// saved place — put it in a trip, or take it off the list.
import { MapPin, Star } from "lucide-react";
import { AddPlaceToTripMenu } from "@/components/plan/AddPlaceToTripMenu";
import { SavePlaceButton } from "@/components/place/SavePlaceButton";
import { categoryIcon, categoryLabel } from "@/lib/category-styles";
import { EXTERNAL_TO_ACTIVITY_CATEGORY } from "@/lib/place-mock-metadata";
import type { SavedPlace } from "@/lib/saved-places-api";
import type { ExternalPlaceCategory } from "@/lib/external-places-api";

const FALLBACK_IMAGE = "/images/luang-prabang.jpg";

export function SavedPlaceCard({
  place,
  onSavedChange,
  onRequireLogin,
}: {
  place: SavedPlace;
  // The list drops the card when the bookmark comes off — staying in "สถานที่
  // ที่คุณบันทึกไว้" after un-saving reads as a failed click.
  onSavedChange: (placeId: string, saved: boolean) => void;
  onRequireLogin: () => void;
}) {
  // The API's own 7-value taxonomy, folded into this app's ActivityCategory so
  // the chip matches the ones on an itinerary card. Unknown values fall back to
  // "other" rather than crashing on a category added server-side later.
  const activityCategory =
    EXTERNAL_TO_ACTIVITY_CATEGORY[place.category as ExternalPlaceCategory] ?? "other";
  const CategoryIcon = categoryIcon[activityCategory];

  return (
    // No overflow-hidden on the card: AddPlaceToTripMenu's popover opens
    // downward out of the footer and a clip here would cut it off. The photo
    // clips itself instead — same fix as the stop card on /view-trip.
    <div className="rounded-2xl border bg-white" style={{ borderColor: "var(--color-border-tag)" }}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={place.imageUrl || FALLBACK_IMAGE}
          alt=""
          className="h-full w-full object-cover"
          // Google's photo links expire; a dead one must not leave a broken
          // image icon where a photo should be.
          onError={(event) => {
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
        <div className="absolute right-2 top-2">
          <SavePlaceButton
            placeId={place.id}
            placeName={place.name}
            initialSaved
            signedIn
            onRequireLogin={onRequireLogin}
            onSavedChange={(saved) => onSavedChange(place.id, saved)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 text-sm font-bold leading-snug">{place.name}</h3>
          {place.rating != null && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--color-muted)]">
              <Star size={12} className="text-[var(--color-accent-orange)]" fill="var(--color-accent-orange)" />
              {place.rating.toFixed(1)}
            </span>
          )}
        </div>

        <span
          className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
        >
          <CategoryIcon size={12} />
          {categoryLabel[activityCategory]}
        </span>

        {place.address && (
          <p className="flex items-start gap-1.5 text-xs text-[var(--color-muted)]">
            <MapPin size={12} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{place.address}</span>
          </p>
        )}

        <div className="flex items-center justify-end pt-1">
          <AddPlaceToTripMenu
            place={{ placeId: place.id, title: place.name, category: activityCategory, lat: place.lat, lng: place.lng }}
            signedIn
            onRequireLogin={onRequireLogin}
            variant="label"
          />
        </div>
      </div>
    </div>
  );
}
