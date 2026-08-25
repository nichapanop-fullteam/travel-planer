"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { BookingBar } from "@/components/consumer/BookingBar";
import { DestinationPickerDialog } from "@/components/consumer/DestinationPickerDialog";
import { DatePickerDialog } from "@/components/consumer/DatePickerDialog";
import { GuestPickerDialog } from "@/components/consumer/GuestPickerDialog";
import { getLastCreateTripSearch, saveLastCreateTripSearch } from "@/lib/create-trip-search";
import { listTrips, type BackendTripListItem } from "@/lib/trips-api";
import { getTripGallery, resolveCoverImageUrl } from "@/lib/trip-media-api";
import { feedCategoryLabel } from "@/lib/feed-categories";
import { formatTHB } from "@/lib/trip-utils";
import type { Destination, FeedCategory } from "@/types";

// Every cover crops to the same ratio — object-cover absorbs each source
// photo's real (and differing) dimensions so the grid still lines up cleanly
// row by row instead of staggering.
const CARD_ASPECT = "aspect-[4/5]";

const FEED_TABS = ["สำหรับคุณ", "กำลังติดตาม", "แพลนทริป"] as const;

const categories = ["ทั้งหมด", "แจกแพลน", "ที่เที่ยว", "คาเฟ่", "ของกิน", "ธรรมชาติ", "วัฒนธรรม"];

