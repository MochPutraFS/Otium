import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSafeCallbackUrl,
  getSessionMaxAge,
  verifySessionToken,
} from "@/lib/jwt";

export {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSafeCallbackUrl,
  getSessionMaxAge,
  verifySessionToken,
};

/**
 * Membangun opsi standar HttpOnly Cookie untuk token sesi.
 * @param {boolean} rememberMe
 */
export function buildSessionCookieOptions(rememberMe = false) {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: getSessionMaxAge(rememberMe),
  };
}

/**
 * Menyimpan cookie sesi JWT di Server Action / Route Handler.
 * @param {string} token
 * @param {boolean} [rememberMe=false]
 */
export async function setSessionCookie(token, rememberMe = false) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    token,
    buildSessionCookieOptions(rememberMe)
  );
}

/**
 * Menghapus cookie sesi JWT saat logout atau sesi tidak aktif.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

/**
 * Membaca payload sesi JWT dari cookie tanpa menyentuh database.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Memverifikasi kredensial login (Email atau Username + Password) menggunakan Raw SQL berparameter
 * dan bcryptjs. Menolak akun dengan is_active = FALSE.
 * @param {string} rawIdentifier
 * @param {string} rawPassword
 */
export async function authenticateCredentials(rawIdentifier, rawPassword) {
  const identifier =
    typeof rawIdentifier === "string" ? rawIdentifier.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";

  if (!identifier || !password) {
    return {
      ok: false,
      status: 400,
      error: "Email/Username dan Password wajib diisi.",
      fieldErrors: {
        identifier: identifier ? "" : "Email atau Username wajib diisi.",
        password: password ? "" : "Password wajib diisi.",
      },
    };
  }

  const sql = `
    SELECT
      u.id,
      u.username,
      u.email,
      u.password_hash,
      u.full_name,
      u.role,
      u.division_id,
      u.is_active,
      d.name AS division_name
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    WHERE LOWER(u.email) = LOWER($1)
       OR LOWER(u.username) = LOWER($1)
    LIMIT 1;
  `;

  const result = await query(sql, [identifier]);
  const user = result.rows[0];

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Email/Username atau Password tidak valid.",
    };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return {
      ok: false,
      status: 401,
      error: "Email/Username atau Password tidak valid.",
    };
  }

  if (!user.is_active) {
    return {
      ok: false,
      status: 403,
      error: "Akun Anda berstatus Nonaktif. Silakan hubungi Administrator.",
    };
  }

  return {
    ok: true,
    status: 200,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      divisionId: user.division_id,
      divisionName: user.division_name || null,
    },
  };
}

/**
 * Mengambil profil lengkap pengguna yang sedang login langsung dari PostgreSQL
 * sekaligus memastikan akun masih berstatus aktif (is_active = TRUE).
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const sql = `
    SELECT
      u.id,
      u.username,
      u.email,
      u.full_name,
      u.role,
      u.division_id,
      d.name AS division_name,
      u.phone,
      u.address,
      u.avatar_url,
      u.initial_leave_quota,
      u.remaining_leave_quota,
      u.join_date,
      u.is_active
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    WHERE u.id = $1
      AND u.is_active = TRUE
    LIMIT 1;
  `;

  const result = await query(sql, [session.id]);
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    divisionId: row.division_id,
    divisionName: row.division_name || null,
    phone: row.phone || "",
    address: row.address || "",
    avatarUrl: row.avatar_url || null,
    initialLeaveQuota: Number(row.initial_leave_quota),
    remainingLeaveQuota: Number(row.remaining_leave_quota),
    joinDate: row.join_date,
    isActive: row.is_active,
    initials: buildUserInitials(row.full_name),
  };
}

/**
 * Membuat inisial 2 huruf dari nama lengkap untuk avatar fallback.
 * @param {string} fullName
 */
export function buildUserInitials(fullName) {
  if (!fullName || typeof fullName !== "string") return "OT";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "OT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Memetakan string role resmi PostgreSQL ke key tampilan UI dashboard.
 * @param {string} role
 */
export function mapRoleToUiKey(role) {
  switch (role) {
    case "Admin":
      return "admin";
    case "Ketua Divisi":
      return "ketua-divisi";
    case "HRD":
      return "hrd";
    case "Karyawan":
    default:
      return "karyawan";
  }
}
