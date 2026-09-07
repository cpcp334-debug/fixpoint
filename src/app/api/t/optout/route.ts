import { NextResponse } from "next/server";
import { applyAnalyticsOptOut } from "@/lib/analytics/ingest";

function safeReturnTo(request: Request) {
  const origin = new URL(request.url).origin;
  const ref = request.headers.get("referer");
  if (ref && ref.startsWith(origin)) return ref;
  return `${origin}/en/cookie-policy`;
}

export async function POST(request: Request) {
  return applyAnalyticsOptOut(request);
}

export async function GET(request: Request) {
  return applyAnalyticsOptOut(request, NextResponse.redirect(safeReturnTo(request), 302));
}
