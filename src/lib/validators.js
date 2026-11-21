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

/**
 * Validasi & sanitasi payload Create / Update Divisi pada CMS Modul 2 (/admin/divisions).
 * Menegakkan nama divisi 2–100 karakter, deskripsi opsional maks 500 karakter,
 * serta leaderId wajib berupa bilangan bulat positif.
 * @param {object} payload
 */
export function validateAdminDivisionPayload(payload = {}) {
  const name = sanitizeText(payload.name);
  const rawDescription =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const description = rawDescription.length > 0 ? rawDescription : null;
  const rawLeaderId = payload.leaderId;

  const fieldErrors = {};

  if (!name || name.length < 2) {
    fieldErrors.name = "Nama divisi wajib diisi (minimal 2 karakter).";
  } else if (name.length > 100) {
    fieldErrors.name = "Nama divisi maksimal 100 karakter.";
  }

  if (description && description.length > 500) {
    fieldErrors.description = "Deskripsi divisi maksimal 500 karakter.";
  }

  let leaderId = null;
  if (
    rawLeaderId === null ||
    rawLeaderId === undefined ||
    String(rawLeaderId).trim() === ""
  ) {
    fieldErrors.leaderId =
      "Ketua Divisi wajib dipilih dari kandidat yang tersedia.";
  } else if (!isPositiveInt(rawLeaderId)) {
    fieldErrors.leaderId = "Pilihan Ketua Divisi tidak valid.";
  } else {
    leaderId = Number(rawLeaderId);
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Periksa kembali data divisi yang dimasukkan.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      name,
      description,
      leaderId,
    },
  };
}

/**
 * Validasi payload penghapusan Divisi pada CMS Modul 2 (/admin/divisions).
 * Mewajibkan ID divisi valid serta flag isDoubleConfirmed === true (Konfirmasi 2 Tahap).
 * @param {number | string} divisionId
 * @param {{ isDoubleConfirmed?: boolean }} [payload]
 */
export function validateDeleteDivisionPayload(divisionId, payload = {}) {
  if (!isPositiveInt(divisionId)) {
    return {
      ok: false,
      status: 400,
      error: "ID divisi tidak valid.",
    };
  }

  if (payload?.isDoubleConfirmed !== true) {
    return {
      ok: false,
      status: 400,
      error:
        "Penghapusan divisi memerlukan persetujuan Konfirmasi 2 Tahap (Double Confirmation).",
    };
  }

  return {
    ok: true,
    data: {
      divisionId: Number(divisionId),
      isDoubleConfirmed: true,
    },
  };
}

/**
 * Validasi payload Assign Anggota Divisi (Bulk) pada CMS Modul 3 (/admin/division-members).
 * Membersihkan duplikat ID dan memastikan seluruh ID berupa bilangan bulat positif.
 * @param {number | string} divisionId
 * @param {Array<number | string>} userIds
 */
export function validateAssignMembersPayload(divisionId, userIds) {
  if (!isPositiveInt(divisionId)) {
    return {
      ok: false,
      status: 400,
      error: "Divisi tujuan tidak valid.",
    };
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "Pilih minimal 1 karyawan untuk ditempatkan ke divisi.",
    };
  }

  const uniqueIds = [];
  const seen = new Set();
  for (const rawId of userIds) {
    if (!isPositiveInt(rawId)) {
      return {
        ok: false,
        status: 400,
        error: "Terdapat ID karyawan yang tidak valid dalam daftar pilihan.",
      };
    }
    const parsed = Number(rawId);
    if (!seen.has(parsed)) {
      seen.add(parsed);
      uniqueIds.push(parsed);
    }
  }

  if (uniqueIds.length > 100) {
    return {
      ok: false,
      status: 400,
      error: "Maksimal 100 karyawan dapat di-assign dalam satu transaksi.",
    };
  }

  return {
    ok: true,
    data: {
      divisionId: Number(divisionId),
      userIds: uniqueIds,
    },
  };
}

/**
 * Validasi payload Remove Anggota dari Divisi pada CMS Modul 3 (/admin/division-members).
 * @param {number | string} divisionId
 * @param {number | string} userId
 */
