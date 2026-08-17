"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Pencil,
  Receipt,
  Settings,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import type { ExpenseCategory, GeneratedTrip, TripExpense } from "@/types";
import { categoryIcon } from "@/lib/category-styles";
import {
  ACTIVITY_TO_EXPENSE_CATEGORY,
  EXPENSE_CATEGORY_GRID,
  expenseCategoryIcon,
  expenseCategoryLabel,
} from "@/lib/expense-styles";
import { formatExpenseDate, formatExpenseTotal, getExpensesTotal, seedExpensesFromTrip } from "@/lib/trip-expenses";
import { formatTHB } from "@/lib/trip-utils";

// Reference-design "การจัดการงบประมาณ" tab: a spend summary, an expense
// ledger, and the add-expense + pick-item flows. Companion-related affordances
// (ยอดคงเหลือกลุ่ม/เพิ่มเพื่อนร่วมทริป/การตั้งค่า/ดูการแยกย่อย) stay inert —
// same "not wired up in this demo" pattern as Sidebar.tsx, since there's no
// multi-user backend to back them yet.
const DEMO_DISABLED_TITLE = "ยังไม่เปิดใช้งานในเดโมนี้";

export function BudgetManagementPanel({
  trip,
  onPatch,
}: {
  trip: GeneratedTrip;
  onPatch: (patch: Partial<GeneratedTrip>) => void;
}) {
  const expenses = trip.expenses ?? seedExpensesFromTrip(trip);
  const [sortAsc, setSortAsc] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  function persist(next: TripExpense[]) {
    onPatch({ expenses: next });
  }

  const total = getExpensesTotal(expenses);
  const sorted = [...expenses].sort((a, b) => {
    const da = a.date ?? "";
    const db = b.date ?? "";
    return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold sm:text-2xl">การจัดการงบประมาณ</h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white sm:px-5"
          style={{ backgroundColor: "var(--color-accent-orange)" }}
        >
          <Plus size={16} /> เพิ่มค่าใช้จ่าย
        </button>
      </div>

      <div className="rounded-2xl p-5 sm:p-6" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">{formatExpenseTotal(total)}</p>
            {trip.budgetGoal ? (
              <p className="mt-2 text-xs font-semibold text-[var(--color-muted)]">
                ใช้ไปแล้ว {Math.min(100, Math.round((total / trip.budgetGoal) * 100))}% จากงบ {formatTHB(trip.budgetGoal)}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGoalOpen(true)}
                className="flex items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-sm font-semibold"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Pencil size={14} /> ตั้งงบประมาณ
              </button>
              <span
                title={DEMO_DISABLED_TITLE}
                className="flex cursor-default items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-sm font-semibold opacity-70"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Receipt size={14} /> ยอดคงเหลือกลุ่ม
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-sm font-semibold text-[var(--color-muted)]">
            <span title={DEMO_DISABLED_TITLE} className="flex cursor-default items-center gap-2 opacity-80">
              <List size={16} /> ดูการแยกย่อย
            </span>
            <span title={DEMO_DISABLED_TITLE} className="flex cursor-default items-center gap-2 opacity-80">
              <UserPlus size={16} /> เพิ่มเพื่อนร่วมทริป
            </span>
            <span title={DEMO_DISABLED_TITLE} className="flex cursor-default items-center gap-2 opacity-80">
              <Settings size={16} /> การตั้งค่า
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center gap-1.5 text-lg font-extrabold"
          >
            <ChevronDown size={18} className={`transition-transform ${collapsed ? "-rotate-90" : ""}`} />
            ค่าใช้จ่าย
          </button>
          <button
            type="button"
            onClick={() => setSortAsc((v) => !v)}
            className="flex items-center gap-1 text-sm text-[var(--color-muted)]"
          >
            เรียง: วันที่ ({sortAsc ? "เก่าสุดก่อน" : "ใหม่ล่าสุดก่อน"}) <ChevronDown size={14} />
          </button>
        </div>

        {!collapsed && (
          <div className="flex flex-col rounded-2xl border" style={{ borderColor: "var(--color-border)" }}>
            {sorted.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--color-muted)]">ยังไม่มีค่าใช้จ่าย</p>
            ) : (
              sorted.map((expense, i) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  showDivider={i > 0}
                  onDelete={() => persist(expenses.filter((e) => e.id !== expense.id))}
                />
              ))
            )}
          </div>
        )}
      </div>

      {addOpen && (
        <AddExpenseDialog
          trip={trip}
          onClose={() => setAddOpen(false)}
          onAdd={(expense) => {
            persist([expense, ...expenses]);
            setAddOpen(false);
          }}
        />
      )}
      {goalOpen && (
        <SetBudgetGoalDialog
          trip={trip}
          onClose={() => setGoalOpen(false)}
          onSave={(budgetGoal) => {
            onPatch({ budgetGoal });
            setGoalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ExpenseRow({
  expense,
  showDivider,
  onDelete,
}: {
  expense: TripExpense;
  showDivider: boolean;
  onDelete: () => void;
}) {
  const Icon = expenseCategoryIcon[expense.category];
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
        <p className="truncate text-sm font-bold">{expense.title}</p>
        <p className="text-xs text-[var(--color-muted)]">
          {expense.date ? formatExpenseDate(expense.date) : "ไม่ระบุวันที่"} • {expenseCategoryLabel[expense.category]}
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="ลบค่าใช้จ่าย"
        className="shrink-0 rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
      >
        <Trash2 size={14} />
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-extrabold">{formatTHB(expense.amount)}</span>
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
          title={expense.paidBy}
        >
          {expense.paidBy.charAt(0)}
        </span>
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
};

function AddExpenseDialog({
  trip,
  onClose,
  onAdd,
}: {
  trip: GeneratedTrip;
  onClose: () => void;
  onAdd: (expense: TripExpense) => void;
}) {
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<ExpenseSelection | null>(null);
  const [date, setDate] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const numericAmount = Number(amount.replace(/[^\d.]/g, "")) || 0;
  const SelectedIcon = selected ? expenseCategoryIcon[selected.category] : Receipt;

  function handleSave() {
    if (numericAmount <= 0) return;
    onAdd({
      id: crypto.randomUUID(),
      title: selected?.title ?? "ค่าใช้จ่ายอื่นๆ",
      amount: numericAmount,
      category: selected?.category ?? "other",
      date: date || undefined,
      paidBy: "คุณ",
      splitLabel: "ไม่แบ่ง",
      linkedActivityId: selected?.linkedActivityId,
    });
  }

  if (pickerOpen) {
    return (
      <SelectExpenseItemDialog
        trip={trip}
        onClose={onClose}
        onBack={() => setPickerOpen(false)}
        onSelect={(next) => {
          setSelected(next);
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
        <button
          type="button"
          onClick={handleSave}
          disabled={numericAmount <= 0}
          className="w-full rounded-full py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent-orange)" }}
        >
          บันทึก
        </button>
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
                  onClick={() => onSelect({ title: item.title, category: item.category, linkedActivityId: item.id })}
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
  onClose,
  onSave,
}: {
  trip: GeneratedTrip;
  onClose: () => void;
  onSave: (budgetGoal: number) => void;
}) {
  const [value, setValue] = useState(trip.budgetGoal ? String(trip.budgetGoal) : "");

  function handleSave() {
    const numeric = Number(value.replace(/[^\d.]/g, "")) || 0;
    if (numeric <= 0) return;
    onSave(numeric);
  }

  return (
    <DialogShell
      title="ตั้งงบประมาณ"
      onClose={onClose}
      footer={
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
            disabled={!value.trim()}
            className="flex-1 rounded-full py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            บันทึก
          </button>
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
