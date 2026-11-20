"use server";

import { redirect } from "next/navigation";
import {
  authenticateCredentials,
  clearSessionCookie,
  createSessionToken,
  getSafeCallbackUrl,
  setSessionCookie,
} from "@/lib/auth";

/**
 * Server Action untuk login terpusat 4 role (Admin, Karyawan, Ketua Divisi, HRD).
 * Menerima objek payload maupun FormData, memverifikasi kredensial ke PostgreSQL,
 * menyetel HttpOnly JWT Cookie (1 hari / 7 hari), lalu redirect ke dashboard.
 */
export async function loginAction(input) {
  let identifier = "";
  let password = "";
  let rememberMe = false;
  let callbackUrl = "";

  if (input instanceof FormData) {
    identifier = String(input.get("identifier") || "");
    password = String(input.get("password") || "");
    rememberMe =
      input.get("rememberMe") === "on" || input.get("rememberMe") === "true";
    callbackUrl = String(input.get("callbackUrl") || "");
  } else if (input && typeof input === "object") {
    identifier = String(input.identifier || "");
    password = String(input.password || "");
    rememberMe = Boolean(input.rememberMe);
    callbackUrl = String(input.callbackUrl || "");
  }

  let authResult;
  try {
    authResult = await authenticateCredentials(identifier, password);
  } catch (error) {
    console.error("Login database/auth error:", error);
    return {
      error:
        "Tidak dapat memproses login saat ini. Pastikan layanan database aktif lalu coba kembali.",
    };
  }

  if (!authResult.ok) {
    return {
      error: authResult.error,
      fieldErrors: authResult.fieldErrors || null,
    };
  }

  const token = await createSessionToken(authResult.user, rememberMe);
  await setSessionCookie(token, rememberMe);

  const destination = getSafeCallbackUrl(callbackUrl, authResult.user.role);
  redirect(destination);
}

/**
 * Server Action untuk keluar dari sesi (menghapus cookie JWT dan kembali ke /login).
 */
export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login?reason=logged_out");
}
