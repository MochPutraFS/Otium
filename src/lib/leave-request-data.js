import { query } from "@/lib/db";
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