export function validateRemoveMemberPayload(divisionId, userId) {
  if (!isPositiveInt(divisionId)) {
    return {
      ok: false,
      status: 400,
      error: "ID divisi tidak valid.",
    };
  }

  if (!isPositiveInt(userId)) {
    return {
      ok: false,
      status: 400,
      error: "ID anggota tidak valid.",
    };
  }

  return {
    ok: true,
    data: {
      divisionId: Number(divisionId),
      userId: Number(userId),
    },
  };
}

const LEAVE_TYPE_CODE_PATTERN = /^[A-Z0-9_]{2,30}$/;

/**
 * Validasi payload Create / Update Jenis Cuti Dinamis pada CMS Modul 4 (/admin/leave-types).
 * Menegakkan aturan kolom tabel `leave_types` di PostgreSQL (`code`, `name`, `max_quota NUMERIC(4,1) > 0`,
 * `min_submission_days INTEGER`, flag aturan bisnis boolean, dan `description`).
 * @param {object} payload
 * @param {{ mode?: "create" | "edit" }} [options]
 */
export function validateLeaveTypePayload(payload, { mode = "create" } = {}) {
  const fieldErrors = {};

  if (mode === "edit" && !isPositiveInt(payload?.id)) {
    return {
      ok: false,
      status: 400,
      error: "ID jenis cuti tidak valid.",
    };
  }

  const normalizedCode = sanitizeText(payload?.code, 30).toUpperCase();
  if (!normalizedCode || !LEAVE_TYPE_CODE_PATTERN.test(normalizedCode)) {
    fieldErrors.code =
      "Kode wajib 2–30 karakter huruf kapital, angka, atau underscore (mis. MARRIAGE).";
  }

  const name = sanitizeText(payload?.name, 100);
  if (name.length < 3) {
    fieldErrors.name = "Nama jenis cuti wajib diisi (minimal 3 karakter).";
  } else if (name.length > 100) {
    fieldErrors.name = "Nama jenis cuti maksimal 100 karakter.";
  }

  const rawMaxQuota = payload?.maxQuota;
  const parsedMaxQuota = Number(rawMaxQuota);
  if (
    rawMaxQuota === "" ||
    rawMaxQuota === null ||
    rawMaxQuota === undefined ||
    !Number.isFinite(parsedMaxQuota) ||
    parsedMaxQuota <= 0 ||
    parsedMaxQuota > 365
  ) {
    fieldErrors.maxQuota = "Kuota maksimal harus > 0 dan <= 365 hari.";
  } else if (Math.round(parsedMaxQuota * 2) !== parsedMaxQuota * 2) {
    fieldErrors.maxQuota = "Kuota maksimal harus kelipatan 0.5 hari.";
  }

  const rawLeadTime = payload?.minSubmissionDays;
  const parsedLeadTime = Number(rawLeadTime);
  if (
    rawLeadTime === "" ||
    rawLeadTime === null ||
    rawLeadTime === undefined ||
    !Number.isFinite(parsedLeadTime) ||
    !Number.isInteger(parsedLeadTime) ||
    parsedLeadTime < -30 ||
    parsedLeadTime > 90
  ) {
    fieldErrors.minSubmissionDays =
      "Batas waktu pengajuan harus bilangan bulat antara -30 s.d. 90 hari.";
  }

  const rawDescription =
    payload?.description === undefined || payload?.description === null
      ? ""
      : String(payload.description).trim();
  if (rawDescription.length > 500) {
    fieldErrors.description = "Deskripsi / panduan pemohon maksimal 500 karakter.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Periksa kembali data jenis cuti yang masih belum valid.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      id: mode === "edit" ? Number(payload.id) : null,
      code: normalizedCode,
      name,
      maxQuota: Number(parsedMaxQuota.toFixed(1)),
      minSubmissionDays: parsedLeadTime,
      requiresAttachment: Boolean(payload?.requiresAttachment),
      deductsAnnualQuota: Boolean(payload?.deductsAnnualQuota),
      requiresMinOneYearTenure: Boolean(payload?.requiresMinOneYearTenure),
      isActive:
        payload?.isActive === undefined ? true : Boolean(payload.isActive),
      description: rawDescription ? sanitizeText(rawDescription, 500) : null,
    },
  };
}

