"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronLeft,
  Compass,
  Coffee,
  Landmark,
  Link2,
  Mountain,
  Moon,
  Palmtree,
  Paperclip,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Ticket,
  TreePine,
  Users,
  UtensilsCrossed,
  MapPin,
} from "lucide-react";
import { BookingBar } from "@/components/consumer/BookingBar";
import { DatePickerDialog } from "@/components/consumer/DatePickerDialog";
import { DestinationPickerDialog } from "@/components/consumer/DestinationPickerDialog";
import { buildGuestsLabel, GuestPickerDialog } from "@/components/consumer/GuestPickerDialog";
import { RecommendedPlacesStep, type SelectedRecommendation } from "@/components/consumer/RecommendedPlacesStep";
import { Divider } from "@/components/ui/Divider";
import { getLastCreateTripSearch, saveLastCreateTripSearch } from "@/lib/create-trip-search";
import { DEFAULT_RECOMMENDATION_CENTER, type RecommendedPlace } from "@/lib/place-recommendations";
import { saveTripDraft } from "@/lib/trip-drafts";
import { generateTripFromDraft, saveGeneratedTrip } from "@/lib/generated-trips";
import type {
  Activity,
  ActivityCategory,
  Destination,
  GeneratedTrip,
  PlaceCategory,
  TripCreationMode,
  TripDraft,
} from "@/types";

const PLACE_TO_ACTIVITY_CATEGORY: Record<PlaceCategory, ActivityCategory> = {
  hotel: "hotel",
  restaurant: "food",
  attraction: "sightseeing",
};

interface StyleOption {
  tag: string;
  icon: LucideIcon | null;
}

const STYLE_OPTIONS: StyleOption[] = [
  { tag: "ทะเล", icon: Palmtree },
  { tag: "ภูเขา", icon: Mountain },
  { tag: "ธรรมชาติ", icon: TreePine },
  { tag: "วัฒนธรรม", icon: Landmark },
  { tag: "อาหาร", icon: UtensilsCrossed },
  { tag: "คาเฟ่", icon: Coffee },
  { tag: "ไนท์ไลฟ์", icon: Moon },
  { tag: "ช้อปปิ้ง", icon: ShoppingBag },
  { tag: "ผจญภัย", icon: Compass },
];

const MORE_STYLE_OPTIONS: StyleOption[] = [
  { tag: "เมือง", icon: Building2 },
  { tag: "ประวัติศาสตร์", icon: null },
  { tag: "ถ่ายรูป", icon: null },
  { tag: "สปา / พักผ่อน", icon: null },
  { tag: "กีฬา / outdoor", icon: null },
];

const PACE_OPTIONS = ["Slow Life", "Chill", "Balance", "Active", "Hardcore"];

const BUDGET_OPTIONS = [
  { key: "Economy", label: "Economy", value: "<1,000฿" },
  { key: "Comfort", label: "Comfort", value: "฿1,000 - ฿5,000" },
  { key: "Premium", label: "Premium", value: "฿5,000 - ฿10,000" },
  { key: "Luxury", label: "Luxury", value: "฿10,000+" },
];

const HOTEL_STYLE_OPTIONS = ["บูทีค", "รีสอร์ท", "โรงแรมทั่วไป", "โฮมสเตย์", "วิลล่า", "โฮสเทล"];
const MORE_HOTEL_STYLE_OPTIONS = ["อพาร์ทเมนท์", "แคมป์ปิ้ง / กลางแจ้ง"];
const HOTEL_GRADE_OPTIONS = ["1★", "2★", "3★", "4★", "5★"];
const MORE_HOTEL_GRADE_OPTIONS = ["ไม่ระบุ", "หรูหราพิเศษ"];

const COND_OPTIONS = ["มีผู้สูงอายุ", "มีรถส่วนตัว", "เดินเยอะไม่ได้", "มีเด็กเล็ก", "ผู้ใช้รถเข็น"];
const MORE_COND_OPTIONS = ["มังสวิรัติ", "ฮาลาล", "แพ้อาหารทะเล", "ไม่ขึ้นที่สูง", "งบจำกัดเข้ม", "เดินทางคนเดียว"];

