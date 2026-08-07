import { NextRequest, NextResponse } from "next/server";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
  "places.primaryType",
].join(",");

// Proxies Places Text Search (New) so the server API key is never exposed to
// the browser. Called as GET /api/places/search?q=ร้านอาหารในหลวงพระบาง
export async function GET(request: NextRequest) {
  const textQuery = request.nextUrl.searchParams.get("q");

  if (!textQuery) {
    return NextResponse.json({ error: "Missing required query param: q" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GOOGLE_MAPS_SERVER_API_KEY" }, { status: 500 });
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, languageCode: "th" }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Places Text Search failed", detail }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
