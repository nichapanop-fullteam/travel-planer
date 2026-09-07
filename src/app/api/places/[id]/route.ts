import { NextRequest, NextResponse } from "next/server";

import { rateLimitHeaders, upstreamHeaders } from "@/lib/proxy-auth";

const EXTERNAL_API_BASE_URL =
  process.env.EXTERNAL_API_BASE_URL ?? "https://travel-planner-api-git-909858882015.asia-northeast3.run.app";

// Proxies GET /places/:id so detail dialogs can hydrate a place lazily without
// exposing the external service directly to the browser.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(`/places/${encodeURIComponent(id)}`, EXTERNAL_API_BASE_URL);
  const response = await fetch(url, {
    headers: upstreamHeaders(request),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Place details request failed", detail }, { status: response.status });
  }

  return NextResponse.json(await response.json(), { headers: rateLimitHeaders(response) });
}
