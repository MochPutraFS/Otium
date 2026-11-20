import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "session_token";
export const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 24; // 1 hari (detik)
export const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 7; // 7 hari (detik)

export const ROLE_ROUTE_RULES = [
  { prefix: "/admin", allowedRoles: ["Admin"] },
  { prefix: "/approvals/leader", allowedRoles: ["Ketua Divisi"] },
  { prefix: "/approvals/hrd", allowedRoles: ["HRD"] },
  { prefix: "/leaves", allowedRoles: ["Karyawan", "Ketua Divisi"] },
  {
    prefix: "/dashboard",
    allowedRoles: ["Admin", "Karyawan", "Ketua Divisi", "HRD"],
  },
  {
    prefix: "/profile",
    allowedRoles: ["Admin", "Karyawan", "Ketua Divisi", "HRD"],
  },
];

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Environment variable JWT_SECRET belum dikonfigurasi pada .env"
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Menghitung durasi cookie sesi dalam detik (1 hari normal, 7 hari jika Remember Me).
 * @param {boolean} rememberMe
 * @returns {number}
 */
export function getSessionMaxAge(rememberMe) {
  return rememberMe ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
}

/**
 * Menandatangani JWT sesi (HS256) yang kompatibel di Node.js Runtime & Edge Runtime.
 * @param {{ id: number, username: string, email: string, fullName: string, role: string, divisionId: number | null }} payload
 * @param {boolean} [rememberMe=false]
 * @returns {Promise<string>}
 */
export async function createSessionToken(payload, rememberMe = false) {
  const expiration = rememberMe ? "7d" : "1d";

  return new SignJWT({
    id: payload.id,
    username: payload.username,
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role,
    divisionId: payload.divisionId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(getJwtSecretKey());
}

/**
 * Memverifikasi token JWT sesi. Mengembalikan payload user atau null jika tidak valid/kedaluwarsa.
 * @param {string} token
 * @returns {Promise<{ id: number, username: string, email: string, fullName: string, role: string, divisionId: number | null } | null>}
 */
export async function verifySessionToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: ["HS256"],
    });

    if (!payload?.id || !payload?.role) {
      return null;
    }

    return {
      id: Number(payload.id),
      username: String(payload.username || ""),
      email: String(payload.email || ""),
      fullName: String(payload.fullName || ""),
      role: String(payload.role),
      divisionId:
        payload.divisionId === null || payload.divisionId === undefined
          ? null
          : Number(payload.divisionId),
    };
  } catch {
    return null;
  }
}

/**
 * Memastikan callbackUrl aman (anti Open Redirect) dan sesuai hak akses role pengguna.
 * Jika tidak valid atau role tidak berhak, diarahkan ke /dashboard.
 * @param {string} callbackUrl
 * @param {string} role
 * @returns {string}
 */
export function getSafeCallbackUrl(callbackUrl, role) {
  if (
    !callbackUrl ||
    typeof callbackUrl !== "string" ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//")
  ) {
    return "/dashboard";
  }

  const pathname = callbackUrl.split("?")[0];
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/")
  ) {
    return "/dashboard";
  }

  const matchedRule = ROLE_ROUTE_RULES.find((rule) =>
    pathname.startsWith(rule.prefix)
  );
  if (!matchedRule || !matchedRule.allowedRoles.includes(role)) {
    return "/dashboard";
  }

  return callbackUrl;
}
