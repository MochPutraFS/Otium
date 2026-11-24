import { query } from "@/lib/db";
import { mapRoleToUiKey } from "@/lib/auth";
import {
  addCalendarDays,
  formatIndonesianDate,
  formatIndonesianDateRange,
  parseIsoDate,
} from "@/lib/date-utils";
import { formatTenureLabel } from "@/lib/shell-data";

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

const WEEKDAY_SHORT_ID = ["Sen", "Sel", "Rab", "Kam", "Jum"];

/**
 * Format label periode bulan & tahun berjalan dari tanggal ISO server (contoh: "Nov 2026").
 * @param {string} isoDateStr
 */
function formatPeriodMonthLabel(isoDateStr) {
  const parsed = parseIsoDate(isoDateStr);
  if (!parsed) return "-";
  return `${MONTH_SHORT_ID[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

/**
 * Format label masa kerja khusus karyawan < 1 tahun (contoh: "6 Bulan 4 Hari" atau "18 Hari").
 * @param {number} months
 * @param {number} days
 */
function formatSubYearTenureLabel(months, days) {
  const safeMonths = Math.max(0, Number(months) || 0);
  const safeDays = Math.max(0, Number(days) || 0);

  if (safeMonths === 0 && safeDays === 0) {
    return "Baru bergabung";
  }
  if (safeMonths === 0) {
    return `${safeDays} Hari`;
  }
  if (safeDays === 0) {
    return `${safeMonths} Bulan`;
  }
  return `${safeMonths} Bulan ${safeDays} Hari`;
}

/**
 * Membangun strip 5 hari kerja (Sen–Jum) pada minggu berjalan beserta daftar anggota yang cuti.
 * @param {string} weekStartIso - Tanggal Senin (YYYY-MM-DD)
 * @param {string} serverTodayIso - Tanggal hari ini dari PostgreSQL (YYYY-MM-DD)
 * @param {Array<object>} weeklyLeavesRaw - Daftar cuti Approved yang beririsan minggu berjalan
 */
function buildWeeklyScheduleStrip(weekStartIso, serverTodayIso, weeklyLeavesRaw) {
  if (!weekStartIso) return [];

  return WEEKDAY_SHORT_ID.map((dayShort, offset) => {
    const dayIso = addCalendarDays(weekStartIso, offset);
    const parsed = parseIsoDate(dayIso);
    const dateNum = parsed ? String(parsed.getDate()).padStart(2, "0") : "--";

    const onLeaveMap = new Map();
    for (const leave of weeklyLeavesRaw) {
      if (leave.start_date_iso <= dayIso && leave.end_date_iso >= dayIso) {
        if (!onLeaveMap.has(leave.employee_id)) {
          onLeaveMap.set(leave.employee_id, {
            id: leave.employee_id,
            name: leave.employee_name,
          });
        }
      }
    }

    return {
      dayIso,
      dayShort,
      dateNum,
      isToday: dayIso === serverTodayIso,
      onLeave: Array.from(onLeaveMap.values()),
    };
  });
}

/**
 * Fase 2 (8.5) — Daftar karyawan aktif (eligible >= 1 tahun) yang masih memiliki sisa kuota
 * cuti tahunan besar (>= threshold, default 6.0 hari) untuk panel Expiring Quota Alert.
 * @param {number} [threshold=6.0]
 */
async function getExpiringQuotaEmployees(threshold = 6.0) {
  const sql = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.role,
      COALESCE(d.name, 'Belum Ditugaskan') AS division_name,
      u.initial_leave_quota,
      u.remaining_leave_quota,
      (
        SELECT TO_CHAR(MAX(n.created_at), 'YYYY-MM-DD HH24:MI')
        FROM notifications n
        WHERE n.user_id = u.id
          AND n.title ILIKE '%Kuota Cuti%'
      ) AS last_reminded_at
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    WHERE u.is_active = TRUE
      AND u.role IN ('Karyawan', 'Ketua Divisi')
      AND CURRENT_DATE >= (u.join_date + INTERVAL '1 year')
      AND u.remaining_leave_quota >= $1
    ORDER BY u.remaining_leave_quota DESC, u.full_name ASC;
  `;

  const res = await query(sql, [threshold]);
  return res.rows.map((emp) => ({
    id: emp.id,
    fullName: emp.full_name,
    email: emp.email,
    role: emp.role,
    divisionName: emp.division_name,
    initialQuota: Number(emp.initial_leave_quota || 12),
    remainingQuota: Number(emp.remaining_leave_quota || 0),
    lastRemindedAt: emp.last_reminded_at || null,
  }));
}

