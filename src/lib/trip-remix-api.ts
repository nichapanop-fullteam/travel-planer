import { authenticatedFetch, BackendAuthenticationError } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";

// POST /trips/:sourceTripId/remix — NOT yet implemented on the backend as of
// this writing (no such route exists in the API docs this app codes
// against). This client is built against the agreed contract so the
// frontend flow is ready the moment the backend ships it; until then every
// call here will fail with a network/404 error, surfaced through
// RemixApiError("server"/"not_found") like any other unreachable endpoint.
export interface RemixTripRequest {
  title: string;
  startDate: string; // ISO date, "2026-09-12"
  endDate: string; // ISO date — computed client-side from startDate + source duration
  travelerCount: number;
  copyNotes: boolean;
  copyBudget: boolean;
}

// Response shape kept loose (like CreateTripResponse in trips-create-api.ts)
// — this app only actually needs `id` to navigate to the new Planner.
export interface RemixTripResponse {
  id: string;
  [key: string]: unknown;
}

export type RemixErrorKind =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "server";

export class RemixApiError extends Error {
  kind: RemixErrorKind;
  expectedDurationDays?: number;
  // Set only for a 409 whose body echoes back the trip already created for
  // this Idempotency-Key — lets the caller treat the retry as a success.
  existingTripId?: string;

  constructor(kind: RemixErrorKind, message: string, expectedDurationDays?: number) {
    super(message);
    this.name = "RemixApiError";
    this.kind = kind;
    this.expectedDurationDays = expectedDurationDays;
  }
}

async function readExpectedDurationDays(response: Response): Promise<number | undefined> {
  try {
    const body = (await response.clone().json()) as { expectedDurationDays?: number; durationDays?: number };
    const value = body.expectedDurationDays ?? body.durationDays;
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

// Never send ownerId/userId — ownership is derived server-side from the
// Bearer token attached by authenticatedFetch, same as every other
// authenticated mutation in this app (see createTripOnServer).
export async function remixTrip(
  sourceTripId: string,
  payload: RemixTripRequest,
  idempotencyKey: string
): Promise<RemixTripResponse> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${BACKEND_URL}/trips/${sourceTripId}/remix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // authenticatedFetch throws BackendAuthenticationError (rather than
    // returning a 401 response) once its own refresh-and-retry has been
    // exhausted — everything else (network failure, etc.) is a generic
    // server error from this caller's point of view.
    if (error instanceof BackendAuthenticationError) {
      throw new RemixApiError("unauthorized", "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
    }
    throw new RemixApiError("server", "สร้างทริปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }

  if (response.ok) return (await response.json()) as RemixTripResponse;

  if (response.status === 400) {
    const expectedDurationDays = await readExpectedDurationDays(response);
    return Promise.reject(
      new RemixApiError(
        "validation",
        expectedDurationDays != null
          ? `จำนวนวันที่เลือกไม่ตรงกับแผนต้นฉบับ กรุณาเลือกช่วงเวลา ${expectedDurationDays} วัน`
          : "จำนวนวันที่เลือกไม่ตรงกับแผนต้นฉบับ",
        expectedDurationDays
      )
    );
  }
  if (response.status === 403) {
    throw new RemixApiError("forbidden", "ไม่สามารถนำแผนส่วนตัวนี้ไปใช้ได้");
  }
  if (response.status === 404) {
    throw new RemixApiError("not_found", "ไม่พบแผนต้นฉบับ หรือแผนอาจถูกลบแล้ว");
  }
  if (response.status === 409) {
    // Idempotency-key replay: the backend may echo back the trip that was
    // already created for this key so the caller can just use it instead
    // of erroring — read `id` the same speculative way readExpectedDurationDays
    // reads the 400 body, and attach it so the hook can treat this as a
    // success rather than a conflict when it's present.
    const error = new RemixApiError("conflict", "คำขอนี้ถูกส่งไปแล้ว กำลังตรวจสอบทริปที่สร้างไว้...");
    try {
      const body = (await response.clone().json()) as { id?: string };
      error.existingTripId = body.id;
    } catch {
      // no body / not JSON — existingTripId stays unset, handled as a plain conflict.
    }
    throw error;
  }
  throw new RemixApiError("server", "สร้างทริปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
}
