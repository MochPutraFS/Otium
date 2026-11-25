import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { validateLoginCredentials } from "@/lib/validators";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSafeCallbackUrl,
  getSessionMaxAge,
  matchesRoutePrefix,
  verifySessionToken,
} from "@/lib/jwt";

export {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSafeCallbackUrl,
  getSessionMaxAge,
  matchesRoutePrefix,
  verifySessionToken,
};

/**
 * Menentukan flag Secure cookie sesi.
 * Aktif otomatis pada deployment HTTPS (VERCEL / NEXT_PUBLIC_APP_URL=https://...) atau COOKIE_SECURE=true,
 * namun tetap kompatibel saat menjalankan `npm run start` lokal melalui HTTP (localhost / IP LAN).
 */
function shouldUseSecureCookie() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return Boolean(
    process.env.VERCEL === "1" ||
      String(process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://")
  );
}

/**
 * Membangun opsi standar HttpOnly Cookie untuk token sesi.
 * @param {boolean} rememberMe
 */
export function buildSessionCookieOptions(rememberMe = false) {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: shouldUseSecureCookie(),
    maxAge: getSessionMaxAge(rememberMe),
  };
}

/**
 * Membangun opsi penghapusan cookie sesi (Single Source of Truth untuk logout & 401 cleanup).
 */
export function buildClearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: shouldUseSecureCookie(),
    maxAge: 0,
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
  cookieStore.set(SESSION_COOKIE_NAME, "", buildClearSessionCookieOptions());
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
  const validation = validateLoginCredentials(rawIdentifier, rawPassword);
  if (!validation.ok) {
    return validation;
  }

  const { identifier, password } = validation;

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
 * Helper Two-Layer RBAC: memastikan pengguna memiliki sesi valid & status akun aktif di PostgreSQL.
 * Cocok digunakan oleh Server Actions dan Route Handlers sebelum mengeksekusi query mutasi/privat.
 * @returns {Promise<{ ok: true, user: object } | { ok: false, status: 401, error: string }>}
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Sesi tidak valid atau akun berstatus nonaktif. Silakan login kembali.",
    };
  }
  return { ok: true, user };
}

/**
 * Helper Two-Layer RBAC: memverifikasi sesi aktif sekaligus mencocokkan role pengguna terhadap daftar role diizinkan.
 * @param {string[]} allowedRoles
 * @returns {Promise<{ ok: true, user: object } | { ok: false, status: 401 | 403, error: string }>}
 */
export async function requireRole(allowedRoles = []) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth;
  }

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(auth.user.role)
  ) {
    return {
      ok: false,
      status: 403,
      error: "Anda tidak memiliki hak akses untuk operasi ini.",
    };
  }

  return auth;
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
