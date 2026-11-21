import { query } from "@/lib/db";
import { buildUserInitials } from "@/lib/auth";

/**
 * Format timestamp PostgreSQL menjadi label waktu Indonesia ringkas (misal: "18 Nov 2026, 14:20").
 * @param {string|Date|null} value
 */
function formatTimestampId(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const months = [
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
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Mengekstrak nama file bersih dari path lokal `/uploads/attachments/...`.
 * @param {string|null} url
 */
function extractAttachmentName(url) {
  if (!url) return "";
  const clean = String(url).split("?")[0];
  const segments = clean.split("/");
  return segments[segments.length - 1] || clean;
}

/**
 * Memetakan baris SQL pengajuan cuti untuk portal verifikasi Ketua Divisi.
 */
function mapLeaderApprovalRow(row) {
  const attachmentUrl = row.attachment_url || null;
  return {
    id: row.id,
    userId: row.user_id,
    applicantName: row.applicant_name || "",
    applicantRole: row.applicant_role || "Karyawan",
    applicantAvatar: row.applicant_avatar || null,
    applicantInitials: buildUserInitials(row.applicant_name),
    divisionName: row.division_name || "-",
    leaveTypeId: row.leave_type_id,
    leaveTypeCode: row.leave_type_code,
    leaveTypeName: row.leave_type_name,
    deductsAnnualQuota: Boolean(row.deducts_annual_quota),
    remainingQuota: Number(row.remaining_leave_quota ?? 0),
    isHalfDay: Boolean(row.is_half_day),
    submissionDate: row.submission_date,
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays: Number(row.total_days),
    reason: row.reason || "",
    handoverUserId: row.handover_user_id,
    handoverUserName: row.handover_user_name || "-",
    handoverNotes: row.handover_notes || "",
    attachmentUrl,
    attachmentName: extractAttachmentName(attachmentUrl),
    leaveAddress: row.leave_address || "",
    emergencyPhone: row.emergency_phone || "",
    status: row.status,
    quotaDeducted: Boolean(row.quota_deducted),
    rejectedByRole: row.rejected_by_role || null,
    rejectionReason: row.rejection_reason || null,
    cancellationReason: row.cancellation_reason || null,
    cancelledAt: row.cancelled_at ? formatTimestampId(row.cancelled_at) : null,
    leaderApproverName: row.leader_approver_name || null,
    leaderApprovedAt: row.leader_approved_at
      ? formatTimestampId(row.leader_approved_at)
      : null,
    leaderNotes: row.leader_notes || null,
    hrdApproverName: row.hrd_approver_name || null,
    hrdApprovedAt: row.hrd_approved_at
      ? formatTimestampId(row.hrd_approved_at)
      : null,
    hrdNotes: row.hrd_notes || null,
    createdAtLabel: formatTimestampId(row.created_at),
  };
}

/**
 * Memuat seluruh data workspace Modul 6A: Verifikasi Tahap 1 (Ketua Divisi)
 * secara langsung dari PostgreSQL dengan Raw SQL terparameterisasi.
 *
 * Scope Mutlak (Guard #2):
 * - Hanya divisi di mana `divisions.leader_id = $leaderId`
 * - Hanya pemohon ber-role `'Karyawan'` (`u.role = 'Karyawan'`)
 * - Ketua Divisi tidak pernah melihat/memverifikasi pengajuan pribadinya sendiri (`lr.user_id <> $leaderId`)
 *
 * @param {number} leaderId
 * @param {{ tab?: string, leaveTypeId?: number|null, status?: string, search?: string }} [filters]
 */
export async function getLeaderApprovalWorkspaceData(leaderId, filters = {}) {
  const leaderSql = `
    SELECT
      u.id,
      u.full_name,
      u.role,
      u.avatar_url,
      d.id AS division_id,
      d.name AS division_name
    FROM users u
    LEFT JOIN divisions d ON d.leader_id = u.id
    WHERE u.id = $1
      AND u.is_active = TRUE
    LIMIT 1;
  `;

  const leaveTypesSql = `
    SELECT
      id,
      code,
      name,
      is_active
    FROM leave_types
    WHERE is_active = TRUE
    ORDER BY
      CASE code
        WHEN 'ANNUAL' THEN 1
        WHEN 'SICK' THEN 2
        ELSE 3
      END,
      name ASC;
  `;

  const [leaderRes, leaveTypesRes] = await Promise.all([
    query(leaderSql, [leaderId]),
    query(leaveTypesSql),
  ]);

  const leaderRow = leaderRes.rows[0];
  if (!leaderRow) return null;

  const leaderProfile = {
    id: leaderRow.id,
    fullName: leaderRow.full_name,
    role: leaderRow.role,
    avatarUrl: leaderRow.avatar_url || null,
    initials: buildUserInitials(leaderRow.full_name),
    divisionId: leaderRow.division_id ?? null,
    divisionName: leaderRow.division_name || null,
  };

  const leaveTypes = leaveTypesRes.rows.map((lt) => ({
    id: lt.id,
    code: lt.code,
    name: lt.name,
    isActive: Boolean(lt.is_active),
  }));

  // Edge Case: Ketua Divisi belum ditugaskan memimpin divisi aktif mana pun
  if (!leaderProfile.divisionId) {
    return {
      leaderProfile,
      leaveTypes,
      counts: {
        pending: 0,
        verified: 0,
        attachmentsPending: 0,
        total: 0,
      },
      requests: [],
    };
  }

  // Hitung metrik KPI divisi secara akurat (tanpa terpengaruh filter pencarian)
  const countsSql = `
    SELECT
      COUNT(*) FILTER (WHERE lr.status = 'Pending')::int AS pending_count,
      COUNT(*) FILTER (WHERE lr.status <> 'Pending')::int AS verified_count,
      COUNT(*) FILTER (
        WHERE lr.status = 'Pending'
          AND lr.attachment_url IS NOT NULL
          AND BTRIM(lr.attachment_url) <> ''
      )::int AS attachments_pending_count,
      COUNT(*)::int AS total_count
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    JOIN divisions d ON u.division_id = d.id
    WHERE d.id = $1
      AND d.leader_id = $2
      AND u.role = 'Karyawan'
      AND lr.user_id <> $2;
  `;

  // Bangun filter opsional secara terparameterisasi
  const whereClauses = [
    "d.id = $1",
    "d.leader_id = $2",
    "u.role = 'Karyawan'",
    "lr.user_id <> $2",
  ];
  const params = [leaderProfile.divisionId, leaderProfile.id];

  if (filters.tab === "queue") {
    whereClauses.push("lr.status = 'Pending'");
  } else if (filters.tab === "history") {
    whereClauses.push("lr.status <> 'Pending'");
    if (filters.status && filters.status !== "ALL") {
      params.push(filters.status);
      whereClauses.push(`lr.status = $${params.length}`);
    }
  } else if (filters.status && filters.status !== "ALL") {
    params.push(filters.status);
    whereClauses.push(`lr.status = $${params.length}`);
  }

  if (filters.leaveTypeId) {
    params.push(filters.leaveTypeId);
    whereClauses.push(`lr.leave_type_id = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    whereClauses.push(
      `(u.full_name ILIKE $${params.length} OR lr.reason ILIKE $${params.length} OR COALESCE(hu.full_name, '') ILIKE $${params.length})`
    );
  }

  const requestsSql = `
    SELECT
      lr.id,
      lr.user_id,
      u.full_name AS applicant_name,
      u.role AS applicant_role,
      u.avatar_url AS applicant_avatar,
      u.remaining_leave_quota,
      d.name AS division_name,
      lr.leave_type_id,
      lt.code AS leave_type_code,
      lt.name AS leave_type_name,
      lt.deducts_annual_quota,
      lr.is_half_day,
      TO_CHAR(lr.submission_date, 'YYYY-MM-DD') AS submission_date,
      TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date,
      lr.total_days,
      lr.reason,
      lr.handover_user_id,
      hu.full_name AS handover_user_name,
      lr.handover_notes,
      lr.attachment_url,
      lr.leave_address,
      lr.emergency_phone,
      lr.status,
      lr.quota_deducted,
      lr.rejected_by_role,
      lr.rejection_reason,
      lr.cancellation_reason,
      lr.cancelled_at,
      COALESCE(leader_u.full_name, la_s1.approver_name_snapshot) AS leader_approver_name,
      COALESCE(lr.leader_approved_at, la_s1.acted_at) AS leader_approved_at,
      COALESCE(lr.leader_notes, la_s1.notes) AS leader_notes,
      COALESCE(hrd_u.full_name, la_s2.approver_name_snapshot) AS hrd_approver_name,
      COALESCE(lr.hrd_approved_at, la_s2.acted_at) AS hrd_approved_at,
      COALESCE(lr.hrd_notes, la_s2.notes) AS hrd_notes,
      lr.created_at
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    JOIN divisions d ON u.division_id = d.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN users hu ON lr.handover_user_id = hu.id
    LEFT JOIN users leader_u ON lr.leader_approver_id = leader_u.id
    LEFT JOIN users hrd_u ON lr.hrd_approver_id = hrd_u.id
    LEFT JOIN leave_approvals la_s1
           ON la_s1.leave_request_id = lr.id AND la_s1.approval_stage = 1
    LEFT JOIN leave_approvals la_s2
           ON la_s2.leave_request_id = lr.id AND la_s2.approval_stage = 2
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY
      CASE WHEN lr.status = 'Pending' THEN 0 ELSE 1 END ASC,
      lr.created_at DESC;
  `;

  const [countsRes, requestsRes] = await Promise.all([
    query(countsSql, [leaderProfile.divisionId, leaderProfile.id]),
    query(requestsSql, params),
  ]);

  const countRow = countsRes.rows[0] || {};
  const counts = {
    pending: Number(countRow.pending_count || 0),
    verified: Number(countRow.verified_count || 0),
    attachmentsPending: Number(countRow.attachments_pending_count || 0),
    total: Number(countRow.total_count || 0),
  };

  return {
    leaderProfile,
    leaveTypes,
    counts,
    requests: requestsRes.rows.map(mapLeaderApprovalRow),
  };
}

/**
 * Memuat seluruh data workspace Modul 6B: Persetujuan Final & Multi-Approve HRD (/approvals/hrd)
 * secara langsung dari PostgreSQL dengan Raw SQL terparameterisasi.
 *
 * Cakupan Antrean Final HRD (2 Jalur Resmi PRD):
 * - Jalur 1: Pemohon `role = 'Karyawan'` dengan `status = 'Approved by Leader'`
 * - Jalur 2: Pemohon `role = 'Ketua Divisi'` dengan `status = 'Pending'`
 * - Tab 2 (Perusahaan): Seluruh pengajuan cuti karyawan di semua divisi & 5 status resmi.
 *
 * @param {number} hrdId
 * @param {{ tab?: string, jalur?: string, divisionId?: number|null, leaveTypeId?: number|null, status?: string, search?: string }} [filters]
 */
export async function getHrdApprovalWorkspaceData(hrdId, filters = {}) {
  const hrdSql = `
    SELECT
      u.id,
      u.full_name,
      u.role,
      u.avatar_url
    FROM users u
    WHERE u.id = $1
      AND u.is_active = TRUE
    LIMIT 1;
  `;

  const divisionsSql = `
    SELECT id, name
    FROM divisions
    ORDER BY name ASC;
  `;

  const leaveTypesSql = `
    SELECT
      id,
      code,
      name,
      is_active
    FROM leave_types
    WHERE is_active = TRUE
    ORDER BY
      CASE code
        WHEN 'ANNUAL' THEN 1
        WHEN 'SICK' THEN 2
        ELSE 3
      END,
      name ASC;
  `;

  const countsSql = `
    SELECT
      COUNT(*) FILTER (
        WHERE (u.role = 'Karyawan' AND lr.status = 'Approved by Leader')
           OR (u.role = 'Ketua Divisi' AND lr.status = 'Pending')
      )::int AS pending_final_count,
      COUNT(*) FILTER (
        WHERE u.role = 'Karyawan' AND lr.status = 'Approved by Leader'
      )::int AS jalur1_count,
      COUNT(*) FILTER (
        WHERE u.role = 'Ketua Divisi' AND lr.status = 'Pending'
      )::int AS jalur2_count,
      COUNT(*) FILTER (WHERE lr.status = 'Approved')::int AS approved_count,
      COUNT(*)::int AS total_count
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id;
  `;

  // Bangun klausa WHERE dinamis terparameterisasi
  const whereClauses = ["1 = 1"];
  const params = [];

  if (filters.tab === "queue") {
    whereClauses.push(
      "((u.role = 'Karyawan' AND lr.status = 'Approved by Leader') OR (u.role = 'Ketua Divisi' AND lr.status = 'Pending'))"
    );
  }

  if (filters.jalur === "J1") {
    whereClauses.push("u.role = 'Karyawan'");
  } else if (filters.jalur === "J2") {
    whereClauses.push("u.role = 'Ketua Divisi'");
  }

  if (filters.divisionId) {
    params.push(filters.divisionId);
    whereClauses.push(`u.division_id = $${params.length}`);
  }

  if (filters.leaveTypeId) {
    params.push(filters.leaveTypeId);
    whereClauses.push(`lr.leave_type_id = $${params.length}`);
  }

  if (filters.status && filters.status !== "ALL" && filters.tab !== "queue") {
    params.push(filters.status);
    whereClauses.push(`lr.status = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    whereClauses.push(
      `(u.full_name ILIKE $${idx} OR lr.reason ILIKE $${idx} OR COALESCE(d.name, '') ILIKE $${idx} OR COALESCE(hu.full_name, '') ILIKE $${idx})`
    );
  }

  const requestsSql = `
    SELECT
      lr.id,
      lr.user_id,
      u.full_name AS applicant_name,
      u.role AS applicant_role,
      u.avatar_url AS applicant_avatar,
      u.remaining_leave_quota,
      u.division_id,
      COALESCE(d.name, 'Tanpa Divisi') AS division_name,
      lr.leave_type_id,
      lt.code AS leave_type_code,
      lt.name AS leave_type_name,
      lt.deducts_annual_quota,
      lr.is_half_day,
      TO_CHAR(lr.submission_date, 'YYYY-MM-DD') AS submission_date,
      TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date,
      lr.total_days,
      lr.reason,
      lr.handover_user_id,
      hu.full_name AS handover_user_name,
      lr.handover_notes,
      lr.attachment_url,
      lr.leave_address,
      lr.emergency_phone,
      lr.status,
      lr.quota_deducted,
      lr.rejected_by_role,
      lr.rejection_reason,
      lr.cancellation_reason,
      lr.cancelled_at,
      COALESCE(leader_u.full_name, la_s1.approver_name_snapshot) AS leader_approver_name,
      COALESCE(lr.leader_approved_at, la_s1.acted_at) AS leader_approved_at,
      COALESCE(lr.leader_notes, la_s1.notes) AS leader_notes,
      COALESCE(hrd_u.full_name, la_s2.approver_name_snapshot) AS hrd_approver_name,
      COALESCE(lr.hrd_approved_at, la_s2.acted_at) AS hrd_approved_at,
      COALESCE(lr.hrd_notes, la_s2.notes) AS hrd_notes,
      lr.created_at
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    LEFT JOIN divisions d ON u.division_id = d.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN users hu ON lr.handover_user_id = hu.id
    LEFT JOIN users leader_u ON lr.leader_approver_id = leader_u.id
    LEFT JOIN users hrd_u ON lr.hrd_approver_id = hrd_u.id
    LEFT JOIN leave_approvals la_s1
           ON la_s1.leave_request_id = lr.id AND la_s1.approval_stage = 1
    LEFT JOIN leave_approvals la_s2
           ON la_s2.leave_request_id = lr.id AND la_s2.approval_stage = 2
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY
      CASE
        WHEN (u.role = 'Karyawan' AND lr.status = 'Approved by Leader')
          OR (u.role = 'Ketua Divisi' AND lr.status = 'Pending')
        THEN 0
        ELSE 1
      END ASC,
      lr.created_at DESC;
  `;

  const [hrdRes, divisionsRes, leaveTypesRes, countsRes, requestsRes] =
    await Promise.all([
      query(hrdSql, [hrdId]),
      query(divisionsSql),
      query(leaveTypesSql),
      query(countsSql),
      query(requestsSql, params),
    ]);

  const hrdRow = hrdRes.rows[0];
  if (!hrdRow) return null;

  const hrdProfile = {
    id: hrdRow.id,
    fullName: hrdRow.full_name,
    role: hrdRow.role,
    avatarUrl: hrdRow.avatar_url || null,
    initials: buildUserInitials(hrdRow.full_name),
  };

  const divisions = divisionsRes.rows.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  const leaveTypes = leaveTypesRes.rows.map((lt) => ({
    id: lt.id,
    code: lt.code,
    name: lt.name,
    isActive: Boolean(lt.is_active),
  }));

  const countRow = countsRes.rows[0] || {};
  const counts = {
    pendingFinal: Number(countRow.pending_final_count || 0),
    jalur1: Number(countRow.jalur1_count || 0),
    jalur2: Number(countRow.jalur2_count || 0),
    approved: Number(countRow.approved_count || 0),
    total: Number(countRow.total_count || 0),
  };

  return {
    hrdProfile,
    divisions,
    leaveTypes,
    counts,
    requests: requestsRes.rows.map((row) => ({
      ...mapLeaderApprovalRow(row),
      divisionId: row.division_id ?? null,
    })),
  };
}
