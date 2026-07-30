import Link from "next/link";
import { Bookmark, Landmark, Link2, Moon, Search, Shuffle, Sparkles, Star } from "lucide-react";
import { HomeNavbar } from "@/components/consumer/HomeNavbar";
import { creatorPlans, recommendDestinations, topDestinations } from "@/lib/home-content";
import { formatTHB } from "@/lib/trip-utils";

// Public discovery home — redesigned per Pluno Guide UI reference.
// Uses its own top navbar (HomeNavbar) instead of the shared ConsumerShell
// sidebar layout used by trip-detail/plan/share.
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Hero />

      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-10 sm:px-10">
        <ActionCards />
        <RecommendDestinationSection />
        <TopDestinationSection />
        <PlanFromTopCreatorsSection />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden px-6 text-center sm:min-h-[480px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-mountain.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/40" />

      <HomeNavbar />

      <div className="relative flex max-w-2xl flex-col items-center gap-3">
        <h1 className="text-3xl font-extrabold leading-tight text-white drop-shadow-sm sm:text-4xl">
          ยังไม่มีแพลนทริป ?
          <br />
          ให้ Pluno ช่วยจัดเลย
        </h1>
        <p className="text-sm text-white/90 sm:text-base">
          สร้างแพลนเที่ยวทั้งทริปในไม่กี่นาที ปรับเองได้ตามใจคุณทุกจุด
        </p>

        <div className="mt-4 flex w-full max-w-xl items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-5 py-3 shadow-lg">
            <Search size={18} className="shrink-0" style={{ color: "var(--color-accent-orange)" }} />
            <input
              type="text"
              placeholder="ค้นหาทริป หรือสถานที่เที่ยว.."
              disabled
              className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--color-muted)] focus:outline-none"
            />
          </div>
          <button
            className="shrink-0 rounded-full px-7 py-3 text-sm font-semibold text-white shadow-lg"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            ค้นหา
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Link
        href="/create-trip"
        className="relative flex items-center gap-4 rounded-2xl p-5 text-white shadow-md transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: "var(--color-deep-green)" }}
      >
        <span
          className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow"
          style={{ backgroundColor: "var(--color-accent-orange)" }}
        >
          <Sparkles size={12} />
          Pluno AI
        </span>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Sparkles size={20} />
        </div>
        <div>
          <p className="text-sm font-bold">สร้างทริปใหม่</p>
          <p className="text-xs text-white/80">ไม่ต้องเริ่มจากศูนย์ ให้ Pluno สร้างให้</p>
        </div>
      </Link>

      <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
          <Shuffle size={20} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <p className="text-sm font-bold">Remix ทริป</p>
          <p className="text-xs text-[var(--color-muted)]">ต่อยอดทริปจากแผนในคอมมูนิตี้</p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
          <Link2 size={20} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <p className="text-sm font-bold">นำเข้าจากลิงก์</p>
          <p className="text-xs text-[var(--color-muted)]">วางลิงก์ IG / TikTok / Facebook</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
      <Link href="#" className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
        ดูทั้งหมด →
      </Link>
    </div>
  );
}

const RECOMMEND_TAG_ICONS = [Sparkles, Moon, Landmark];

function RecommendDestinationSection() {
  return (
    <section>
      <SectionHeader title="Recommend Destination" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recommendDestinations.map((dest) => (
          <div
            key={dest.id}
            className="overflow-hidden rounded-3xl border border-[var(--color-border)]/30 bg-white shadow-sm"
          >
            <div className="aspect-[16/10] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dest.imageUrl} alt={dest.title} className="h-full w-full object-cover" />
            </div>
            <div className="relative -mt-6 flex flex-col gap-2 bg-white p-4 shadow-[0_-6px_12px_-6px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-bold">{dest.title}</p>
              <p className="truncate text-xs text-[var(--color-muted)]">{dest.subtitle}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {dest.tags.map((tag, i) => {
                  const Icon = RECOMMEND_TAG_ICONS[i % RECOMMEND_TAG_ICONS.length];
                  return (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full border border-[var(--color-border)]/50 px-2 py-0.5 text-xs text-[var(--color-muted)]"
                    >
                      <Icon size={12} style={{ color: "var(--color-primary)" }} />
                      {tag}
                    </span>
                  );
                })}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 font-semibold text-[var(--color-accent-orange)]">
                    <Star size={13} fill="currentColor" />
                    {dest.rating}
                  </span>
                  <span className="flex items-center gap-1 text-[var(--color-muted)]">
                    <Bookmark size={13} />
                    {dest.saves}
                  </span>
                </div>
                <span className="font-bold" style={{ color: "var(--color-primary)" }}>
                  {formatTHB(dest.priceFrom)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopDestinationSection() {
  return (
    <section>
      <SectionHeader title="TOP Destination" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {topDestinations.map((dest) => (
          <div key={dest.id} className="relative aspect-[16/7] overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dest.imageUrl} alt={dest.label} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <p className="absolute bottom-4 left-4 text-lg font-bold text-white">{dest.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanFromTopCreatorsSection() {
  return (
    <section>
      <SectionHeader title="Plan From Top Creators" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {creatorPlans.map((plan) => (
          <div key={plan.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={plan.imageUrl} alt={plan.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/30 py-1 pl-1 pr-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm">
                {plan.creatorAvatar}
              </span>
              <span className="text-xs font-medium text-white">{plan.creatorName}</span>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3.5">
              <p className="text-sm font-bold leading-snug text-white">{plan.title}</p>
              <div className="flex items-center gap-3 text-xs text-white/90">
                <span>♥ {plan.likes}</span>
                <span>💬 {plan.comments}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
