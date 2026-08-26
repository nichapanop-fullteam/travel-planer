"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  Heart,
  Landmark,
  Leaf,
  Palmtree,
  Search,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";

// The app's home page — a social-travel-community "Discover your next
// journey" feed of creator-made guides, restyled to match the reference
// three-column layout (feed + trending/creators rail). All-mock data:
// there's no backend for community guides, trending destinations, or
// creator follows yet (see CONTRIBUTING.md for what's real vs. visual).
type Category = "thailand" | "japan" | "nature" | "food" | "weekend";

type FeaturedGuide = {
  id: string;
  title: string;
  duration: string;
  description: string;
  cover: string;
  likes: number;
  bookmarks: number;
  categories: Category[];
  author: { name: string; handle: string; avatar?: string };
  inspiredBy?: string;
  // English keywords for search, since some destinations/descriptions are
  // Thai-flavored — lets the search bar also match a typed city name.
  keywords: string;
};

const FEATURED_GUIDES: FeaturedGuide[] = [
  {
    id: "luang-prabang-temples",
    title: "Luang Prabang",
    duration: "3 days",
    description: "Serene temples, sunrise alms, and riverside slow days.",
    cover: "/images/wat-xieng-thong.png",
    likes: 342,
    bookmarks: 128,
    categories: ["weekend"],
    author: { name: "May", handle: "may.travels", avatar: "/images/profile-avatar.jpg" },
    keywords: "luang prabang laos temples",
  },
  {
    id: "tokyo-first-timer",
    title: "Kyoto autumn",
    duration: "5 days",
    description: "Colorful leaves, historic temples, and cozy tea houses.",
    cover: "/images/tokyo.jpg",
    likes: 521,
    bookmarks: 196,
    categories: ["japan", "nature"],
    author: { name: "Taro", handle: "taro.discovers", avatar: "/images/profile-v2.jpg" },
    keywords: "kyoto tokyo japan autumn",
  },
  {
    id: "mekong-slow-boat",
    title: "Mekong slow boat",
    duration: "2 days",
    description: "Drift past jungle cliffs on a two-day riverboat crossing.",
    cover: "/images/mekong-boat.png",
    likes: 187,
    bookmarks: 74,
    categories: ["nature", "weekend"],
    author: { name: "Fern", handle: "fern.wanderlust" },
    keywords: "mekong river laos boat",
  },
  {
    id: "night-market-eats",
    title: "Luang Prabang night market",
    duration: "1 day",
    description: "A grazing route through the best stalls after sunset.",
    cover: "/images/night-market.png",
    likes: 298,
    bookmarks: 112,
    categories: ["food", "weekend"],
    author: { name: "Vanessa", handle: "vanessa.eats" },
    inspiredBy: "May's trip",
    keywords: "luang prabang night market food laos",
  },
  {
    id: "chengdu-panda",
    title: "Chengdu",
    duration: "4 days",
    description: "Panda sanctuaries, spicy hot pot, and teahouse afternoons.",
    cover: "/images/chengdu.jpg",
    likes: 256,
    bookmarks: 91,
    categories: ["food"],
    author: { name: "Vanessa", handle: "vanessa.eats" },
    keywords: "chengdu china panda",
  },
  {
    id: "seoul-cafe-hop",
    title: "Seoul café crawl",
    duration: "5 days",
    description: "Hanok-lined cafés, night shopping, and skincare hauls.",
    cover: "/images/plan-seoul.jpg",
    likes: 431,
    bookmarks: 203,
    categories: ["food"],
    author: { name: "Fern", handle: "fern.wanderlust" },
    keywords: "seoul korea cafe",
  },
  {
    id: "osaka-street-food",
    title: "Osaka street food",
    duration: "3 days",
    description: "A eat-your-way-through itinerary for Japan's kitchen city.",
    cover: "/images/plan-osaka.jpg",
    likes: 389,
    bookmarks: 145,
    categories: ["japan", "food"],
    author: { name: "Taro", handle: "taro.discovers" },
    keywords: "osaka japan street food",
  },
  {
    id: "beijing-heritage",
    title: "Beijing heritage trail",
    duration: "6 days",
    description: "The Wall, the Forbidden City, and hutong alleyways.",
    cover: "/images/plan-beijing.jpg",
    likes: 214,
    bookmarks: 88,
    categories: [],
    author: { name: "May", handle: "may.travels" },
    keywords: "beijing china wall",
  },
  {
    id: "london-classic",
    title: "London in a weekend",
    duration: "3 days",
    description: "Museums, markets, and a proper afternoon tea.",
    cover: "/images/plan-london.jpg",
    likes: 302,
    bookmarks: 119,
    categories: ["weekend"],
    author: { name: "Fern", handle: "fern.wanderlust" },
    keywords: "london uk england",
  },
  {
    id: "joma-cafe-crawl",
    title: "Luang Prabang café crawl",
    duration: "1 day",
    description: "A local's route through the town's best coffee stops.",
    cover: "/images/joma-cafe.png",
    likes: 176,
    bookmarks: 65,
    categories: ["food", "weekend"],
    author: { name: "May", handle: "may.travels" },
    keywords: "luang prabang laos cafe coffee",
  },
  {
    id: "luang-prabang-nature",
    title: "Kuang Si waterfalls",
    duration: "1 day",
    description: "Turquoise pools, jungle hikes, and a bear rescue stop.",
    cover: "/images/luang-prabang.jpg",
    likes: 267,
    bookmarks: 103,
    categories: ["nature", "weekend"],
    author: { name: "Taro", handle: "taro.discovers" },
    keywords: "luang prabang laos waterfall nature",
  },
];

