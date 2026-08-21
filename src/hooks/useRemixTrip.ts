"use client";

import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { emptyDays, saveGeneratedTrip } from "@/lib/generated-trips";
import { remixTrip, RemixApiError, type RemixTripRequest } from "@/lib/trip-remix-api";
import type { GeneratedTrip } from "@/types";

export type RemixStatus =
  | "idle"
  | "validation_error"
  | "submitting"
  | "success"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "duration_mismatch"
  | "conflict"
  | "error";

export interface RemixFormValues {
  title: string;
  startDate: string; // ISO date, "2026-09-12"
  travelerCount: number;
  copyNotes: boolean;
  copyBudget: boolean;
}

export interface RemixSourceMeta {
  sourceTripId: string;
  sourceTitle: string;
  sourceCreatorName?: string;
  sourceDurationDays: number;
}

// Exported so RemixSetupDialog can show the computed end date without
// duplicating this logic.
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validate(values: RemixFormValues): string | null {
  if (!values.title.trim()) return "กรุณากรอกชื่อทริป";
  if (!values.startDate) return "กรุณาเลือกวันเริ่มต้น";
  if (!Number.isFinite(values.travelerCount) || values.travelerCount < 1) return "จำนวนผู้เดินทางต้องมากกว่า 0";
  return null;
}

// Builds a fresh, minimal local shell for the new trip — never derived from
// (or sharing references with) the source GeneratedTrip. It only exists so
// /generated-plan/[newId] has something to paint instantly and so saving it
// fires TRIPS_CHANGED_EVENT (see lib/generated-trips.ts) for My Trips to
// refresh; the page's own mount effect always refetches GET /trips/:id
// afterward and lets that backend copy win, same as any other trip created
// on the server without a local draft behind it.
function buildRemixedTripShell(
  newTripId: string,
  values: RemixFormValues,
  source: RemixSourceMeta
): GeneratedTrip {
  return {
    id: newTripId,
    draftId: newTripId,
    createdAt: new Date().toISOString(),
    title: values.title.trim(),
    destination: "",
    coverImageUrl: "/images/hero-mountain.jpg",
    durationLabel: `${source.sourceDurationDays} วัน ${Math.max(source.sourceDurationDays - 1, 0)} คืน`,
    paceLabel: "ยังไม่ระบุ",
    budgetLabel: "ยังไม่ระบุ",
    conditionsLabel: "ไม่มีเงื่อนไขพิเศษ",
    styles: [],
    status: "generated",
    days: emptyDays(`${source.sourceDurationDays} วัน`, values.startDate),
    backendSynced: true,
    remixedFrom: {
      sourceTripId: source.sourceTripId,
      sourceTitle: source.sourceTitle,
      sourceCreatorName: source.sourceCreatorName,
    },
  };
}

export function useRemixTrip() {
  const { backendUser } = useAuth();
  const [status, setStatus] = useState<RemixStatus>("idle");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [expectedDurationDays, setExpectedDurationDays] = useState<number | undefined>(undefined);
  const [newTripId, setNewTripId] = useState<string | undefined>(undefined);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  // Call when the dialog opens (fresh attempt) so a resubmit after closing
  // and reopening never reuses a stale Idempotency-Key.
  const reset = useCallback(() => {
    setStatus("idle");
    setMessage(undefined);
    setExpectedDurationDays(undefined);
    setNewTripId(undefined);
    idempotencyKeyRef.current = crypto.randomUUID();
  }, []);

  const submit = useCallback(
    async (values: RemixFormValues, source: RemixSourceMeta) => {
      // Double-click / rapid resubmit guard — a ref (not state) so a second
      // click that fires before the first setStatus("submitting") commits
      // still sees it.
      if (submittingRef.current) return;

      const validationError = validate(values);
      if (validationError) {
        setStatus("validation_error");
        setMessage(validationError);
        return;
      }

      // Hard requirement: never call the Remix API before auth is confirmed.
      if (!backendUser) {
        setStatus("unauthorized");
        setMessage("กรุณาเข้าสู่ระบบก่อนสร้างทริป");
        return;
      }

      submittingRef.current = true;
      setStatus("submitting");
      setMessage(undefined);

      const endDate = addDays(values.startDate, Math.max(source.sourceDurationDays - 1, 0));
      const payload: RemixTripRequest = {
        title: values.title.trim(),
        startDate: values.startDate,
        endDate,
        travelerCount: values.travelerCount,
        copyNotes: values.copyNotes,
        copyBudget: values.copyBudget,
      };

      try {
        const response = await remixTrip(source.sourceTripId, payload, idempotencyKeyRef.current);
        saveGeneratedTrip(buildRemixedTripShell(response.id, values, source));
        setNewTripId(response.id);
        setStatus("success");
      } catch (error) {
        if (error instanceof RemixApiError) {
          if (error.kind === "conflict" && error.existingTripId) {
            // Idempotency replay that echoed back the trip already created
            // for this key — use it instead of surfacing an error.
            setNewTripId(error.existingTripId);
            setStatus("success");
          } else {
            const statusByKind: Record<Exclude<RemixApiError["kind"], never>, RemixStatus> = {
              validation: "duration_mismatch",
              unauthorized: "unauthorized",
              forbidden: "forbidden",
              not_found: "not_found",
              conflict: "conflict",
              server: "error",
            };
            setStatus(statusByKind[error.kind]);
            setMessage(error.message);
            setExpectedDurationDays(error.expectedDurationDays);
          }
        } else {
          setStatus("error");
          setMessage("สร้างทริปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        submittingRef.current = false;
      }
    },
    [backendUser]
  );

  return { status, message, expectedDurationDays, newTripId, submit, reset };
}
