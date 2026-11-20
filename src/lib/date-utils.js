// Utilitas perhitungan hari kerja & validasi tanggal cuti (JavaScript murni).
// Dapat digunakan bersama di sisi Client (preview interaktif) dan Server Actions.

const MONTH_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/**
 * Parse string YYYY-MM-DD ke objek Date lokal (tanpa geser timezone UTC).
 */
export function parseIsoDate(isoDateStr) {
  if (!isoDateStr || typeof isoDateStr !== "string") return null;
  const parts = isoDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Format Date kembali menjadi string YYYY-MM-DD.
 */
export function toIsoDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Selisih hari kalender (targetDate - baseDate).
 * Positif jika targetDate di masa depan, negatif jika di masa lalu.
 */
export function diffCalendarDays(targetIso, baseIso) {
  const target = parseIsoDate(targetIso);
  const base = parseIsoDate(baseIso);
  if (!target || !base) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - base.getTime()) / msPerDay);
}

/**
 * Cek apakah sebuah tanggal adalah akhir pekan (Sabtu/Minggu) atau hari libur nasional.
 */
export function isNonWorkingDay(isoDateStr, holidayDates = []) {
  const date = parseIsoDate(isoDateStr);
  if (!date) return true;
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  return holidayDates.includes(isoDateStr);
}

/**
 * Hitung jumlah hari kerja efektif (mengecualikan Sabtu, Minggu, & holidayDates).
 * Mendukung pecahan 0.5 hari jika isHalfDay === true pada hari kerja aktif.
 */
export function calculateWorkingDays(
  startDateStr,
  endDateStr,
  isHalfDay = false,
  holidayDates = []
) {
  const start = parseIsoDate(startDateStr);
  const end = parseIsoDate(isHalfDay ? startDateStr : endDateStr);

  if (!start || !end || end < start) return 0;

  if (isHalfDay) {
    return isNonWorkingDay(startDateStr, holidayDates) ? 0 : 0.5;
  }

  let workingDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = toIsoDate(cursor);
    if (!isNonWorkingDay(iso, holidayDates)) {
      workingDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return workingDays;
}

/**
 * Validasi batas waktu pengajuan (Garda 5):
 * - Cuti Tahunan (minSubmissionDays > 0): minimal H-n sebelum start_date.
 * - Cuti Sakit (code === 'SICK' / minSubmissionDays < 0): H-0 s.d. maks H+|n| setelah mulai sakit.
 */
export function validateSubmissionLeadTime(
  startDateStr,
  submissionDateStr,
  leaveTypeCode,
  minSubmissionDays = 0
) {
  if (!startDateStr || !submissionDateStr) {
    return { valid: false, message: "Tanggal mulai cuti wajib diisi." };
  }

  const diff = diffCalendarDays(startDateStr, submissionDateStr);

  if (leaveTypeCode === "SICK" || minSubmissionDays < 0) {
    const maxRetroactiveDays = Math.abs(minSubmissionDays || 3);
    // diff === 0 -> H-0 (hari ini); diff === -3 -> 3 hari setelah mulai sakit (H+3)
    if (diff > 0 || diff < -maxRetroactiveDays) {
      return {
        valid: false,
        message: `Cuti Sakit hanya dapat diajukan pada H-0 hingga maksimal H+${maxRetroactiveDays} sejak tanggal mulai sakit.`,
      };
    }
    return { valid: true, message: "" };
  }

  if (minSubmissionDays > 0 && diff < minSubmissionDays) {
    return {
      valid: false,
      message: `Wajib diajukan minimal H-${minSubmissionDays} sebelum tanggal mulai cuti.`,
    };
  }

  return { valid: true, message: "" };
}

/**
 * Validasi anti-overlap (Garda 7) terhadap pengajuan aktif milik pemohon sendiri.
 */
export function hasDateOverlap(startDateStr, endDateStr, existingRequests = []) {
  if (!startDateStr || !endDateStr) return false;
  const activeStatuses = ["Pending", "Approved by Leader", "Approved"];

  return existingRequests.some(
    (req) =>
      activeStatuses.includes(req.status) &&
      req.startDate <= endDateStr &&
      req.endDate >= startDateStr
  );
}

/**
 * Format tunggal YYYY-MM-DD menjadi "25 Nov 2026".
 */
export function formatIndonesianDate(isoDateStr) {
  const d = parseIsoDate(isoDateStr);
  if (!d) return isoDateStr || "-";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format rentang tanggal ringkas untuk tabel & drawer.
 */
export function formatIndonesianDateRange(startDateStr, endDateStr, isHalfDay = false) {
  if (!startDateStr) return "-";
  if (isHalfDay || !endDateStr || startDateStr === endDateStr) {
    return formatIndonesianDate(startDateStr);
  }
  const start = parseIsoDate(startDateStr);
  const end = parseIsoDate(endDateStr);
  if (!start || !end) return `${startDateStr} – ${endDateStr}`;

  if (start.getFullYear() === end.getFullYear()) {
    return `${String(start.getDate()).padStart(2, "0")} ${MONTH_SHORT_ID[start.getMonth()]} – ${String(end.getDate()).padStart(2, "0")} ${MONTH_SHORT_ID[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${formatIndonesianDate(startDateStr)} – ${formatIndonesianDate(endDateStr)}`;
}
