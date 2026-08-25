"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LoaderCircle,
  Plus,
  Pencil,
  Receipt,
  Share2,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import type { ExpenseCategory, GeneratedTrip } from "@/types";
import { categoryIcon } from "@/lib/category-styles";
import {
  ACTIVITY_TO_EXPENSE_CATEGORY,
  EXPENSE_CATEGORY_GRID,
  expenseCategoryIcon,
  expenseCategoryLabel,
} from "@/lib/expense-styles";
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

const BUCKET_COLOR: Record<BudgetBucket, string> = {
  accommodation: "#7c5cbf",
  activity: "#e2574c",
  food: "#f0a53c",
  shopping: "#2a9e64",
  transport: "#4a6fd4",
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

  const draft = getTripDrafts().find((d) => d.id === trip.draftId);
  const travelerCount = draft ? Math.max(draft.adults + draft.children, 1) : 1;
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

      <div className="flex flex-col gap-3 rounded-3xl p-4 sm:p-5" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl p-4 text-white sm:p-5" style={{ backgroundColor: "var(--color-brand-green)" }}>
            <p className="text-xs font-semibold text-white/80 sm:text-sm">รวมงบที่ใช้ไป{perSuffix}</p>
            <p className="mt-1.5 text-2xl font-extrabold sm:text-3xl">{formatTHB(per(total))}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 sm:p-5">
            <p className="text-xs font-semibold text-[var(--color-muted)] sm:text-sm">งบที่ตั้งเอาไว้{perSuffix}</p>
            <p className="mt-1.5 text-2xl font-extrabold sm:text-3xl" style={goal === undefined ? { color: "var(--color-muted)" } : undefined}>
              {goal !== undefined ? formatTHB(per(goal)) : "ยังไม่ได้ตั้งงบ"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 sm:p-5">
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
          <div className="rounded-2xl bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold sm:text-base">สัดส่วนค่าใช้จ่าย{perSuffix}</h3>
              <span className="text-xs text-[var(--color-muted)]">{items.length} รายการ</span>
            </div>

            <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full">
              {breakdown.map((b) => (
                <div key={b.bucket} style={{ width: `${b.percentage}%`, backgroundColor: b.color }} />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
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
            defaultOpen={day.dayNumber === 1}
            onDeleteItem={deleteLineItem}
          />
        ))}
        {unassignedTotal > 0 && (
          <DayAccordionRow
            label="ไม่ระบุวันที่"
            amount={per(unassignedTotal)}
            items={unassignedItems}
            onDeleteItem={deleteLineItem}
          />
        )}
      </div>

      {addOpen && (
        <AddExpenseDialog
          trip={trip}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
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

// Background fill scaled to the highest-spending day, so at a glance you can
// see which day burned through the most — a plain number-per-row list makes
// that comparison require reading every value. Turns red (instead of the
// usual brand-green tint) when a day ran over its even split of the trip
// goal, since that's the one thing worth flagging without opening the ledger.
// Expandable per-day row — replaces the old flat ledger-plus-progress-bar
// layout with one accordion per day, each opening to that day's own expense
// rows (reusing ExpenseRow). Day 1 starts open (see DayAccordionRow's
// defaultOpen caller) so there's always something visible without a click.
function DayAccordionRow({
  label,
  amount,
  items,
  defaultOpen,
  onDeleteItem,
}: {
  label: string;
  amount: number;
  items: TripBudgetLineItem[];
  defaultOpen?: boolean;
  onDeleteItem: (item: TripBudgetLineItem) => void;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: "var(--color-surface)" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left">
        <span className="text-sm font-bold">{label}</span>
        <span className="flex items-center gap-2.5">
          <span className="text-sm font-extrabold">{formatTHB(amount)}</span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </span>
      </button>
      {open && (
        <div className="flex flex-col bg-white">
          {items.length === 0 ? (
            <p className="p-5 text-center text-sm text-[var(--color-muted)]">ยังไม่มีค่าใช้จ่ายวันนี้</p>
          ) : (
            items.map((item, i) => (
              <ExpenseRow
                key={item.id}
                item={item}
                showDivider={i > 0}
                onDelete={item.source === "expense" || item.source === "activity" ? () => onDeleteItem(item) : undefined}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ExpenseRow({
  item,
  showDivider,
  onDelete,
}: {
  item: TripBudgetLineItem;
  showDivider: boolean;
  onDelete?: () => void;
}) {
  const Icon = expenseCategoryIcon[item.category];
  return (
    <div
      className={`flex items-center gap-3 p-4 ${showDivider ? "border-t" : ""}`}
      style={{ borderColor: "var(--color-border)" }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <Icon size={16} className="text-[var(--color-muted)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{item.title}</p>
        <p className="text-xs text-[var(--color-muted)]">
          {item.date ? formatExpenseDate(item.date) : "ไม่ระบุวันที่"} • {expenseCategoryLabel[item.category]}
        </p>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="ลบค่าใช้จ่าย"
          className="shrink-0 rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
        >
          <Trash2 size={14} />
        </button>
      )}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-extrabold">{formatTHB(item.amount)}</span>
        {item.paidBy && (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
            title={item.paidBy}
          >
            {item.paidBy.charAt(0)}
          </span>
        )}
      </div>
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
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          {onBack ? (
            <button type="button" onClick={onBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <ChevronLeft size={18} />
            </button>
          ) : (
            <span className="w-8" />
          )}
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4">{children}</div>

        {footer && <div className="mt-6">{footer}</div>}
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

function AddExpenseDialog({
  trip,
  onClose,
  onSaved,
}: {
  trip: GeneratedTrip;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<ExpenseSelection | null>(null);
  const [date, setDate] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const numericAmount = Number(amount.replace(/[^\d.]/g, "")) || 0;
  const SelectedIcon = selected ? expenseCategoryIcon[selected.category] : Receipt;

  async function handleSave() {
    if (numericAmount <= 0) return;
    setSaving(true);
    setSaveError("");
    try {
      if (selected?.linkedActivityId) {
        // Linking to an existing itinerary stop — this cost belongs to that
        // activity, so it goes through PATCH /items/:itemId, not a standalone
        // expense row (posting both would double-count it in the budget).
        await updateTripItemOnServer(selected.linkedActivityId, {
          costAmount: numericAmount,
          paidBy: "คุณ",
          splitLabel: "ไม่แบ่ง",
        });
      } else {
        await createExpense(trip.id, {
          title: selected?.title ?? "ค่าใช้จ่ายอื่นๆ",
          amount: numericAmount,
          category: selected ? toBackendExpenseCategory(selected.category) : "other",
          date: date || undefined,
          paidBy: "คุณ",
          splitLabel: "ไม่แบ่ง",
        });
      }
      onSaved();
    } catch (error) {
      setSaveError(error instanceof BackendAuthenticationError ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  if (pickerOpen) {
    return (
      <SelectExpenseItemDialog
        trip={trip}
        onClose={onClose}
        onBack={() => setPickerOpen(false)}
        onSelect={(next) => {
          setSelected(next);
          if (next.date) setDate(next.date);
          setPickerOpen(false);
        }}
      />
    );
  }

  return (
    <DialogShell
      title="เพิ่มค่าใช้จ่าย"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {saveError && <p className="text-center text-xs font-semibold text-[var(--color-danger)]">{saveError}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={numericAmount <= 0 || saving}
            className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "var(--color-accent-orange)" }}
          >
            {saving && <LoaderCircle size={14} className="animate-spin" />}
            บันทึก
          </button>
        </div>
      }
    >
      <div
        className="flex items-center gap-2 rounded-2xl border-2 px-4 py-3.5 focus-within:border-[var(--color-primary)]"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span className="flex items-center gap-1 text-lg font-bold text-[var(--color-muted)]">฿</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          autoFocus
          className="w-full bg-transparent text-lg font-bold focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-surface)" }}>
          <SelectedIcon size={15} className="text-[var(--color-muted)]" />
        </div>
        <span className="flex-1 truncate text-sm font-semibold">{selected?.title ?? "เลือกรายการ"}</span>
        <ChevronRight size={16} className="shrink-0 text-[var(--color-muted)]" />
      </button>

      <div className="flex items-center justify-between rounded-xl border px-3.5 py-3" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-sm font-semibold">จ่ายโดย</span>
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)]">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            T
          </span>
          คุณ
        </span>
      </div>

      <div
        title={DEMO_DISABLED_TITLE}
        className="flex cursor-default items-center justify-between rounded-xl border px-3.5 py-3 opacity-70"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span className="text-sm font-semibold">แบ่ง</span>
        <span className="flex items-center gap-1 text-sm font-semibold text-[var(--color-muted)]">
          ไม่แบ่ง <ChevronDown size={14} />
        </span>
      </div>

      {!selected?.linkedActivityId && (
        <div className="relative flex items-center gap-1.5 px-1">
          <span className="text-sm text-[var(--color-muted)]">วันที่:</span>
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.focus()}
            className="flex items-center gap-1 text-sm font-semibold"
          >
            {date ? formatExpenseDate(date) : "ไม่บังคับ"} <ChevronDown size={14} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="absolute inset-y-0 left-0 h-full w-32 cursor-pointer opacity-0"
          />
        </div>
      )}
    </DialogShell>
  );
}

function SelectExpenseItemDialog({
  trip,
  onClose,
  onBack,
  onSelect,
}: {
  trip: GeneratedTrip;
  onClose: () => void;
  onBack: () => void;
  onSelect: (selection: ExpenseSelection) => void;
}) {
  const [showAllItems, setShowAllItems] = useState(false);

  const itineraryItems = trip.days.flatMap((day) =>
    day.activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      category: ACTIVITY_TO_EXPENSE_CATEGORY[activity.category],
      icon: categoryIcon[activity.category],
      date: day.date,
    }))
  );
  const visibleItems = showAllItems ? itineraryItems : itineraryItems.slice(0, 2);

  return (
    <DialogShell title="เลือกรายการ" onClose={onClose} onBack={onBack}>
      {itineraryItems.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold">เลือกจากแผนการเดินทาง</p>
          <div className="flex flex-col gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect({ title: item.title, category: item.category, linkedActivityId: item.id, date: item.date })}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--color-surface)]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-surface)" }}>
                    <Icon size={15} className="text-[var(--color-muted)]" />
                  </div>
                  <span className="truncate text-sm font-semibold">{item.title}</span>
                </button>
              );
            })}
            {!showAllItems && itineraryItems.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllItems(true)}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--color-surface)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-surface)" }}>
                  <span className="text-sm font-bold text-[var(--color-muted)]">···</span>
                </div>
                <span className="text-sm font-semibold text-[var(--color-muted)]">ดูทั้งหมด</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        {itineraryItems.length > 0 && <hr className="mb-4 border-[var(--color-border)]/60" />}
        <p className="mb-2 text-sm font-bold">หรือเลือกจากหมวดหมู่</p>
        <div className="grid grid-cols-4 gap-2.5">
          {EXPENSE_CATEGORY_GRID.map((cat) => {
            const Icon = expenseCategoryIcon[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelect({ title: expenseCategoryLabel[cat], category: cat })}
                className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 hover:bg-[var(--color-surface)]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-surface)" }}>
                  <Icon size={17} className="text-[var(--color-muted)]" />
                </div>
                <span className="text-center text-[11px] font-semibold leading-tight">{expenseCategoryLabel[cat]}</span>
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
