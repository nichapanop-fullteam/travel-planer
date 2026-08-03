"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Link2, MapPin, Shuffle, Sparkles, Users } from "lucide-react";
import { HomeNavbar } from "@/components/consumer/HomeNavbar";
import { BookingBar } from "@/components/consumer/BookingBar";
import { RecommendDestinationCard } from "@/components/consumer/RecommendDestinationCard";
import { CreatorPlanCard } from "@/components/consumer/CreatorPlanCard";
import { creatorPlans, recommendDestinations, topDestinations } from "@/lib/home-content";
import { findDestinationGuide } from "@/lib/discovery-content";

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
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [searchError, setSearchError] = useState(false);

  function handleSearch() {
    const guide = findDestinationGuide(destination);
    if (guide) {
      router.push(`/discovery?q=${encodeURIComponent(destination.trim())}`);
      return;
    }
    setSearchError(true);
  }

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

      <div className="relative flex flex-col items-center gap-6">
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight text-white drop-shadow-sm sm:text-4xl">
          วางแผนสร้างทริปเที่ยวง่ายๆ
          <br />
          ไม่ต้องเริ่มจากศูนย์
        </h1>

        <BookingBar
          fields={[
            {
              icon: MapPin,
              label: "Destination",
              placeholder: "City, country",
              value: destination,
              onChange: (v) => {
                setDestination(v);
                if (searchError) setSearchError(false);
              },
              hasError: searchError,
            },
            { icon: CalendarDays, label: "Date", placeholder: "วันเดินทางไป - วันกลับ", disabled: true },
            { icon: Users, label: "Guest", placeholder: "ประเภท และจำนวนคน", disabled: true },
          ]}
          onSearch={handleSearch}
        />
        {searchError && (
          <p className="text-sm font-medium text-white drop-shadow-sm">
            ยังไม่มีข้อมูลปลายทางนี้ — ลองค้นหา &ldquo;หลวงพระบาง, ลาว&rdquo; ดูก่อนได้เลย
          </p>
        )}
      </div>
    </div>
  );
}

function ActionCards() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-center text-xl font-bold" style={{ color: "var(--color-brand-green)" }}>
        Recommend Feature
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/create-trip"
          className="flex items-center gap-4 rounded-2xl p-5 text-white shadow-md transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--color-deep-green)" }}
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
            <Sparkles size={20} style={{ color: "var(--color-brand-green)" }} />
            <span
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: "var(--color-brand-green)" }}
            >
              AI
            </span>
          </div>
          <div>
            <p className="text-sm font-bold">Pluno สร้างแพลนทริปให้</p>
            <p className="text-xs text-white/80">จัดทริปไม่ต้องเริ่มจากศูนย์ ให้ pluno จัดการทริปให้</p>
          </div>
        </Link>

        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
            <Shuffle size={20} style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <p className="text-sm font-bold">Remix ทริป</p>
            <p className="text-xs text-[var(--color-muted)]">ต่อยอดทริปจากแพลนของครีเอเตอร์และคอมมูนิตี้</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
            <Link2 size={20} style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <p className="text-sm font-bold">นำแพลนเข้าจากลิงก์</p>
            <p className="text-xs text-[var(--color-muted)]">สรุปแพลนสถานที่จาก IG / TikTok / Facebook</p>
          </div>
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

function RecommendDestinationSection() {
  return (
    <section>
      <SectionHeader title="Recommend Destination" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recommendDestinations.map((dest) => (
          <RecommendDestinationCard key={dest.id} dest={dest} />
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
          <CreatorPlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  );
}
