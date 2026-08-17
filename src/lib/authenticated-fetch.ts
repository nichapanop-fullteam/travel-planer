import { BACKEND_URL } from "@/lib/backend-url";
import {
  clearBackendSession,
  getBackendAccessToken,
  setBackendSession,
  setBackendAccessToken,
  type BackendProfile,
} from "@/lib/backend-user";

export class BackendAuthenticationError extends Error {
  constructor() {
    super("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
    this.name = "BackendAuthenticationError";
  }
}

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "ngrok-skip-browser-warning": "1" },
    });

    if (response.status === 401) throw new BackendAuthenticationError();
    if (!response.ok) throw new Error(`รีเฟรชเซสชันไม่สำเร็จ (${response.status})`);
    const body = (await response.json()) as { accessToken?: string };
    if (!body.accessToken) throw new BackendAuthenticationError();
    setBackendAccessToken(body.accessToken);
    return body.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

function withBearer(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("ngrok-skip-browser-warning", "1");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");
  return { ...init, credentials: "include", headers };
}

function expireSession(): never {
  clearBackendSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("backend-auth-expired"));
  }
  throw new BackendAuthenticationError();
}

/** Sends a protected request and retries it at most once after a cookie-based refresh. */
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  let response = await fetch(input, withBearer(init, getBackendAccessToken()));
  if (response.status !== 401) return response;

  let token: string;
  try {
    token = await refreshAccessToken();
  } catch (error) {
    if (error instanceof BackendAuthenticationError) return expireSession();
    throw error;
  }

  response = await fetch(input, withBearer(init, token));
  if (response.status === 401) return expireSession();
  return response;
}

/** Restores the in-memory session from the HTTP-only refresh cookie after a reload. */
export async function restoreBackendSession(): Promise<BackendProfile | null> {
  try {
    const token = await refreshAccessToken();
    const response = await fetch(`${BACKEND_URL}/auth/me`, withBearer({}, token));
    if (response.status === 401) return expireSession();
    if (!response.ok) throw new Error(`โหลดข้อมูลผู้ใช้ไม่สำเร็จ (${response.status})`);
    const profile = (await response.json()) as BackendProfile;
    setBackendSession(token, profile);
    return profile;
  } catch (error) {
    if (error instanceof BackendAuthenticationError) {
      clearBackendSession();
      return null;
    }
    throw error;
  }
}
