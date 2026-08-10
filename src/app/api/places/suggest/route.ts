import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_PLACES_API_BASE_URL =
  process.env.EXTERNAL_PLACES_API_BASE_URL ?? "https://zips-wrinkle-rigid.ngrok-free.dev";

// Proxies the external Places Suggest API — "what's popular near this
// destination", used once a Destination has coordinates (from
// /api/places/details). Same response shape and DB-upsert cost as
// /places/search (see src/app/api/places/search/route.ts), just keyed by
// coordinates instead of free text. Called as
// GET /api/places/suggest?lat=...&lng=...&radius=...&limit=...
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radius = request.nextUrl.searchParams.get("radius");
  const limit = request.nextUrl.searchParams.get("limit");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing required query params: lat, lng" }, { status: 400 });
  }

  const url = new URL("/places/suggest", EXTERNAL_PLACES_API_BASE_URL);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lng", lng);
  if (radius) url.searchParams.set("radius", radius);
  if (limit) url.searchParams.set("limit", limit);

  const response = await fetch(url, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  // See src/app/api/places/search/route.ts for why this can't just be
  // response.json() — the ngrok tunnel serves an HTML error page (not the
  // documented JSON error shape) if its own backend is unreachable.
  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Places Suggest request failed", detail: text.slice(0, 500) },
      { status: 502 }
    );
  }
}
