import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_PLACES_API_BASE_URL =
  process.env.EXTERNAL_PLACES_API_BASE_URL ?? "https://zips-wrinkle-rigid.ngrok-free.dev";

// Proxies the external Places Details API server-side so the browser never
// has to deal with the ngrok tunnel's CORS policy or browser-warning
// interstitial directly. Called as
// GET /api/places/details?externalRef=...&sessionToken=...
export async function GET(request: NextRequest) {
  const externalRef = request.nextUrl.searchParams.get("externalRef");
  const sessionToken = request.nextUrl.searchParams.get("sessionToken");

  if (!externalRef || !sessionToken) {
    return NextResponse.json(
      { error: "Missing required query params: externalRef, sessionToken" },
      { status: 400 }
    );
  }

  const url = new URL("/places/details", EXTERNAL_PLACES_API_BASE_URL);
  url.searchParams.set("externalRef", externalRef);
  url.searchParams.set("sessionToken", sessionToken);

  const response = await fetch(url, {
    // ngrok-free.dev tunnels serve an HTML warning page to browser-looking
    // requests unless this header is set.
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Places Details request failed", detail }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
