import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import "./globals.css";

// One typeface for the whole platform.
//
// This used to be three: Plus Jakarta Sans led the heading stack, DM Sans led
// the body stack, and Noto Sans Thai sat behind both purely as the fallback
// that caught Thai glyphs. Because neither Latin family ships Thai, any line
// mixing the two scripts — which is most of this app — rendered in two
// different faces at once. Noto Sans Thai covers Latin as well, so it leads
// everywhere now and the other two stop being downloaded at all.
//
// No `weight` is passed on purpose: Noto Sans Thai is a variable font, so this
// pulls the whole 100–900 range in one file, which the UI needs (it goes up to
// font-extrabold).
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "PunGuide",
  description: "Social Travel Planning Platform",
  applicationName: "PunGuide",
  manifest: "/manifest.webmanifest",
  icons: {
    // The rest of the set is declared in app/manifest.ts; these two are what
    // browsers read from the document itself, iOS Safari included — it ignores
    // the manifest's icons entirely when saving to the home screen.
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    // iOS's equivalent of the manifest's `display: "standalone"`.
    capable: true,
    title: "PunGuide",
    // Lets the page paint under the status bar, which the app's own top nav
    // already accounts for with its safe-area padding.
    statusBarStyle: "black-translucent",
  },
  // iOS auto-links anything that looks like a phone number, restyling it
  // mid-paragraph — unwanted in trip notes and addresses.
  formatDetection: { telephone: false },
};

// Standalone display needs the viewport locked down the way a native shell is:
// no pinch-zoom-induced layout shifts on the fixed tab bar, and `viewportFit`
// so `env(safe-area-inset-*)` reports real values on notched devices.
export const viewport: Viewport = {
  themeColor: "#2a9e64",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSansThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            {children}
            <InstallPrompt />
          </ToastProvider>
        </AuthProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
