"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Play,
  Plus,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { PuntokClip } from "@/lib/puntok-content";

// The vertical clip feed at /puntok.
//
// One snap-scrolling column: every post owns a full screen, and the scroller —
// not the window — is what moves, so the feed's chrome can sit still on top of
// it.
//
// Two shapes out of one tree, split at 1025px like the rest of the app
// (MobileBottomNav, FrostedTopNav):
//
// - At or below: the post is the screen. Edge to edge, square corners, the two
//   feed tabs overlaid on the clip, and the bottom bar the only other chrome.
// - Above: the post becomes a 9:16 card hanging under the header's black bar,
//   with a lime up/down stepper beside it. The stage stays clear there — the
//   tabs move into the header's filter menu (see FeedFilterMenu in
//   app/puntok/page.tsx), which is why `tab` is a prop rather than state.
//
// It is a prototype: likes, saves and follows are component state over the
// mock rows in lib/puntok-content.ts, and nothing is persisted or posted.

export type PuntokTab = "forYou" | "following";

const TABS: { key: PuntokTab; label: string }[] = [
  { key: "following", label: "กำลังติดตาม" },
  { key: "forYou", label: "สำหรับคุณ" },
];

// Card width on desktop, derived from the viewport rather than fixed so the
// 9:16 card still fits a laptop's short screen. 0.5625 is 9/16; the 9.75rem is
// the two header rows above the stage plus the gap the card keeps from them.
// Lives as a custom property because the stepper positions itself against the
// card's edge and the card is centred — both need the same number.
const CARD_WIDTH = "min(380px, calc((100dvh - 9.75rem) * 0.5625))";

