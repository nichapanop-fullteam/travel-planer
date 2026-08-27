"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Link2, LoaderCircle, RefreshCw, Trash2, TriangleAlert, X } from "lucide-react";
import {
  createShareLink,
  deleteShareLink,
  getShareLink,
  updateShareLink,
  type TripShare,
} from "@/lib/share-api";
import { useToast } from "@/providers/ToastProvider";

// Owner-only dialog behind the "แชร์" button. Mirrors the four owner
// endpoints in lib/share-api.ts: read current state on open, create the link,
// toggle it off/on, reissue it, or delete it.
//
// Deliberately keeps "ปิดลิงก์" (isActive: false) and "ออกลิงก์ใหม่"
// (regenerate) as separate actions with separate wording, because they differ
// in a way that matters for privacy and is easy to get wrong: toggling off
// then on restores the SAME url, so everyone who already has it gets back in.
// Only regenerating (or deleting and creating again) actually cuts off
// previous recipients.
export function ShareTripDialog({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const { showToast } = useToast();

  const [share, setShare] = useState<TripShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // One flag per in-flight mutation so each button shows its own spinner
  // rather than the whole dialog locking up.
  const [busy, setBusy] = useState<null | "create" | "toggle" | "regenerate" | "delete">(null);
  const [copied, setCopied] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // 404 means "never shared", which getShareLink resolves as null — a normal
    // starting state, not an error.
    getShareLink(tripId)
      .then((result) => {
        if (!cancelled) setShare(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError("โหลดสถานะการแชร์ไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || busy) return;
      if (confirmRegenerate) {
        setConfirmRegenerate(false);
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, confirmRegenerate, onClose]);

  const runAction = useCallback(
    async (kind: "create" | "toggle" | "regenerate" | "delete", action: () => Promise<TripShare | null>, successMessage: string) => {
      setBusy(kind);
      try {
        const next = await action();
        setShare(next);
        showToast(successMessage);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setBusy(null);
      }
    },
    [showToast]
  );

  // Not using navigator.clipboard unconditionally: it's undefined on
  // non-secure origins, and the promise rejects when the document isn't
  // focused. Failure surfaces as a toast so the user knows to copy manually
  // rather than pasting nothing.
  async function handleCopy() {
    if (!share) return;
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(share.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกลิงก์แล้วคัดลอกเอง");
    }
  }

  const isLive = Boolean(share?.isActive);

  const dialog = (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-trip-title"
        className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)]/30 px-5 pb-4 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-sel-bg)", color: "var(--color-primary)" }}
            >
              <Link2 size={19} />
            </span>
            <div className="min-w-0">
              <h2 id="share-trip-title" className="text-lg font-bold leading-tight">
                แชร์ทริปนี้
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">ใครมีลิงก์ก็เปิดดูได้ ไม่ต้องเข้าสู่ระบบ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(busy)}
            aria-label="ปิด"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--foreground)] disabled:opacity-60"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <LoaderCircle size={22} className="animate-spin text-[var(--color-primary)]" />
            </div>
          ) : loadError ? (
            <div
              className="flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
            >
              <TriangleAlert size={17} className="mt-0.5 shrink-0" />
              <span>{loadError}</span>
            </div>
          ) : !share ? (
            // Never shared yet.
            <>
              <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                เปิดแชร์แล้วจะได้ลิงก์มา 1 อัน ส่งให้ใครก็เปิดดูแผนได้ทันที คุณยกเลิกลิงก์ได้ตลอดเวลา
                <br />
                <span className="mt-1.5 block text-xs">
                  ผู้ที่เปิดจะเห็นเฉพาะแผนเที่ยว — งบประมาณ โน้ตส่วนตัว ที่พัก และข้อมูลการจอง จะไม่ถูกแชร์
                </span>
              </p>
              <button
                type="button"
                onClick={() => runAction("create", () => createShareLink(tripId), "เปิดแชร์แล้ว")}
                disabled={Boolean(busy)}
                className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--color-deep-green)] hover:shadow-[0_6px_18px_-4px_rgba(42,158,100,0.5)] disabled:opacity-70"
              >
                {busy === "create" ? <LoaderCircle size={16} className="animate-spin" /> : <Link2 size={16} />}
                {busy === "create" ? "กำลังเปิดแชร์..." : "เปิดแชร์และสร้างลิงก์"}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">ลิงก์สำหรับแชร์</span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={
                    isLive
                      ? { backgroundColor: "var(--color-sel-bg)", color: "var(--color-deep-green)" }
                      : { backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }
                  }
                >
                  {isLive ? "เปิดใช้งาน" : "ปิดอยู่"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* readOnly input rather than a <p> so the url can be selected
                    and copied by hand when the clipboard API is unavailable. */}
                <input
                  readOnly
                  value={share.shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label="ลิงก์สำหรับแชร์"
                  className="min-w-0 flex-1 rounded-2xl border px-4 py-3 text-xs text-[var(--foreground)] disabled:opacity-60"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor: isLive ? undefined : "var(--color-surface)",
                    opacity: isLive ? 1 : 0.6,
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!isLive}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-deep-green)] disabled:opacity-40"
                  aria-label="คัดลอกลิงก์"
                >
                  {copied ? <Check size={17} /> : <Copy size={16} />}
                </button>
              </div>

              {!isLive && (
                <p className="text-xs leading-relaxed text-[var(--color-muted)]">
                  ลิงก์นี้ถูกปิดอยู่ ผู้ที่เปิดจะเห็นว่าลิงก์ใช้ไม่ได้ — เปิดใช้งานอีกครั้งได้ด้วยลิงก์เดิม
                </p>
              )}

              <div className="h-px bg-[var(--color-border)]/40" />

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    runAction("toggle", () => updateShareLink(tripId, { isActive: !isLive }), isLive ? "ปิดลิงก์แล้ว" : "เปิดใช้งานลิงก์แล้ว")
                  }
                  disabled={Boolean(busy)}
                  className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface)] disabled:opacity-60"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{isLive ? "ปิดลิงก์ชั่วคราว" : "เปิดใช้งานลิงก์อีกครั้ง"}</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {isLive ? "ใช้ลิงก์เดิม เปิดกลับมาได้ทีหลัง" : "คนที่เคยได้ลิงก์นี้จะกลับเข้าดูได้"}
                    </span>
                  </span>
                  {busy === "toggle" && <LoaderCircle size={16} className="shrink-0 animate-spin" />}
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmRegenerate(true)}
                  disabled={Boolean(busy)}
                  className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface)] disabled:opacity-60"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">ออกลิงก์ใหม่</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      ลิงก์เดิมใช้ไม่ได้ทันที — ใช้เมื่ออยากตัดสิทธิ์คนที่เคยส่งให้
                    </span>
                  </span>
                  {busy === "regenerate" ? (
                    <LoaderCircle size={16} className="shrink-0 animate-spin" />
                  ) : (
                    <RefreshCw size={16} className="shrink-0 text-[var(--color-muted)]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    runAction(
                      "delete",
                      async () => {
                        await deleteShareLink(tripId);
                        return null;
                      },
                      "ยกเลิกการแชร์แล้ว"
                    )
                  }
                  disabled={Boolean(busy)}
                  className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-60"
                  style={{
                    borderColor: "var(--color-danger-border)",
                    backgroundColor: "var(--color-danger-bg)",
                    color: "var(--color-danger)",
                  }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">ยกเลิกการแชร์</span>
                    <span className="block text-xs opacity-80">ลิงก์ตายทันที เปิดแชร์ใหม่ได้แต่จะได้ลิงก์ใหม่</span>
                  </span>
                  {busy === "delete" ? (
                    <LoaderCircle size={16} className="shrink-0 animate-spin" />
                  ) : (
                    <Trash2 size={16} className="shrink-0" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmRegenerate && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4"
          onClick={() => !busy && setConfirmRegenerate(false)}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="regenerate-confirm-title"
            className="w-full max-w-[420px] rounded-3xl bg-white p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
            >
              <RefreshCw size={24} />
            </div>
            <h3 id="regenerate-confirm-title" className="mt-4 text-xl font-bold">
              ออกลิงก์ใหม่?
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              ลิงก์เดิมจะใช้ไม่ได้ทันที ใครที่คุณเคยส่งลิงก์ให้จะเปิดดูไม่ได้อีก
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmRegenerate(false)}
                disabled={Boolean(busy)}
                className="rounded-full border px-4 py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)] disabled:opacity-50"
                style={{ borderColor: "var(--color-border)" }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  await runAction("regenerate", () => updateShareLink(tripId, { regenerate: true }), "ออกลิงก์ใหม่แล้ว");
                  setConfirmRegenerate(false);
                }}
                disabled={Boolean(busy)}
                className="flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--color-danger)" }}
              >
                {busy === "regenerate" ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                ออกลิงก์ใหม่
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(dialog, document.body);
}
