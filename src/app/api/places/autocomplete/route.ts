import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_PLACES_API_BASE_URL =
  process.env.EXTERNAL_PLACES_API_BASE_URL ?? "https://zips-wrinkle-rigid.ngrok-free.dev";

// Proxies the external Places Autocomplete API — the destination-only,
// no-DB-write, cheap-per-keystroke sibling of /places/search (see
// src/app/api/places/search/route.ts, which returns POIs and upserts into
// the places table on every call — wrong tool for a typeahead). Called as
// GET /api/places/autocomplete?q=...&sessionToken=...
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const sessionToken = request.nextUrl.searchParams.get("sessionToken");

  if (!q) {
    return NextResponse.json({ error: "Missing required query param: q" }, { status: 400 });
  }

  const url = new URL("/places/autocomplete", EXTERNAL_PLACES_API_BASE_URL);
  url.searchParams.set("q", q);
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);

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
      { error: "Places Autocomplete request failed", detail: text.slice(0, 500) },
      { status: 502 }
    );
  }
}
