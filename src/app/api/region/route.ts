import { NextResponse } from "next/server";
import { REGION_COOKIE_NAME, isSupportedRegion } from "@/lib/regions";

// Region selection isn't tied to a user account — it's a lightweight
// display preference, so a cookie is enough; no need to add a column to
// the User table for it.
export async function POST(request: Request) {
  const { region } = await request.json();

  if (typeof region !== "string" || !isSupportedRegion(region)) {
    return NextResponse.json({ error: "Invalid region" }, { status: 400 });
  }

  const response = NextResponse.json({ region });
  response.cookies.set(REGION_COOKIE_NAME, region, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
  return response;
}
