"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Share, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Chrome's install event, which TypeScript's DOM lib still does not ship.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "punguide.installPromptDismissed";

function wasDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Private mode / blocked storage: treat it as never dismissed.
    return false;
  }
}

// True on iPhone/iPad, including iPadOS 13+, which reports itself as a Mac and
// is only distinguishable by the touch points.
function isIOS() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

// True once the site is running from the home screen rather than in a browser
// tab. `navigator.standalone` is iOS's own flag; the media query covers
// everyone else.
function isInstalled() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return iosStandalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

// An "add to home screen" card, in two flavours because the platforms differ in
// kind, not degree:
//
//   - Chrome/Edge (Android, desktop) fire `beforeinstallprompt` when the app
//     qualifies, and hand over an event that opens the real install dialog. One
//     tap, no instructions needed.
//   - iOS has no such event and no API for a site to request installation at
//     all. Safari's Share → "เพิ่มไปยังหน้าจอโฮม" is the only route, so all the
//     card can do there is point at it. That is why this branch sniffs the
//     platform, which the other one deliberately does not: there is no event to
//     wait for.
//
// Neither card shows once the app is installed — `beforeinstallprompt` stops
// firing, and the iOS branch checks display-mode directly.
//
// Sits above MobileBottomNav's fixed bar (bottom-24 through the tablet
// breakpoint) so it never covers the tabs, and a dismissal is remembered so the
// card asks once rather than on every visit.
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Read through useSyncExternalStore rather than an effect: the answer depends
  // on browser APIs that do not exist during SSR, and the server snapshot
  // (false) is what makes the first client render match the server's.
  const showIOSHint = useSyncExternalStore(
    // Nothing to subscribe to — the platform does not change mid-session, and
    // the install itself reloads the page into its own standalone context.
    useCallback(() => () => {}, []),
    useCallback(() => isIOS() && !isInstalled() && !wasDismissed(), []),
    useCallback(() => false, []),
  );

  useEffect(() => {
    if (wasDismissed()) return;

    const onPrompt = (event: Event) => {
      // Suppress Chrome's own mini-infobar so this card is the only ask.
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (dismissed || (!installEvent && !showIOSHint)) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do — worst case the card returns on the next visit.
    }
    setInstallEvent(null);
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    // The event can only be used once, whatever the user chose.
    setInstallEvent(null);
  };

  return (
    <div className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-lg lg:bottom-6">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={44}
        height={44}
        className="rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--foreground)]">
          ติดตั้ง PunGuide
        </p>
        {showIOSHint ? (
          // Not truncated, unlike the Chrome copy: this line is an instruction
          // the user has to follow, so it wraps rather than being cut off.
          <p className="flex flex-wrap items-center gap-x-1 text-xs text-[var(--color-muted)]">
            กด
            <Share className="inline h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>ด้านล่าง แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”</span>
          </p>
        ) : (
          <p className="truncate text-xs text-[var(--color-muted)]">
            เปิดเต็มจอ ใช้ได้เร็วขึ้น เหมือนแอป
          </p>
        )}
      </div>
      {installEvent && (
        <Button onClick={install} className="shrink-0 px-4">
          ติดตั้ง
        </Button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="ปิด"
        className="shrink-0 rounded-full p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-border)]/30"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
