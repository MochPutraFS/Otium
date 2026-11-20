import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  authenticateCredentials,
  buildSessionCookieOptions,
  createSessionToken,
} from "@/lib/auth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format payload JSON tidak valid." },
      { status: 400 }
    );
  }

  const identifier = body?.identifier ?? body?.email ?? body?.username ?? "";
  const password = body?.password ?? "";
  const rememberMe = Boolean(body?.rememberMe);

  try {
    const authResult = await authenticateCredentials(identifier, password);

    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const token = await createSessionToken(authResult.user, rememberMe);
    const response = NextResponse.json(
      {
        success: true,
        user: authResult.user,
      },
      { status: 200 }
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      buildSessionCookieOptions(rememberMe)
    );

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat memverifikasi akun." },
      { status: 500 }
    );
  }
}
