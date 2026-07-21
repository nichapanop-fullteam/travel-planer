import Link from "next/link";
import {
  Clock,
  Compass,
  Crown,
  Globe2,
  Heart,
  MapIcon,
  Megaphone,
  Navigation,
  SlidersHorizontal,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { ConsumerShell } from "@/components/consumer/ConsumerShell";
import { FeedGrid } from "@/components/consumer/FeedGrid";
import { mockFeedTrips } from "@/lib/feed-data";

// Public discovery home — replaces the old organizer trip list.
// Reference: Pluno App UI design (consumer/social side), adapted to a web layout.
export default function DashboardPage() {
  return (
    <ConsumerShell active="home">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <HeroBanner />
          <InspirationMapCard />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-8">
            <FeedGrid trips={mockFeedTrips} />
            <TopCreatorsRow />
          </div>
          <div className="flex flex-col gap-6">
            <WhyPlunoCard />
            <RevenueModelCard />
          </div>
        </div>

        <StatsBar />
      </div>
    </ConsumerShell>
  );
}

function HeroBanner() {
  return (
    <div className="relative flex min-h-[280px] flex-col justify-center overflow-hidden rounded-3xl p-8 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=80"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      <div className="relative max-w-md">
        <h1 className="text-3xl font-extrabold leading-tight">
          วางแผนการเดินทาง
          <br />
          แบ่งปันประสบการณ์
          <br />
          <span style={{ color: "var(--color-secondary-green)" }}>ไปได้ไกลกว่าเดิม</span>
        </h1>
        <p className="mt-3 text-sm text-white/85">
          ค้นหาแผนเที่ยวจากนักเดินทางจริง และสร้างการเดินทางในแบบของคุณ
        </p>
        <Link
          href="#"
          className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Compass size={16} />
          ค้นหาแผนเที่ยว
        </Link>
      </div>
      <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2">
        <span className="text-xs font-medium text-[var(--foreground)]">
          นักเดินทางกว่า <strong>50K+</strong> คน ไว้วางใจ Pluno
        </span>
      </div>
    </div>
  );
}

function InspirationMapCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border)]/40 bg-white">
      <p className="px-4 pt-4 text-sm font-bold">ค้นหาแรงบันดาลใจใกล้คุณ</p>
      <div
        className="relative m-4 mt-3 flex-1 overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(140deg, #c8dfca 0%, #b4cec4 45%, #c2d5ce 100%)", minHeight: 160 }}
      >
        {[
          { x: "30%", y: "30%" },
          { x: "60%", y: "20%" },
          { x: "45%", y: "60%" },
          { x: "75%", y: "55%" },
        ].map((pin, i) => (
          <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pin.x, top: pin.y }}>
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 0 0 4px rgba(42,158,100,0.25)" }}
            >
              <Navigation size={10} className="text-white" />
            </div>
          </div>
        ))}
        <button className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow">
          <MapIcon size={12} style={{ color: "var(--color-primary)" }} />
          ดูในแผนที่
        </button>
      </div>
    </div>
  );
}

function WhyPlunoCard() {
  const items = [
    { icon: Clock, title: "ประหยัดเวลา", desc: "ไม่ต้องเริ่มวางแผนจากศูนย์" },
    { icon: Users, title: "แผนจากประสบการณ์จริง", desc: "เชื่อถือได้ อัปเดตล่าสุด" },
    { icon: SlidersHorizontal, title: "ปรับแต่งได้ตามสไตล์คุณ", desc: "เวลา งบ สถานที่ ครบในที่เดียว" },
    { icon: Heart, title: "ชุมชนที่แบ่งปัน", desc: "ได้ไอเดียใหม่ๆ ไม่รู้จบ" },
  ];
  return (
    <div className="rounded-3xl border border-[var(--color-border)]/40 bg-white p-5">
      <h3 className="text-sm font-bold">Why Pluno?</h3>
      <div className="mt-4 flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <item.icon size={18} style={{ color: "var(--color-primary)" }} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-[var(--color-muted)]">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueModelCard() {
  const items = [
    { icon: Crown, label: "Premium Subscription" },
    { icon: Ticket, label: "Affiliate Booking" },
    { icon: Megaphone, label: "Sponsored Trips" },
  ];
  return (
    <div className="rounded-3xl border border-[var(--color-border)]/40 bg-white p-5">
      <h3 className="text-sm font-bold">รายได้ของเรา (Revenue Model)</h3>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
              <item.icon size={16} style={{ color: "var(--color-primary)" }} />
            </div>
            <span className="text-[10px] leading-tight text-[var(--color-muted)]">{item.label}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-orange)]/15">
            <span className="text-[10px] font-extrabold" style={{ color: "var(--color-accent-orange)" }}>
              AD
            </span>
          </div>
          <span className="text-[10px] leading-tight text-[var(--color-muted)]">Ads</span>
        </div>
      </div>
    </div>
  );
}

function TopCreatorsRow() {
  const creators = [
    { name: "TravelWithMay", followers: "12.5K", avatar: "🧳" },
    { name: "BackpackStory", followers: "8.7K", avatar: "🎒" },
    { name: "WanderMore", followers: "6.3K", avatar: "🗺️" },
    { name: "TripwithDream", followers: "5.1K", avatar: "✈️" },
    { name: "Journey.plans", followers: "4.2K", avatar: "📸" },
  ];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">นักสร้างสรรค์ยอดนิยม</h2>
        <span className="text-xs text-[var(--color-muted)]">ดูทั้งหมด →</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {creators.map((c) => (
          <div
            key={c.name}
            className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-[var(--color-border)]/40 bg-white px-3 py-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)] text-lg">
              {c.avatar}
            </span>
            <div>
              <p className="text-xs font-semibold">{c.name}</p>
              <p className="text-[11px] text-[var(--color-muted)]">ผู้ติดตาม {c.followers}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsBar() {
  const stats = [
    { icon: MapIcon, value: "10K+", label: "แผนเที่ยว" },
    { icon: Users, value: "50K+", label: "นักเดินทาง" },
    { icon: Globe2, value: "150+", label: "ประเทศ" },
    { icon: Star, value: "4.8", label: "คะแนนเฉลี่ย" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 rounded-3xl border border-[var(--color-border)]/40 bg-white p-5 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-2.5">
          <s.icon size={18} style={{ color: "var(--color-primary)" }} />
          <div>
            <p className="text-sm font-bold">{s.value}</p>
            <p className="text-[11px] text-[var(--color-muted)]">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