const CATEGORY_FILTERS: { key: "forYou" | Category; label: string; icon: typeof Sparkles }[] = [
  { key: "forYou", label: "For you", icon: Sparkles },
  { key: "thailand", label: "Thailand", icon: Palmtree },
  { key: "japan", label: "Japan", icon: Landmark },
  { key: "nature", label: "Nature", icon: Leaf },
  { key: "food", label: "Food", icon: UtensilsCrossed },
  { key: "weekend", label: "Weekend", icon: CalendarDays },
];

const TRENDING_DESTINATIONS = [
  { name: "Bali, Indonesia", posts: "12.4K", image: "/images/plan-osaka.jpg" },
  { name: "Tokyo, Japan", posts: "9.8K", image: "/images/tokyo.jpg" },
  { name: "Sapa, Vietnam", posts: "7.2K", image: "/images/luang-prabang.jpg" },
  { name: "Kuala Lumpur, Malaysia", posts: "5.6K", image: "/images/chengdu.jpg" },
  { name: "Lisbon, Portugal", posts: "4.1K", image: "/images/plan-london.jpg" },
];

const CREATORS = [
  { name: "May", handle: "may.travels", avatar: "/images/profile-avatar.jpg" },
  { name: "Taro", handle: "taro.discovers", avatar: "/images/profile-v2.jpg" },
  { name: "Fern", handle: "fern.wanderlust" },
];

