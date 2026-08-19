"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Compass,
  Home,
  LoaderCircle,
  MapPin,
  Menu,
  Plus,
  Search,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
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

const creators = [
  { name: "TravelWithTawn", niche: "ญี่ปุ่น · จีน", avatar: "🎒" },
  { name: "Foodie Nomad", niche: "อาหาร · คาเฟ่", avatar: "🍜" },
  { name: "Slow Life Trip", niche: "ธรรมชาติ · ฮีลใจ", avatar: "🌿" },
];

const trends = [
  { tag: "#เที่ยวญี่ปุ่น", posts: "12.8k โพสต์" },
  { tag: "#แจกแพลนเที่ยว", posts: "8.4k โพสต์" },
  { tag: "#หลวงพระบาง", posts: "6.2k โพสต์" },
  { tag: "#CafeHopping", posts: "5.9k โพสต์" },
];

const categories = ["ทั้งหมด", "แจกแพลน", "ที่เที่ยว", "คาเฟ่", "ของกิน", "ธรรมชาติ", "วัฒนธรรม"];

export default function MainPage() {
  const [activeTab, setActiveTab] = useState("สำหรับคุณ");
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

  const visibleTrips = useMemo(() => {
    if (!trips) return trips;
    if (activeCategory === "ทั้งหมด") return trips;
    return trips.filter((trip) => trip.tags.some((tag) => tag.toLowerCase().includes(activeCategory.toLowerCase())));
  }, [trips, activeCategory]);

  return (
    <main className="min-h-screen bg-[#f6f7f6] pb-20 text-[#17211c] lg:pb-16">
      <SocialHeader />

      <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-6 px-3 pb-6 pt-20 sm:px-6 sm:pt-24 lg:grid-cols-[220px_minmax(0,720px)_280px] lg:px-8">
        <LeftNav />

        <section className="min-w-0">
          <HomeSearchBar onSearch={handleSearch} />

          <div className="sticky top-[64px] z-20 mt-4 rounded-2xl border border-[#e5e9e6] bg-[#f6f7f6] sm:top-[73px]">
            <div className="flex">
              {["สำหรับคุณ", "กำลังติดตาม", "แพลนทริป"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative flex-1 py-3.5 text-sm font-semibold transition sm:py-4 ${
                    activeTab === tab ? "text-[#236747]" : "text-[#7a837e] hover:text-[#39443e]"
                  }`}
                >
                  {tab}
                  {activeTab === tab && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-[#2a9e64]" />}
                </button>
              ))}
            </div>
            <CategoryChips active={activeCategory} onSelect={setActiveCategory} />
          </div>

          {activeSearch && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-full bg-[#e9f4ee] px-4 py-2.5 text-sm">
              <span className="truncate">
                ผลค้นหา: <b className="font-bold text-[#236747]">{activeSearch}</b>
              </span>
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="shrink-0 text-xs font-semibold text-[#236747] underline"
              >
                ล้างการค้นหา
              </button>
            </div>
          )}

          {loadError ? (
            <div className="mt-4 rounded-2xl bg-[#fdeceb] px-5 py-4 text-sm font-semibold text-[#c53d3d]">{loadError}</div>
          ) : visibleTrips === null ? (
            <div className="flex justify-center py-16">
              <LoaderCircle size={20} className="animate-spin text-[#9aa19d]" />
            </div>
          ) : visibleTrips.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#d8dedb] py-16 text-center">
              <p className="text-sm font-semibold">
                {activeSearch ? `ไม่พบทริปสำหรับ "${activeSearch}"` : "ยังไม่มีทริปในหมวดนี้"}
              </p>
              <p className="text-xs text-[#9aa19d]">ลองเลือกหมวดอื่น หรือกลับมาดูใหม่ภายหลัง</p>
            </div>
          ) : (
            <MasonryFeed trips={visibleTrips} />
          )}
        </section>

        <RightRail />
      </div>

      <BottomNav />
    </main>
  );
}

// Same Destination/Date/Guest search widget as the Create Trip hero (see
// BookingBar's own doc comment) — but here "ค้นหา" filters the trip feed
// below by destination (GET /trips?destination=) instead of jumping to
// create-trip. Date/Guest still get remembered (and still prefill
// create-trip via the same "last search" localStorage bucket if the
// traveler goes on to build a trip elsewhere) but have no server-side
// equivalent on this endpoint, so they don't affect what gets searched.
function HomeSearchBar({ onSearch }: { onSearch: (destination: string) => void }) {
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

function SocialHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e4e9e6] bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-3 sm:h-[72px] sm:gap-4 sm:px-8">
        <Link href="/main" className="shrink-0"><Logo className="text-lg sm:text-xl" /></Link>
        <div className="relative ml-1 hidden max-w-md flex-1 md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#89928d]" size={18} />
          <input aria-label="ค้นหา" placeholder="ค้นหาแรงบันดาลใจ สถานที่ หรือครีเอเตอร์" className="h-11 w-full rounded-full bg-[#f1f4f2] pl-11 pr-4 text-sm outline-none ring-[#2a9e64]/20 transition focus:ring-4" />
        </div>
        <button aria-label="ค้นหา" className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-[#f2f4f3] md:hidden"><Search size={18} /></button>
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          <Link href="/main" className="rounded-full bg-[#e9f4ee] px-4 py-2 text-sm font-semibold text-[#236747]">หน้าหลัก</Link>
          <Link href="/discovery" className="rounded-full px-4 py-2 text-sm font-medium text-[#68726d] hover:bg-[#f3f5f4]">สำรวจ</Link>
          <Link href="/my-trips" className="rounded-full px-4 py-2 text-sm font-medium text-[#68726d] hover:bg-[#f3f5f4]">ทริปของฉัน</Link>
        </nav>
        <button aria-label="แจ้งเตือน" className="relative hidden h-10 w-10 place-items-center rounded-full bg-[#f2f4f3] sm:grid"><Bell size={19} /><span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#f37130]" /></button>
        <Link href="/my-trips" className="hidden sm:block"><img src="/images/profile-avatar.jpg" alt="โปรไฟล์" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" /></Link>
        <button aria-label="เมนู" className="grid h-10 w-10 place-items-center lg:hidden"><Menu size={22} /></button>
      </div>
    </header>
  );
}

function LeftNav() {
  const items = [
    { icon: Home, label: "ฟีดของฉัน", active: true, href: "/main" },
    { icon: Compass, label: "ค้นพบ", href: "/discovery" },
    { icon: CalendarDays, label: "ทริปของฉัน", href: "/my-trips" },
    { icon: Bookmark, label: "บันทึกไว้", href: "#" },
    { icon: Users, label: "คอมมูนิตี้", href: "#" },
  ];
  return (
    <aside className="sticky top-24 hidden h-fit lg:block">
      <nav className="space-y-1">
        {items.map(({ icon: Icon, label, active, href }) => (
          <Link key={label} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-[#e5f2eb] text-[#236747]" : "text-[#606b65] hover:bg-white"}`}>
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />{label}
          </Link>
        ))}
      </nav>
      <p className="mt-8 px-3 text-xs leading-5 text-[#9aa19d]">เกี่ยวกับเรา · ความเป็นส่วนตัว<br />© 2026 PunGuide</p>
    </aside>
  );
}

