import { query } from "@/lib/db";
import { buildUserInitials } from "@/lib/auth";
import { formatTenureLabel } from "@/lib/shell-data";
import { PROTECTED_USER_ROLES, VALID_USER_ROLES } from "@/lib/validators";

const SORT_CLAUSE_MAP = {
  name_asc: "LOWER(u.full_name) ASC, u.id ASC",
  name_desc: "LOWER(u.full_name) DESC, u.id DESC",
  join_newest: "u.join_date DESC, LOWER(u.full_name) ASC",
  join_oldest: "u.join_date ASC, LOWER(u.full_name) ASC",
  division_asc: "COALESCE(LOWER(d.name), 'zzzz') ASC, LOWER(u.full_name) ASC",
};

/**
 * Memetakan baris hasil query tabel users + divisions PostgreSQL ke objek serializable client.
 * @param {object} row
 */
export function mapAdminUserRow(row) {
  const years = Number(row.tenure_years || 0);
  const months = Number(row.tenure_months || 0);
  const isEligible = Boolean(row.is_tenure_eligible);

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    initials: buildUserInitials(row.full_name),
    role: row.role,
    divisionId: row.division_id,
    divisionName: row.division_name || null,
    ledDivisionId: row.led_division_id || null,
    ledDivisionName: row.led_division_name || null,
    phone: row.phone || "",
    address: row.address || "",
    avatarUrl: row.avatar_url || null,
    initialLeaveQuota: Number(row.initial_leave_quota),
    remainingLeaveQuota: Number(row.remaining_leave_quota),
    joinDate: row.join_date,
    isActive: Boolean(row.is_active),
    isProtected: PROTECTED_USER_ROLES.includes(row.role),
    tenure: {
      years,
      months,
      isEligible,
      label: formatTenureLabel(years, months),
    },
  };
}

/**
 * Memuat daftar pengguna (dengan filter & sorting opsional via parameterized SQL)
 * serta daftar master divisi dan tanggal server hari ini untuk CMS Modul 1 (/admin/users).
 * @param {{
 *   search?: string,
 *   role?: string,
 *   divisionId?: string,
 *   status?: string,
 *   tenure?: string,
 *   sort?: string,
 * }} [filters]
 */
export async function getAdminUsersWorkspaceData(filters = {}) {
  const conditions = [];
  const params = [];

  const search = typeof filters.search === "string" ? filters.search.trim() : "";
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(
      `(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.username ILIKE $${idx} OR COALESCE(d.name, '') ILIKE $${idx})`
    );
  }

  const role = typeof filters.role === "string" ? filters.role.trim() : "";
  if (role && role !== "ALL" && VALID_USER_ROLES.includes(role)) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  const divisionId =
    typeof filters.divisionId === "string" ? filters.divisionId.trim() : "";
  if (divisionId === "NONE") {
    conditions.push(`u.division_id IS NULL`);
  } else if (divisionId && divisionId !== "ALL" && /^\d+$/.test(divisionId)) {
    params.push(Number(divisionId));
    conditions.push(`u.division_id = $${params.length}`);
  }

  const status = typeof filters.status === "string" ? filters.status.trim() : "";
  if (status === "ACTIVE") {
    conditions.push(`u.is_active = TRUE`);
  } else if (status === "INACTIVE") {
    conditions.push(`u.is_active = FALSE`);
  }

  const tenure = typeof filters.tenure === "string" ? filters.tenure.trim() : "";
  if (tenure === "ELIGIBLE") {
    conditions.push(`CURRENT_DATE >= (u.join_date + INTERVAL '1 year')`);
  } else if (tenure === "INELIGIBLE") {
    conditions.push(`CURRENT_DATE < (u.join_date + INTERVAL '1 year')`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderByClause =
    SORT_CLAUSE_MAP[filters.sort] || SORT_CLAUSE_MAP.name_asc;

  const usersSql = `
    SELECT
      u.id,
      u.username,
      u.email,
      u.full_name,
      u.role,
      u.division_id,
      d.name AS division_name,
      ld.id AS led_division_id,
      ld.name AS led_division_name,
      u.phone,
      u.address,
      u.avatar_url,
      u.initial_leave_quota,
      u.remaining_leave_quota,
      TO_CHAR(u.join_date, 'YYYY-MM-DD') AS join_date,
      u.is_active,
      (CURRENT_DATE >= (u.join_date + INTERVAL '1 year')) AS is_tenure_eligible,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.join_date))::int AS tenure_years,
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, u.join_date))::int AS tenure_months,
      TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_today_iso
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    LEFT JOIN divisions ld ON ld.leader_id = u.id
    ${whereClause}
    ORDER BY ${orderByClause};
  `;

  const divisionsSql = `
    SELECT
      id,
      name,
      leader_id
    FROM divisions
    ORDER BY LOWER(name) ASC, id ASC;
  `;

  const [usersRes, divisionsRes] = await Promise.all([
    query(usersSql, params),
    query(divisionsSql),
  ]);

  const users = usersRes.rows.map(mapAdminUserRow);
  const divisions = divisionsRes.rows.map((row) => ({
    id: row.id,
    name: row.name,
    leaderId: row.leader_id,
  }));

  const serverTodayIso =
    usersRes.rows[0]?.server_today_iso || new Date().toISOString().slice(0, 10);

  return {
    users,
    divisions,
    todayIso: serverTodayIso,
  };
}
