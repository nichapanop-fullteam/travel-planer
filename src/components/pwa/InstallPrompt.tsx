"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Chrome's install event, which TypeScript's DOM lib still does not ship.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "punguide.installPromptDismissed";

// An "add to home screen" card, shown only once the browser has told us the app
// is actually installable — no banner on iOS Safari (which never fires the
// event) and none when the app is already installed, since the event does not
// fire there either. That is the whole reason this listens for
// `beforeinstallprompt` instead of sniffing user agents.
//
// Sits above MobileBottomNav's fixed bar (bottom-24 through the tablet
// breakpoint) so it never covers the tabs, and a dismissal is remembered so the
// card asks once rather than on every visit.
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      // Private mode / blocked storage: fall through and just show the card.
    }

    const onPrompt = (event: Event) => {
      // Suppress Chrome's own mini-infobar so this card is the only ask.
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstallEvent(null));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!installEvent) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do — worst case the card returns on the next visit.
    }
    setInstallEvent(null);
  };

  const install = async () => {
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
        <p className="truncate text-xs text-[var(--color-muted)]">
          เปิดเต็มจอ ใช้ได้เร็วขึ้น เหมือนแอป
        </p>
      </div>
      <Button onClick={install} className="shrink-0 px-4">
        ติดตั้ง
      </Button>
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
