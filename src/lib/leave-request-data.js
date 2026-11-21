import { query } from "@/lib/db";
import { buildUserInitials } from "@/lib/auth";
import { buildLeaveTypeRuleSummary } from "@/lib/leave-type-utils";

/**
 * Memuat seluruh data awal halaman Form Pengajuan Cuti Baru (/leaves/new)
 * langsung dari PostgreSQL dalam satu sesi paralel.
 * @param {number} userId
 */
export async function getNewLeaveWorkspaceData(userId) {
  const userSql = `
    SELECT
      u.id,
      u.username,
      u.email,
      u.full_name,
      u.role,
      u.division_id,
      d.name AS division_name,
      leader.full_name AS leader_name,
      u.phone,
      u.address,
      u.initial_leave_quota,
      u.remaining_leave_quota,
      TO_CHAR(u.join_date, 'YYYY-MM-DD') AS join_date,
      TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_today,
      (CURRENT_DATE >= (u.join_date + INTERVAL '1 year')::date) AS is_eligible_annual_leave
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    LEFT JOIN users leader ON d.leader_id = leader.id
    WHERE u.id = $1
      AND u.is_active = TRUE
    LIMIT 1;
  `;

  const userRes = await query(userSql, [userId]);
  const userRow = userRes.rows[0];
  if (!userRow) return null;

  const leaveTypesSql = `
    SELECT
      id,
      code,
      name,
      max_quota,
      min_submission_days,
      requires_attachment,
      deducts_annual_quota,
      requires_min_one_year_tenure,
      description
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

  const colleaguesSql = `
    SELECT
      id,
      full_name,
      role
    FROM users
    WHERE division_id = $1
      AND is_active = TRUE
      AND id <> $2
    ORDER BY full_name ASC;
  `;

  const holidaysSql = `
    SELECT
      TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date,
      name,
      holiday_type
    FROM holidays
    WHERE is_active = TRUE
    ORDER BY holiday_date ASC;
  `;

  const activeRangesSql = `
    SELECT
      id,
      TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
      status
    FROM leave_requests
    WHERE user_id = $1
      AND status IN ('Pending', 'Approved by Leader', 'Approved')
    ORDER BY start_date ASC;
  `;

  const [leaveTypesRes, colleaguesRes, holidaysRes, activeRangesRes] =
    await Promise.all([
      query(leaveTypesSql),
      userRow.division_id
        ? query(colleaguesSql, [userRow.division_id, userRow.id])
        : Promise.resolve({ rows: [] }),
      query(holidaysSql),
      query(activeRangesSql, [userRow.id]),
    ]);

  const userProfile = {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    fullName: userRow.full_name,
    role: userRow.role,
    divisionId: userRow.division_id,
    divisionName: userRow.division_name || null,
    leaderName: userRow.leader_name || null,
    phone: userRow.phone || "",
    address: userRow.address || "",
    initialLeaveQuota: Number(userRow.initial_leave_quota),
    remainingLeaveQuota: Number(userRow.remaining_leave_quota),
    joinDate: userRow.join_date,
    isEligibleAnnualLeave: Boolean(userRow.is_eligible_annual_leave),
  };

  const leaveTypes = leaveTypesRes.rows.map((row) => {
    const mapped = {
      id: row.id,
      code: row.code,
      name: row.name,
      maxQuota: Number(row.max_quota),
      minSubmissionDays: Number(row.min_submission_days),
      requiresAttachment: Boolean(row.requires_attachment),
      deductsAnnualQuota: Boolean(row.deducts_annual_quota),
      requiresMinOneYearTenure: Boolean(row.requires_min_one_year_tenure),
      description: row.description || "",
    };
    return {
      ...mapped,
      ruleSummary: buildLeaveTypeRuleSummary(mapped),
    };
  });

  const colleagues = colleaguesRes.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    role: row.role,
  }));

  const holidays = holidaysRes.rows.map((row) => ({
    holidayDate: row.holiday_date,
    name: row.name,
    holidayType: row.holiday_type,
  }));

  const activeLeaveRanges = activeRangesRes.rows.map((row) => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  }));

  return {
    serverToday: userRow.server_today,
    userProfile,
    leaveTypes,
    colleagues,
    holidays,
    activeLeaveRanges,
  };
}

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
 * Mengekstrak nama file yang bersih dari path lokal `/uploads/attachments/...`.
 * @param {string|null} url
 */
function extractAttachmentName(url) {
  if (!url) return "";
  const clean = String(url).split("?")[0];
  const segments = clean.split("/");
  return segments[segments.length - 1] || clean;
}

/**
 * Membangun array Timeline Persetujuan 2 Jalur berdasarkan role pemohon,
 * status pengajuan, serta histori audit pada tabel `leave_approvals`.
 * - Jalur 1 (Karyawan): Diajukan -> Verifikasi Ketua Divisi -> Persetujuan Final HRD
 * - Jalur 2 (Ketua Divisi): Diajukan -> Persetujuan Final HRD (bypass tahap 1)
 */
export function buildLeaveTimeline(row, approvalRows = []) {
  const isLeaderApplicant = row.applicant_role === "Ketua Divisi";
  const stage1Approval = approvalRows.find((a) => Number(a.approval_stage) === 1);
  const stage2Approval = approvalRows.find((a) => Number(a.approval_stage) === 2);

  const timeline = [
    {
      stage: "Pengajuan Dibuat",
      actor: row.applicant_name || "Pemohon",
      role: row.applicant_role || "Karyawan",
      time: formatTimestampId(row.created_at) || row.submission_date,
      state: "done",
      notes: "",
    },
  ];

  // Jika dibatalkan oleh pemohon saat masih Pending
  if (row.status === "Cancelled") {
    timeline.push({
      stage: "Dibatalkan Pemohon",
      actor: row.applicant_name || "Pemohon",
      role: row.applicant_role || "Karyawan",
      time: formatTimestampId(row.cancelled_at) || "-",
      state: "cancelled",
      notes: row.cancellation_reason || "",
    });
    return timeline;
  }

  // Tahap 1: Khusus pemohon Karyawan (Ketua Divisi bypass langsung ke HRD)
  if (!isLeaderApplicant) {
    if (stage1Approval) {
      const isRejected = stage1Approval.action === "Rejected";
      timeline.push({
        stage: isRejected
          ? "Ditolak Ketua Divisi"
          : "Verifikasi Ketua Divisi",
        actor: stage1Approval.approver_name_snapshot || row.leader_approver_name || "Ketua Divisi",
        role: "Ketua Divisi",
        time: formatTimestampId(stage1Approval.acted_at),
        state: isRejected ? "rejected" : "done",
        notes: stage1Approval.notes || "",
      });
      if (isRejected) return timeline;
    } else if (row.leader_approved_at) {
      const isRejectedByLeader =
        row.status === "Rejected" && row.rejected_by_role === "Ketua Divisi";
      timeline.push({
        stage: isRejectedByLeader
          ? "Ditolak Ketua Divisi"
          : "Verifikasi Ketua Divisi",
        actor: row.leader_approver_name || row.division_leader_name || "Ketua Divisi",
        role: "Ketua Divisi",
        time: formatTimestampId(row.leader_approved_at),
        state: isRejectedByLeader ? "rejected" : "done",
        notes: row.leader_notes || (isRejectedByLeader ? row.rejection_reason || "" : ""),
      });
      if (isRejectedByLeader) return timeline;
    } else {
      timeline.push({
        stage: "Verifikasi Ketua Divisi",
        actor: row.division_leader_name || "Ketua Divisi",
        role: "Ketua Divisi",
        time: "Menunggu verifikasi",
        state: row.status === "Pending" ? "active" : "upcoming",
        notes: "",
      });
    }
  }

  // Tahap 2: Persetujuan Final HRD (untuk Karyawan setelah Leader, atau langsung untuk Ketua Divisi)
  if (stage2Approval) {
    const isRejected = stage2Approval.action === "Rejected";
    timeline.push({
      stage: isRejected ? "Ditolak HRD" : "Persetujuan Final HRD",
      actor: stage2Approval.approver_name_snapshot || row.hrd_approver_name || "HRD",
      role: "HRD",
      time: formatTimestampId(stage2Approval.acted_at),
      state: isRejected ? "rejected" : "done",
      notes: stage2Approval.notes || "",
    });
  } else if (row.hrd_approved_at) {
    const isRejectedByHrd =
      row.status === "Rejected" && row.rejected_by_role === "HRD";
    timeline.push({
      stage: isRejectedByHrd ? "Ditolak HRD" : "Persetujuan Final HRD",
      actor: row.hrd_approver_name || "HRD",
      role: "HRD",
      time: formatTimestampId(row.hrd_approved_at),
      state: isRejectedByHrd ? "rejected" : "done",
      notes: row.hrd_notes || (isRejectedByHrd ? row.rejection_reason || "" : ""),
    });
  } else {
    const isWaitingHrd =
      (isLeaderApplicant && row.status === "Pending") ||
      (!isLeaderApplicant && row.status === "Approved by Leader");
    timeline.push({
      stage: "Persetujuan Final HRD",
      actor: "Tim HRD",
      role: "HRD",
      time: isWaitingHrd ? "Menunggu persetujuan final" : "Menunggu tahap sebelumnya",
      state: isWaitingHrd ? "active" : "upcoming",
      notes: "",
    });
  }

  return timeline;
}

/**
 * Memetakan satu baris SQL `leave_requests` menjadi objek bersih untuk UI / API JSON.
 */
function mapLeaveRequestRow(row, approvalRows = []) {
  const attachmentUrl = row.attachment_url || null;
  return {
    id: row.id,
    userId: row.user_id,
    applicantName: row.applicant_name || "",
    applicantRole: row.applicant_role || "",
    divisionName: row.division_name || null,
    divisionLeaderName: row.division_leader_name || null,
    leaveTypeId: row.leave_type_id,
    leaveTypeCode: row.leave_type_code,
    leaveTypeName: row.leave_type_name,
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
    timeline: buildLeaveTimeline(row, approvalRows),
  };
}

/**
 * Memuat daftar riwayat pengajuan cuti milik pemohon (`/leaves` & `GET /api/leaves`)
 * dengan dukungan filter dinamis terparameterisasi (status, jenis cuti, rentang tanggal, pencarian, sortir).
 */
export async function getLeaveHistoryWorkspaceData(userId, filters = {}) {
  const userSql = `
    SELECT
      u.id,
      u.full_name,
      u.role,
      u.division_id,
      d.name AS division_name,
      leader.full_name AS division_leader_name,
      u.initial_leave_quota,
      u.remaining_leave_quota
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    LEFT JOIN users leader ON d.leader_id = leader.id
    WHERE u.id = $1
      AND u.is_active = TRUE
    LIMIT 1;
  `;

  const userRes = await query(userSql, [userId]);
  const userRow = userRes.rows[0];
  if (!userRow) return null;

  // Bangun klausa WHERE dinamis secara aman menggunakan parameterized placeholder ($1, $2, ...)
  const whereClauses = ["lr.user_id = $1"];
  const params = [userId];

  if (filters.status && filters.status !== "ALL") {
    if (filters.status === "WAITING") {
      whereClauses.push("lr.status IN ('Pending', 'Approved by Leader')");
    } else {
      params.push(filters.status);
      whereClauses.push(`lr.status = $${params.length}`);
    }
  }

  if (filters.leaveTypeId) {
    params.push(filters.leaveTypeId);
    whereClauses.push(`lr.leave_type_id = $${params.length}`);
  }

  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    whereClauses.push(`lr.end_date >= $${params.length}::date`);
  }

  if (filters.dateTo) {
    params.push(filters.dateTo);
    whereClauses.push(`lr.start_date <= $${params.length}::date`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    whereClauses.push(
      `(lr.reason ILIKE $${idx} OR lr.handover_notes ILIKE $${idx} OR lt.name ILIKE $${idx} OR COALESCE(hu.full_name, '') ILIKE $${idx})`
    );
  }

  let orderBySql = "lr.submission_date DESC, lr.created_at DESC, lr.id DESC";
  if (filters.sortBy === "start_desc") {
    orderBySql = "lr.start_date DESC, lr.id DESC";
  } else if (filters.sortBy === "start_asc") {
    orderBySql = "lr.start_date ASC, lr.id ASC";
  }

  const requestsSql = `
    SELECT
      lr.id,
      lr.user_id,
      u.full_name AS applicant_name,
      u.role AS applicant_role,
      d.name AS division_name,
      leader.full_name AS division_leader_name,
      lr.leave_type_id,
      lt.code AS leave_type_code,
      lt.name AS leave_type_name,
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
      lr.leader_approved_at,
      lr.leader_notes,
      la_u.full_name AS leader_approver_name,
      lr.hrd_approved_at,
      lr.hrd_notes,
      hr_u.full_name AS hrd_approver_name,
      lr.created_at
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    LEFT JOIN divisions d ON u.division_id = d.id
    LEFT JOIN users leader ON d.leader_id = leader.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN users hu ON lr.handover_user_id = hu.id
    LEFT JOIN users la_u ON lr.leader_approver_id = la_u.id
    LEFT JOIN users hr_u ON lr.hrd_approver_id = hr_u.id
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY ${orderBySql};
  `;

  const countsSql = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('Pending', 'Approved by Leader'))::int AS waiting,
      COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'Approved by Leader')::int AS approved_by_leader,
      COUNT(*) FILTER (WHERE status = 'Approved')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'Rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE status = 'Cancelled')::int AS cancelled
    FROM leave_requests
    WHERE user_id = $1;
  `;

  const leaveTypesSql = `
    SELECT id, code, name, is_active
    FROM leave_types
    WHERE is_active = TRUE
       OR id IN (SELECT DISTINCT leave_type_id FROM leave_requests WHERE user_id = $1)
    ORDER BY
      CASE code
        WHEN 'ANNUAL' THEN 1
        WHEN 'SICK' THEN 2
        ELSE 3
      END,
      name ASC;
  `;

  const [requestsRes, countsRes, leaveTypesRes] = await Promise.all([
    query(requestsSql, params),
    query(countsSql, [userId]),
    query(leaveTypesSql, [userId]),
  ]);

  const countRow = countsRes.rows[0] || {};
  const counts = {
    ALL: Number(countRow.total || 0),
    WAITING: Number(countRow.waiting || 0),
    Pending: Number(countRow.pending || 0),
    "Approved by Leader": Number(countRow.approved_by_leader || 0),
    Approved: Number(countRow.approved || 0),
    Rejected: Number(countRow.rejected || 0),
    Cancelled: Number(countRow.cancelled || 0),
  };

  return {
    userProfile: {
      id: userRow.id,
      fullName: userRow.full_name,
      role: userRow.role,
      divisionId: userRow.division_id,
      divisionName: userRow.division_name || null,
      divisionLeaderName: userRow.division_leader_name || null,
      initialLeaveQuota: Number(userRow.initial_leave_quota),
      remainingLeaveQuota: Number(userRow.remaining_leave_quota),
    },
    counts,
    leaveTypes: leaveTypesRes.rows.map((lt) => ({
      id: lt.id,
      code: lt.code,
      name: lt.name,
      isActive: Boolean(lt.is_active),
    })),
    requests: requestsRes.rows.map((row) => mapLeaveRequestRow(row)),
  };
}

