import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildClearSessionCookieOptions,
  getCurrentUser,
} from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const response = NextResponse.json(
        { error: "Sesi tidak valid atau akun berstatus nonaktif." },
        { status: 401 }
      );
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "",
        buildClearSessionCookieOptions()
      );
      return response;
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data sesi pengguna." },
      { status: 500 }
    );
  }
}
