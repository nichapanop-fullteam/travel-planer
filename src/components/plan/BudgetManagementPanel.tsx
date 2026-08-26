"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Bed,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Footprints,
  LoaderCircle,
  Plus,
  Pencil,
  Share2,
  ShoppingBag,
  Trash2,
  TriangleAlert,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import type { ExpenseCategory, GeneratedTrip } from "@/types";
import { ACTIVITY_TO_EXPENSE_CATEGORY } from "@/lib/expense-styles";
import { formatExpenseDate } from "@/lib/trip-expenses";
import { formatTHB } from "@/lib/trip-utils";
import { getTripDrafts } from "@/lib/trip-drafts";
import { updateTripItemOnServer, updateTripOnServer } from "@/lib/trips-update-api";
import { BackendAuthenticationError } from "@/lib/authenticated-fetch";
import {
  createExpense,
  deleteExpense,
  getTripBudget,
  toBackendExpenseCategory,
  type BackendExpenseCategory,
  type TripBudget,
  type TripBudgetLineItem,
} from "@/lib/trip-budget-api";

// The 5(+1)-bucket grouping the "สัดส่วนค่าใช้จ่าย" card shows — coarser than
// the backend's own 8-value BackendExpenseCategory, matching the reference
// design's legend (ค่าที่พัก/ค่ากิจกรรม/ค่าอาหาร-ของกิน/ช้อปปิ้ง/ค่าเดินทาง).
// "other" gets its own bucket rather than folding into ค่ากิจกรรม, so
// misc/uncategorized spend is never misattributed.
type BudgetBucket = "accommodation" | "activity" | "food" | "shopping" | "transport" | "other";

const BUCKET_ORDER: BudgetBucket[] = ["accommodation", "activity", "food", "shopping", "transport", "other"];

const BUCKET_LABEL: Record<BudgetBucket, string> = {
  accommodation: "ค่าที่พัก",
  activity: "ค่ากิจกรรม",
  food: "ค่าอาหาร / ของกิน",
  shopping: "ช้อปปิ้ง",
  transport: "ค่าเดินทาง",
  other: "อื่นๆ",
};

// Shorter labels for the "รายการค่าใช้จ่าย" filter dropdown's checkbox list
// (reference design drops the "ค่า" prefix there) — kept separate from
// BUCKET_LABEL so the "สัดส่วนค่าใช้จ่าย" legend's wording doesn't shift too.
const FILTER_CATEGORY_LABEL: Record<BudgetBucket, string> = {
  accommodation: "ที่พัก",
  food: "อาหาร",
  transport: "การเดินทาง",
  activity: "กิจกรรม",
  shopping: "ช้อปปิ้ง",
  other: "อื่นๆ",
};

const BUCKET_COLOR: Record<BudgetBucket, string> = {
  accommodation: "#7d46fa",
  activity: "#ff5b36",
  food: "#ffb85c",
  shopping: "#17ab59",
  transport: "#4c7fff",
  other: "#9ca3af",
};

const CATEGORY_TO_BUCKET: Record<BackendExpenseCategory, BudgetBucket> = {
  hotel: "accommodation",
  activity: "activity",
  sightseeing: "activity",
  food: "food",
  shopping: "shopping",
  transport: "transport",
  fuel: "transport",
  other: "other",
};

// Reference-design "การจัดการงบประมาณ" tab: a spend summary, an expense
// ledger, and the add-expense + pick-item flows, all backed by
// GET/POST/PATCH/DELETE /trips/:id/budget & /expenses (see lib/trip-budget-api.ts).
// Companion-related affordances (ยอดคงเหลือกลุ่ม/เพิ่มเพื่อนร่วมทริป/การตั้งค่า/
// ดูการแยกย่อย) stay inert — same "not wired up in this demo" pattern as
// Sidebar.tsx, since there's no multi-user backend to back them yet.
const DEMO_DISABLED_TITLE = "ยังไม่เปิดใช้งานในเดโมนี้";

