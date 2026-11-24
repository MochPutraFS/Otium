import { query } from "@/lib/db";
import { buildUserInitials } from "@/lib/auth";
import { formatIndonesianDateRange } from "@/lib/date-utils";

const ALLOWED_CALENDAR_STATUSES = ["Approved", "Approved by Leader", "Pending"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getMonthBounds(year, month) {
  const safeYear = Math.max(2020, Math.min(2099, Number(year) || 2026));
  const safeMonth = Math.max(1, Math.min(12, Number(month) || 1));
  const lastDay = new Date(safeYear, safeMonth, 0).getDate();
  return {
    year: safeYear,
    month: safeMonth,
    monthStart: `${safeYear}-${pad2(safeMonth)}-01`,
    monthEnd: `${safeYear}-${pad2(safeMonth)}-${pad2(lastDay)}`,
  };
}

/**
 * Memuat data Kalender & Direktori Cuti Lintas Role (Fase 2 - 8.2).
 * Privasi ditegakkan langsung di level SQL: TIDAK pernah mengambil `attachment_url`,
 * `reason`, `leave_address`, `emergency_phone`, maupun `handover_notes`.
 *
 * @param {{ year?: number, month?: number, divisionId?: string|number|null, status?: string }} [filters]
 */
export async function getCompanyCalendarData(filters = {}) {
  const todayRes = await query(
    `SELECT
       TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS today_iso,
       EXTRACT(YEAR FROM CURRENT_DATE)::int AS current_year,
       EXTRACT(MONTH FROM CURRENT_DATE)::int AS current_month;`
  );
  const todayRow = todayRes.rows[0] || {};
  const todayIso = todayRow.today_iso || new Date().toISOString().slice(0, 10);

  const bounds = getMonthBounds(
    filters.year ?? todayRow.current_year,
    filters.month ?? todayRow.current_month
  );

  const params = [bounds.monthStart, bounds.monthEnd];
  const conditions = [
    `lr.status IN ('Approved', 'Approved by Leader', 'Pending')`,
    `lr.start_date <= $2::date`,
    `lr.end_date >= $1::date`,
  ];

  const rawDivision =
    filters.divisionId !== undefined && filters.divisionId !== null
      ? String(filters.divisionId).trim()
      : "ALL";
  let parsedDivisionId = null;
  if (rawDivision && rawDivision !== "ALL" && /^\d+$/.test(rawDivision)) {
    parsedDivisionId = Number(rawDivision);
    params.push(parsedDivisionId);
    conditions.push(`u.division_id = $${params.length}`);
  }

  const rawStatus =
    typeof filters.status === "string" ? filters.status.trim() : "ALL";
  if (ALLOWED_CALENDAR_STATUSES.includes(rawStatus)) {
    params.push(rawStatus);
    conditions.push(`lr.status = $${params.length}`);
  }

  // Query transparansi tim: hanya kolom koordinasi publik, TANPA data sensitif
  const leavesSql = `
    SELECT
      lr.id,
      lr.user_id,
      u.full_name AS employee_name,
      u.role AS employee_role,
      u.division_id,
      COALESCE(d.name, 'Tanpa Divisi') AS division_name,
      lt.name AS leave_type_name,
      TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date,
      lr.is_half_day,
      lr.total_days,
      lr.status,
      COALESCE(hu.full_name, '-') AS handover_name
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    LEFT JOIN divisions d ON u.division_id = d.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN users hu ON lr.handover_user_id = hu.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY lr.start_date ASC, u.full_name ASC;
  `;

  const holidaysSql = `
    SELECT
      id,
      TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date,
      name,
      holiday_type
    FROM holidays
    WHERE is_active = TRUE
      AND holiday_date BETWEEN $1::date AND $2::date
    ORDER BY holiday_date ASC;
  `;

  const blackoutParams = [bounds.monthStart, bounds.monthEnd];
  let blackoutDivClause = "";
  if (parsedDivisionId !== null) {
    blackoutParams.push(parsedDivisionId);
    blackoutDivClause = `AND (bp.division_id IS NULL OR bp.division_id = $3)`;
  }

  const blackoutsSql = `
    SELECT
      bp.id,
      bp.name,
      TO_CHAR(bp.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(bp.end_date, 'YYYY-MM-DD') AS end_date,
      bp.reason,
      bp.division_id,
      COALESCE(d.name, 'Seluruh Perusahaan') AS division_name
    FROM blackout_periods bp
    LEFT JOIN divisions d ON bp.division_id = d.id
    WHERE bp.is_active = TRUE
      AND bp.start_date <= $2::date
      AND bp.end_date >= $1::date
      ${blackoutDivClause}
    ORDER BY bp.start_date ASC;
  `;

  const divisionsSql = `
    SELECT id, name
    FROM divisions
    ORDER BY LOWER(name) ASC, id ASC;
  `;

  const [leavesRes, holidaysRes, blackoutsRes, divisionsRes] =
    await Promise.all([
      query(leavesSql, params),
      query(holidaysSql, [bounds.monthStart, bounds.monthEnd]),
      query(blackoutsSql, blackoutParams),
      query(divisionsSql),
    ]);

  return {
    todayIso,
    year: bounds.year,
    month: bounds.month,
    monthStart: bounds.monthStart,
    monthEnd: bounds.monthEnd,
    divisions: divisionsRes.rows.map((d) => ({ id: d.id, name: d.name })),
    holidays: holidaysRes.rows.map((h) => ({
      id: h.id,
      holidayDate: h.holiday_date,
      name: h.name,
      holidayType: h.holiday_type,
    })),
    blackoutPeriods: blackoutsRes.rows.map((b) => ({
      id: b.id,
      name: b.name,
      startDate: b.start_date,
      endDate: b.end_date,
      reason: b.reason,
      divisionId: b.division_id,
      divisionName: b.division_name,
    })),
    leaves: leavesRes.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      employeeName: row.employee_name,
      employeeInitials: buildUserInitials(row.employee_name),
      employeeRole: row.employee_role,
      divisionId: row.division_id,
      divisionName: row.division_name,
      leaveTypeName: row.leave_type_name,
      startDate: row.start_date,
      endDate: row.end_date,
      isHalfDay: Boolean(row.is_half_day),
      totalDays: Number(row.total_days),
      periodLabel: formatIndonesianDateRange(
        row.start_date,
        row.end_date,
        Boolean(row.is_half_day)
      ),
      status: row.status,
      handoverName: row.handover_name,
    })),
  };
}