/**
 * Validasi payload Toggle Status Aktif/Nonaktif Jenis Cuti pada CMS Modul 4.
 * @param {number | string} leaveTypeId
 * @param {boolean} isActive
 */
export function validateToggleLeaveTypeStatusPayload(leaveTypeId, isActive) {
  if (!isPositiveInt(leaveTypeId)) {
    return {
      ok: false,
      status: 400,
      error: "ID jenis cuti tidak valid.",
    };
  }

  if (typeof isActive !== "boolean") {
    return {
      ok: false,
      status: 400,
      error: "Nilai status aktif jenis cuti tidak valid.",
    };
  }

  return {
    ok: true,
    data: {
      leaveTypeId: Number(leaveTypeId),
      isActive,
    },
  };
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ATTACHMENT_URL_PATTERN = /^\/uploads\/attachments\/[a-zA-Z0-9._-]+$/;

/**
 * Mengecek apakah string YYYY-MM-DD adalah tanggal kalender yang valid.
 * @param {string} value
 */
function isValidCalendarIsoDate(value) {
  if (!value || typeof value !== "string" || !ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * Validasi path lampiran hasil unggahan /api/upload (mencegah path traversal & URL eksternal).
 * @param {string | null | undefined} url
 */
export function isValidAttachmentUrl(url) {
  if (!url) return true;
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.includes("..")) return false;
  return ATTACHMENT_URL_PATTERN.test(trimmed) && trimmed.length <= 255;
}

/**
 * Validasi payload endpoint `POST /api/leaves/check-availability` (Modul 5).
 * @param {object} payload
 */
export function validateAvailabilityPayload(payload) {
  const fieldErrors = {};

  if (!isPositiveInt(payload?.leaveTypeId)) {
    fieldErrors.leaveTypeId = "Jenis cuti wajib dipilih.";
  }

  const isHalfDay = Boolean(payload?.isHalfDay);
  const startDate = String(payload?.startDate || "").trim();
  const rawEndDate = isHalfDay
    ? startDate
    : String(payload?.endDate || "").trim();

  if (!isValidCalendarIsoDate(startDate)) {
    fieldErrors.startDate = "Tanggal mulai cuti tidak valid (YYYY-MM-DD).";
  }

  if (!isValidCalendarIsoDate(rawEndDate)) {
    fieldErrors.endDate = "Tanggal selesai cuti tidak valid (YYYY-MM-DD).";
  } else if (isValidCalendarIsoDate(startDate) && rawEndDate < startDate) {
    fieldErrors.endDate =
      "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Parameter pengecekan ketersediaan cuti tidak valid.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      leaveTypeId: Number(payload.leaveTypeId),
      isHalfDay,
      startDate,
      endDate: rawEndDate,
    },
  };
}

/**
 * Validasi payload dasar Server Action `submitLeaveRequestAction` (Modul 5 — Garda 2).
 * Validasi bisnis lanjutan (hari kerja, masa kerja 1 tahun, lead time, lampiran wajib,
 * anti-overlap, dan kecukupan kuota) dilanjutkan terhadap data PostgreSQL di dalam transaksi.
 * @param {object} payload
 */
export function validateLeaveRequestPayload(payload) {
  const fieldErrors = {};

  if (!isPositiveInt(payload?.leaveTypeId)) {
    fieldErrors.leaveTypeId = "Jenis cuti wajib dipilih.";
  }

  const isHalfDay = Boolean(payload?.isHalfDay);
  const startDate = String(payload?.startDate || "").trim();
  const endDate = isHalfDay
    ? startDate
    : String(payload?.endDate || "").trim();

  if (!isValidCalendarIsoDate(startDate)) {
    fieldErrors.startDate = "Tanggal mulai cuti wajib diisi dengan format valid.";
  }

  if (!isValidCalendarIsoDate(endDate)) {
    fieldErrors.endDate = "Tanggal selesai cuti wajib diisi dengan format valid.";
  } else if (isValidCalendarIsoDate(startDate) && endDate < startDate) {
    fieldErrors.endDate =
      "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
  }

  const reason = sanitizeText(payload?.reason, 1000);
  if (reason.length < 5) {
    fieldErrors.reason = "Alasan cuti wajib diisi minimal 5 karakter.";
  }

  if (!isPositiveInt(payload?.handoverUserId)) {
    fieldErrors.handoverUserId = "Rekan pengganti satu divisi wajib dipilih.";
  }

  const handoverNotes = sanitizeText(payload?.handoverNotes, 1000);
  if (handoverNotes.length < 5) {
    fieldErrors.handoverNotes =
      "Catatan serah terima tugas wajib diisi minimal 5 karakter.";
  }

  const leaveAddress = sanitizeText(payload?.leaveAddress, 500);
  if (leaveAddress.length < 5) {
    fieldErrors.leaveAddress =
      "Alamat selama cuti wajib diisi minimal 5 karakter.";
  }

  const emergencyPhone = sanitizeText(payload?.emergencyPhone, 30);
  if (!emergencyPhone) {
    fieldErrors.emergencyPhone = "Nomor telepon darurat wajib diisi.";
  } else if (!/^[0-9+\-\s()]{8,20}$/.test(emergencyPhone)) {
    fieldErrors.emergencyPhone =
      "Format nomor darurat tidak valid (8–20 karakter angka, +, atau -).";
  }

  const rawAttachmentUrl = String(payload?.attachmentUrl || "").trim();
  if (rawAttachmentUrl && !isValidAttachmentUrl(rawAttachmentUrl)) {
    fieldErrors.attachmentUrl =
      "Path lampiran tidak valid. Unggah ulang dokumen melalui tombol unggah.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Mohon lengkapi seluruh kolom wajib pada formulir pengajuan cuti.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      leaveTypeId: Number(payload.leaveTypeId),
      isHalfDay,
      startDate,
      endDate,
      reason,
      handoverUserId: Number(payload.handoverUserId),
      handoverNotes,
      leaveAddress,
      emergencyPhone,
      attachmentUrl: rawAttachmentUrl || null,
    },
  };
}

