import type { ReactNode } from "react";
import { Logo } from "@/components/common/Logo";

// Shared split-screen shell for /login and /signup — decorative illustration
// panel on the left (hidden on small screens), form content on the right.
// Mirrors the two-pane pattern from the reference design, restyled with
// PunGuide's own brand assets/copy instead of the placeholder illustration.
export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <div
        className="relative hidden w-full max-w-md shrink-0 flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{ backgroundColor: "var(--color-deep-green)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-mountain.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" />

        <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-white/70">{eyebrow}</p>

        <div className="relative">
          <h2 className="text-2xl font-extrabold leading-snug text-white">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">{subtitle}</p>
          <div className="mt-6 flex items-center gap-1.5">
            <span className="h-1.5 w-6 rounded-full bg-white" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 block text-xl" />
          {children}
        </div>
      </div>
    </div>
  );
}

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20.5H24v7.9h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.6-5.6C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path fill="#FF3D00" d="M6.3 14.7l6.5 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.1 8 3l5.6-5.6C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path
        fill="#4CAF50"
        d="M24 44c5.4 0 10.3-2 13.9-5.4l-6.4-5.4C29.4 34.8 26.8 36 24 36c-5.3 0-9.7-3.2-11.3-7.7l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20.5H24v7.9h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.4 5.4C41.5 36.4 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
