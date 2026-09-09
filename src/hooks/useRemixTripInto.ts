"use client";

import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  remixTripInto,
  RemixApiError,
  type RemixIntoTripResponse,
} from "@/lib/trip-remix-api";

// Sibling of useRemixTrip for the "Add to trip" branch of the Remix menu.
// Much smaller, because the endpoint behind it takes no form: there is
// nothing to validate client-side, no trip shell to build (the target trip
// already exists on the server and /generated-plan/[id] refetches it), and
// no new id to carry — the id that comes back is the target the visitor
// picked.
export type RemixIntoStatus =
  | "idle"
  | "submitting"
  | "success"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "error";

export interface RemixIntoOptions {
  copyNotes: boolean;
  copyBudget: boolean;
}

export function useRemixTripInto() {
  const { backendUser } = useAuth();
  const [status, setStatus] = useState<RemixIntoStatus>("idle");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<RemixIntoTripResponse | undefined>(undefined);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  // Call when the dialog opens so a second attempt after closing never
  // replays the first attempt's key — a replay answers `replayed: true` and
  // appends nothing, which would look like a silent no-op to the visitor.
  const reset = useCallback(() => {
    setStatus("idle");
    setMessage(undefined);
    setResult(undefined);
    idempotencyKeyRef.current = crypto.randomUUID();
  }, []);

  const submit = useCallback(
    async (sourceTripId: string, targetTripId: string, options: RemixIntoOptions) => {
      // Ref, not state, for the same reason as useRemixTrip: a second click
      // landing before setStatus("submitting") commits still sees it.
      if (submittingRef.current) return;

      if (!backendUser) {
        setStatus("unauthorized");
        setMessage("กรุณาเข้าสู่ระบบก่อนเพิ่มแผนลงทริป");
        return;
      }

      submittingRef.current = true;
      setStatus("submitting");
      setMessage(undefined);

      try {
        const response = await remixTripInto(
          sourceTripId,
          targetTripId,
          { copyNotes: options.copyNotes, copyBudget: options.copyBudget },
          idempotencyKeyRef.current
        );
        setResult(response);
        setStatus("success");
      } catch (error) {
        if (error instanceof RemixApiError) {
          const statusByKind: Record<RemixApiError["kind"], RemixIntoStatus> = {
            // Only reachable if the grid somehow offered the source trip
            // itself — treated as a plain error, there is no field to
            // highlight.
            validation: "error",
            unauthorized: "unauthorized",
            forbidden: "forbidden",
            not_found: "not_found",
            // This route never answers 409; mapped for exhaustiveness.
            conflict: "error",
            server: "error",
          };
          setStatus(statusByKind[error.kind]);
          setMessage(error.message);
        } else {
          setStatus("error");
          setMessage("เพิ่มแผนลงทริปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        submittingRef.current = false;
      }
    },
    [backendUser]
  );

  return { status, message, result, submit, reset };
}
