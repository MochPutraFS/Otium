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
 * Parse string YYYY-MM-DD ke objek Date lokal (tanpa geser timezone UTC)
 * sekaligus memastikan tanggal kalender benar-benar valid (misal menolak 2026-02-31).
 */
export function parseIsoDate(isoDateStr) {
  if (!isoDateStr || typeof isoDateStr !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) return null;
  const [year, month, day] = isoDateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Validasi ketat string tanggal YYYY-MM-DD.
 */
export function isValidIsoDate(isoDateStr) {
  return parseIsoDate(isoDateStr) !== null;
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
 * Tambah/kurangi hari kalender pada tanggal YYYY-MM-DD.
 */
export function addCalendarDays(isoDateStr, days) {
  const base = parseIsoDate(isoDateStr);
  if (!base) return "";
  base.setDate(base.getDate() + Number(days || 0));
  return toIsoDate(base);
}

/**
 * Mencari hari kerja terdekat (Senin–Jumat & bukan hari libur aktif) yang memenuhi
 * batas waktu pengajuan jenis cuti (`minSubmissionDays`).
 */
export function getNextValidWorkingDate(
  baseIsoDateStr,
  minSubmissionDays = 0,
  holidayDates = []
) {
  const base = parseIsoDate(baseIsoDateStr);
  if (!base) return "";

  const lead = Number(minSubmissionDays || 0);
  // Jika lead > 0 (mis. H-3), mulai pencarian dari base + lead.
  // Jika lead <= 0 (H-0 atau H+3 seperti Cuti Sakit), mulai dari hari ini (H-0).
  const offset = lead > 0 ? lead : 0;
  const cursor = new Date(base);
  cursor.setDate(cursor.getDate() + offset);

  // Jika lead < 0 (retroaktif seperti Cuti Sakit) dan hari ini akhir pekan/libur,
  // mundur maksimal |lead| hari untuk mencari hari kerja yang masih dalam jendela H-0..H+n.
  if (lead < 0) {
    const maxBack = Math.abs(lead);
    for (let step = 0; step <= maxBack; step += 1) {
      const candidate = new Date(base);
      candidate.setDate(candidate.getDate() - step);
      const iso = toIsoDate(candidate);
      if (!isNonWorkingDay(iso, holidayDates)) {
        return iso;
      }
    }
    return toIsoDate(base);
  }

  for (let guard = 0; guard < 31; guard += 1) {
    const iso = toIsoDate(cursor);
    if (!isNonWorkingDay(iso, holidayDates)) {
      return iso;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return toIsoDate(cursor);
}

/**
 * Evaluasi syarat masa kerja minimal 1 tahun penuh sejak `joinDateStr` (Garda 4).
 * Setara dengan PostgreSQL: `reference_date >= (join_date + INTERVAL '1 year')::date`.
 */
export function isEligibleForAnnualLeave(joinDateStr, referenceDateStr) {
  const join = parseIsoDate(joinDateStr);
  const ref = parseIsoDate(referenceDateStr);
  if (!join || !ref) return false;

  const targetYear = join.getFullYear() + 1;
  const targetMonth = join.getMonth();
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const anniversary = new Date(
    targetYear,
    targetMonth,
    Math.min(join.getDate(), lastDayOfTargetMonth)
  );

  return ref.getTime() >= anniversary.getTime();
}

/**
 * Mengembalikan daftar objek hari libur yang jatuh di dalam rentang [startDateStr, endDateStr]
 * pada hari Senin–Jumat (sehingga benar-benar memotong perhitungan hari kerja).
 */
export function getHolidaysInRange(startDateStr, endDateStr, holidays = []) {
  if (!isValidIsoDate(startDateStr) || !isValidIsoDate(endDateStr)) return [];
  if (endDateStr < startDateStr) return [];

  return holidays.filter((h) => {
    const iso = typeof h === "string" ? h : h.holidayDate;
    if (!iso || iso < startDateStr || iso > endDateStr) return false;
    const d = parseIsoDate(iso);
    if (!d) return false;
    const day = d.getDay();
    return day !== 0 && day !== 6;
  });
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
 * - minSubmissionDays > 0  : minimal H-n sebelum start_date (mis. Cuti Tahunan H-3).
 * - minSubmissionDays === 0: minimal H-0 (start_date >= submissionDate, tidak boleh backdate).
 * - code === 'SICK' / minSubmissionDays < 0: H-0 s.d. maks H+|n| setelah mulai sakit/cuti.
 */
export function validateSubmissionLeadTime(
  startDateStr,
  submissionDateStr,
  leaveTypeCode,
  minSubmissionDays = 0,
  leaveTypeName = ""
) {
  if (!startDateStr || !submissionDateStr) {
    return { valid: false, message: "Tanggal mulai cuti wajib diisi." };
  }

  const diff = diffCalendarDays(startDateStr, submissionDateStr);
  const lead = Number(minSubmissionDays || 0);

  if (leaveTypeCode === "SICK" || lead < 0) {
    const maxRetroactiveDays = Math.abs(lead || 3);
    // diff === 0 -> H-0 (hari ini); diff === -3 -> 3 hari setelah mulai sakit (H+3)
    if (diff > 0 || diff < -maxRetroactiveDays) {
      const label =
        leaveTypeCode === "SICK"
          ? "Cuti Sakit"
          : leaveTypeName || "Jenis cuti ini";
      return {
        valid: false,
        message: `${label} hanya dapat diajukan pada H-0 hingga maksimal H+${maxRetroactiveDays} sejak tanggal mulai.`,
      };
    }
    return { valid: true, message: "" };
  }

  if (lead === 0 && diff < 0) {
    return {
      valid: false,
      message: "Tanggal mulai cuti tidak boleh lebih awal dari hari ini (minimal H-0).",
    };
  }

  if (lead > 0 && diff < lead) {
    return {
      valid: false,
      message: `Wajib diajukan minimal H-${lead} sebelum tanggal mulai cuti.`,
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