const ALLOWED_LEAVE_STATUS_FILTERS = new Set([
  "ALL",
  "WAITING",
  "Pending",
  "Approved by Leader",
  "Approved",
  "Rejected",
  "Cancelled",
]);

const ALLOWED_LEAVE_SORT_OPTIONS = new Set([
  "submitted_desc",
  "start_desc",
  "start_asc",
]);

/**
 * Validasi payload Server Action `cancelLeaveRequestAction` (Modul 5 — Pembatalan Cuti).
 * @param {number|string} requestId
 * @param {string} cancellationReason
 */
export function validateCancelLeavePayload(requestId, cancellationReason) {
  const fieldErrors = {};

  if (!isPositiveInt(requestId)) {
    return {
      ok: false,
      status: 400,
      error: "ID pengajuan cuti tidak valid.",
      fieldErrors: { requestId: "ID pengajuan tidak valid." },
    };
  }

  const trimmedReason = sanitizeText(cancellationReason, 500);
  if (trimmedReason.length < 5) {
    fieldErrors.cancellationReason =
      "Alasan pembatalan wajib diisi minimal 5 karakter.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: fieldErrors.cancellationReason,
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      requestId: Number(requestId),
      cancellationReason: trimmedReason,
    },
  };
}

/**
 * Validasi & sanitasi query parameter untuk `GET /api/leaves`.
 * @param {URLSearchParams|object} params
 */
export function validateLeaveListQueryParams(params) {
  const getParam = (key) => {
    if (!params) return "";
    if (typeof params.get === "function") return params.get(key) || "";
    return params[key] || "";
  };

  const rawStatus = String(getParam("status") || "ALL").trim();
  const status = ALLOWED_LEAVE_STATUS_FILTERS.has(rawStatus)
    ? rawStatus
    : "ALL";

  const rawLeaveTypeId = String(getParam("leaveTypeId") || "ALL").trim();
  let leaveTypeId = null;
  if (rawLeaveTypeId && rawLeaveTypeId !== "ALL") {
    if (!isPositiveInt(rawLeaveTypeId)) {
      return {
        ok: false,
        status: 400,
        error: "Parameter filter jenis cuti tidak valid.",
      };
    }
    leaveTypeId = Number(rawLeaveTypeId);
  }

  const dateFrom = String(getParam("dateFrom") || "").trim();
  const dateTo = String(getParam("dateTo") || "").trim();

  if (dateFrom && !isValidCalendarIsoDate(dateFrom)) {
    return {
      ok: false,
      status: 400,
      error: "Format tanggal awal filter tidak valid (YYYY-MM-DD).",
    };
  }

  if (dateTo && !isValidCalendarIsoDate(dateTo)) {
    return {
      ok: false,
      status: 400,
      error: "Format tanggal akhir filter tidak valid (YYYY-MM-DD).",
    };
  }

  if (dateFrom && dateTo && dateTo < dateFrom) {
    return {
      ok: false,
      status: 400,
      error: "Tanggal akhir filter tidak boleh lebih awal dari tanggal awal.",
    };
  }

  const search = sanitizeText(getParam("search"), 100);
  const rawSort = String(getParam("sortBy") || "submitted_desc").trim();
  const sortBy = ALLOWED_LEAVE_SORT_OPTIONS.has(rawSort)
    ? rawSort
    : "submitted_desc";

  return {
    ok: true,
    data: {
      status,
      leaveTypeId,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      search,
      sortBy,
    },
  };
}

