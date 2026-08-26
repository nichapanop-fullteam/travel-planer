"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPin, Sparkles, SlidersHorizontal, Hand } from "lucide-react";
import { RecommendDestinationCard } from "@/components/consumer/RecommendDestinationCard";
import { CreatorPlanCard } from "@/components/consumer/CreatorPlanCard";
import { PlaceCard } from "@/components/consumer/PlaceCard";
import { destinationGuides, findDestinationGuide, type DestinationGuide } from "@/lib/discovery-content";

export default function DiscoveryPage() {
  return (
    <Suspense fallback={null}>
      <DiscoveryResults />
    </Suspense>
  );
}

function DiscoveryResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const guide = findDestinationGuide(query);

  if (!guide) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/search-empty-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative flex max-w-md flex-col items-center gap-4 rounded-3xl bg-white/90 p-8 shadow-lg backdrop-blur-sm">
          <p className="text-lg font-bold">ยังไม่มีข้อมูลสำหรับ &ldquo;{query}&rdquo;</p>
          <p className="text-sm text-[var(--color-muted)]">
            ตอนนี้ระบบรองรับตัวอย่างการค้นหา: {destinationGuides.map((g) => g.name).join(" · ")}
          </p>
          <Link
            href="/main"
            className="rounded-full px-6 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <DiscoveryHero destinationName={guide.name} />

      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-10 sm:px-10">
        <div>
          <h1 className="text-2xl font-bold">Discovery</h1>
          <div className="mt-4 h-px bg-[var(--color-border)]/40" />
        </div>

        <DestinationFilterSection guide={guide} />

        <RecommendedTripsSection guide={guide} />

        <CreatorPlansSection guide={guide} />
      </div>
    </div>
  );
}

function DiscoveryHero({ destinationName }: { destinationName: string }) {
  const router = useRouter();

  function goToCreateTrip(mode: "ai" | "self") {
    router.push(`/create-trip?destination=${encodeURIComponent(destinationName)}&mode=${mode}`);
  }

  return (
    <div className="relative flex min-h-[280px] flex-col items-center justify-center gap-5 overflow-hidden px-6 pb-8 pt-16 text-center sm:pt-20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-mountain.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/45" />

      <Link
        href="/main"
        className="absolute left-6 top-6 flex items-center gap-1.5 text-sm font-medium text-white drop-shadow-sm sm:left-10 sm:top-8"
      >
        <ArrowLeft size={16} />
        ย้อนกลับ
      </Link>

      <h1 className="relative text-2xl font-extrabold text-white drop-shadow-sm sm:text-3xl">
        เริ่มสร้างทริปของคุณ
      </h1>

      <div className="relative flex w-full max-w-xl items-center gap-3 rounded-full bg-white px-5 py-3 shadow-lg">
        <MapPin size={18} className="shrink-0" style={{ color: "var(--color-brand-green)" }} />
        <span className="text-sm font-semibold text-[var(--foreground)]">{destinationName}</span>
      </div>

      <div className="relative grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => goToCreateTrip("ai")}
          className="flex items-center gap-3 rounded-2xl p-4 text-left text-white shadow-md transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--color-brand-green)" }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              PunGuide จัดแพลนให้
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{ backgroundColor: "var(--color-accent-orange)" }}
              >
                AI
              </span>
            </p>
            <p className="text-xs text-white/80">ร่างแพลนทั้งทริปใน ~40 วินาที แก้ไขทุกจุด</p>
          </div>
          <ArrowRight size={16} className="shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => goToCreateTrip("self")}
          className="flex items-center gap-3 rounded-2xl bg-white/85 p-4 text-left shadow-md backdrop-blur-sm transition-transform hover:-translate-y-0.5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-sel-bg)]">
            <Hand size={18} style={{ color: "var(--color-brand-green)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">สร้างแพลนเอง</p>
            <p className="text-xs text-[var(--color-muted)]">สร้างแพลนเองทุกจุด</p>
          </div>
          <ArrowRight size={16} className="shrink-0" style={{ color: "var(--color-brand-green)" }} />
        </button>
      </div>
    </div>
  );
}

function DestinationFilterSection({
  guide,
}: {
  guide: DestinationGuide;
}) {
  const [activeFilter, setActiveFilter] = useState("ทั้งหมด");
  const filters = ["ทั้งหมด", ...guide.filters];
  const visiblePlaces =
    activeFilter === "ทั้งหมด"
      ? guide.popularPlaces
      : guide.popularPlaces.filter((p) => p.tags.includes(activeFilter));

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">{guide.name}</h2>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-brand-green)" }}
          >
            {guide.badge}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                style={
                  activeFilter === filter
                    ? { backgroundColor: "var(--color-accent-orange)", color: "#fff" }
                    : { border: "1px solid var(--color-border-tag)", color: "var(--foreground)" }
                }
              >
                {filter}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)]/50 px-4 py-2 text-sm font-medium"
          >
            <SlidersHorizontal size={14} />
            สไตล์การเที่ยว
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold">สถานที่ยอดนิยม</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {visiblePlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecommendedTripsSection({ guide }: { guide: DestinationGuide }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold sm:text-xl">ทริปแนะนำ</h2>
        <Link href="#" className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
          ดูทั้งหมด →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {guide.recommendedTrips.map((trip) => (
          <RecommendDestinationCard key={trip.id} dest={trip} />
        ))}
      </div>
    </section>
  );
}

function CreatorPlansSection({ guide }: { guide: DestinationGuide }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold sm:text-xl">Plan From Top Creators</h2>
        <Link href="#" className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
          ดูทั้งหมด →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {guide.creatorPlans.map((plan) => (
          <CreatorPlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  );
}
