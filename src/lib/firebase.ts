import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";

// punguide-65ad8 project — values come from NEXT_PUBLIC_* env vars (see
// .env.local) rather than being hardcoded, so this can point at a different
// Firebase project per environment without editing code.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Reuse the existing app across Next.js hot reloads / repeated imports —
// initializeApp() throws if called twice for the same app.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

// Default persistence (indexedDBLocalPersistence) opens an IndexedDB
// connection that Turbopack's dev-mode Fast Refresh can tear down mid-use —
// surfaces as a stray "Database is closing/hidden" console error right
// after sign-in, harmless but noisy. Switching to plain localStorage avoids
// that IndexedDB layer entirely.
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// Analytics needs `window` and isn't supported everywhere (e.g. Safari
// private browsing), so it's resolved lazily/async instead of at module
// load — this file is imported from both client and server code, and a
// top-level getAnalytics() call would throw during server rendering.
let analyticsPromise: Promise<Analytics | null> | null = null;
export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null));
  }
  return analyticsPromise;
}