export default function MainPage() {
  const [activeTab, setActiveTab] = useState<(typeof FEED_TABS)[number]>("สำหรับคุณ");
  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
  const [trips, setTrips] = useState<BackendTripListItem[] | null>(null);
  const [loadError, setLoadError] = useState("");
  // "" = unfiltered feed. Set whenever "ค้นหา" is pressed in HomeSearchBar
  // (destination-only — Date/Guest have no server-side equivalent) so the
  // empty/error copy below can say what was searched and offer a way back.
  const [activeSearch, setActiveSearch] = useState("");

  // GET /trips — the public cross-owner feed (no login required), same
  // source my-trips.tsx uses for "ทริปของฉัน" via its authenticated sibling.
  // This is real trip data end to end: no mock author/like/comment fields,
  // since the backend doesn't return any of those for a trip.
  function loadTrips(destination: string) {
    let cancelled = false;
    setTrips(null);
    setLoadError("");
    listTrips(destination)
      .then((items) => {
        if (!cancelled) setTrips(items);
      })
      .catch(() => {
        if (!cancelled) setLoadError("โหลดทริปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => loadTrips(""), []);

  function handleSearch(destination: string) {
    setActiveSearch(destination);
    loadTrips(destination);
  }

  // "ล้างการค้นหา" needs to reset the Destination field itself, not just the
  // feed — handleSearch("") alone leaves HomeSearchBar's own destination
  // state (and the localStorage it prefills from) untouched, so the field
  // would still show the old value even though the feed is back to
  // unfiltered. Bumping this counter is HomeSearchBar's cue to clear it.
  const [clearSignal, setClearSignal] = useState(0);
  function handleClearSearch() {
    setClearSignal((n) => n + 1);
    handleSearch("");
  }

  const visibleTrips = useMemo(() => {
    if (!trips) return trips;
    if (activeCategory === "ทั้งหมด") return trips;
    return trips.filter((trip) => (trip.tags ?? []).some((tag) => tag.toLowerCase().includes(activeCategory.toLowerCase())));
  }, [trips, activeCategory]);

  return (
    <AppShell active="home">
      <PageContainer>
        {/* The feed is intentionally narrower than PageContainer's full width
            (same ~720px column the previous 3-column layout used) — a
            single-column social feed reads better narrow than stretched to
            the shared dashboard width /my-trips and /trip-detail use. */}
        <div className="mx-auto w-full max-w-2xl">
          <HomeSearchBar onSearch={handleSearch} clearSignal={clearSignal} />

          <div className="sticky top-0 z-20 mt-4 rounded-2xl border bg-[var(--color-surface)]" style={{ borderColor: "var(--color-border)" }}>
            <Tabs tabs={[...FEED_TABS]} active={activeTab} onChange={setActiveTab} />
            <CategoryChips active={activeCategory} onSelect={setActiveCategory} />
          </div>

          {activeSearch && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-full bg-[var(--color-sel-bg)] px-4 py-2.5 text-sm">
              <span className="truncate">
                ผลค้นหา: <b className="font-bold text-[var(--color-brand-green)]">{activeSearch}</b>
              </span>
              <button
                type="button"
                onClick={handleClearSearch}
                className="shrink-0 text-xs font-semibold text-[var(--color-brand-green)] underline"
              >
                ล้างการค้นหา
              </button>
            </div>
          )}

          {loadError ? (
            <div className="mt-4 rounded-2xl bg-[var(--color-danger-bg)] px-5 py-4 text-sm font-semibold text-[var(--color-danger)]">
              {loadError}
            </div>
          ) : visibleTrips === null ? (
            <div className="py-16">
              <Spinner />
            </div>
          ) : visibleTrips.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title={activeSearch ? `ไม่พบทริปสำหรับ "${activeSearch}"` : "ยังไม่มีทริปในหมวดนี้"}
                description="ลองเลือกหมวดอื่น หรือกลับมาดูใหม่ภายหลัง"
              />
            </div>
          ) : (
            <MasonryFeed trips={visibleTrips} />
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}

// Same Destination/Date/Guest search widget as the Create Trip hero (see
// BookingBar's own doc comment) — but here "ค้นหา" filters the trip feed
// below by destination (GET /trips?destination=) instead of jumping to
// create-trip. Date/Guest still get remembered (and still prefill
// create-trip via the same "last search" localStorage bucket if the
// traveler goes on to build a trip elsewhere) but have no server-side
// equivalent on this endpoint, so they don't affect what gets searched.
function HomeSearchBar({
  onSearch,
  clearSignal,
}: {
  onSearch: (destination: string) => void;
  clearSignal: number;
}) {
  const [destination, setDestination] = useState("");
  const [destinationPlace, setDestinationPlace] = useState<Destination | undefined>(undefined);
  const [duration, setDuration] = useState("");
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [guests, setGuests] = useState("");
  const [destDialogOpen, setDestDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);

  useEffect(() => {
    const last = getLastCreateTripSearch();
    if (!last) return;
    setDestination(last.destination);
    setDestinationPlace(last.destinationPlace);
    setDuration(last.duration);
    setStartDate(last.startDate);
    setEndDate(last.endDate);
    setGuests(last.guests);
    setAdults(last.adults);
    setChildren(last.children);
  }, []);

  // "ล้างการค้นหา" on the parent feed bumps clearSignal — clear just the
  // Destination field (Date/Guest have no bearing on the search, see the doc
  // comment above, so leave them as the traveler set them). Skips the
  // signal's initial value (0) so this doesn't wipe out the localStorage
  // prefill effect above on first mount. Also re-persists the cleared value,
  // so reloading the page doesn't bring the old destination right back.
  useEffect(() => {
    if (clearSignal === 0) return;
    setDestination("");
    setDestinationPlace(undefined);
    saveLastCreateTripSearch({ destination: "", destinationPlace: undefined, duration, startDate, endDate, guests, adults, children });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSignal]);

  function handleSearch() {
    saveLastCreateTripSearch({ destination, destinationPlace, duration, startDate, endDate, guests, adults, children });
    onSearch(destination);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/luang-prabang-aerial.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative flex flex-col items-center gap-2.5 px-4 py-5 sm:py-6">
        <p className="text-sm font-extrabold text-white drop-shadow-sm sm:text-base">พร้อมทริปต่อไปหรือยัง?</p>
        <BookingBar
          compact
          fields={[
            {
              icon: MapPin,
              label: "Destination",
              value: destination,
              placeholder: "หลวงพระบาง, ลาว",
              onFieldClick: () => setDestDialogOpen(true),
              readOnly: true,
            },
            {
              icon: CalendarDays,
              label: "Date",
              value: duration,
              placeholder: "วันเดินทางไป - วันกลับ",
              onFieldClick: () => setDateDialogOpen(true),
              readOnly: true,
            },
            {
              icon: Users,
              label: "Guest",
              value: guests,
              placeholder: "ประเภท และจำนวนคน",
              onFieldClick: () => setGuestDialogOpen(true),
              readOnly: true,
            },
          ]}
          onSearch={handleSearch}
        />
      </div>

      <DestinationPickerDialog
        isOpen={destDialogOpen}
        onClose={() => setDestDialogOpen(false)}
        onConfirm={(result) => {
          setDestination(result.label);
          setDestinationPlace(result.destination);
          setDestDialogOpen(false);
        }}
      />
      <DatePickerDialog
        isOpen={dateDialogOpen}
        initialStartDate={startDate}
        initialEndDate={endDate}
        onClose={() => setDateDialogOpen(false)}
        onConfirm={(result) => {
          setDuration(result.label);
          setStartDate(result.startDate);
          setEndDate(result.endDate);
          setDateDialogOpen(false);
        }}
      />
      <GuestPickerDialog
        isOpen={guestDialogOpen}
        initialAdults={adults}
        initialChildren={children}
        onClose={() => setGuestDialogOpen(false)}
        onConfirm={(result) => {
          setAdults(result.adults);
          setChildren(result.children);
          setGuests(result.label);
          setGuestDialogOpen(false);
        }}
      />
    </div>
  );
}

// Lemon8's own category row is flat text, not pill buttons — bold + a short
// underline marks the active one, everything else just sits in muted gray.
function CategoryChips({ active, onSelect }: { active: string; onSelect: (category: string) => void }) {
  return (
    <div className="flex gap-4 overflow-x-auto px-3 py-2.5 [scrollbar-width:none]">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`relative shrink-0 pb-1 text-[13px] transition ${
            active === category ? "font-bold text-[var(--foreground)]" : "font-medium text-[var(--color-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {category}
          {active === category && <span className="absolute inset-x-0 -bottom-0.5 h-[2.5px] rounded-full bg-[var(--foreground)]" />}
        </button>
      ))}
    </div>
  );
}

// A plain even grid — every cover shares the same aspect ratio (see
// CARD_ASPECT), so rows line up cleanly instead of staggering.
function MasonryFeed({ trips }: { trips: BackendTripListItem[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4">
      {trips.map((trip) => (
        <LemonCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}

// Lemon8's real card keeps the photo completely clean — no text or icons
// overlaid on it — and puts everything else in the plain area below. GET
// /trips has no author/like/comment/rating fields (those were mocked
// before) — this shows only what the trip itself actually carries: a
// destination subtitle, its real tags (translated via feedCategoryLabel,
// e.g. "culture" → "วัฒนธรรม"), duration, and draft/confirmed status.
function LemonCard({ trip }: { trip: BackendTripListItem }) {
  const href = `/generated-plan/${trip.id}`;
  const durationDays = trip.schedule?.durationDays;

  // GET /trips doesn't return a coverImage until PUT /trips/:tripId/cover has
  // been called (see resolveCoverImageUrl's doc comment) — a trip built from
  // uploaded/place photos but with no cover explicitly set otherwise. Fall
  // back to GET /trips/:tripId/media and use whichever photo it flags as the
  // cover, only firing this second request for the trips that actually need it.
  const [galleryCover, setGalleryCover] = useState<string | null>(null);
  useEffect(() => {
    if (resolveCoverImageUrl(trip)) return;
    let cancelled = false;
    getTripGallery(trip.id, { page: 1, limit: 12 })
      .then((gallery) => {
        if (cancelled) return;
        const cover = gallery.items.find((item) => item.isCover) ?? gallery.items[0];
        if (cover) setGalleryCover(cover.urls.large);
      })
      .catch(() => {
        // No gallery yet (or the request failed) — the /images/hero-mountain.jpg
        // placeholder below covers this silently, same as a trip with no photos at all.
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  return (
    <article className="overflow-hidden rounded-2xl bg-white">
      <Link href={href} className={`block ${CARD_ASPECT} overflow-hidden rounded-2xl bg-[var(--color-surface)]`}>
        <img
          src={resolveCoverImageUrl(trip) ?? galleryCover ?? "/images/hero-mountain.jpg"}
          alt={trip.title}
          className="h-full w-full object-cover transition duration-500 hover:scale-[1.04]"
        />
      </Link>
      <div className="px-1 pb-1 pt-2.5">
        <Link href={href}>
          <h2 className="line-clamp-2 text-[13px] font-bold leading-snug">{trip.title}</h2>
        </Link>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[var(--color-muted)]">
          <MapPin size={11} className="shrink-0" />
          {trip.destination}
        </p>

        {(trip.tags?.length ?? 0) > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {trip.tags!.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted)]"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                {feedCategoryLabel[tag as FeedCategory] ?? tag}
              </span>
            ))}
          </div>
        )}

        {trip.totalBudget > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-brand-green)]">
            <Wallet size={11} className="shrink-0" />
            งบ {formatTHB(trip.totalBudget)}
          </p>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--color-muted)]">{durationDays ? `${durationDays} วัน` : "ยังไม่ระบุวัน"}</span>
          <StatusBadge status={trip.status} />
        </div>
      </div>
    </article>
  );
}