/**
 * Mengambil seluruh data live PostgreSQL untuk Dashboard Admin (PRD 6.2.1).
 */
export async function getAdminDashboardData() {
  const statsSql = `
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE is_active = TRUE) AS active_users,
      (SELECT COUNT(*)::int FROM users WHERE is_active = FALSE) AS inactive_users,
      (SELECT COUNT(*)::int FROM leave_requests
       WHERE DATE_TRUNC('month', submission_date) = DATE_TRUNC('month', CURRENT_DATE)) AS monthly_requests,
      (SELECT COUNT(*)::int FROM leave_requests
       WHERE status IN ('Pending', 'Approved by Leader')) AS pending_approvals,
      (SELECT COUNT(*)::int FROM divisions) AS total_divisions,
      TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_today_iso;
  `;

  const ineligibleSql = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.role,
      COALESCE(d.name, 'Belum Ditugaskan') AS division_name,
      TO_CHAR(u.join_date, 'YYYY-MM-DD') AS join_date_iso,
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, u.join_date))::int AS tenure_months,
      EXTRACT(DAY FROM AGE(CURRENT_DATE, u.join_date))::int AS tenure_days,
      LEAST(
        100,
        GREATEST(0, ROUND(((CURRENT_DATE - u.join_date)::numeric / 365.0) * 100))
      )::int AS tenure_progress_percent
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    WHERE u.is_active = TRUE
      AND CURRENT_DATE < (u.join_date + INTERVAL '1 year')
    ORDER BY u.join_date DESC, u.full_name ASC;
  `;

  const [statsRes, ineligibleRes, expiringQuotaEmployees] = await Promise.all([
    query(statsSql),
    query(ineligibleSql),
    getExpiringQuotaEmployees(6.0),
  ]);

  const row = statsRes.rows[0] || {};
  const serverTodayIso = row.server_today_iso || "";

  return {
    serverTodayIso,
    periodLabel: formatPeriodMonthLabel(serverTodayIso),
    stats: {
      activeUsers: Number(row.active_users || 0),
      inactiveUsers: Number(row.inactive_users || 0),
      monthlyRequests: Number(row.monthly_requests || 0),
      pendingApprovals: Number(row.pending_approvals || 0),
      totalDivisions: Number(row.total_divisions || 0),
    },
    ineligibleEmployees: ineligibleRes.rows.map((emp) => ({
      id: emp.id,
      fullName: emp.full_name,
      email: emp.email,
      role: emp.role,
      divisionName: emp.division_name,
      joinDateIso: emp.join_date_iso,
      joinDate: formatIndonesianDate(emp.join_date_iso),
      tenureLabel: formatSubYearTenureLabel(emp.tenure_months, emp.tenure_days),
      tenureProgressPercent: Number(emp.tenure_progress_percent || 0),
      status: "Belum Eligible",
    })),
    expiringQuotaEmployees,
  };
}

/**
 * Mengambil seluruh data live PostgreSQL untuk Dashboard Karyawan (PRD 6.2.2).
 * @param {object} currentUser
 */
export async function getEmployeeDashboardData(currentUser) {
  const userProfileSql = `
    SELECT
      u.id,
      u.full_name,
      u.role,
      u.initial_leave_quota,
      u.remaining_leave_quota,
      TO_CHAR(u.join_date, 'YYYY-MM-DD') AS join_date_iso,
      (CURRENT_DATE >= (u.join_date + INTERVAL '1 year')) AS is_eligible_annual_leave,
      d.name AS division_name,
      leader.full_name AS leader_name,
      TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_today_iso
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    LEFT JOIN users leader ON d.leader_id = leader.id
    WHERE u.id = $1
      AND u.is_active = TRUE
    LIMIT 1;
  `;

  const requestStatsSql = `
    SELECT
      COUNT(*)::int AS total_requests,
      COUNT(*) FILTER (WHERE lr.status = 'Approved')::int AS approved_count,
      COUNT(*) FILTER (WHERE lr.status = 'Approved by Leader')::int AS approved_by_leader_count,
      COUNT(*) FILTER (WHERE lr.status = 'Pending')::int AS pending_count,
      COUNT(*) FILTER (WHERE lr.status = 'Rejected')::int AS rejected_count,
      COUNT(*) FILTER (WHERE lr.status = 'Cancelled')::int AS cancelled_count,
      COUNT(*) FILTER (
        WHERE lt.code = 'SICK'
          AND lr.status <> 'Cancelled'
          AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      )::int AS sick_leave_count,
      COALESCE(SUM(lr.total_days) FILTER (
        WHERE lt.code = 'SICK'
          AND lr.status <> 'Cancelled'
          AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      ), 0)::numeric(6,1) AS sick_leave_days
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.user_id = $1;
  `;

  const handoverSql = `
    SELECT
      lr.id,
      req.full_name AS requester_name,
      COALESCE(d.name, 'Tanpa Divisi') AS division_name,
      lt.name AS leave_type_name,
      TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date_iso,
      TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date_iso,
      lr.is_half_day,
      lr.total_days,
      lr.handover_notes,
      lr.status
    FROM leave_requests lr
    JOIN users req ON lr.user_id = req.id
    LEFT JOIN divisions d ON req.division_id = d.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.handover_user_id = $1
      AND lr.status IN ('Pending', 'Approved by Leader', 'Approved')
      AND lr.end_date >= CURRENT_DATE
    ORDER BY lr.start_date ASC, lr.id DESC
    LIMIT 10;
  `;

  const recentRequestsSql = `
    SELECT
      lr.id,
      lt.name AS leave_type_name,
      TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date_iso,
      TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date_iso,
      lr.is_half_day,
      lr.total_days,
      COALESCE(ho.full_name, '-') AS handover_name,
      lr.status,
      lr.rejected_by_role
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN users ho ON lr.handover_user_id = ho.id
    WHERE lr.user_id = $1
    ORDER BY lr.created_at DESC, lr.id DESC
    LIMIT 10;
  `;

  const [profileRes, statsRes, handoverRes, recentRes] = await Promise.all([
    query(userProfileSql, [currentUser.id]),
    query(requestStatsSql, [currentUser.id]),
    query(handoverSql, [currentUser.id]),
    query(recentRequestsSql, [currentUser.id]),
  ]);

  const profileRow = profileRes.rows[0] || {};
  const statsRow = statsRes.rows[0] || {};
  const initialQuota = Number(profileRow.initial_leave_quota ?? 12);
  const remainingQuota = Number(profileRow.remaining_leave_quota ?? 0);
  const usedQuota = Math.max(0, Number((initialQuota - remainingQuota).toFixed(1)));

  return {
    serverTodayIso: profileRow.server_today_iso || "",
    user: {
      id: profileRow.id || currentUser.id,
      fullName: profileRow.full_name || currentUser.fullName,
      role: profileRow.role || currentUser.role,
      divisionName: profileRow.division_name || null,
      leaderName: profileRow.leader_name || null,
      joinDate: formatIndonesianDate(profileRow.join_date_iso),
      isEligibleAnnualLeave: Boolean(profileRow.is_eligible_annual_leave),
    },
    stats: {
      initialQuota,
      remainingQuota,
      usedQuota,
      sickLeaveCount: Number(statsRow.sick_leave_count || 0),
      sickLeaveDays: Number(statsRow.sick_leave_days || 0),
      totalRequests: Number(statsRow.total_requests || 0),
      approvedCount: Number(statsRow.approved_count || 0),
      approvedByLeaderCount: Number(statsRow.approved_by_leader_count || 0),
      pendingCount: Number(statsRow.pending_count || 0),
      rejectedCount: Number(statsRow.rejected_count || 0),
      cancelledCount: Number(statsRow.cancelled_count || 0),
    },
    handoverInbox: handoverRes.rows.map((item) => ({
      id: item.id,
      requesterName: item.requester_name,
      divisionName: item.division_name,
      leaveTypeName: item.leave_type_name,
      periodLabel: formatIndonesianDateRange(
        item.start_date_iso,
        item.end_date_iso,
        Boolean(item.is_half_day)
      ),
      isHalfDay: Boolean(item.is_half_day),
      totalDays: Number(item.total_days || 0),
      handoverNotes: item.handover_notes,
      status: item.status,
    })),
    recentRequests: recentRes.rows.map((req) => ({
      id: req.id,
      leaveTypeName: req.leave_type_name,
      periodLabel: formatIndonesianDateRange(
        req.start_date_iso,
        req.end_date_iso,
        Boolean(req.is_half_day)
      ),
      isHalfDay: Boolean(req.is_half_day),
      totalDays: Number(req.total_days || 0),
      handoverName: req.handover_name,
      status: req.status,
      rejectedByRole: req.rejected_by_role || null,
    })),
  };
}

/**
 * Mengambil seluruh data live PostgreSQL untuk Dashboard Ketua Divisi (PRD 6.2.3).
 * @param {object} currentUser
 */
export async function getLeaderDashboardData(currentUser) {
  const leaderMetaSql = `
    SELECT
      u.id,
      u.full_name,
      u.role,
      u.initial_leave_quota,
      u.remaining_leave_quota,
      (CURRENT_DATE >= (u.join_date + INTERVAL '1 year')) AS is_eligible_annual_leave,
      d.id AS managed_division_id,
      d.name AS managed_division_name,
      TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_today_iso,
      TO_CHAR(DATE_TRUNC('week', CURRENT_DATE)::date, 'YYYY-MM-DD') AS week_start_iso,
      TO_CHAR((DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date, 'YYYY-MM-DD') AS week_end_iso
    FROM users u
    LEFT JOIN divisions d ON d.leader_id = u.id
    WHERE u.id = $1
      AND u.is_active = TRUE
    LIMIT 1;
  `;

  const metaRes = await query(leaderMetaSql, [currentUser.id]);
  const meta = metaRes.rows[0] || {};
  const managedDivisionId = meta.managed_division_id || null;
  const serverTodayIso = meta.server_today_iso || "";
  const weekStartIso = meta.week_start_iso || "";
  const weekEndIso = meta.week_end_iso || "";
  const weekRangeLabel = formatIndonesianDateRange(weekStartIso, weekEndIso, false);

  const personalInitialQuota = Number(meta.initial_leave_quota ?? 12);
  const personalRemainingQuota = Number(meta.remaining_leave_quota ?? 0);

  if (!managedDivisionId) {
    return {
      serverTodayIso,
      weekRangeLabel,
      user: {
        id: meta.id || currentUser.id,
        fullName: meta.full_name || currentUser.fullName,
        role: meta.role || currentUser.role,
        divisionId: null,
        divisionName: "Belum Memimpin Divisi",
        hasManagedDivision: false,
        isEligibleAnnualLeave: Boolean(meta.is_eligible_annual_leave),
      },
      stats: {
        totalDivisionRequests: 0,
        pendingVerificationCount: 0,
        membersOnLeaveThisWeek: 0,
        presentTodayCount: 0,
        totalActiveMembers: 0,
        personalInitialQuota,
        personalRemainingQuota,
      },
      weeklyScheduleStrip: buildWeeklyScheduleStrip(weekStartIso, serverTodayIso, []),
      weeklyLeaves: [],
      divisionMembers: [],
    };
  }

  const divisionStatsSql = `
    SELECT
      COUNT(*)::int AS total_division_requests,
      COUNT(*) FILTER (WHERE lr.status = 'Pending')::int AS pending_verification_count
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    WHERE u.division_id = $1
      AND u.role = 'Karyawan';
  `;

  const weeklyLeavesSql = `
    SELECT
      lr.id,
      u.id AS employee_id,
      u.full_name AS employee_name,
      lt.name AS leave_type_name,
      TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date_iso,
      TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date_iso,
      lr.is_half_day,
      lr.total_days,
      COALESCE(ho.full_name, '-') AS handover_name,
      lr.status
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN users ho ON lr.handover_user_id = ho.id
    WHERE u.division_id = $1
      AND lr.status = 'Approved'
      AND lr.start_date <= (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date
      AND lr.end_date >= DATE_TRUNC('week', CURRENT_DATE)::date
    ORDER BY lr.start_date ASC, u.full_name ASC;
  `;

  const membersSql = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.role,
      u.remaining_leave_quota,
      u.is_active,
      (CURRENT_DATE >= (u.join_date + INTERVAL '1 year')) AS is_eligible_annual_leave,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.join_date))::int AS tenure_years,
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, u.join_date))::int AS tenure_months
    FROM users u
    WHERE u.division_id = $1
      AND u.id <> $2
    ORDER BY u.is_active DESC, u.full_name ASC;
  `;

  const [divStatsRes, weeklyLeavesRes, membersRes] = await Promise.all([
    query(divisionStatsSql, [managedDivisionId]),
    query(weeklyLeavesSql, [managedDivisionId]),
    query(membersSql, [managedDivisionId, currentUser.id]),
  ]);

  const divStats = divStatsRes.rows[0] || {};
  const weeklyLeavesRaw = weeklyLeavesRes.rows;
  const membersRaw = membersRes.rows;

  const uniqueMembersOnLeaveThisWeek = new Set(
    weeklyLeavesRaw.map((item) => item.employee_id)
  );
  const uniqueMembersOnLeaveToday = new Set(
    weeklyLeavesRaw
      .filter(
        (item) =>
          item.employee_id !== currentUser.id &&
          item.start_date_iso <= serverTodayIso &&
          item.end_date_iso >= serverTodayIso
      )
      .map((item) => item.employee_id)
  );

  const totalActiveMembers = membersRaw.filter((m) => m.is_active).length;
  const presentTodayCount = Math.max(
    0,
    totalActiveMembers - uniqueMembersOnLeaveToday.size
  );

  return {
    serverTodayIso,
    weekRangeLabel,
    user: {
      id: meta.id || currentUser.id,
      fullName: meta.full_name || currentUser.fullName,
      role: meta.role || currentUser.role,
      divisionId: managedDivisionId,
      divisionName: meta.managed_division_name,
      hasManagedDivision: true,
      isEligibleAnnualLeave: Boolean(meta.is_eligible_annual_leave),
    },
    stats: {
      totalDivisionRequests: Number(divStats.total_division_requests || 0),
      pendingVerificationCount: Number(divStats.pending_verification_count || 0),
      membersOnLeaveThisWeek: uniqueMembersOnLeaveThisWeek.size,
      presentTodayCount,
      totalActiveMembers,
      personalInitialQuota,
      personalRemainingQuota,
    },
    weeklyScheduleStrip: buildWeeklyScheduleStrip(
      weekStartIso,
      serverTodayIso,
      weeklyLeavesRaw
    ),
    weeklyLeaves: weeklyLeavesRaw.map((item) => ({
      id: item.id,
      employeeId: item.employee_id,
      employeeName: item.employee_name,
      leaveTypeName: item.leave_type_name,
      periodLabel: formatIndonesianDateRange(
        item.start_date_iso,
        item.end_date_iso,
        Boolean(item.is_half_day)
      ),
      isHalfDay: Boolean(item.is_half_day),
      totalDays: Number(item.total_days || 0),
      handoverName: item.handover_name,
      status: item.status,
    })),
    divisionMembers: membersRaw.map((member) => ({
      id: member.id,
      fullName: member.full_name,
      email: member.email,
      role: member.role,
      tenureLabel: formatTenureLabel(member.tenure_years, member.tenure_months),
      remainingQuota: Number(member.remaining_leave_quota ?? 0),
      isEligibleAnnualLeave: Boolean(member.is_eligible_annual_leave),
      accountStatus: member.is_active ? "Aktif" : "Nonaktif",
    })),
  };
}

/**
 * Mengambil seluruh data live PostgreSQL untuk Dashboard HRD (PRD 6.2.4).
 */
export async function getHrdDashboardData() {
  const statsSql = `
    SELECT
      (SELECT COUNT(*)::int FROM leave_requests
       WHERE DATE_TRUNC('month', submission_date) = DATE_TRUNC('month', CURRENT_DATE)) AS monthly_company_requests,
      (SELECT COUNT(*)::int FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       WHERE (u.role = 'Karyawan' AND lr.status = 'Approved by Leader')
          OR (u.role = 'Ketua Divisi' AND lr.status = 'Pending')) AS pending_final_approval,
      (SELECT COUNT(DISTINCT lr.user_id)::int FROM leave_requests lr
       WHERE lr.status = 'Approved'
         AND lr.start_date <= (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
         AND lr.end_date >= DATE_TRUNC('month', CURRENT_DATE)::date) AS employees_on_leave_this_month,
      (SELECT COUNT(*)::int FROM divisions) AS active_divisions,
      (SELECT COUNT(*)::int FROM users WHERE is_active = TRUE) AS active_employees,
      TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_today_iso;
  `;

  const monthlyLeavesSql = `
    SELECT
      lr.id,
      u.full_name AS employee_name,
      u.role,
      COALESCE(d.name, 'Tanpa Divisi') AS division_name,
      lt.name AS leave_type_name,
      TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date_iso,
      TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date_iso,
      lr.is_half_day,
      lr.total_days,
      COALESCE(ho.full_name, '-') AS handover_name
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    LEFT JOIN divisions d ON u.division_id = d.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN users ho ON lr.handover_user_id = ho.id
    WHERE lr.status = 'Approved'
      AND lr.start_date <= (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
      AND lr.end_date >= DATE_TRUNC('month', CURRENT_DATE)::date
    ORDER BY lr.start_date ASC, u.full_name ASC;
  `;

  const divisionsSummarySql = `
    SELECT
      d.id,
      d.name,
      d.max_concurrent_leave_pct,
      COALESCE(leader.full_name, 'Belum Ditunjuk') AS leader_name,
      COUNT(DISTINCT m.id) FILTER (WHERE m.is_active = TRUE)::int AS active_members,
      COUNT(DISTINCT lr_today.user_id)::int AS currently_on_leave,
      COUNT(DISTINCT lr_month.id)::int AS monthly_leave_count
    FROM divisions d
    LEFT JOIN users leader ON d.leader_id = leader.id
    LEFT JOIN users m ON m.division_id = d.id
    LEFT JOIN leave_requests lr_today
      ON lr_today.user_id = m.id
     AND lr_today.status = 'Approved'
     AND CURRENT_DATE BETWEEN lr_today.start_date AND lr_today.end_date
    LEFT JOIN leave_requests lr_month
      ON lr_month.user_id = m.id
     AND DATE_TRUNC('month', lr_month.submission_date) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY d.id, d.name, d.max_concurrent_leave_pct, leader.full_name
    ORDER BY d.name ASC;
  `;

  const [statsRes, leavesRes, divisionsRes, expiringQuotaEmployees] =
    await Promise.all([
      query(statsSql),
      query(monthlyLeavesSql),
      query(divisionsSummarySql),
      getExpiringQuotaEmployees(6.0),
    ]);

  const row = statsRes.rows[0] || {};
  const serverTodayIso = row.server_today_iso || "";

  return {
    serverTodayIso,
    periodLabel: formatPeriodMonthLabel(serverTodayIso),
    stats: {
      monthlyCompanyRequests: Number(row.monthly_company_requests || 0),
      pendingFinalApproval: Number(row.pending_final_approval || 0),
      employeesOnLeaveThisMonth: Number(row.employees_on_leave_this_month || 0),
      activeDivisions: Number(row.active_divisions || 0),
      activeEmployees: Number(row.active_employees || 0),
    },
    monthlyApprovedLeaves: leavesRes.rows.map((item) => ({
      id: item.id,
      employeeName: item.employee_name,
      role: item.role,
      divisionName: item.division_name,
      leaveTypeName: item.leave_type_name,
      periodLabel: formatIndonesianDateRange(
        item.start_date_iso,
        item.end_date_iso,
        Boolean(item.is_half_day)
      ),
      isHalfDay: Boolean(item.is_half_day),
      totalDays: Number(item.total_days || 0),
      handoverName: item.handover_name,
    })),
    divisionsSummary: divisionsRes.rows.map((div) => ({
      id: div.id,
      name: div.name,
      maxConcurrentLeavePct: Number(div.max_concurrent_leave_pct || 30),
      leaderName: div.leader_name,
      activeMembers: Number(div.active_members || 0),
      currentlyOnLeave: Number(div.currently_on_leave || 0),
      monthlyLeaveCount: Number(div.monthly_leave_count || 0),
    })),
    expiringQuotaEmployees,
  };
}

/**
 * Dispatcher data dashboard sesuai role user yang sedang login.
 * @param {object} currentUser
 */
export async function getDashboardDataForUser(currentUser) {
  const roleKey = mapRoleToUiKey(currentUser.role);

  switch (roleKey) {
    case "admin":
      return { roleKey, data: await getAdminDashboardData() };
    case "ketua-divisi":
      return { roleKey, data: await getLeaderDashboardData(currentUser) };
    case "hrd":
      return { roleKey, data: await getHrdDashboardData() };
    case "karyawan":
    default:
      return { roleKey: "karyawan", data: await getEmployeeDashboardData(currentUser) };
  }
}
