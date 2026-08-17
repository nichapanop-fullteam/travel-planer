import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE_URL =
  process.env.EXTERNAL_API_BASE_URL ?? "https://travel-planner-api-git-909858882015.asia-northeast3.run.app";

// Proxies the external Places Suggest Sections API — same "what's popular
// near this destination" data as /places/suggest (see
// src/app/api/places/suggest/route.ts), but pre-split into three
// quota-guaranteed buckets (attractions/restaurants/accommodations) instead
// of one popularity-ranked list, so a 3-carousel page doesn't risk an empty
// section. `limit` here is per-section, not overall (default 5, not 10).
// Called as GET /api/places/suggest/sections?lat=...&lng=...&radius=...&limit=...
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radius = request.nextUrl.searchParams.get("radius");
  const limit = request.nextUrl.searchParams.get("limit");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing required query params: lat, lng" }, { status: 400 });
  }

  const url = new URL("/places/suggest/sections", EXTERNAL_API_BASE_URL);
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
      { error: "Places Suggest Sections request failed", detail: text.slice(0, 500) },
      { status: 502 }
    );
  }
}