const ALLOWED_APPROVAL_ACTIONS = new Set(["Approve", "Reject"]);
const ALLOWED_LEADER_HISTORY_STATUSES = new Set([
  "ALL",
  "Approved by Leader",
  "Approved",
  "Rejected",
  "Cancelled",
]);
const ALLOWED_LEADER_TABS = new Set(["all", "queue", "history"]);

/**
 * Validasi payload Server Action `verifyByLeaderAction` (Modul 6A — Verifikasi Tahap 1).
 * - Mode `Approve`: catatan bersifat opsional (maks 500 karakter).
 * - Mode `Reject`: alasan penolakan WAJIB diisi minimal 5 karakter (maks 500 karakter).
 * @param {number|string} requestId
 * @param {string} action
 * @param {string} notes
 */
export function validateLeaderVerificationPayload(requestId, action, notes) {
  const fieldErrors = {};

  if (!isPositiveInt(requestId)) {
    return {
      ok: false,
      status: 400,
      error: "ID pengajuan cuti tidak valid.",
      fieldErrors: { requestId: "ID pengajuan cuti tidak valid." },
    };
  }

  const normalizedAction = String(action || "").trim();
  if (!ALLOWED_APPROVAL_ACTIONS.has(normalizedAction)) {
    return {
      ok: false,
      status: 400,
      error: "Tindakan verifikasi tidak valid (hanya Approve atau Reject).",
      fieldErrors: { action: "Tindakan verifikasi tidak valid." },
    };
  }

  const trimmedNotes = sanitizeText(notes, 500);
  if (normalizedAction === "Reject" && trimmedNotes.length < 5) {
    fieldErrors.notes =
      "Alasan penolakan wajib diisi minimal 5 karakter agar pemohon memahami dasar keputusan.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: fieldErrors.notes,
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      requestId: Number(requestId),
      action: normalizedAction,
      notes: trimmedNotes,
    },
  };
}

/**
 * Validasi & sanitasi query parameter untuk `GET /api/approvals/leader`.
 * @param {URLSearchParams|object} params
 */
export function validateLeaderApprovalQueryParams(params) {
  const getParam = (key) => {
    if (!params) return "";
    if (typeof params.get === "function") return params.get(key) || "";
    return params[key] || "";
  };

  const rawTab = String(getParam("tab") || "all").trim().toLowerCase();
  const tab = ALLOWED_LEADER_TABS.has(rawTab) ? rawTab : "all";

  const rawLeaveTypeId = String(getParam("leaveTypeId") || "ALL").trim();
  let leaveTypeId = null;
  if (rawLeaveTypeId && rawLeaveTypeId !== "ALL") {
    if (!isPositiveInt(rawLeaveTypeId)) {
      return {
        ok: false,
        status: 400,
        error: "Parameter filter jenis cuti tidak valid.",
      };
    }
    leaveTypeId = Number(rawLeaveTypeId);
  }

  const rawStatus = String(getParam("status") || "ALL").trim();
  const status = ALLOWED_LEADER_HISTORY_STATUSES.has(rawStatus)
    ? rawStatus
    : "ALL";

  const search = sanitizeText(getParam("search"), 100);

  return {
    ok: true,
    data: {
      tab,
      leaveTypeId,
      status,
      search,
    },
  };
}
