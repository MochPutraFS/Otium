/**
 * Utilitas murni (client & server safe) untuk Jenis Cuti Dinamis (CMS Modul 4).
 * Tidak mengimpor driver database (`pg`) agar aman dipakai di komponen Client (.jsx).
 */

export const CORE_LEAVE_TYPE_CODES = Object.freeze(["ANNUAL", "SICK"]);

/**
 * Mengecek apakah kode jenis cuti termasuk kategori inti sistem (ANNUAL / SICK)
 * yang kodenya dirujuk langsung oleh aturan bisnis (tenure, lead time H+3, dll.).
 * @param {string | null | undefined} code
 */
export function isCoreLeaveTypeCode(code) {
  if (!code) return false;
  return CORE_LEAVE_TYPE_CODES.includes(String(code).trim().toUpperCase());
}

/**
 * Memformat parameter `min_submission_days` (hari kalender) ke label aturan bisnis yang mudah dibaca.
 * - Nilai > 0  : wajib diajukan minimal H-n sebelum `start_date` (mis. `3` -> `Min. H-3`).
 * - Nilai === 0: dapat diajukan mulai hari H (`H-0 (Hari H)`).
 * - Nilai < 0  : dapat diajukan menyusul hingga maksimal H+n setelah `start_date` (mis. `-3` -> `Maks. H+3`).
 * @param {number | string} minSubmissionDays
 */
export function formatSubmissionLeadTime(minSubmissionDays) {
  const days = Number(minSubmissionDays || 0);
  if (!Number.isFinite(days) || days === 0) {
    return "H-0 (Hari H)";
  }
  if (days > 0) {
    return `Min. H-${days}`;
  }
  return `Maks. H+${Math.abs(days)}`;
}

/**
 * Menyusun kalimat ringkasan aturan bisnis jenis cuti secara live
 * untuk pratinjau di modal CMS Admin maupun panduan di Form Pengajuan Cuti.
 * @param {{
 *   minSubmissionDays?: number | string,
 *   requiresAttachment?: boolean,
 *   deductsAnnualQuota?: boolean,
 *   requiresMinOneYearTenure?: boolean,
 *   maxQuota?: number | string,
 * }} rule
 */
export function buildLeaveTypeRuleSummary(rule = {}) {
  const parts = [];

  if (rule.maxQuota !== undefined && rule.maxQuota !== "") {
    const parsedQuota = Number(rule.maxQuota);
    if (Number.isFinite(parsedQuota) && parsedQuota > 0) {
      parts.push(`Kuota maks. ${parsedQuota.toFixed(1)} hari`);
    }
  }

  parts.push(`Ajuan ${formatSubmissionLeadTime(rule.minSubmissionDays)}`);
  parts.push(
    rule.requiresAttachment ? "Wajib lampiran bukti" : "Tanpa lampiran wajib"
  );
  parts.push(
    rule.deductsAnnualQuota
      ? "Memotong kuota tahunan (12 hari)"
      : "Tidak memotong kuota tahunan"
  );
  parts.push(
    rule.requiresMinOneYearTenure
      ? "Wajib masa kerja >= 1 tahun"
      : "Berlaku untuk semua masa kerja"
  );

  return parts.join(" · ");
}
