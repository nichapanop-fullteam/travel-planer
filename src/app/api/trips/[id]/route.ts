import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL ?? "https://travel-planner-api-git-909858882015.asia-northeast3.run.app";

// Proxies GET /trips/:id — same CORS-workaround reasoning as ../route.ts.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authHeader = request.headers.get("authorization");

  const response = await fetch(new URL(`/trips/${id}`, EXTERNAL_API_BASE_URL), {
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });

  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to load trip", detail: text.slice(0, 500) }, { status: 502 });
  }
}
