/**
 * Modul validasi & sanitasi input murni sisi server (JavaScript tanpa dependensi eksternal).
 * Digunakan bersama oleh Server Actions dan Route Handlers sebelum eksekusi query PostgreSQL.
 */

export const MAX_IDENTIFIER_LENGTH = 100;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Membersihkan spasi awal/akhir pada input teks. Mengembalikan string kosong jika bukan string.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Memastikan nilai adalah bilangan bulat positif valid (cocok untuk ID PostgreSQL SERIAL).
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPositiveInt(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

/**
 * Validasi kredensial login (Email atau Username + Password) sebelum menyentuh database / bcryptjs.
 * Mencegah input kosong maupun payload oversized (mitigasi bcrypt DoS).
 * @param {unknown} rawIdentifier
 * @param {unknown} rawPassword
 */
export function validateLoginCredentials(rawIdentifier, rawPassword) {
  const identifier = sanitizeText(rawIdentifier);
  const password = typeof rawPassword === "string" ? rawPassword : "";

  const fieldErrors = {
    identifier: "",
    password: "",
  };

  if (!identifier) {
    fieldErrors.identifier = "Email atau Username wajib diisi.";
  } else if (identifier.length > MAX_IDENTIFIER_LENGTH) {
    fieldErrors.identifier = `Email atau Username maksimal ${MAX_IDENTIFIER_LENGTH} karakter.`;
  }

  if (!password) {
    fieldErrors.password = "Password wajib diisi.";
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    fieldErrors.password = `Password maksimal ${MAX_PASSWORD_LENGTH} karakter.`;
  }

  if (fieldErrors.identifier || fieldErrors.password) {
    return {
      ok: false,
      status: 400,
      error:
        !identifier || !password
          ? "Email/Username dan Password wajib diisi."
          : "Format kredensial tidak valid.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    identifier,
    password,
  };
}
