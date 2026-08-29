import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
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
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
