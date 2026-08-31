import type { MetadataRoute } from "next";

// The web app manifest, served by Next at /manifest.webmanifest. Written as a
// route rather than a static public/manifest.json so the values that also
// appear in metadata (name, theme colour) sit next to typed fields and stay in
// one language the rest of the app already speaks.
//
// `display: "standalone"` is what drops the browser chrome once installed —
// combined with MobileBottomNav's fixed tab bar it is the whole reason the
// installed app reads as an app. `id` is pinned so a future change to
// `start_url` does not make Chrome treat the install as a different app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PunGuide — Social Travel Planning",
    short_name: "PunGuide",
    description:
      "วางแผนทริป แชร์กับเพื่อน และเก็บทุกไอเดียการเดินทางไว้ในที่เดียว",
    lang: "th",
    dir: "ltr",
    start_url: "/main",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Matches --color-primary / --color-page-cream in globals.css. theme_color
    // tints the Android status bar; background_color is the splash screen the
    // OS paints before the first frame renders, so it is the page cream rather
    // than the brand green to avoid a colour flash into the feed.
    theme_color: "#2a9e64",
    background_color: "#f3ecdd",
    categories: ["travel", "lifestyle", "social"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Separate maskable art — the "any" icons keep the rounded-square badge
      // from src/app/icon.svg, which Android would crop into on adaptive
      // launchers. These two carry the same mark on a full-bleed field with the
      // safe-zone padding the maskable spec asks for.
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "สร้างทริปใหม่", short_name: "สร้างทริป", url: "/create-trip" },
      { name: "ทริปของฉัน", short_name: "ทริปของฉัน", url: "/my-trips" },
      { name: "ค้นหา", short_name: "ค้นหา", url: "/search" },
    ],
  };
}