export default function CreateTripPage() {
  return (
    <Suspense fallback={null}>
      <CreateTripForm />
    </Suspense>
  );
}

function CreateTripForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const destinationParam = searchParams.get("destination") ?? "";
  // Coming from the Luang Prabang search/discovery page — prefill the whole
  // form with the reference preferences instead of leaving it blank.
  const prefillDefaults = destinationParam.includes("หลวงพระบาง");

  const [mode, setMode] = useState<TripCreationMode>(
    searchParams.get("mode") === "self" ? "self" : "ai"
  );
  const [destination, setDestination] = useState(destinationParam);
  const [destinationPlace, setDestinationPlace] = useState<Destination | undefined>(undefined);
  const [duration, setDuration] = useState(prefillDefaults ? "3 วัน 2 คืน" : "");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [guests, setGuests] = useState(prefillDefaults ? buildGuestsLabel(1, 0) : "");

  const [extraStyles, setExtraStyles] = useState<StyleOption[]>([]);
  const [styles, setStyles] = useState<string[]>(
    prefillDefaults ? ["วัฒนธรรม", "อาหาร", "ไนท์ไลฟ์"] : []
  );
  const [pace, setPace] = useState<string | null>(prefillDefaults ? "Chill" : null);
  const [budget, setBudget] = useState<string | null>(prefillDefaults ? "Premium" : null);
  const [customBudget, setCustomBudget] = useState("");
  const [extraConds, setExtraConds] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>(
    prefillDefaults ? ["มีรถส่วนตัว", "เดินเยอะไม่ได้"] : []
  );

  const [accommodationStatus, setAccommodationStatus] = useState<"booked" | "unbooked" | null>(null);
  const [bookingFileName, setBookingFileName] = useState<string | null>(null);
  const [bookingLink, setBookingLink] = useState("");
  const [accommodationName, setAccommodationName] = useState("");
  const [extraHotelStyles, setExtraHotelStyles] = useState<string[]>([]);
  const [hotelStyles, setHotelStyles] = useState<string[]>([]);
  const [hotelStyleRecommend, setHotelStyleRecommend] = useState(false);
  const [extraHotelGrades, setExtraHotelGrades] = useState<string[]>([]);
  const [hotelGrades, setHotelGrades] = useState<string[]>([]);
  const [hotelGradeRecommend, setHotelGradeRecommend] = useState(false);
  const [accommodationNote, setAccommodationNote] = useState("");

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRecommendations, setSelectedRecommendations] = useState<SelectedRecommendation[]>([]);

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [destDialogOpen, setDestDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [hasHydratedSearch, setHasHydratedSearch] = useState(false);

  const customBudgetInputRef = useRef<HTMLInputElement>(null);
  const bookingFileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  // Prefill the Destination/Date/Guest bar from the last search the user ran
  // on this page, unless a deep link (destinationParam) already specifies one.
  useEffect(() => {
    if (!destinationParam) {
      const last = getLastCreateTripSearch();
      if (last) {
        setDestination(last.destination);
        setDestinationPlace(last.destinationPlace);
        setDuration(last.duration);
        setGuests(last.guests);
        setAdults(last.adults);
        setChildren(last.children);
      }
    }
    setHasHydratedSearch(true);
    // Only ever run on mount — this is a one-time hydration from storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasHydratedSearch) return;
    saveLastCreateTripSearch({ destination, destinationPlace, duration, guests, adults, children });
  }, [hasHydratedSearch, destination, destinationPlace, duration, guests, adults, children]);

  const allStyleOptions = [...STYLE_OPTIONS, ...extraStyles];
  const remainingStyleOptions = MORE_STYLE_OPTIONS.filter(
    (o) => !extraStyles.some((e) => e.tag === o.tag)
  );
  const allCondOptions = [...COND_OPTIONS, ...extraConds];
  const remainingCondOptions = MORE_COND_OPTIONS.filter((o) => !extraConds.includes(o));

  const allHotelStyleOptions = [...HOTEL_STYLE_OPTIONS, ...extraHotelStyles];
  const remainingHotelStyleOptions = MORE_HOTEL_STYLE_OPTIONS.filter((o) => !extraHotelStyles.includes(o));
  const allHotelGradeOptions = [...HOTEL_GRADE_OPTIONS, ...extraHotelGrades];
  const remainingHotelGradeOptions = MORE_HOTEL_GRADE_OPTIONS.filter((o) => !extraHotelGrades.includes(o));

  function toggleStyle(tag: string) {
    setStyles((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleCondition(tag: string) {
    setConditions((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleHotelStyle(tag: string) {
    setHotelStyles((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleHotelGrade(tag: string) {
    setHotelGrades((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function handleDestinationChange(value: string) {
    setDestination(value);
    if (status === "error" && value.trim()) setStatus("idle");
  }

  function selectBudget(key: string) {
    setBudget((prev) => (prev === key ? null : key));
  }

  function selectCustomBudget() {
    setBudget("custom");
    customBudgetInputRef.current?.focus();
  }

  function toggleRecommendation(place: RecommendedPlace, category: PlaceCategory) {
    setSelectedRecommendations((prev) =>
      prev.some((s) => s.place.googlePlaceId === place.googlePlaceId)
        ? prev.filter((s) => s.place.googlePlaceId !== place.googlePlaceId)
        : [...prev, { place, category }]
    );
  }

  // Appends whatever the user picked on the recommended-places step as
  // extra day-1 activities — generateTripFromDraft only knows about the
  // draft's preferences, not this selection, so it's merged in afterward.
  function withSelectedRecommendations(trip: GeneratedTrip): GeneratedTrip {
    if (selectedRecommendations.length === 0 || trip.days.length === 0) return trip;

    const firstDay = trip.days[0];
    const startingCount = firstDay.activities.length;
    const extraActivities: Activity[] = selectedRecommendations.map(({ place, category }, i) => ({
      id: crypto.randomUUID(),
      time: `${String(Math.min(9 + startingCount + i, 22)).padStart(2, "0")}:00`,
      title: place.name,
      category: PLACE_TO_ACTIVITY_CATEGORY[category],
      location: {
        name: place.name,
        lat: place.latitude,
        lng: place.longitude,
        rating: place.rating,
        imageUrl: place.imageUrl,
        googlePlaceId: place.googlePlaceId,
      },
      cost: 0,
    }));

    return {
      ...trip,
      days: [{ ...firstDay, activities: [...firstDay.activities, ...extraActivities] }, ...trip.days.slice(1)],
    };
  }

  function submit(isSkip: boolean) {
    if (!destination.trim()) {
      setStatus("error");
      return;
    }

    // The primary button on step 1 moves to the recommended-places step
    // instead of generating right away — generation happens from step 2.
    if (!isSkip && step === 1) {
      setStep(2);
      return;
    }

    // `disabled={status === "loading"}` alone can't stop a fast double-click:
    // both clicks read the same pre-render `status` closure, so the button
    // isn't disabled yet when the second one fires. Guard with a ref, which
    // updates synchronously, so the trip only ever gets saved once.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const finalStyles = isSkip ? [] : styles;
    const finalPace = isSkip ? null : pace;
    const finalBudget = isSkip ? null : budget;
    const finalCustomBudget = isSkip ? "" : customBudget;
    const finalConditions = isSkip ? [] : conditions;
    const finalAccommodation: TripDraft["accommodation"] =
      !isSkip && accommodationStatus
        ? accommodationStatus === "booked"
          ? {
              status: "booked",
              booked: {
                attachmentName: bookingFileName ?? undefined,
                bookingLink: bookingLink.trim(),
                hotelName: accommodationName.trim(),
              },
            }
          : {
              status: "unbooked",
              unbooked: {
                styles: hotelStyles,
                styleRecommend: hotelStyleRecommend,
                grades: hotelGrades,
                gradeRecommend: hotelGradeRecommend,
                note: accommodationNote.trim(),
              },
            }
        : undefined;

    if (isSkip) {
      setStyles([]);
      setPace(null);
      setBudget(null);
      setCustomBudget("");
      setConditions([]);
      setAccommodationStatus(null);
      setBookingFileName(null);
      setBookingLink("");
      setAccommodationName("");
      setHotelStyles([]);
      setHotelStyleRecommend(false);
      setHotelGrades([]);
      setHotelGradeRecommend(false);
      setAccommodationNote("");
    }

    setStatus("loading");
    window.setTimeout(() => {
      const draft: TripDraft = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        mode,
        destination: destination.trim(),
        destinationPlace,
        duration: duration.trim(),
        guests: guests.trim(),
        styles: finalStyles,
        pace: finalPace,
        budget: finalBudget,
        customBudget: finalCustomBudget,
        conditions: finalConditions,
        accommodation: finalAccommodation,
      };
      saveTripDraft(draft);
      const generatedTrip = withSelectedRecommendations(generateTripFromDraft(draft));
      saveGeneratedTrip(generatedTrip);
      router.push(`/generated-plan/${generatedTrip.id}`);
    }, 1200);
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-10" style={{ backgroundColor: "var(--color-page-cream)" }}>
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-xl">
        <Hero
          destination={destination}
          onDestinationFieldClick={() => setDestDialogOpen(true)}
          duration={duration}
          onDurationChange={setDuration}
          onDateFieldClick={() => setDateDialogOpen(true)}
          guests={guests}
          onGuestsChange={setGuests}
          onGuestFieldClick={() => setGuestDialogOpen(true)}
          destinationHasError={status === "error"}
        />

        <DestinationPickerDialog
          isOpen={destDialogOpen}
          onClose={() => setDestDialogOpen(false)}
          onConfirm={(result) => {
            handleDestinationChange(result.label);
            setDestinationPlace(result.destination);
            setDestDialogOpen(false);
          }}
        />

        <DatePickerDialog
          isOpen={dateDialogOpen}
          onClose={() => setDateDialogOpen(false)}
          onConfirm={(result) => {
            setDuration(result.label);
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

        {step === 1 && (
          <div className="px-6 py-4 sm:px-8">
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
        )}

        <div className="relative">
          {status === "error" && (
            <div className="mx-6 mt-6 rounded-2xl border px-4 py-3 text-sm sm:mx-8" style={{ backgroundColor: "var(--color-danger-bg)", borderColor: "var(--color-danger-border)", color: "var(--color-danger)" }}>
              <strong>กรอกไม่ครบ</strong> — กรุณาระบุปลายทางก่อนสร้างแพลน
            </div>
          )}

          {step === 2 ? (
            <RecommendedPlacesStep
              center={
                destinationPlace
                  ? { lat: destinationPlace.latitude, lng: destinationPlace.longitude }
                  : DEFAULT_RECOMMENDATION_CENTER
              }
              destinationName={destination.trim() || undefined}
              selectedIds={new Set(selectedRecommendations.map((s) => s.place.googlePlaceId))}
              selectedRecommendations={selectedRecommendations}
              onToggle={toggleRecommendation}
              onEditPreferences={() => setStep(1)}
              onSubmit={() => submit(false)}
              submitDisabled={status === "loading"}
            />
          ) : (
            <>
              {mode === "self" && (
                <div className="mx-6 mt-6 rounded-2xl border px-4 py-3 text-sm sm:mx-8" style={{ backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)" }}>
                  โหมด <strong>สร้างด้วยตัวเอง</strong> — คุณจะเลือกสถานที่เองในขั้นถัดไป ตัวเลือกด้านล่างใช้เป็นตัวช่วยกรองเท่านั้น
                </div>
              )}

          <div className="flex flex-col gap-1 px-6 py-2 sm:px-8">
            <FormRow
              label="สไตล์การเที่ยว"
              hint="เลือกได้หลายอย่าง"
            >
              <div className="flex flex-wrap items-center gap-3">
                {allStyleOptions.map((opt) => (
                  <Chip
                    key={opt.tag}
                    label={opt.tag}
                    icon={opt.icon}
                    isOn={styles.includes(opt.tag)}
                    onClick={() => toggleStyle(opt.tag)}
                  />
                ))}
                {remainingStyleOptions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExtraStyles((prev) => [...prev, ...remainingStyleOptions])}
                    className="inline-flex items-center gap-1.5 rounded-[20px] border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-sel-bg)]"
                    style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }}
                  >
                    <Plus size={14} />
                    เพิ่มเติม
                  </button>
                ) : (
                  <span className="text-sm text-[var(--color-muted)]">เพิ่มครบแล้ว</span>
                )}
                {styles.length > 0 && (
                  <span className="ml-1 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    <b style={{ color: "var(--color-brand-green)" }}>{styles.length}</b> รายการ
                    <button
                      type="button"
                      onClick={() => setStyles([])}
                      className="text-[var(--color-muted)] underline hover:text-[var(--color-danger)]"
                    >
                      ล้าง
                    </button>
                  </span>
                )}
              </div>
              {styles.length === 0 && (
                <p className="mt-2.5 text-xs text-[var(--color-muted)]">
                  ยังไม่ได้เลือก — Pluno จะจัดทริปแบบทั่วไปให้ เลือกอย่างน้อย 1 อย่างเพื่อผลลัพธ์ที่ตรงใจกว่า
                </p>
              )}
            </FormRow>

            <Divider />

            <FormRow label="ความเข้มข้นของทริป" centerLabel>
              <div className="flex flex-wrap items-center gap-2.5">
                {PACE_OPTIONS.map((p) => (
                  <Tag key={p} label={p} isOn={pace === p} onClick={() => setPace((prev) => (prev === p ? null : p))} />
                ))}
              </div>
            </FormRow>

            {mode === "ai" && (
              <>
                <Divider />

                <FormRow label="งบต่อคน / วัน">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {BUDGET_OPTIONS.map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => selectBudget(b.key)}
                        className={`flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 ${
                          budget === b.key ? "" : "border-[var(--color-border)] bg-white"
                        }`}
                        style={
                          budget === b.key
                            ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)" }
                            : undefined
                        }
                      >
                        <span
                          className="text-sm font-bold"
                          style={budget === b.key ? { color: "var(--color-brand-green)" } : undefined}
                        >
                          {b.label}
                        </span>
                        <span
                          className="text-sm text-[var(--color-muted)]"
                          style={budget === b.key ? { color: "var(--color-brand-green)" } : undefined}
                        >
                          {b.value}
                        </span>
                      </button>
                    ))}
                    <div
                      onClick={selectCustomBudget}
                      className="flex cursor-text flex-col items-start gap-1.5 rounded-2xl border p-4 shadow-sm"
                      style={
                        budget === "custom"
                          ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)" }
                          : { borderColor: "var(--color-border)" }
                      }
                    >
                      <span
                        className="text-sm font-bold"
                        style={budget === "custom" ? { color: "var(--color-brand-green)" } : undefined}
                      >
                        ระบุเอง
                      </span>
                      <span
                        className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5"
                        style={{ backgroundColor: budget === "custom" ? "rgba(255,255,255,0.7)" : "var(--color-surface)" }}
                      >
                        <span className="text-sm text-[var(--color-muted)]">฿</span>
                        <input
                          ref={customBudgetInputRef}
                          type="text"
                          inputMode="numeric"
                          placeholder="2,500"
                          value={customBudget}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            setCustomBudget(e.target.value);
                            if (e.target.value) setBudget("custom");
                          }}
                          className="w-full bg-transparent text-sm text-[var(--foreground)] focus:outline-none"
                        />
                      </span>
                    </div>
                  </div>
                </FormRow>
              </>
            )}

            <Divider />

            <FormRow label="ที่พัก / โรงแรม">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <AccommodationStatusCard
                    icon={Ticket}
                    title="จองแล้ว"
                    subtitle="แนบไฟล์การจองหรือลิงก์"
                    isOn={accommodationStatus === "booked"}
                    onClick={() => setAccommodationStatus((prev) => (prev === "booked" ? null : "booked"))}
                  />
                  <AccommodationStatusCard
                    icon={Search}
                    title="ยังไม่จอง"
                    subtitle={
                      accommodationStatus === "unbooked"
                        ? "บอกความต้องการของคุณ (ปรับแก้ภายหลังได้)"
                        : "บอกสไตล์กับเราตรงๆ"
                    }
                    isOn={accommodationStatus === "unbooked"}
                    onClick={() => setAccommodationStatus((prev) => (prev === "unbooked" ? null : "unbooked"))}
                  />
                </div>

                {accommodationStatus === "booked" && (
                  <div
                    className="flex flex-col gap-3 rounded-2xl border p-4"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
                  >
                    <p className="text-xs font-semibold text-[var(--color-muted)]">
                      แนบไฟล์ หรือ Link การจอง (อย่างใดอย่างหนึ่ง)
                    </p>

                    <button
                      type="button"
                      onClick={() => bookingFileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-left text-sm"
                      style={{
                        borderColor: "var(--color-border)",
                        color: bookingFileName ? "var(--foreground)" : "var(--color-muted)",
                      }}
                    >
                      <Paperclip size={14} />
                      {bookingFileName ?? "แนบไฟล์ (รองรับ PDF, รูป)"}
                    </button>
                    <input
                      ref={bookingFileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => setBookingFileName(e.target.files?.[0]?.name ?? null)}
                    />

                    <div
                      className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <Link2 size={14} style={{ color: "var(--color-muted)" }} />
                      <input
                        type="text"
                        placeholder="ลิงก์การจอง"
                        value={bookingLink}
                        onChange={(e) => setBookingLink(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
                      <span className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
                      หรือ
                      <span className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-muted)]">ชื่อที่พัก / โรงแรม</label>
                      <div
                        className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <Pencil size={14} style={{ color: "var(--color-muted)" }} />
                        <input
                          type="text"
                          placeholder='เช่น "โรงแรมดวงตะวัน" หรือ "ย่านนิมมาน"'
                          value={accommodationName}
                          onChange={(e) => setAccommodationName(e.target.value)}
                          className="w-full bg-transparent text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <p
                      className="rounded-xl px-3 py-2 text-center text-xs"
                      style={{ backgroundColor: "var(--color-page-cream)", color: "var(--color-muted)" }}
                    >
                      หมายเหตุ ระบบจะอ่านข้อมูลตำแหน่งที่พักให้อัตโนมัติ
                    </p>
                  </div>
                )}

                {accommodationStatus === "unbooked" && (
                  <div
                    className="flex flex-col gap-4 rounded-2xl border p-4"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
                  >
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-[var(--color-muted)]">สไตล์โรงแรมที่ต้องการ</label>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {allHotelStyleOptions.map((tag) => (
                          <Tag key={tag} label={tag} isOn={hotelStyles.includes(tag)} onClick={() => toggleHotelStyle(tag)} />
                        ))}
                        <RecommendChip isOn={hotelStyleRecommend} onClick={() => setHotelStyleRecommend((v) => !v)} />
                        {remainingHotelStyleOptions.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setExtraHotelStyles((prev) => [...prev, ...remainingHotelStyleOptions])}
                            className="inline-flex items-center gap-1.5 rounded-[20px] border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-sel-bg)]"
                            style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }}
                          >
                            <Plus size={14} />
                            เพิ่มเติม
                          </button>
                        ) : (
                          <span className="text-sm text-[var(--color-muted)]">เพิ่มครบแล้ว</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-[var(--color-muted)]">เกรดที่พัก</label>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {allHotelGradeOptions.map((tag) => (
                          <Tag key={tag} label={tag} isOn={hotelGrades.includes(tag)} onClick={() => toggleHotelGrade(tag)} />
                        ))}
                        <RecommendChip isOn={hotelGradeRecommend} onClick={() => setHotelGradeRecommend((v) => !v)} />
                        {remainingHotelGradeOptions.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setExtraHotelGrades((prev) => [...prev, ...remainingHotelGradeOptions])}
                            className="inline-flex items-center gap-1.5 rounded-[20px] border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-sel-bg)]"
                            style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }}
                          >
                            <Plus size={14} />
                            เพิ่มเติม
                          </button>
                        ) : (
                          <span className="text-sm text-[var(--color-muted)]">เพิ่มครบแล้ว</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-muted)]">ถ้ามีที่พักในใจแล้ว บอกเราได้</label>
                      <div
                        className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <Pencil size={14} style={{ color: "var(--color-muted)" }} />
                        <input
                          type="text"
                          placeholder="ชื่อที่พัก หรือลิงก์"
                          value={accommodationNote}
                          onChange={(e) => setAccommodationNote(e.target.value)}
                          className="w-full bg-transparent text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </FormRow>

            <Divider />

            <FormRow label="เงื่อนไข / ข้อจำกัด" centerLabel>
              <div className="flex flex-wrap items-center gap-2.5">
                {allCondOptions.map((c) => (
                  <Tag key={c} label={c} isOn={conditions.includes(c)} onClick={() => toggleCondition(c)} />
                ))}
                {remainingCondOptions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExtraConds((prev) => [...prev, ...remainingCondOptions])}
                    className="inline-flex items-center gap-1.5 rounded-[20px] border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-sel-bg)]"
                    style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }}
                  >
                    <Plus size={14} />
                    เพิ่มเติม
                  </button>
                ) : (
                  <span className="text-sm text-[var(--color-muted)]">เพิ่มครบแล้ว</span>
                )}
              </div>
            </FormRow>
          </div>
            </>
          )}

          {/* RecommendedPlacesStep renders its own summary + สร้างแพลน bar
              once something's selected on step 2 — this generic footer
              would otherwise duplicate that CTA. */}
          {!(step === 2 && selectedRecommendations.length > 0) && (
            <div className="flex flex-col-reverse items-center gap-4 border-t border-[var(--color-border)]/40 px-6 py-5 sm:flex-row sm:justify-between sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-8 rounded-full" style={{ backgroundColor: "var(--color-accent-orange)" }} />
                  <span
                    className="h-2 w-2 rounded-full transition-colors"
                    style={{ backgroundColor: step === 2 ? "var(--color-accent-orange)" : "#d5cdb8" }}
                  />
                </div>
                <span className="text-sm text-[var(--color-muted)]">{step} จาก 2</span>
              </div>
              <div className="flex items-center gap-8">
                <button
                  type="button"
                  onClick={() => (step === 2 ? setStep(1) : submit(true))}
                  disabled={status === "loading"}
                  className="text-sm text-[var(--color-muted)] underline hover:text-[var(--foreground)] disabled:opacity-50"
                >
                  {step === 2 ? "ย้อนกลับ" : "ข้ามไปก่อน"}
                </button>
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={status === "loading"}
                  className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: "var(--color-accent-orange)" }}
                >
                  {step === 2 ? "สร้างแพลน" : mode === "self" ? "เริ่มจัดทริปเอง" : "สร้างแพลน"}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/85 backdrop-blur-sm">
              <div
                className="h-11 w-11 animate-spin rounded-full border-4"
                style={{ borderColor: "var(--color-sel-bg)", borderTopColor: "var(--color-brand-green)" }}
              />
              <p className="text-sm font-semibold" style={{ color: "var(--color-brand-green)" }}>
                กำลังสร้างแผนทริปของคุณ…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Hero({
  destination,
  onDestinationFieldClick,
  duration,
  onDurationChange,
  onDateFieldClick,
  guests,
  onGuestsChange,
  onGuestFieldClick,
  destinationHasError,
}: {
  destination: string;
  onDestinationFieldClick: () => void;
  duration: string;
  onDurationChange: (v: string) => void;
  onDateFieldClick: () => void;
  guests: string;
  onGuestsChange: (v: string) => void;
  onGuestFieldClick: () => void;
  destinationHasError: boolean;
}) {
  const router = useRouter();

  return (
    <div className="relative flex min-h-[260px] flex-col items-center justify-center gap-5 overflow-hidden px-6 py-8 text-center sm:min-h-[300px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-mountain.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/40" />

      <button
        type="button"
        onClick={() => router.back()}
        className="absolute left-6 top-6 flex items-center gap-1.5 text-sm font-medium text-white drop-shadow-sm sm:left-8 sm:top-8"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm">
          <ChevronLeft size={16} />
        </span>
        ย้อนกลับ
      </button>

      <h1 className="relative text-2xl font-extrabold text-white drop-shadow-sm sm:text-3xl">
        สร้างทริปของคุณ
      </h1>

      <BookingBar
        showSearchButton={false}
        fields={[
          {
            icon: MapPin,
            label: "Destination",
            value: destination,
            placeholder: "City, country",
            onFieldClick: onDestinationFieldClick,
            readOnly: true,
            hasError: destinationHasError,
          },
          {
            icon: CalendarDays,
            label: "Date",
            value: duration,
            placeholder: "วันเดินทางไป - วันกลับ",
            onChange: onDurationChange,
            onFieldClick: onDateFieldClick,
            readOnly: true,
          },
          {
            icon: Users,
            label: "Guest",
            value: guests,
            placeholder: "ประเภท และจำนวนคน",
            onChange: onGuestsChange,
            onFieldClick: onGuestFieldClick,
            readOnly: true,
          },
        ]}
      />
    </div>
  );
}