export default function MainPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"forYou" | Category>("forYou");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const visibleGuides = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FEATURED_GUIDES.filter((guide) => {
      if (category !== "forYou" && !guide.categories.includes(category)) return false;
      if (!q) return true;
      return (
        guide.title.toLowerCase().includes(q) ||
        guide.description.toLowerCase().includes(q) ||
        guide.keywords.includes(q) ||
        guide.author.handle.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  function toggleSaved(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppShell active="home" hideDesktopTopbar>
      <PageContainer className="min-h-full bg-[#f8fbfa] !py-5 sm:!pl-10 sm:!pr-3">
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <h1 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-[42px] sm:leading-[1.15]">Discover your next journey</h1>

            <div className="mt-4 flex items-center gap-3 rounded-full border border-[var(--color-border)]/40 bg-white px-5 py-2.5 shadow-sm">
              <Search size={18} className="shrink-0 text-[var(--color-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search destinations, trips, or creators"
                className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--color-muted)] focus:outline-none"
              />
              <button
                type="button"
                title="ยังไม่เปิดใช้งานในเดโมนี้"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {CATEGORY_FILTERS.map((filter) => {
                const isActive = category === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setCategory(filter.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white"
                        : "border border-[var(--color-border)]/60 bg-white text-[var(--foreground)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <filter.icon size={14} />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {visibleGuides.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-muted)]">
                ยังไม่มีไกด์ในหมวดนี้ ลองเลือกหมวดอื่นดูสิ
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {visibleGuides.map((guide) => (
                  <GuideCard
                    key={guide.id}
                    guide={guide}
                    saved={savedIds.has(guide.id)}
                    onToggleSaved={() => toggleSaved(guide.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 self-start">
            <TrendingDestinationsCard />
            <CreatorsToFollowCard />
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

function GuideCard({
  guide,
  saved,
  onToggleSaved,
}: {
  guide: FeaturedGuide;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: "#e1e9e5" }}>
      <div className="relative aspect-[0.92] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={guide.cover} alt={guide.title} className="h-full w-full object-cover" />

        <button
          type="button"
          onClick={onToggleSaved}
          aria-pressed={saved}
          aria-label="บันทึกไกด์นี้"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white"
        >
          <Bookmark
            size={15}
            className={saved ? "fill-[var(--color-primary)] text-[var(--color-primary)]" : "text-[var(--foreground)]"}
          />
        </button>

        {guide.inspiredBy && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#177c5a] shadow-sm">
            <Sparkles size={13} /> Inspired by {guide.inspiredBy}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5 p-5">
        <h2 className="text-lg font-bold leading-snug">
          {guide.title} <span className="font-normal text-[var(--color-muted)]">· {guide.duration}</span>
        </h2>
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 text-sm leading-5 text-[var(--color-muted)]">{guide.description}</p>
          <div className="flex shrink-0 items-center gap-3 pt-0.5 text-xs font-medium text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1"><Heart size={14} />{guide.likes}</span>
            <span className="inline-flex items-center gap-1"><Bookmark size={14} />{guide.bookmarks}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {guide.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={guide.author.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {guide.author.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 text-sm">
              <p className="truncate font-bold leading-tight">{guide.author.name}</p>
              <p className="truncate text-xs text-[var(--color-muted)]">@{guide.author.handle}</p>
            </div>
          </div>

          <button
            type="button"
            title="ยังไม่เปิดใช้งานในเดโมนี้"
            className="shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#17895f" }}
          >
            Remix trip
          </button>
        </div>
      </div>
    </article>
  );
}

function TrendingDestinationsCard() {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "#e1e9e5" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Trending destinations</h2>
        <button
          type="button"
          title="ยังไม่เปิดใช้งานในเดโมนี้"
          className="text-sm font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          See all
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {TRENDING_DESTINATIONS.map((dest) => (
          <div key={dest.name} className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dest.image} alt="" className="h-16 w-[88px] shrink-0 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">{dest.name}</p>
              <p className="truncate text-xs text-[var(--color-muted)]">{dest.posts} posts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreatorsToFollowCard() {
  // Visual-only follow toggle — there's no follow-a-creator endpoint yet
  // (see CONTRIBUTING.md for what's real vs. visual).
  const [following, setFollowing] = useState<Set<string>>(new Set());

  function toggleFollow(handle: string) {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "#e1e9e5" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Creators to follow</h2>
        <button
          type="button"
          title="ยังไม่เปิดใช้งานในเดโมนี้"
          className="text-sm font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          See all
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {CREATORS.map((creator) => {
          const isFollowing = following.has(creator.handle);
          return (
            <div key={creator.handle} className="flex items-center gap-3">
              {creator.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creator.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {creator.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight">{creator.name}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">@{creator.handle}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleFollow(creator.handle)}
                aria-pressed={isFollowing}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  isFollowing
                    ? "border-[var(--color-primary)] bg-[var(--color-sel-bg)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)]/60 text-[var(--foreground)] hover:bg-[var(--color-surface)]"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
