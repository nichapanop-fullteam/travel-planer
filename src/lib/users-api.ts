import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { BACKEND_URL } from "@/lib/backend-url";
import type { BackendProfile } from "@/lib/backend-user";

// PATCH /users/me and POST /users/me/avatar — both return the same
// AuthUserResponseDto shape as GET /auth/me, so callers can drop the result
// straight into setBackendSession without a separate reconcile step.

// Nest's plain BadRequestException shape: { statusCode, message, error }.
// `message` is either a single string or (for class-validator failures) an
// array of them — surface that directly instead of the raw JSON blob.
function extractMessage(bodyText: string): string | undefined {
  try {
    const body = JSON.parse(bodyText) as { message?: string | string[] };
    if (!body.message) return undefined;
    return Array.isArray(body.message) ? body.message.join(", ") : body.message;
  } catch {
    return undefined;
  }
}

async function parseProfileOrThrow(response: Response, action: string): Promise<BackendProfile> {
  if (response.ok) return response.json();
  const bodyText = await response.text().catch(() => "");
  throw new Error(extractMessage(bodyText) ?? `${action}ไม่สำเร็จ (${response.status} ${response.statusText})`);
}

// PATCH /users/me — name only; username/email are immutable from this API on
// purpose (see the API doc). Empty or >255 chars 400s server-side too, but
// the account page validates client-side first so this rarely round-trips.
export async function updateProfileName(name: string): Promise<BackendProfile> {
  const response = await authenticatedFetch(`${BACKEND_URL}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseProfileOrThrow(response, "บันทึกชื่อ");
}

// POST /users/me/avatar — multipart, field name `file`. JPEG/PNG only, 5MB
// cap (both enforced server-side too). The returned avatarUrl is a fixed,
// per-user storage key (`users/{userId}/avatar.webp`) that a fresh upload
// overwrites in place — the string itself never changes, so the caller must
// cache-bust it (e.g. `avatarUrl + "?t=" + Date.now()`) to see the new image
// without a full page reload.
export async function uploadProfileAvatar(file: File): Promise<BackendProfile> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await authenticatedFetch(`${BACKEND_URL}/users/me/avatar`, {
    method: "POST",
    body: formData,
  });
  return parseProfileOrThrow(response, "อัปโหลดรูปโปรไฟล์");
}
