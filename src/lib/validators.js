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

export const AVATAR_URL_PATTERN = /^\/uploads\/avatars\/[a-zA-Z0-9._-]+$/;

/**
 * Validasi path lokal avatar hasil unggahan /api/upload.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidAvatarUrl(value) {
  if (value === null || value === "") return true;
  if (typeof value !== "string") return false;
  if (value.includes("..")) return false;
  return AVATAR_URL_PATTERN.test(value);
}

/**
 * Validasi & sanitasi input pembaruan profil pengguna (adaptif Admin vs Non-Admin).
 * @param {object} payload
 * @param {{ isAdmin?: boolean }} [options]
 */
export function validateProfileUpdate(payload = {}, { isAdmin = false } = {}) {
  const fullName = sanitizeText(payload.fullName);
  const phone = sanitizeText(payload.phone);
  const address = sanitizeText(payload.address);

  const fieldErrors = {};

  if (!fullName || fullName.length < 3) {
    fieldErrors.fullName = "Nama lengkap wajib diisi minimal 3 karakter.";
  } else if (fullName.length > 150) {
    fieldErrors.fullName = "Nama lengkap maksimal 150 karakter.";
  }

  if (phone && !/^[0-9+\-\s()]{8,20}$/.test(phone)) {
    fieldErrors.phone =
      "Format nomor telepon tidak valid (8–20 karakter, gunakan angka, +, -, spasi, atau kurung).";
  }

  if (address.length > 500) {
    fieldErrors.address = "Alamat domisili maksimal 500 karakter.";
  }

  const sanitized = {
    fullName,
    phone: phone || null,
    address: address || null,
  };

  if (isAdmin) {
    const username = sanitizeText(payload.username);
    const email = sanitizeText(payload.email);
    const joinDateIso = sanitizeText(payload.joinDateIso);
    const rawDivisionId = payload.divisionId;
    const parsedQuota = Number(payload.initialLeaveQuota);

    if (!username || !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
      fieldErrors.username =
        "Username 3–50 karakter (huruf, angka, titik, garis bawah, atau tanda hubung).";
    }

    if (
      !email ||
      email.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      fieldErrors.email = "Format alamat email tidak valid.";
    }

    let divisionId = null;
    if (
      rawDivisionId !== null &&
      rawDivisionId !== undefined &&
      String(rawDivisionId).trim() !== ""
    ) {
      if (!isPositiveInt(rawDivisionId)) {
        fieldErrors.divisionId = "Pilihan divisi tidak valid.";
      } else {
        divisionId = Number(rawDivisionId);
      }
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(joinDateIso)) {
      fieldErrors.joinDateIso = "Format tanggal bergabung tidak valid (YYYY-MM-DD).";
    } else {
      const parsedDate = new Date(`${joinDateIso}T00:00:00Z`);
      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== joinDateIso
      ) {
        fieldErrors.joinDateIso = "Tanggal bergabung tidak valid.";
      }
    }

    if (
      Number.isNaN(parsedQuota) ||
      parsedQuota < 0 ||
      parsedQuota > 60 ||
      Math.round(parsedQuota * 2) !== parsedQuota * 2
    ) {
      fieldErrors.initialLeaveQuota =
        "Kuota awal harus antara 0 hingga 60 hari (kelipatan 0.5).";
    }

    sanitized.username = username;
    sanitized.email = email;
    sanitized.divisionId = divisionId;
    sanitized.joinDateIso = joinDateIso;
    sanitized.initialLeaveQuota = Number(parsedQuota.toFixed(1));
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Periksa kembali data profil yang Anda masukkan.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: sanitized,
  };
}

/**
 * Validasi input perubahan password akun.
 * @param {object} payload
 */
export function validatePasswordChange(payload = {}) {
  const currentPassword =
    typeof payload.currentPassword === "string" ? payload.currentPassword : "";
  const newPassword =
    typeof payload.newPassword === "string" ? payload.newPassword : "";
  const confirmPassword =
    typeof payload.confirmPassword === "string" ? payload.confirmPassword : "";

  const fieldErrors = {};

  if (!currentPassword.trim()) {
    fieldErrors.currentPassword = "Password saat ini wajib diisi.";
  } else if (currentPassword.length > MAX_PASSWORD_LENGTH) {
    fieldErrors.currentPassword = `Password saat ini maksimal ${MAX_PASSWORD_LENGTH} karakter.`;
  }

  if (!newPassword) {
    fieldErrors.newPassword = "Password baru wajib diisi.";
  } else if (newPassword.length < 8) {
    fieldErrors.newPassword = "Password baru minimal 8 karakter.";
  } else if (newPassword.length > MAX_PASSWORD_LENGTH) {
    fieldErrors.newPassword = `Password baru maksimal ${MAX_PASSWORD_LENGTH} karakter.`;
  } else if (!(/[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword))) {
    fieldErrors.newPassword =
      "Password baru harus mengandung kombinasi huruf dan angka.";
  } else if (newPassword === currentPassword) {
    fieldErrors.newPassword =
      "Password baru tidak boleh sama dengan password saat ini.";
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Konfirmasi password baru wajib diisi.";
  } else if (confirmPassword !== newPassword) {
    fieldErrors.confirmPassword = "Konfirmasi password baru tidak cocok.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Periksa kembali input keamanan password Anda.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      currentPassword,
      newPassword,
    },
  };
}

export const VALID_USER_ROLES = [
  "Admin",
  "Karyawan",
  "Ketua Divisi",
  "HRD",
];

