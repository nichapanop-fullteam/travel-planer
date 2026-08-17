import { BACKEND_URL } from "@/lib/backend-url";
import {
  clearBackendSession,
  getBackendProfile,
  setBackendSession,
  type BackendProfile,
} from "@/lib/backend-user";
import type { User } from "@/types";

type AuthResult = { ok: true; user: User } | { ok: false; error: string };

function toUser(profile: BackendProfile): User {
  const timestamp = new Date().toISOString();
  return {
    id: profile.id,
    name: profile.name || "ผู้ใช้ PunGuide",
    email: profile.email || "",
    avatarUrl: profile.avatarUrl,
    role: "traveler",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("message" in body)) return fallback;
  const message = (body as { message: unknown }).message;
  return Array.isArray(message) ? message.map(String).join("\n") : String(message);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function getCurrentUser(): User | null {
  const profile = getBackendProfile();
  return profile ? toUser(profile) : null;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "ngrok-skip-browser-warning": "1" },
    });
  } finally {
    clearBackendSession();
  }
}

export async function loginWithEmail(username: string, password: string): Promise<AuthResult> {
  if (!username.trim()) return { ok: false, error: "กรุณากรอกชื่อผู้ใช้" };
  if (!password) return { ok: false, error: "กรุณากรอกรหัสผ่าน" };
  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const body = await readJson(response);
    if (!response.ok) return { ok: false, error: errorMessage(body, "เข้าสู่ระบบไม่สำเร็จ") };
    const session = body as { accessToken: string; expiresIn: string; user: BackendProfile };
    setBackendSession(session.accessToken, session.user);
    return { ok: true, user: toUser(session.user) };
  } catch {
    return { ok: false, error: "เชื่อมต่อบริการเข้าสู่ระบบไม่ได้" };
  }
}

export async function createProfile(input: { username: string; password: string }): Promise<AuthResult> {
  try {
    const register = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
      body: JSON.stringify({ username: input.username.trim(), password: input.password }),
    });
    const registerBody = await readJson(register);
    if (!register.ok) return { ok: false, error: errorMessage(registerBody, "สร้างบัญชีไม่สำเร็จ") };
    return loginWithEmail(input.username, input.password);
  } catch {
    return { ok: false, error: "เชื่อมต่อบริการสมัครสมาชิกไม่ได้" };
  }
}
