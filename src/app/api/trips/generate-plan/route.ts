import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL ?? "https://travel-planner-api-git-909858882015.asia-northeast3.run.app";

// Proxies the external trip-generation API. Not streaming — this blocks for
// 10-30s+ (real place search + model call + up to 3 auto-repair attempts),
// so this route intentionally sets no timeout of its own.
export async function POST(request: NextRequest) {
  const body = await request.text();

  const response = await fetch(new URL("/trips/plan/generate", EXTERNAL_API_BASE_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body,
  });

  // See src/app/api/places/search/route.ts for why this can't just be
  // response.json() — the ngrok tunnel serves an HTML error page (not the
  // documented JSON error shape) if its own backend is unreachable.
  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Trip generation request failed", detail: text.slice(0, 500) },
      { status: 502 }
    );
  }
}
