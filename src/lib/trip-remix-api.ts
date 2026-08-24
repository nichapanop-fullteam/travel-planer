import { authenticatedFetch, BackendAuthenticationError } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";

// POST /trips/:sourceTripId/remix — matches RemixTripRequestDto on the
// backend (see remix-trip.request.dto.ts). startDate/endDate are sent as a
// pair or omitted entirely; this client always computes and sends both once
// a start date is picked (see useRemixTrip's addDays).
export interface RemixTripRequest {
  title: string;
  startDate: string; // ISO date, "2026-09-12"
  endDate: string; // ISO date — computed client-side from startDate + source duration
  travelerCount: number;
  copyNotes: boolean;
  copyBudget: boolean;
}

// Matches RemixTripResponseDto on the backend — deliberately narrow (no
// budget, no media, no schedule breakdown). `sourceTrip` is the one place
// this app gets the source's title/owner name for the "Remix จาก ..." banner
// without a second request — see buildRemixedTripShell in useRemixTrip.ts
// and the sourceTripId-only fallback in generated-trips.ts for why every
// other trip response can't provide it.
export interface RemixTripResponse {
  id: string;
  ownerId: string;
  title: string;
  planMode: string;
  status: string;
  visibility: "private" | "public";
  sourceTrip: {
    id: string;
    title: string;
    ownerId: string;
    ownerDisplayName?: string;
  };
  createdAt: string;
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

// The real 400 body is Nest's plain BadRequestException shape — no
// dedicated numeric field, just a message string: "New duration (N day(s))
// must match the source trip's duration (M day(s))" (see
// assertCompatibleDuration on the backend). M — the count the caller needs
// to match — is pulled out of that sentence; a mismatched startDate/endDate
// pair with no day count in the message (e.g. only one of the two sent)
// leaves this undefined and the caller falls back to a generic message.
async function readExpectedDurationDays(response: Response): Promise<number | undefined> {
  try {
    const body = (await response.clone().json()) as { message?: string };
    const match = body.message?.match(/source trip'?s duration \((\d+)\s*day/i);
    const value = match ? Number(match[1]) : undefined;
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
    // Not what a same-key retry actually does on the backend today — that
    // replays transparently as a normal 201 with the original trip (see
    // TripsService.remixTrip's idempotency fast path), never a 409. Kept as
    // a defensive fallback in case a future backend change (or a proxy in
    // front of it) ever does surface a real conflict here: read `id` the
    // same speculative way readExpectedDurationDays reads the 400 body, and
    // attach it so the hook can treat this as a success rather than a
    // conflict when it's present.
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