function ModeToggle({
  mode,
  setMode,
}: {
  mode: TripCreationMode;
  setMode: (m: TripCreationMode) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-3 py-3 sm:gap-3 sm:px-4"
      style={{ backgroundColor: "var(--color-page-cream)" }}
    >
      <button
        type="button"
        onClick={() => setMode("ai")}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-colors sm:text-base"
        style={
          mode === "ai"
            ? { backgroundColor: "var(--color-brand-green)", color: "#fff" }
            : { color: "var(--foreground)" }
        }
      >
        Pluno จัดแพลนให้
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
          style={{ backgroundColor: "var(--color-accent-orange)" }}
        >
          AI
        </span>
      </button>
      <button
        type="button"
        onClick={() => setMode("self")}
        className="inline-flex flex-1 items-center justify-center rounded-full py-3.5 text-sm font-bold transition-colors sm:text-base"
        style={
          mode === "self"
            ? { backgroundColor: "var(--color-brand-green)", color: "#fff" }
            : { color: "var(--foreground)" }
        }
      >
        สร้างด้วยตัวเอง
      </button>
    </div>
  );
}

function FormRow({
  label,
  hint,
  centerLabel,
  dimmed,
  children,
}: {
  label: string;
  hint?: string;
  centerLabel?: boolean;
  dimmed?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 py-6 sm:flex-row sm:gap-8 ${centerLabel ? "sm:items-center" : "sm:items-start"} ${
        dimmed ? "opacity-45 grayscale-[0.35] pointer-events-none" : ""
      }`}
    >
      <div className="w-full shrink-0 sm:w-[200px]">
        <p className="text-lg font-bold">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Chip({
  label,
  icon: Icon,
  isOn,
  onClick,
}: {
  label: string;
  icon: LucideIcon | null;
  isOn: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[20px] border px-4 py-2.5 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style={
        isOn
          ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)", fontWeight: 700 }
          : { borderColor: "var(--color-border-chip)", color: "var(--foreground)" }
      }
    >
      {Icon && <Icon size={15} style={{ color: isOn ? "var(--color-brand-green)" : "var(--color-muted)" }} />}
      {label}
    </button>
  );
}

function Tag({ label, isOn, onClick }: { label: string; isOn: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-[20px] border px-4 py-2.5 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style={
        isOn
          ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)", fontWeight: 700 }
          : { borderColor: "var(--color-border-tag)", color: "var(--foreground)" }
      }
    >
      {label}
    </button>
  );
}

function AccommodationStatusCard({
  icon: Icon,
  title,
  subtitle,
  isOn,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  isOn: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5"
      style={
        isOn
          ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)" }
          : { borderColor: "var(--color-border)" }
      }
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: isOn ? "rgba(255,255,255,0.7)" : "var(--color-surface)" }}
      >
        <Icon size={16} style={{ color: isOn ? "var(--color-brand-green)" : "var(--color-muted)" }} />
      </span>
      <span>
        <span className="block text-sm font-bold" style={isOn ? { color: "var(--color-brand-green)" } : undefined}>
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{subtitle}</span>
      </span>
    </button>
  );
}

function RecommendChip({ isOn, onClick }: { isOn: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-[20px] border px-4 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style={
        isOn
          ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)" }
          : { borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }
      }
    >
      แนะนำให้เลย
    </button>
  );
}
