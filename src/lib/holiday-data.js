import { query } from "@/lib/db";
import { VALID_HOLIDAY_TYPES } from "@/lib/validators";

/**
 * Memetakan baris tabel holidays PostgreSQL ke objek serializable untuk client.
 * @param {object} row
 */
export function mapHolidayRow(row) {
  return {
    id: row.id,
    holidayDate: row.holiday_date,
    year: Number(row.holiday_year),
    name: row.name,
    holidayType: row.holiday_type,
    isActive: Boolean(row.is_active),
    createdByName: row.created_by_name || "Sistem",
    createdAt: row.created_at
      ? row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at)
      : null,
  };
}

/**
 * Memuat daftar Hari Libur Nasional & Cuti Bersama dari PostgreSQL
 * dengan filter tahun, kategori, status aktif, dan pencarian terparameterisasi.
 * @param {{ search?: string, year?: string, type?: string, status?: string }} [filters]
 */
export async function getHolidaysWorkspaceData(filters = {}) {
  const conditions = [];
  const params = [];

  const search = typeof filters.search === "string" ? filters.search.trim() : "";
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`h.name ILIKE $${params.length}`);
  }

  const year = typeof filters.year === "string" ? filters.year.trim() : "";
  if (year && year !== "ALL" && /^\d{4}$/.test(year)) {
    params.push(Number(year));
    conditions.push(`EXTRACT(YEAR FROM h.holiday_date)::int = $${params.length}`);
  }

  const type = typeof filters.type === "string" ? filters.type.trim() : "";
  if (type && type !== "ALL" && VALID_HOLIDAY_TYPES.includes(type)) {
    params.push(type);
    conditions.push(`h.holiday_type = $${params.length}`);
  }

  const status = typeof filters.status === "string" ? filters.status.trim() : "";
  if (status === "ACTIVE") {
    conditions.push(`h.is_active = TRUE`);
  } else if (status === "INACTIVE") {
    conditions.push(`h.is_active = FALSE`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const holidaysSql = `
    SELECT
      h.id,
      TO_CHAR(h.holiday_date, 'YYYY-MM-DD') AS holiday_date,
      EXTRACT(YEAR FROM h.holiday_date)::int AS holiday_year,
      h.name,
      h.holiday_type,
      h.is_active,
      u.full_name AS created_by_name,
      h.created_at
    FROM holidays h
    LEFT JOIN users u ON h.created_by = u.id
    ${whereClause}
    ORDER BY h.holiday_date ASC, h.id ASC;
  `;

  const metaSql = `
    SELECT
      TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_today_iso,
      EXTRACT(YEAR FROM CURRENT_DATE)::int AS current_year;
  `;

  const [holidaysRes, metaRes] = await Promise.all([
    query(holidaysSql, params),
    query(metaSql),
  ]);

  const meta = metaRes.rows[0] || {};
  return {
    holidays: holidaysRes.rows.map(mapHolidayRow),
    todayIso: meta.server_today_iso || new Date().toISOString().slice(0, 10),
    currentYear: Number(meta.current_year || new Date().getFullYear()),
  };
}