// Lemon8's own category row is flat text, not pill buttons — bold + a short
// underline marks the active one, everything else just sits in muted gray.
function CategoryChips({ active, onSelect }: { active: string; onSelect: (category: string) => void }) {
  return (
    <div className="flex gap-4 overflow-x-auto px-1 py-2.5 [scrollbar-width:none]">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`relative shrink-0 pb-1 text-[13px] transition ${
            active === category ? "font-bold text-[#17211c]" : "font-medium text-[#9aa19d] hover:text-[#5f6964]"
          }`}
        >
          {category}
          {active === category && <span className="absolute inset-x-0 -bottom-0.5 h-[2.5px] rounded-full bg-[#17211c]" />}
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
  const durationDays = trip.schedule.durationDays;

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
  }, [trip]);

  return (
    <article className="overflow-hidden rounded-2xl bg-white">
      <Link href={href} className={`block ${CARD_ASPECT} overflow-hidden rounded-2xl bg-[#edf0ee]`}>
        <img
          src={resolveCoverImageUrl(trip) ?? galleryCover ?? "/images/hero-mountain.jpg"}
          alt={trip.title}
          className="h-full w-full object-cover transition duration-500 hover:scale-[1.04]"
        />
      </Link>
      <div className="px-1 pb-1 pt-2.5">
        <Link href={href}>
          <h2 className="line-clamp-2 text-[13px] font-bold leading-snug text-[#17211c]">{trip.title}</h2>
        </Link>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#7e8882]">
          <MapPin size={11} className="shrink-0" />
          {trip.destination}
        </p>

        {trip.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {trip.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#f2f5f3] px-2 py-0.5 text-[10px] font-semibold text-[#5f6964]">
                {feedCategoryLabel[tag as FeedCategory] ?? tag}
              </span>
            ))}
          </div>
        )}

        {trip.totalBudget > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#236747]">
            <Wallet size={11} className="shrink-0" />
            งบ {formatTHB(trip.totalBudget)}
          </p>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#9aa19d]">{durationDays ? `${durationDays} วัน` : "ยังไม่ระบุวัน"}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trip.status === "confirmed" ? "bg-[#e5f2eb] text-[#236747]" : "bg-[#fdf1e6] text-[#c17a2e]"
            }`}
          >
            {trip.status === "confirmed" ? "ยืนยันแล้ว" : "ร่างแผน"}
          </span>
        </div>
      </div>
    </article>
  );
}

// Fixed bottom tab bar, mobile-only (LeftNav already covers this on lg+) —
// this is the piece that makes the page feel like a Lemon8/FB *app* rather
// than a website: Home / Discover / a raised create button / Saved / Profile.
function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5e9e6] bg-white lg:hidden">
      <div className="mx-auto flex max-w-[560px] items-center justify-between px-6 py-2">
        <Link href="/main" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[#236747]">
          <Home size={22} strokeWidth={2.5} fill="currentColor" fillOpacity={0.12} />
          <span className="text-[10px] font-semibold">หน้าหลัก</span>
        </Link>
        <Link href="/discovery" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[#7a837e]">
          <Compass size={22} />
          <span className="text-[10px] font-medium">ค้นพบ</span>
        </Link>
        <Link
          href="/create-trip"
          aria-label="สร้างทริป"
          className="-mt-6 grid h-12 w-12 place-items-center rounded-full bg-[#246f4d] text-white shadow-lg shadow-[#246f4d]/30"
        >
          <Plus size={22} strokeWidth={2.5} />
        </Link>
        <button aria-label="แจ้งเตือน" className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[#7a837e]">
          <Bell size={22} />
          <span className="absolute right-2 top-0.5 h-2 w-2 rounded-full bg-[#f37130]" />
          <span className="text-[10px] font-medium">แจ้งเตือน</span>
        </button>
        <Link href="/my-trips" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[#7a837e]">
          <img src="/images/profile-avatar.jpg" alt="" className="h-[22px] w-[22px] rounded-full object-cover" />
          <span className="text-[10px] font-medium">โปรไฟล์</span>
        </Link>
      </div>
    </nav>
  );
}

function RightRail() {
  return (
    <aside className="sticky top-24 hidden h-fit space-y-4 lg:block">
      <div className="overflow-hidden rounded-2xl bg-[#163f30] p-5 text-white shadow-lg shadow-[#163f30]/10"><span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold"><Sparkles size={11} /> PUNGUIDE AI</span><h3 className="mt-3 text-lg font-bold leading-snug">อยากไปเที่ยว<br />แต่ยังไม่มีแพลน?</h3><p className="mt-2 text-xs leading-5 text-white/70">บอกสไตล์ที่ชอบ แล้วให้เราสร้างทริปที่ใช่สำหรับคุณ</p><Link href="/create-trip" className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#1d5b3f]">เริ่มสร้างทริป <ChevronRight size={16} /></Link></div>
      <div className="rounded-2xl border border-[#e5e9e6] bg-white p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">กำลังมาแรง 🔥</h3><Link href="/discovery" className="text-[11px] font-semibold text-[#2a8158]">ดูทั้งหมด</Link></div><div className="space-y-3">{trends.map((trend, i) => <Link href="/discovery" key={trend.tag} className="flex items-center gap-3"><span className="text-xs font-bold text-[#a0a7a3]">{String(i + 1).padStart(2, "0")}</span><span><span className="block text-xs font-bold">{trend.tag}</span><span className="text-[10px] text-[#969e99]">{trend.posts}</span></span></Link>)}</div></div>
      <div className="rounded-2xl border border-[#e5e9e6] bg-white p-4"><h3 className="mb-3 text-sm font-bold">ครีเอเตอร์น่าติดตาม</h3><div className="space-y-4">{creators.map((creator) => <div key={creator.name} className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#eff3f0] text-lg">{creator.avatar}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{creator.name}</p><p className="truncate text-[10px] text-[#929a95]">{creator.niche}</p></div><button className="rounded-full border border-[#b8d8c6] px-3 py-1.5 text-[10px] font-bold text-[#27714e] hover:bg-[#edf6f1]">ติดตาม</button></div>)}</div></div>
    </aside>
  );
}
