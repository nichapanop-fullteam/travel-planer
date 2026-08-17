import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE_URL =
  process.env.EXTERNAL_API_BASE_URL ?? "https://travel-planner-api-git-909858882015.asia-northeast3.run.app";

// Proxies the external Places Search API so the browser never needs a
// Google Maps API key for this feature — the ngrok backend holds its own
// key and does the Google call server-side. Called as
// GET /api/places/search?q=...&limit=...
// Param validation (q required/≤200 chars, limit 1-20) and error shapes
// (400/502/503) are enforced upstream — we just forward them through.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const limit = request.nextUrl.searchParams.get("limit");

  if (!q) {
    return NextResponse.json({ error: "Missing required query param: q" }, { status: 400 });
  }

  const url = new URL("/places/search", EXTERNAL_API_BASE_URL);
  url.searchParams.set("q", q);
  if (limit) url.searchParams.set("limit", limit);

  const response = await fetch(url, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  // The upstream contract promises JSON errors, but that only holds once
  // the API itself is reachable — if the ngrok tunnel can't reach its
  // backend at all, it serves its own HTML error page instead, which would
  // otherwise throw here and surface as an opaque 500.
  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Places Search request failed", detail: text.slice(0, 500) },
      { status: 502 }
    );
  }
}
