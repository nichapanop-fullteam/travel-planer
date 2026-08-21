import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// firebase/auth's getAuth() throws immediately at module-load time without a
// real project config (NEXT_PUBLIC_FIREBASE_*), which none of these unit
// tests set up — every test that transitively imports AuthProvider (almost
// all of them, via useAuth) would otherwise fail before its own assertions
// even run. Only `auth` is ever imported from this module elsewhere.
vi.mock("@/lib/firebase", () => ({
  auth: {},
  firebaseApp: {},
  getFirebaseAnalytics: async () => null,
}));
