import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildClearSessionCookieOptions,
} from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    buildClearSessionCookieOptions()
  );
  return response;
}