export function PuntokFeed({
  clips,
  tab,
  onTabChange,
}: {
  clips: PuntokClip[];
  tab: PuntokTab;
  onTabChange: (next: PuntokTab) => void;
}) {
  // Keyed by creator, not by post: following someone from one clip has to
  // light up their other clips too, and the "กำลังติดตาม" tab reads from the
  // live set so unfollowing drops those posts out of it.
  const [followed, setFollowed] = useState<ReadonlySet<string>>(
    () => new Set(clips.filter((clip) => clip.following).map((clip) => clip.creatorName))
  );
  const [liked, setLiked] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [saved, setSaved] = useState<ReadonlySet<string>>(() => new Set<string>());

  // Muted by default because autoplay with sound is blocked everywhere — the
  // clip would simply not start. The toggle is the way in to sound.
  const [muted, setMuted] = useState(true);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const visible = useMemo(
    () => (tab === "following" ? clips.filter((clip) => followed.has(clip.creatorName)) : clips),
    [clips, tab, followed]
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // A new tab is a new list, so the old index points at someone else's post.
  // Adjusted during render — React's own answer to "state that has to reset
  // when a prop changes" — rather than in an effect, which would render the
  // stale index once and then render again to correct it.
  const [renderedTab, setRenderedTab] = useState(tab);
  if (renderedTab !== tab) {
    setRenderedTab(tab);
    setActiveIndex(0);
    setPausedByUser(false);
  }

  // The matching DOM half of that reset. An effect because it touches the
  // scroller, which does not exist until after the render that swapped lists.
  // The ref array needs no clearing: React calls each old ref callback with
  // null as its <video> unmounts, so entries the new list doesn't reach are
  // already null by the time the play effect walks them.
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  // Which post is on screen. Read off scrollTop rather than through an
  // IntersectionObserver: snap-mandatory means the scroller only ever rests on
  // an exact multiple of its own height, so this is the same answer with none
  // of the observer's teardown-and-rebuild on every tab switch.
  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientHeight === 0) return;
    const next = Math.round(scroller.scrollTop / scroller.clientHeight);
    setActiveIndex((current) => (current === next ? current : next));
  }, []);

  // Exactly one clip plays at a time. `play()` rejects when the browser
  // declines (a backgrounded tab, an autoplay policy) — a normal outcome here,
  // not an error to surface, so the rejection is swallowed.
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      video.muted = muted;
      if (index === activeIndex && !pausedByUser) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeIndex, muted, pausedByUser, visible]);

  const step = useCallback(
    (delta: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const target = Math.min(Math.max(activeIndex + delta, 0), visible.length - 1);
      scroller.scrollTo({ top: target * scroller.clientHeight, behavior: "smooth" });
    },
    [activeIndex, visible.length]
  );

  const toggle = (
    set: ReadonlySet<string>,
    apply: (next: ReadonlySet<string>) => void,
    key: string
  ) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  return (
    <div
      className="relative h-full overflow-hidden bg-black min-[1025px]:bg-white"
      style={{ ["--puntok-card-w" as string]: CARD_WIDTH }}
    >
      {/* The two feed tabs, overlaid on the clip and outside the scroller so
          they stay put while posts move under them. Phone-only: the desktop
          design keeps the stage clear, and the header's filter menu carries
          the same switch there. */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex justify-center px-4 pb-4 min-[1025px]:hidden"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <div
          role="tablist"
          aria-label="ฟีด Puntok"
          className="flex items-center gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md"
        >
          {TABS.map((item) => {
            const isActive = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(item.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  isActive ? "bg-white text-[var(--foreground)] shadow-sm" : "text-white/85"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyFollowing onBrowse={() => onTabChange("forYou")} />
      ) : (
        <>
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
          >
            {visible.map((clip, index) => (
              <section
                key={clip.id}
                className="flex h-full w-full snap-start snap-always items-center justify-center"
              >
                <ClipCard
                  clip={clip}
                  isActive={index === activeIndex}
                  isPaused={index === activeIndex && pausedByUser}
                  isLiked={liked.has(clip.id)}
                  isSaved={saved.has(clip.id)}
                  isFollowed={followed.has(clip.creatorName)}
                  isMuted={muted}
                  onToggleMute={() => setMuted((value) => !value)}
                  onTogglePlay={() => setPausedByUser((value) => !value)}
                  onToggleLike={() => toggle(liked, setLiked, clip.id)}
                  onToggleSave={() => toggle(saved, setSaved, clip.id)}
                  onToggleFollow={() => toggle(followed, setFollowed, clip.creatorName)}
                  videoRef={(element) => {
                    videoRefs.current[index] = element;
                  }}
                />
              </section>
            ))}
          </div>

          {/* Desktop stepper. Positioned against the card's right edge off the
              same custom property the card is sized from, since both are
              measured out from the centre of the stage. */}
          <div
            className="absolute top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 min-[1025px]:flex"
            style={{ left: "calc(50% + var(--puntok-card-w) / 2 + 1.25rem)" }}
          >
            <StepButton
              label="คลิปก่อนหน้า"
              onClick={() => step(-1)}
              disabled={activeIndex === 0}
              icon={ChevronUp}
            />
            <StepButton
              label="คลิปถัดไป"
              onClick={() => step(1)}
              disabled={activeIndex >= visible.length - 1}
              icon={ChevronDown}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  icon: typeof ChevronUp;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-lime)] text-[var(--foreground)] shadow-[var(--shadow-md)] transition hover:brightness-95 disabled:opacity-35"
    >
      <Icon size={18} strokeWidth={2.6} />
    </button>
  );
}

function ClipCard({
  clip,
  isActive,
  isPaused,
  isLiked,
  isSaved,
  isFollowed,
  isMuted,
  onToggleMute,
  onTogglePlay,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  videoRef,
}: {
  clip: PuntokClip;
  isActive: boolean;
  isPaused: boolean;
  isLiked: boolean;
  isSaved: boolean;
  isFollowed: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onToggleFollow: () => void;
  videoRef: (element: HTMLVideoElement | null) => void;
}) {
  return (
    <article className="relative h-full w-full overflow-hidden bg-black min-[1025px]:aspect-[9/16] min-[1025px]:h-auto min-[1025px]:w-[var(--puntok-card-w)] min-[1025px]:rounded-[20px] min-[1025px]:shadow-[0_18px_50px_-12px_rgba(16,24,40,0.45)]">
      {clip.videoUrl ? (
        <video
          ref={videoRef}
          src={clip.videoUrl}
          poster={clip.imageUrl}
          loop
          muted
          playsInline
          // Only the post in view is worth bytes; the rest hold their poster
          // until the feed reaches them.
          preload={isActive ? "auto" : "none"}
          className="h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clip.imageUrl} alt="" className="h-full w-full object-cover" />
      )}

      {/* Tap the media to pause, the way every clip feed behaves. A button
          rather than a handler on the article so it is reachable from the
          keyboard and announces itself; it sits under the rail and the
          caption, which take their own taps. */}
      {clip.videoUrl && (
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPaused ? "เล่นคลิป" : "หยุดคลิป"}
          className="absolute inset-0 z-0 cursor-default"
        >
          {isPaused && isActive && (
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
              <Play size={26} className="translate-x-0.5" fill="currentColor" />
            </span>
          )}
        </button>
      )}

      {/* Two scrims, not one: the tabs sit on the top edge and the caption on
          the bottom, and a single full-height gradient carrying both would grey
          out the middle of the clip — the part anyone is watching. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

      {/* On the card rather than in the feed's chrome so it lands inside the
          card's own corner on desktop, where the stage around it is white and
          a floating dark pill would have nothing to sit on. */}
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
        aria-pressed={!isMuted}
        className="absolute right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-black/50 top-[calc(0.75rem+env(safe-area-inset-top))] min-[1025px]:top-3 min-[1025px]:h-8 min-[1025px]:w-8"
      >
        {isMuted ? <VolumeX size={16} strokeWidth={2.2} /> : <Volume2 size={16} strokeWidth={2.2} />}
      </button>

      <ActionRail
        clip={clip}
        isLiked={isLiked}
        isSaved={isSaved}
        isFollowed={isFollowed}
        onToggleLike={onToggleLike}
        onToggleSave={onToggleSave}
        onToggleFollow={onToggleFollow}
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-4 pr-16 min-[1025px]:gap-1 min-[1025px]:p-3 min-[1025px]:pr-14">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white drop-shadow min-[1025px]:text-xs">
            {clip.creatorName}
          </span>
          <button
            type="button"
            onClick={onToggleFollow}
            aria-pressed={isFollowed}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition min-[1025px]:px-2 min-[1025px]:text-[9px] ${
              isFollowed
                ? "bg-white/20 text-white ring-1 ring-inset ring-white/50"
                : "bg-white text-[var(--foreground)] hover:bg-white/90"
            }`}
          >
            {isFollowed ? "กำลังติดตาม" : "ติดตาม"}
          </button>
        </div>

        <p className="text-[13px] font-medium leading-snug text-white/95 drop-shadow min-[1025px]:text-[10px]">
          {clip.caption}
        </p>

        <p className="flex flex-wrap gap-x-2 text-[11px] font-semibold text-white/75 min-[1025px]:gap-x-1.5 min-[1025px]:text-[9px]">
          {clip.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </p>
      </div>
    </article>
  );
}

function ActionRail({
  clip,
  isLiked,
  isSaved,
  isFollowed,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
}: {
  clip: PuntokClip;
  isLiked: boolean;
  isSaved: boolean;
  isFollowed: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onToggleFollow: () => void;
}) {
  return (
    <div className="absolute bottom-4 right-2.5 z-10 flex flex-col items-center gap-4 min-[1025px]:bottom-3 min-[1025px]:right-2 min-[1025px]:gap-2">
      <div className="relative pb-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={clip.creatorAvatar}
          alt=""
          className="h-11 w-11 rounded-full border-2 border-white object-cover min-[1025px]:h-8 min-[1025px]:w-8"
        />
        {/* The badge is the follow control, mirroring the pill in the caption —
            both write the same state, so following from either lights up the
            other. It disappears once followed rather than turning into a tick:
            a badge left on someone you already follow reads as an action still
            waiting to be taken. */}
        {!isFollowed && (
          <button
            type="button"
            onClick={onToggleFollow}
            aria-label={`ติดตาม ${clip.creatorName}`}
            className="absolute -bottom-0.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--color-accent-orange)] text-white ring-2 ring-black/10 transition hover:brightness-105 min-[1025px]:h-4 min-[1025px]:w-4"
          >
            <Plus className="h-3 w-3 min-[1025px]:h-2.5 min-[1025px]:w-2.5" strokeWidth={3} />
          </button>
        )}
      </div>

      <RailButton
        label={isLiked ? "เลิกถูกใจ" : "ถูกใจ"}
        count={clip.likes}
        onClick={onToggleLike}
        pressed={isLiked}
      >
        <Heart
          className={`${RAIL_ICON} ${isLiked ? "text-[#ff3b5c]" : ""}`}
          strokeWidth={1.8}
          fill={isLiked ? "currentColor" : "none"}
        />
      </RailButton>

      <RailButton label="ความคิดเห็น" count={clip.comments}>
        <MessageCircle className={RAIL_ICON} strokeWidth={1.8} />
      </RailButton>

      <RailButton
        label={isSaved ? "เอาออกจากที่บันทึก" : "บันทึกไว้ดูทีหลัง"}
        count={clip.saves}
        onClick={onToggleSave}
        pressed={isSaved}
      >
        <Bookmark
          className={`${RAIL_ICON} ${isSaved ? "text-[var(--color-accent-lime)]" : ""}`}
          strokeWidth={1.8}
          fill={isSaved ? "currentColor" : "none"}
        />
      </RailButton>

      <RailButton label="แชร์" count={clip.shares}>
        <Share2 className={RAIL_ICON} strokeWidth={1.8} />
      </RailButton>

      {/* The clip's plan, as the rail's last stop — the one thing on this
          screen that leads back into the rest of the app. Rendered only when
          the post has a plan behind it, rather than as a tile that goes
          nowhere. */}
      {clip.tripHref && (
        <Link
          href={clip.tripHref}
          aria-label="ดูแพลนทริป"
          className="h-10 w-10 overflow-hidden rounded-xl border-2 border-white/80 min-[1025px]:h-8 min-[1025px]:w-8"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={clip.imageUrl} alt="" className="h-full w-full object-cover" />
        </Link>
      )}
    </div>
  );
}

// Sized in classes rather than lucide's `size` prop so the glyph can shrink at
// the desktop breakpoint, where the card is a third of a phone's width and a
// 26px icon covers most of it.
const RAIL_ICON = "h-[26px] w-[26px] min-[1025px]:h-[17px] min-[1025px]:w-[17px]";

function RailButton({
  label,
  count,
  onClick,
  pressed,
  children,
}: {
  label: string;
  count: string;
  onClick?: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={onClick ? pressed : undefined}
      // Comments and share have no surface behind them yet, so they keep the
      // shape but sit inert rather than pretending to be a target.
      disabled={!onClick}
      className="flex flex-col items-center gap-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition active:scale-90 disabled:active:scale-100 min-[1025px]:gap-0.5"
    >
      {/* The design gives each glyph its own translucent disc on desktop, where
          the card is small and the icons would otherwise sit directly on busy
          photography. The phone layout leaves them bare. */}
      <span className="flex items-center justify-center min-[1025px]:h-8 min-[1025px]:w-8 min-[1025px]:rounded-full min-[1025px]:bg-black/30 min-[1025px]:backdrop-blur-sm">
        {children}
      </span>
      <span className="text-[11px] font-semibold leading-none min-[1025px]:text-[9px]">
        {count}
      </span>
    </button>
  );
}

function EmptyFollowing({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="text-sm font-bold text-white min-[1025px]:text-[var(--foreground)]">
        ยังไม่ได้ติดตามใครเลย
      </p>
      <p className="text-xs text-white/70 min-[1025px]:text-[var(--color-muted)]">
        กดติดตามครีเอเตอร์ที่ชอบ แล้วคลิปของเขาจะมาอยู่ตรงนี้
      </p>
      <button
        type="button"
        onClick={onBrowse}
        className="mt-1 rounded-full bg-[var(--color-accent-lime)] px-4 py-2 text-xs font-bold text-[var(--foreground)]"
      >
        ดูคลิปแนะนำ
      </button>
    </div>
  );
}