/**
 * Mengambil detail lengkap satu pengajuan cuti beserta histori `leave_approvals`
 * dengan pemeriksaan hak akses (*Resource Ownership Guard*):
 * - Pemilik pengajuan (`lr.user_id === currentUser.id`)
 * - Ketua Divisi dari divisi pemohon (`d.leader_id === currentUser.id`)
 * - HRD atau Admin
 */
export async function getLeaveRequestDetailById(requestId, currentUser) {
  const detailSql = `
    SELECT
      lr.id,
      lr.user_id,
      u.full_name AS applicant_name,
      u.email AS applicant_email,
      u.username AS applicant_username,
      u.role AS applicant_role,
      u.avatar_url AS applicant_avatar,
      u.remaining_leave_quota,
      u.division_id AS applicant_division_id,
      d.name AS division_name,
      d.leader_id AS division_leader_id,
      leader.full_name AS division_leader_name,
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
      COALESCE(lr.leader_approved_at, la_s1.acted_at) AS leader_approved_at,
      COALESCE(lr.leader_notes, la_s1.notes) AS leader_notes,
      COALESCE(la_u.full_name, la_s1.approver_name_snapshot) AS leader_approver_name,
      COALESCE(lr.hrd_approved_at, la_s2.acted_at) AS hrd_approved_at,
      COALESCE(lr.hrd_notes, la_s2.notes) AS hrd_notes,
      COALESCE(hr_u.full_name, la_s2.approver_name_snapshot) AS hrd_approver_name,
      lr.created_at
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    LEFT JOIN divisions d ON u.division_id = d.id
    LEFT JOIN users leader ON d.leader_id = leader.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN users hu ON lr.handover_user_id = hu.id
    LEFT JOIN users la_u ON lr.leader_approver_id = la_u.id
    LEFT JOIN users hr_u ON lr.hrd_approver_id = hr_u.id
    LEFT JOIN leave_approvals la_s1
           ON la_s1.leave_request_id = lr.id AND la_s1.approval_stage = 1
    LEFT JOIN leave_approvals la_s2
           ON la_s2.leave_request_id = lr.id AND la_s2.approval_stage = 2
    WHERE lr.id = $1
    LIMIT 1;
  `;

  const detailRes = await query(detailSql, [requestId]);
  if (detailRes.rowCount === 0) {
    return { ok: false, status: 404, error: "Pengajuan cuti tidak ditemukan." };
  }

  const row = detailRes.rows[0];
  const isOwner = Number(row.user_id) === Number(currentUser.id);
  const isDivisionLeader =
    currentUser.role === "Ketua Divisi" &&
    row.division_leader_id !== null &&
    Number(row.division_leader_id) === Number(currentUser.id);
  const isPrivileged =
    currentUser.role === "HRD" || currentUser.role === "Admin";

  if (!isOwner && !isDivisionLeader && !isPrivileged) {
    return {
      ok: false,
      status: 403,
      error: "Anda tidak memiliki izin untuk melihat detail pengajuan cuti ini.",
    };
  }

  const approvalsRes = await query(
    `
      SELECT
        id,
        approver_id,
        approver_name_snapshot,
        approver_role,
        approval_stage,
        action,
        notes,
        acted_at
      FROM leave_approvals
      WHERE leave_request_id = $1
      ORDER BY approval_stage ASC, acted_at ASC;
    `,
    [requestId]
  );

  return {
    ok: true,
    status: 200,
    request: {
      ...mapLeaveRequestRow(row, approvalsRes.rows),
      applicantEmail: row.applicant_email || "",
      applicantUsername: row.applicant_username || "",
      applicantAvatar: row.applicant_avatar || null,
      applicantInitials: buildUserInitials(row.applicant_name),
      remainingQuota: Number(row.remaining_leave_quota ?? 0),
      deductsAnnualQuota: Boolean(row.deducts_annual_quota),
      approvals: approvalsRes.rows.map((a) => ({
        id: a.id,
        approverName: a.approver_name_snapshot,
        approverRole: a.approver_role,
        stage: Number(a.approval_stage),
        action: a.action,
        notes: a.notes || "",
        actedAt: formatTimestampId(a.acted_at),
      })),
    },
  };
}
