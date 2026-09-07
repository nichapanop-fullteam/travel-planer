// POST /auth/firebase (see GoogleLoginButton.tsx) exchanges a Firebase ID
// token for the backend's own session: { accessToken, expiresIn, user: { id,
// username, name, email, avatarUrl } }. From then on, backend API calls use
// this accessToken as the Bearer token — not the Firebase ID token — and
// Trip ownership is derived by the backend exclusively from this token.
export interface BackendProfile {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

let accessToken: string | null = null;
let profile: BackendProfile | null = null;
const listeners = new Set<(profile: BackendProfile | null) => void>();

function purgeLegacyStoredSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("punguide.backendAccessToken");
  window.localStorage.removeItem("punguide.backendProfile");
  window.localStorage.removeItem("punguide.backendUserId");
}

export function getBackendAccessToken(): string | null {
  return accessToken;
}

// Bearer header for the optional-auth routes behind our own /api proxies
// (/api/places/*, /api/trips/generate-plan). Those endpoints work signed out —
// the token only decides whether the external API counts the call against this
// user's rate-limit quota or the bucket everyone shares (see lib/proxy-auth.ts)
// — so this returns an empty object rather than failing when there is no
// session, and deliberately does not go through authenticatedFetch: a 401 from
// one of these is not a sign this user's session expired.
export function optionalAuthHeaders(): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export function setBackendAccessToken(token: string): void {
  accessToken = token;
}

export function getBackendProfile(): BackendProfile | null {
  return profile;
}

export function setBackendSession(token: string, nextProfile: BackendProfile): void {
  setBackendAccessToken(token);
  profile = nextProfile;
  listeners.forEach((listener) => listener(profile));
}

export function clearBackendSession(): void {
  accessToken = null;
  profile = null;
  purgeLegacyStoredSession();
  listeners.forEach((listener) => listener(null));
}

export function subscribeBackendSession(listener: (profile: BackendProfile | null) => void): () => void {
  purgeLegacyStoredSession();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