export const PROTECTED_USER_ROLES = ["Admin", "HRD"];

/**
 * Validasi & sanitasi payload Create / Update Pengguna pada CMS Modul 1 (/admin/users).
 * Menerapkan aturan password minimal 8 karakter (kombinasi huruf & angka),
 * kuota kelipatan 0.5, serta format tanggal YYYY-MM-DD yang valid.
 * @param {object} payload
 * @param {{ mode?: "create" | "edit" }} [options]
 */
export function validateAdminUserPayload(payload = {}, { mode = "create" } = {}) {
  const isEdit = mode === "edit";
  const fullName = sanitizeText(payload.fullName);
  const username = sanitizeText(payload.username).toLowerCase();
  const email = sanitizeText(payload.email).toLowerCase();
  const password = typeof payload.password === "string" ? payload.password : "";
  const role = sanitizeText(payload.role);
  const rawDivisionId = payload.divisionId;
  const joinDate = sanitizeText(payload.joinDate);
  const isActive =
    typeof payload.isActive === "boolean" ? payload.isActive : true;

  const fieldErrors = {};

  if (!fullName || fullName.length < 3) {
    fieldErrors.fullName = "Nama lengkap wajib diisi minimal 3 karakter.";
  } else if (fullName.length > 150) {
    fieldErrors.fullName = "Nama lengkap maksimal 150 karakter.";
  }

  if (!username || !/^[a-z0-9._-]{3,50}$/.test(username)) {
    fieldErrors.username =
      "Username 3–50 karakter (huruf kecil, angka, titik, garis bawah, atau tanda hubung).";
  }

  if (
    !email ||
    email.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    fieldErrors.email = "Format alamat email tidak valid.";
  }

  if (!isEdit) {
    if (!password) {
      fieldErrors.password = "Password wajib diisi untuk akun baru.";
    } else if (password.length < 8) {
      fieldErrors.password = "Password minimal 8 karakter.";
    } else if (password.length > MAX_PASSWORD_LENGTH) {
      fieldErrors.password = `Password maksimal ${MAX_PASSWORD_LENGTH} karakter.`;
    } else if (!(/[A-Za-z]/.test(password) && /[0-9]/.test(password))) {
      fieldErrors.password =
        "Password harus mengandung kombinasi huruf dan angka.";
    }
  } else if (password.length > 0) {
    if (password.length < 8) {
      fieldErrors.password = "Password baru minimal 8 karakter.";
    } else if (password.length > MAX_PASSWORD_LENGTH) {
      fieldErrors.password = `Password baru maksimal ${MAX_PASSWORD_LENGTH} karakter.`;
    } else if (!(/[A-Za-z]/.test(password) && /[0-9]/.test(password))) {
      fieldErrors.password =
        "Password baru harus mengandung kombinasi huruf dan angka.";
    }
  }

  if (!VALID_USER_ROLES.includes(role)) {
    fieldErrors.role = "Role pengguna tidak valid.";
  }

  let divisionId = null;
  if (
    rawDivisionId !== null &&
    rawDivisionId !== undefined &&
    String(rawDivisionId).trim() !== ""
  ) {
    if (!isPositiveInt(rawDivisionId)) {
      fieldErrors.divisionId = "Pilihan divisi tidak valid.";
    } else {
      divisionId = Number(rawDivisionId);
    }
  }

  const parsedInitialQuota = Number(payload.initialLeaveQuota);
  if (
    payload.initialLeaveQuota === "" ||
    payload.initialLeaveQuota === null ||
    payload.initialLeaveQuota === undefined ||
    Number.isNaN(parsedInitialQuota) ||
    parsedInitialQuota < 0 ||
    parsedInitialQuota > 365 ||
    Math.round(parsedInitialQuota * 2) !== parsedInitialQuota * 2
  ) {
    fieldErrors.initialLeaveQuota =
      "Kuota awal harus antara 0 hingga 365 hari (kelipatan 0.5).";
  }

  let remainingLeaveQuota = Number.isNaN(parsedInitialQuota)
    ? 0
    : Number(parsedInitialQuota.toFixed(1));

  if (isEdit) {
    const parsedRemainingQuota = Number(payload.remainingLeaveQuota);
    if (
      payload.remainingLeaveQuota === "" ||
      payload.remainingLeaveQuota === null ||
      payload.remainingLeaveQuota === undefined ||
      Number.isNaN(parsedRemainingQuota) ||
      parsedRemainingQuota < 0 ||
      parsedRemainingQuota > 365 ||
      Math.round(parsedRemainingQuota * 2) !== parsedRemainingQuota * 2
    ) {
      fieldErrors.remainingLeaveQuota =
        "Sisa kuota harus antara 0 hingga 365 hari (kelipatan 0.5).";
    } else {
      remainingLeaveQuota = Number(parsedRemainingQuota.toFixed(1));
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(joinDate)) {
    fieldErrors.joinDate = "Format tanggal bergabung tidak valid (YYYY-MM-DD).";
  } else {
    const parsedDate = new Date(`${joinDate}T00:00:00Z`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== joinDate
    ) {
      fieldErrors.joinDate = "Tanggal bergabung tidak valid.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Periksa kembali data pengguna yang dimasukkan.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      fullName,
      username,
      email,
      password: password || null,
      role,
      divisionId,
      initialLeaveQuota: Number(parsedInitialQuota.toFixed(1)),
      remainingLeaveQuota,
      joinDate,
      isActive,
    },
  };
}