export function BudgetManagementPanel({ trip }: { trip: GeneratedTrip; onPatch: (patch: Partial<GeneratedTrip>) => void }) {
  const { backendUser, isLoading: authLoading } = useAuth();
  const [budget, setBudget] = useState<TripBudget | null>(null);
  const [loadError, setLoadError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  // Lifted out of AddExpenseDialog (rather than its own useState) so a draft
  // survives closing the dialog without saving (ยกเลิก/X) — it only clears
  // once "เพิ่มค่าใช้จ่าย" actually succeeds (see the onSaved handler below).
  const [expenseDraft, setExpenseDraft] = useState<DraftExpenseItem[]>(() => [emptyDraftItem()]);
  const [goalOpen, setGoalOpen] = useState(false);
  // "ค่าใช้จ่ายต่อคน" toggle — divides every amount below by the traveler
  // count. GeneratedTrip carries no traveler count of its own (see
  // types/index.ts), so this falls back to the TripDraft this trip was
  // generated from (adults+children); a trip with no matching draft (e.g.
  // loaded straight from a shared link) just shows 1-person amounts, same as
  // the toggle being off.
  const [perPerson, setPerPerson] = useState(false);

  const canUseBudget = Boolean(backendUser) && Boolean(trip.backendSynced);

  // No synchronous setState here — only the async .then/.catch callbacks
  // touch state, so this is safe to call directly from the mount effect
  // below as well as from retry/refresh event handlers.
  const loadBudget = useCallback(() => {
    getTripBudget(trip.id)
      .then((data) => {
        setBudget(data);
        setLoadError("");
      })
      .catch(() => setLoadError("โหลดข้อมูลงบประมาณไม่สำเร็จ กรุณาลองอีกครั้ง"));
  }, [trip.id]);

  useEffect(() => {
    if (canUseBudget) loadBudget();
  }, [canUseBudget, loadBudget]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <LoaderCircle size={22} className="animate-spin text-[var(--color-muted)]" />
      </div>
    );
  }

  if (!backendUser) {
    return (
      <EmptyStateCard
        title="เข้าสู่ระบบเพื่อดูงบประมาณ"
        description="งบและค่าใช้จ่ายของทริปผูกกับบัญชีผู้ใช้ ต้องเข้าสู่ระบบก่อนจึงจะดู/แก้ไขได้"
        action={
          <Link
            href="/login"
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            เข้าสู่ระบบ
          </Link>
        }
      />
    );
  }

  if (!trip.backendSynced) {
    return (
      <EmptyStateCard
        title="บันทึกทริปนี้ก่อนใช้งบประมาณ"
        description="แท็บนี้อ่าน/เขียนงบจากเซิร์ฟเวอร์โดยตรง เปิด “แก้ไขทริป” แล้วบันทึกอย่างน้อยหนึ่งครั้งเพื่อสร้างทริปนี้บนเซิร์ฟเวอร์ก่อน"
      />
    );
  }

  if (loadError) {
    return (
      <EmptyStateCard
        title="โหลดข้อมูลงบประมาณไม่สำเร็จ"
        description={loadError}
        action={
          <button
            type="button"
            onClick={loadBudget}
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            ลองอีกครั้ง
          </button>
        }
      />
    );
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center p-10">
        <LoaderCircle size={22} className="animate-spin text-[var(--color-muted)]" />
      </div>
    );
  }

  const items = budget.items;
  const total = budget.totalBudget;
  const goal = budget.budgetLimit;
  const spentPercent = goal ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  const remaining = goal !== undefined ? goal - total : undefined;

  const bucketTotals = new Map<BudgetBucket, number>();
  for (const b of budget.byCategory) {
    const bucket = CATEGORY_TO_BUCKET[b.category];
    bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + b.amount);
  }
  const breakdown = BUCKET_ORDER.filter((bucket) => (bucketTotals.get(bucket) ?? 0) > 0).map((bucket) => {
    const amount = bucketTotals.get(bucket) ?? 0;
    return { bucket, label: BUCKET_LABEL[bucket], color: BUCKET_COLOR[bucket], amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 };
  });

  const travelerCount = getTravelerCount(trip);
  const per = (amount: number) => (perPerson ? Math.round(amount / travelerCount) : amount);
  const perSuffix = perPerson ? " / ต่อคน" : "";

  const unassignedTotal = items.filter((i) => i.dayNumber == null).reduce((sum, i) => sum + i.amount, 0);
  const itemsByDayNumber = new Map<number, TripBudgetLineItem[]>();
  for (const item of items) {
    if (item.dayNumber == null) continue;
    const list = itemsByDayNumber.get(item.dayNumber) ?? [];
    list.push(item);
    itemsByDayNumber.set(item.dayNumber, list);
  }
  const unassignedItems = items.filter((i) => i.dayNumber == null);
  const amountByDayId = new Map(budget.byDay.map((d) => [d.dayId, d.amount]));

  async function deleteLineItem(item: TripBudgetLineItem) {
    if (item.source === "expense") {
      await deleteExpense(item.id);
    } else if (item.source === "activity") {
      await updateTripItemOnServer(item.id, { costAmount: 0 });
    } else {
      return;
    }
    loadBudget();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-extrabold sm:text-2xl">สรุปงบ</h2>
          <button
            type="button"
            onClick={() => setPerPerson((v) => !v)}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold sm:text-sm"
            style={
              perPerson
                ? { backgroundColor: "var(--color-sel-bg)", borderColor: "var(--color-sel-border)", color: "var(--color-brand-green)" }
                : { borderColor: "var(--color-border)" }
            }
          >
            ค่าใช้จ่ายต่อคน
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title={DEMO_DISABLED_TITLE}
            className="flex items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-sm font-semibold opacity-70"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Share2 size={14} /> แชร์
          </button>
          <span className="h-6 w-px" style={{ backgroundColor: "var(--color-border)" }} />
          <button
            type="button"
            onClick={() => setGoalOpen(true)}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            <Pencil size={14} /> แก้ไขงบ
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            <Plus size={14} /> เพิ่มค่าใช้จ่าย
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[20px] p-4 sm:p-5" style={{ backgroundColor: "#f7f6f0" }}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex min-h-[112px] flex-col items-center justify-center rounded-2xl p-4 text-center text-white sm:p-5" style={{ backgroundColor: "#306b50" }}>
            <p className="text-xs font-semibold text-white/80 sm:text-sm">รวมงบที่ใช้ไป{perSuffix}</p>
            <p className="mt-1.5 text-2xl font-extrabold sm:text-3xl">{formatTHB(per(total))}</p>
          </div>

          <div className="flex min-h-[112px] flex-col items-center justify-center rounded-2xl bg-white p-4 text-center sm:p-5">
            <p className="text-xs font-semibold text-[var(--color-muted)] sm:text-sm">งบที่ตั้งเอาไว้{perSuffix}</p>
            <p className="mt-1.5 text-2xl font-extrabold sm:text-3xl" style={goal === undefined ? { color: "var(--color-muted)" } : undefined}>
              {goal !== undefined ? formatTHB(per(goal)) : "ยังไม่ได้ตั้งงบ"}
            </p>
          </div>

          <div className="flex min-h-[112px] flex-col justify-center rounded-2xl bg-white p-4 sm:p-5">
            {remaining !== undefined ? (
              <>
                <p className="text-xs font-semibold sm:text-sm" style={remaining < 0 ? { color: "var(--color-danger)" } : undefined}>
                  {remaining >= 0 ? `เหลือ ${formatTHB(per(remaining))} จะเท่างบ` : `เกินงบไป ${formatTHB(per(-remaining))}`}
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${spentPercent}%`, backgroundColor: remaining >= 0 ? "var(--color-accent-mint)" : "var(--color-danger)" }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">ยังไม่ได้ตั้งงบ</p>
            )}
          </div>
        </div>

        {breakdown.length > 0 && (
          <div className="rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: "#e5dfd0" }}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold sm:text-base">สัดส่วนค่าใช้จ่าย{perSuffix}</h3>
              <span className="text-xs text-[var(--color-muted)]">{items.length} รายการ</span>
            </div>

            <div className="mt-3 flex h-2.5 w-full gap-1 overflow-hidden rounded-full">
              {breakdown.map((b) => (
                <div key={b.bucket} style={{ width: `${b.percentage}%`, backgroundColor: b.color }} />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              {breakdown.map((b) => (
                <div key={b.bucket}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                    {b.label}
                  </p>
                  <p className="mt-1 text-sm font-extrabold">{formatTHB(per(b.amount))}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {trip.days.map((day) => (
          <DayAccordionRow
            key={day.id}
            label={`วันที่ ${day.dayNumber}`}
            amount={per(amountByDayId.get(day.id) ?? 0)}
            items={itemsByDayNumber.get(day.dayNumber) ?? []}
            amountDivisor={perPerson ? travelerCount : 1}
            defaultOpen={day.dayNumber === 1}
            onDeleteItem={deleteLineItem}
          />
        ))}
        {unassignedTotal > 0 && (
          <DayAccordionRow
            label="ไม่ระบุวันที่"
            amount={per(unassignedTotal)}
            items={unassignedItems}
            amountDivisor={perPerson ? travelerCount : 1}
            onDeleteItem={deleteLineItem}
          />
        )}
      </div>

      {addOpen && (
        <AddExpenseDialog
          trip={trip}
          items={expenseDraft}
          onItemsChange={setExpenseDraft}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            setExpenseDraft([emptyDraftItem()]);
            loadBudget();
          }}
        />
      )}
      {goalOpen && (
        <SetBudgetGoalDialog
          trip={trip}
          currentGoal={goal}
          onClose={() => setGoalOpen(false)}
          onSaved={() => {
            setGoalOpen(false);
            loadBudget();
          }}
        />
      )}
    </div>
  );
}

// GeneratedTrip carries no traveler count of its own (see types/index.ts) —
// this falls back to the TripDraft the trip was generated from
// (adults+children). A trip with no matching draft (e.g. loaded straight
// from a shared link) counts as 1 traveler, same as the "ต่อคน" toggle/inputs
// being a no-op. Shared by the summary's "ค่าใช้จ่ายต่อคน" toggle and
// AddExpenseDialog's per-person amount field.
function getTravelerCount(trip: GeneratedTrip): number {
  const draft = getTripDrafts().find((d) => d.id === trip.draftId);
  return draft ? Math.max(draft.adults + draft.children, 1) : 1;
}

function EmptyStateCard({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border p-10 text-center" style={{ borderColor: "var(--color-border)" }}>
      <TriangleAlert size={28} className="text-[var(--color-muted)]" />
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-sm text-sm text-[var(--color-muted)]">{description}</p>
      {action}
    </div>
  );
}

// null for "other" — rendered as the same "···" glyph used elsewhere in this
// file (see SelectExpenseItemDialog's category grid) rather than a real icon.
const BUCKET_ICON: Record<BudgetBucket, LucideIcon | null> = {
  accommodation: Bed,
  activity: Footprints,
  food: UtensilsCrossed,
  shopping: ShoppingBag,
  transport: Car,
  other: null,
};

// Expandable per-day row — replaces the old flat ledger-plus-progress-bar
// layout with one accordion per day, each opening to that day's own expense
// rows (reusing ExpenseRow). Day 1 starts open (see DayAccordionRow's
// defaultOpen caller) so there's always something visible without a click.
function DayAccordionRow({
  label,
  amount,
  items,
  amountDivisor,
  defaultOpen,
  onDeleteItem,
}: {
  label: string;
  amount: number;
  items: TripBudgetLineItem[];
  amountDivisor: number;
  defaultOpen?: boolean;
  onDeleteItem: (item: TripBudgetLineItem) => void;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  // Empty set == "ทั้งหมด" (show everything) — checking any individual
  // category switches out of that mode; unchecking the last one switches
  // back automatically rather than landing on an ambiguous "nothing shown".
  const [categoryFilter, setCategoryFilter] = useState<Set<BudgetBucket>>(() => new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredItems = categoryFilter.size === 0 ? items : items.filter((i) => categoryFilter.has(CATEGORY_TO_BUCKET[i.category]));

  function toggleBucketFilter(b: BudgetBucket) {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }

  return (
    <div className="rounded-[20px] border" style={{ borderColor: "#e5dfd0", backgroundColor: "#f7f6f0" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-h-[70px] w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="text-base font-bold">{label}</span>
        <span className="flex items-center gap-2.5">
          <span className="text-base font-extrabold">{formatTHB(amount)}</span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md" style={{ color: "#306b50" }}>
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </span>
      </button>
      {open && (
        <div className="mx-4 mb-4 overflow-visible rounded-2xl bg-white">
          <div className="flex min-h-[68px] items-center justify-between gap-2 border-b px-5" style={{ borderColor: "#e5dfd0" }}>
            <h4 className="text-base font-bold">รายการค่าใช้จ่าย</h4>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-xs font-semibold"
                style={{ borderColor: "#e5dfd0" }}
              >
                <Filter size={11} className="text-[var(--color-muted)]" />
                {categoryFilter.size === 0 ? "ทุกหมวด" : `${categoryFilter.size} หมวด`}
              </button>

              {filterOpen && (
                <>
                  {/* Same outside-click catcher as AddExpenseDialog's
                      รูปแบบการจ่าย/วันที่จ่าย dropdowns. */}
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-2xl bg-white py-2 shadow-lg">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter(new Set())}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface)]"
                    >
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                        style={
                          categoryFilter.size === 0
                            ? { borderColor: "var(--color-accent-orange)", backgroundColor: "var(--color-accent-orange)" }
                            : { borderColor: "var(--color-border)" }
                        }
                      >
                        {categoryFilter.size === 0 && <Check size={11} className="text-white" />}
                      </span>
                      ทั้งหมด
                    </button>
                    {CATEGORY_PICKER_ORDER.map((b) => {
                      const isOn = categoryFilter.has(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => toggleBucketFilter(b)}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface)]"
                        >
                          <span
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                            style={isOn ? { borderColor: "var(--color-accent-orange)", backgroundColor: "var(--color-accent-orange)" } : { borderColor: "var(--color-border)" }}
                          >
                            {isOn && <Check size={11} className="text-white" />}
                          </span>
                          {FILTER_CATEGORY_LABEL[b]}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            {filteredItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-muted)]">
                {items.length === 0 ? "ยังไม่มีค่าใช้จ่ายวันนี้" : "ไม่มีค่าใช้จ่ายในหมวดนี้"}
              </p>
            ) : (
              filteredItems.map((item, i) => (
                <ExpenseRow
                  key={item.id}
                  item={item}
                  showDivider={i > 0}
                  amountDivisor={amountDivisor}
                  onDelete={item.source === "expense" || item.source === "activity" ? () => onDeleteItem(item) : undefined}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseRow({
  item,
  showDivider,
  amountDivisor,
  onDelete,
}: {
  item: TripBudgetLineItem;
  showDivider: boolean;
  amountDivisor: number;
  onDelete?: () => void;
}) {
  const bucket = CATEGORY_TO_BUCKET[item.category];
  const color = BUCKET_COLOR[bucket];
  const Icon = BUCKET_ICON[bucket];

  return (
    <div className={`group relative flex min-h-[76px] items-center gap-4 px-5 py-3 ${showDivider ? "border-t" : ""}`} style={{ borderColor: "#e5dfd0" }}>
      {/* "22" appended to the bucket's hex gives a light tint background
          without a second color table to keep in sync with BUCKET_COLOR. */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18` }}>
        {Icon ? <Icon size={18} style={{ color }} /> : <span className="text-sm font-bold" style={{ color }}>···</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{item.title}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold" style={{ color }}>
          <span>{BUCKET_LABEL[bucket]}</span>
          {item.paidBy && <span className="font-normal text-[var(--color-muted)]">· โดย {item.paidBy}</span>}
        </p>
      </div>
      <span className="shrink-0 text-base font-extrabold transition-opacity group-hover:opacity-0">{formatTHB(Math.round(item.amount / amountDivisor))}</span>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="ลบค่าใช้จ่าย"
          className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--color-muted)] opacity-0 transition-opacity hover:bg-[#f7f6f0] focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// Shared centered-modal shell, matching the existing EditDialogShell pattern
// used across the trip detail page's edit dialogs.
function DialogShell({
  title,
  onClose,
  onBack,
  children,
  footer,
  size = "default",
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
}) {
  const isWide = size === "wide";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className={`max-h-[95vh] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl ${isWide ? "max-w-[1000px] p-6 sm:p-7" : "max-w-md p-6"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between ${isWide ? "mb-6 border-b pb-4" : "mb-4"}`} style={isWide ? { borderColor: "var(--color-border)" } : undefined}>
          {onBack ? (
            <button type="button" onClick={onBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <ChevronLeft size={18} />
            </button>
          ) : !isWide ? (
            <span className="w-8" />
          ) : null}
          <h3 className={`${isWide ? "mr-auto text-2xl sm:text-[28px]" : "text-lg"} font-bold`}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={`flex shrink-0 items-center justify-center rounded-full ${isWide ? "h-10 w-10" : "h-8 w-8"}`}
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <X size={isWide ? 22 : 16} />
          </button>
        </div>

        <div className="flex flex-col gap-4">{children}</div>

        {footer && (
          <div className={`${isWide ? "mt-6 pt-5" : "mt-6 pt-4"} border-t`} style={{ borderColor: "var(--color-border)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

type ExpenseSelection = {
  title: string;
  category: ExpenseCategory;
  linkedActivityId?: string;
  // Only set when picked "จากแผนการเดินทาง" — that activity's own day.date is
  // already known, so there's no reason to leave "วันที่: ไม่บังคับ" and have
  // it fall into the budget tab's "ไม่ระบุวันที่" bucket. A category-only pick
  // (no linked activity) has no day to infer this from, so it stays unset.
  date?: string;
};

type PaymentMode = "self" | "split";

const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  self: "จ่ายเอง",
  split: "หารเท่า",
};

interface DraftExpenseItem {
  key: string;
  amount: string;
  selected: ExpenseSelection | null;
  paymentMode: PaymentMode | null;
  date: string;
}

function emptyDraftItem(): DraftExpenseItem {
  return { key: crypto.randomUUID(), amount: "", selected: null, paymentMode: null, date: "" };
}

// Reference design adds several expense rows in one go ("รายการที่ 1/2/...",
// each independently removable) instead of one row per open. The amount
// field is explicitly "ต่อคน" (per person) — multiplied by the trip's
// traveler count (see getTravelerCount) into the actual total sent to the
// backend, since costAmount/createExpense's `amount` are both whole-trip
// totals, not per-person.
function AddExpenseDialog({
  trip,
  items,
  onItemsChange,
  onClose,
  onSaved,
}: {
  trip: GeneratedTrip;
  items: DraftExpenseItem[];
  // Draft state lives in the parent (see BudgetManagementPanel's
  // expenseDraft) so it survives ยกเลิก/X — this dialog just reads/writes it.
  onItemsChange: (update: (prev: DraftExpenseItem[]) => DraftExpenseItem[]) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pickingKey, setPickingKey] = useState<string | null>(null);
  const [paymentDropdownKey, setPaymentDropdownKey] = useState<string | null>(null);
  const [dateDropdownKey, setDateDropdownKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const travelerCount = getTravelerCount(trip);
  const validItems = items.filter((it) => (Number(it.amount) || 0) > 0);

  function updateItem(key: string, patch: Partial<DraftExpenseItem>) {
    onItemsChange((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    onItemsChange((prev) => prev.filter((it) => it.key !== key));
  }

  async function handleSave() {
    if (validItems.length === 0) return;
    setSaving(true);
    setSaveError("");
    try {
      await Promise.all(
        validItems.map((it) => {
          const totalAmount = Math.round((Number(it.amount) || 0) * travelerCount);
          const splitLabel = it.paymentMode === "split" ? "หารเท่า" : "ไม่แบ่ง";
          if (it.selected?.linkedActivityId) {
            // Linking to an existing itinerary stop — this cost belongs to
            // that activity, so it goes through PATCH /items/:itemId, not a
            // standalone expense row (posting both would double-count it).
            return updateTripItemOnServer(it.selected.linkedActivityId, {
              costAmount: totalAmount,
              paidBy: "คุณ",
              splitLabel,
            });
          }
          return createExpense(trip.id, {
            title: it.selected?.title ?? "ค่าใช้จ่ายอื่นๆ",
            amount: totalAmount,
            category: it.selected ? toBackendExpenseCategory(it.selected.category) : "other",
            date: it.date || undefined,
            paidBy: "คุณ",
            splitLabel,
          });
        })
      );
      onSaved();
    } catch (error) {
      setSaveError(error instanceof BackendAuthenticationError ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogShell
        title="เพิ่มค่าใช้จ่าย"
        onClose={onClose}
        size="wide"
        footer={
          <div className="flex flex-col gap-2">
            {saveError && <p className="text-center text-xs font-semibold text-[var(--color-danger)]">{saveError}</p>}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full flex-1 rounded-full border py-3.5 text-lg font-bold text-[var(--color-muted)]"
                style={{ borderColor: "var(--color-border)" }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={validItems.length === 0 || saving}
                className="flex w-full flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-[#dedede] disabled:text-[#aaa69f]"
                style={validItems.length > 0 && !saving ? { backgroundColor: "var(--color-accent-orange)" } : undefined}
              >
                {saving && <LoaderCircle size={14} className="animate-spin" />}
                เพิ่มค่าใช้จ่าย
              </button>
            </div>
          </div>
        }
      >
        {items.map((item, index) => {
          const selectedBucket = item.selected ? CATEGORY_TO_BUCKET[toBackendExpenseCategory(item.selected.category)] : null;
          return (
            <div key={item.key} className="overflow-visible rounded-3xl border" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center justify-between rounded-t-3xl px-4 py-3 sm:px-5" style={{ backgroundColor: "#f8f6f1" }}>
                <h4 className="text-xl font-bold">รายการที่ {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  aria-label="ลบรายการนี้"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5">

              <div>
                <label className="mb-2 block text-base text-[var(--color-muted)]">จำนวนเงิน</label>
                <div
                  className="flex min-h-[52px] items-center gap-2 rounded-2xl border bg-white px-4 focus-within:border-[var(--color-primary)]"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="text-base">฿</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={item.amount}
                    onChange={(e) => updateItem(item.key, { amount: e.target.value })}
                    placeholder="0.00"
                    autoFocus={index === items.length - 1}
                    className="w-full bg-transparent text-base focus:outline-none"
                  />
                  <span className="shrink-0 text-base text-[#9da9bd]">ต่อคน</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-base text-[var(--color-muted)]">ประเภทค่าใช้จ่าย</label>
                <button
                  type="button"
                  onClick={() => setPickingKey(item.key)}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {item.selected && selectedBucket ? (
                    (() => {
                      const BucketIconComp = BUCKET_ICON[selectedBucket];
                      const bucketColor = BUCKET_COLOR[selectedBucket];
                      return (
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          {item.selected.linkedActivityId && (
                            <>
                              <span className="truncate text-sm font-semibold">{item.selected.title}</span>
                              <span className="shrink-0 text-[var(--color-muted)]">·</span>
                            </>
                          )}
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${bucketColor}22` }}>
                            {BucketIconComp ? (
                              <BucketIconComp size={12} style={{ color: bucketColor }} />
                            ) : (
                              <span className="text-xs font-bold" style={{ color: bucketColor }}>···</span>
                            )}
                          </span>
                          <span className="shrink-0 text-sm font-semibold">{BUCKET_LABEL[selectedBucket]}</span>
                        </span>
                      );
                    })()
                  ) : (
                    <span className="flex-1 text-sm text-[var(--color-muted)]">ประเภทค่าใช้จ่าย</span>
                  )}
                  <ChevronRight size={16} className="shrink-0 text-[var(--color-muted)]" />
                </button>
              </div>

              <div className="relative">
                <label className="mb-2 block text-base text-[var(--color-muted)]">รูปแบบการจ่าย</label>
                <button
                  type="button"
                  onClick={() => setPaymentDropdownKey((prev) => (prev === item.key ? null : item.key))}
                  className="flex min-h-[52px] w-full items-center justify-between rounded-2xl border bg-white px-4 text-left"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="text-sm font-semibold" style={item.paymentMode ? undefined : { color: "var(--color-muted)", fontWeight: 400 }}>
                    {item.paymentMode ? PAYMENT_MODE_LABEL[item.paymentMode] : "รูปแบบการจ่าย"}
                  </span>
                  <ChevronDown size={14} className="shrink-0 text-[var(--color-muted)]" />
                </button>

                {paymentDropdownKey === item.key && (
                  <>
                    {/* Transparent full-screen catcher so clicking anywhere
                        outside the option list below closes it — the dialog's
                        own backdrop can't do this since clicks inside the
                        modal are stopped from reaching it. */}
                    <div className="fixed inset-0 z-10" onClick={() => setPaymentDropdownKey(null)} />
                    <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl bg-white py-1 shadow-lg">
                      {(["self", "split"] as const).map((mode) => {
                        const isOn = item.paymentMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              updateItem(item.key, { paymentMode: isOn ? null : mode });
                              setPaymentDropdownKey(null);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface)]"
                          >
                            <span
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                              style={
                                isOn
                                  ? { borderColor: "var(--color-brand-green)", backgroundColor: "var(--color-brand-green)" }
                                  : { borderColor: "var(--color-border)" }
                              }
                            >
                              {isOn && <Check size={11} className="text-white" />}
                            </span>
                            {PAYMENT_MODE_LABEL[mode]}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {!item.selected?.linkedActivityId && (
                <div className="relative">
                  <label className="mb-2 block text-base text-[var(--color-muted)]">วันที่จ่าย</label>
                  <button
                    type="button"
                    onClick={() => setDateDropdownKey((prev) => (prev === item.key ? null : item.key))}
                    className="flex min-h-[52px] w-full items-center justify-between rounded-2xl border bg-white px-4 text-left"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span className="text-sm font-semibold" style={item.date ? undefined : { color: "var(--color-muted)", fontWeight: 400 }}>
                      {item.date
                        ? (() => {
                            const selectedDay = trip.days.find((d) => d.date === item.date);
                            return selectedDay ? `วันที่ ${selectedDay.dayNumber} · ${formatExpenseDate(item.date)}` : formatExpenseDate(item.date);
                          })()
                        : "วันที่จ่าย"}
                    </span>
                    <ChevronDown size={14} className="shrink-0 text-[var(--color-muted)]" />
                  </button>

                  {dateDropdownKey === item.key && (
                    <>
                      {/* Same outside-click catcher as the payment-mode
                          dropdown above. */}
                      <div className="fixed inset-0 z-10" onClick={() => setDateDropdownKey(null)} />
                      <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl bg-white py-1 shadow-lg">
                        {trip.days.map((day) => {
                          const isOn = item.date === day.date;
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => {
                                updateItem(item.key, { date: isOn ? "" : day.date });
                                setDateDropdownKey(null);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface)]"
                            >
                              <span
                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                                style={
                                  isOn
                                    ? { borderColor: "var(--color-brand-green)", backgroundColor: "var(--color-brand-green)" }
                                    : { borderColor: "var(--color-border)" }
                                }
                              >
                                {isOn && <Check size={11} className="text-white" />}
                              </span>
                              <span>วันที่ {day.dayNumber}</span>
                              <span className="text-[var(--color-muted)]">·</span>
                              <span className="text-[var(--color-muted)]">{formatExpenseDate(day.date)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => onItemsChange((prev) => [...prev, emptyDraftItem()])}
          className="self-start flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-base font-bold"
          style={{ borderColor: "#ead1ab", color: "var(--color-accent-orange)", backgroundColor: "#fff8ed" }}
        >
          <Plus size={14} /> เพิ่มค่าใช้จ่าย
        </button>
      </DialogShell>

      {pickingKey && (
        <SelectExpenseItemDialog
          trip={trip}
          onClose={() => setPickingKey(null)}
          onSelect={(next) => {
            const key = pickingKey;
            updateItem(key, { selected: next, date: next.date ?? items.find((it) => it.key === key)?.date ?? "" });
            setPickingKey(null);
          }}
        />
      )}
    </>
  );
}

// Grid order for this specific picker — matches the reference design's
// left-to-right/top-to-bottom order, which differs from BUCKET_ORDER (the
// order the "สัดส่วนค่าใช้จ่าย" legend uses) — kept separate rather than
// reordering BUCKET_ORDER and risking that legend silently shifting too.
const CATEGORY_PICKER_ORDER: BudgetBucket[] = ["accommodation", "food", "transport", "activity", "shopping", "other"];

// A representative BackendExpenseCategory for each bucket — stored on
// ExpenseSelection.category (a plain category pick has no finer-grained
// category to fall back on, unlike a picked itinerary item).
const BUCKET_TO_CATEGORY: Record<BudgetBucket, ExpenseCategory> = {
  accommodation: "hotel",
  activity: "activity",
  food: "food",
  shopping: "shopping",
  transport: "transport",
  other: "other",
};

// Stacks on top of AddExpenseDialog (rendered as a sibling, not a
// replacement — see its pickingKey branch) rather than swapping the whole
// modal out, so the parent dialog stays visible (dimmed) behind it, matching
// the reference. Picking a place and picking a category are mutually
// exclusive — choosing one clears the other — and nothing is committed to
// the parent until "ยืนยัน", unlike the old immediate-select-and-close list.
function SelectExpenseItemDialog({
  trip,
  onClose,
  onSelect,
}: {
  trip: GeneratedTrip;
  onClose: () => void;
  onSelect: (selection: ExpenseSelection) => void;
}) {
  const itineraryItems = trip.days.flatMap((day) =>
    day.activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      category: ACTIVITY_TO_EXPENSE_CATEGORY[activity.category],
      date: day.date,
    }))
  );

  const [placeId, setPlaceId] = useState("");
  const [bucket, setBucket] = useState<BudgetBucket | null>(null);

  const selectedPlace = itineraryItems.find((it) => it.id === placeId);
  // A place is optional extra context, but the category is always required —
  // picking a place no longer silently borrows its own category (the old
  // behavior) or blocks picking one explicitly; it just pre-fills the grid
  // below with the place's category as a starting guess the user can still
  // override before confirming.
  const canConfirm = bucket !== null;

  function handleConfirm() {
    if (!bucket) return;
    const category = BUCKET_TO_CATEGORY[bucket];
    if (selectedPlace) {
      onSelect({ title: selectedPlace.title, category, linkedActivityId: selectedPlace.id, date: selectedPlace.date });
    } else {
      onSelect({ title: BUCKET_LABEL[bucket], category });
    }
    onClose();
  }

  return (
    <DialogShell
      title="ประเภทค่าใช้จ่าย"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border py-2.5 text-sm font-bold" style={{ borderColor: "var(--color-border)" }}>
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-full py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            ยืนยัน
          </button>
        </div>
      }
    >
      {itineraryItems.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)" }}>
          <p className="mb-3 text-sm font-bold">
            จากสถานที่ในแผน <span className="text-xs font-normal text-[var(--color-muted)]">(ไม่บังคับ)</span>
          </p>
          <div className="relative">
            <select
              value={placeId}
              onChange={(e) => {
                setPlaceId(e.target.value);
                // Pre-fill the category grid with the place's own category
                // as a starting guess — only when nothing's picked there
                // yet, so it never overwrites a choice the user already made.
                const place = itineraryItems.find((it) => it.id === e.target.value);
                if (place && !bucket) setBucket(CATEGORY_TO_BUCKET[toBackendExpenseCategory(place.category)]);
              }}
              className="w-full appearance-none rounded-xl border bg-white px-3.5 py-3 text-sm font-semibold focus:outline-none"
              style={{ borderColor: "var(--color-border)" }}
            >
              <option value="">เลือกสถานที่</option>
              {itineraryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          </div>
        </div>
      )}

      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-3 text-sm font-bold">
          เลือกหมวดหมู่ <span style={{ color: "var(--color-danger)" }}>*</span>
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {CATEGORY_PICKER_ORDER.map((b) => {
            const Icon = BUCKET_ICON[b];
            const isOn = bucket === b;
            const color = BUCKET_COLOR[b];
            return (
              <button
                key={b}
                type="button"
                onClick={() => setBucket((prev) => (prev === b ? null : b))}
                className="flex flex-col items-center gap-1.5 rounded-xl border p-3"
                style={isOn ? { borderColor: color, backgroundColor: `${color}14` } : { borderColor: "var(--color-border)" }}
              >
                {Icon ? (
                  <Icon size={20} style={{ color: isOn ? color : "var(--color-muted)" }} />
                ) : (
                  <span className="text-lg font-bold" style={{ color: isOn ? color : "var(--color-muted)" }}>
                    ···
                  </span>
                )}
                <span className="text-xs font-semibold" style={isOn ? { color } : undefined}>
                  {BUCKET_LABEL[b]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </DialogShell>
  );
}

function SetBudgetGoalDialog({
  trip,
  currentGoal,
  onClose,
  onSaved,
}: {
  trip: GeneratedTrip;
  currentGoal?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(currentGoal ? String(currentGoal) : "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    const numeric = Number(value.replace(/[^\d.]/g, "")) || 0;
    if (numeric <= 0) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateTripOnServer(trip.id, { budgetLimit: numeric });
      onSaved();
    } catch (error) {
      setSaveError(error instanceof BackendAuthenticationError ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell
      title="ตั้งงบประมาณ"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {saveError && <p className="text-center text-xs font-semibold text-[var(--color-danger)]">{saveError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border py-2.5 text-sm font-bold"
              style={{ borderColor: "var(--color-border)" }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!value.trim() || saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand-green)" }}
            >
              {saving && <LoaderCircle size={14} className="animate-spin" />}
              บันทึก
            </button>
          </div>
        </div>
      }
    >
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">งบประมาณรวมทั้งทริป (บาท)</label>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="เช่น 20000"
          autoFocus
          className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
          style={{ borderColor: "var(--color-border)" }}
        />
      </div>
    </DialogShell>
  );
}
