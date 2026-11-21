import { query } from "@/lib/db";
import { isCoreLeaveTypeCode } from "@/lib/leave-type-utils";

/**
 * Memetakan baris tabel `leave_types` dari PostgreSQL menjadi objek serializable client.
 * @param {object} row
 */
function mapLeaveTypeRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    maxQuota: Number(row.max_quota),
    minSubmissionDays: Number(row.min_submission_days),
    requiresAttachment: Boolean(row.requires_attachment),
    deductsAnnualQuota: Boolean(row.deducts_annual_quota),
    requiresMinOneYearTenure: Boolean(row.requires_min_one_year_tenure),
    description: row.description || "",
    isActive: Boolean(row.is_active),
    isCore: isCoreLeaveTypeCode(row.code),
    usageCount: Number(row.usage_count || 0),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

/**
 * Memuat seluruh data workspace CMS Modul 4: Manajemen Jenis Cuti Dinamis (/admin/leave-types).
 * Mengambil seluruh baris `leave_types` beserta jumlah transaksi pemakaian di `leave_requests`
 * (LEFT JOIN + GROUP BY) serta ringkasan statistik kategori.
 */
export async function getAdminLeaveTypesWorkspaceData() {
  const sql = `
    SELECT
      lt.id,
      lt.code,
      lt.name,
      lt.max_quota,
      lt.min_submission_days,
      lt.requires_attachment,
      lt.deducts_annual_quota,
      lt.requires_min_one_year_tenure,
      lt.description,
      lt.is_active,
      TO_CHAR(lt.created_at, 'YYYY-MM-DD') AS created_at,
      TO_CHAR(lt.updated_at, 'YYYY-MM-DD') AS updated_at,
      COUNT(lr.id)::INT AS usage_count
    FROM leave_types lt
    LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id
    GROUP BY lt.id
    ORDER BY
      CASE lt.code
        WHEN 'ANNUAL' THEN 0
        WHEN 'SICK' THEN 1
        ELSE 2
      END,
      LOWER(lt.name) ASC,
      lt.id ASC;
  `;

  const res = await query(sql);
  const leaveTypes = res.rows.map(mapLeaveTypeRow);

  let active = 0;
  let withAttachment = 0;
  let deductsAnnual = 0;

  for (const lt of leaveTypes) {
    if (lt.isActive) active += 1;
    if (lt.requiresAttachment) withAttachment += 1;
    if (lt.deductsAnnualQuota) deductsAnnual += 1;
  }

  return {
    leaveTypes,
    stats: {
      total: leaveTypes.length,
      active,
      inactive: leaveTypes.length - active,
      withAttachment,
      deductsAnnual,
    },
  };
}
