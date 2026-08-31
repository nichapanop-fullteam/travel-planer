"use client";

import { useEffect } from "react";

// Registers public/sw.js once the page has settled.
//
// Mounted from the root layout so every route gets the worker, and rendering
// nothing so it costs no layout. Registration waits for `load` because a
// service worker install competes with the first paint for bandwidth otherwise.
//
// Development is skipped: Turbopack serves uncached, ever-changing chunk URLs,
// and a worker caching them is the classic "why am I seeing an old build"
// afternoon. Test the PWA against `next build && next start`.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // A new worker found on a later visit takes over on the next
        // navigation rather than mid-session — swapping the assets under a
        // trip the user is editing is not worth the freshness.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              installing.postMessage("SKIP_WAITING");
            }
          });
        });
      } catch {
        // A failed registration is not worth surfacing to the user: the app
        // works exactly as it did before the worker existed.
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
