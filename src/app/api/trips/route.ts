import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL ?? "https://travel-planner-api-git-909858882015.asia-northeast3.run.app";

// Proxies GET /trips — the backend doesn't send Access-Control-Allow-Origin
// on this route, so a browser-side fetch straight to EXTERNAL_API_BASE_URL
// gets blocked by CORS (curl/server-to-server calls aren't subject to CORS,
// which is why testing this route with curl "works" but the browser can't
// call it directly). Same proxy pattern as trips/generate-plan/route.ts and
// api/places/*.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  const upstreamUrl = new URL("/trips", EXTERNAL_API_BASE_URL);
  const destination = request.nextUrl.searchParams.get("destination");
  if (destination) upstreamUrl.searchParams.set("destination", destination);

  const response = await fetch(upstreamUrl, {
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });

  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to load trips", detail: text.slice(0, 500) }, { status: 502 });
  }
}
