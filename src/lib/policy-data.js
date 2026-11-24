import { query } from "@/lib/db";
import { addCalendarDays, formatIndonesianDateRange } from "@/lib/date-utils";

/**
 * Memuat data halaman CMS Kebijakan Blackout Period & Batas Kapasitas Divisi (/admin/policies).
 */
export async function getPoliciesWorkspaceData() {
  const blackoutsSql = `
    SELECT
      bp.id,
      bp.name,
      TO_CHAR(bp.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(bp.end_date, 'YYYY-MM-DD') AS end_date,
      bp.reason,
      bp.division_id,
      COALESCE(d.name, 'Seluruh Perusahaan') AS division_name,
      bp.is_active,
      COALESCE(u.full_name, 'Sistem') AS created_by_name
    FROM blackout_periods bp
    LEFT JOIN divisions d ON bp.division_id = d.id
    LEFT JOIN users u ON bp.created_by = u.id
    ORDER BY bp.is_active DESC, bp.start_date ASC, bp.id ASC;
  `;

  const divisionsSql = `
    SELECT
      d.id,
      d.name,
      d.max_concurrent_leave_pct,
      COALESCE(leader.full_name, 'Belum Ditunjuk') AS leader_name,
      COUNT(m.id) FILTER (WHERE m.is_active = TRUE)::int AS active_members
    FROM divisions d
    LEFT JOIN users leader ON d.leader_id = leader.id
    LEFT JOIN users m ON m.division_id = d.id
    GROUP BY d.id, d.name, d.max_concurrent_leave_pct, leader.full_name
    ORDER BY LOWER(d.name) ASC, d.id ASC;
  `;

  const todaySql = `SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS today_iso;`;

  const [blackoutsRes, divisionsRes, todayRes] = await Promise.all([
    query(blackoutsSql),
    query(divisionsSql),
    query(todaySql),
  ]);

  return {
    todayIso: todayRes.rows[0]?.today_iso || new Date().toISOString().slice(0, 10),
    blackoutPeriods: blackoutsRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      divisionId: row.division_id,
      divisionName: row.division_name,
      isActive: Boolean(row.is_active),
      createdByName: row.created_by_name,
    })),
    divisions: divisionsRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      maxConcurrentLeavePct: Number(row.max_concurrent_leave_pct || 30),
      leaderName: row.leader_name,
      activeMembers: Number(row.active_members || 0),
    })),
  };
}

/**
 * Mengecek apakah rentang [startDate, endDate] beririsan dengan Blackout Period aktif
 * (baik level perusahaan `division_id IS NULL` maupun khusus divisi pemohon).
 * Mendukung pemanggilan dari pool biasa maupun `client` transaksi `withTransaction`.
 *
 * @param {import("pg").PoolClient | null} client
 * @param {number | null} divisionId
 * @param {string} startDate
 * @param {string} endDate
 */
export async function findOverlappingBlackoutPeriod(
  client,
  divisionId,
  startDate,
  endDate
) {
  const runner = client ? client.query.bind(client) : query;
  const res = await runner(
    `
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
        AND (bp.division_id IS NULL OR bp.division_id = $1)
        AND bp.start_date <= $3::date
        AND bp.end_date >= $2::date
      ORDER BY bp.start_date ASC
      LIMIT 1;
    `,
    [divisionId ?? null, startDate, endDate]
  );

  const row = res.rows[0];
  if (!row) return null;

  const periodLabel = formatIndonesianDateRange(row.start_date, row.end_date);
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    periodLabel,
    reason: row.reason,
    divisionName: row.division_name,
    message: `Pengajuan ditolak karena beririsan dengan Periode Blackout "${row.name}" (${periodLabel}): ${row.reason}`,
  };
}

/**
 * Menghitung puncak persentase anggota divisi yang cuti bersamaan selama rentang [startDate, endDate]
 * apabila pengajuan pemohon disetujui/diajukan.
 *
 * @param {{
 *   divisionId: number | null,
 *   startDate: string,
 *   endDate: string,
 *   applicantUserId: number,
 *   excludeRequestId?: number | null,
 * }} params
 */
export async function evaluateDivisionCapacityImpact({
  divisionId,
  startDate,
  endDate,
  applicantUserId,
  excludeRequestId = null,
}) {
  if (!divisionId || !startDate || !endDate || endDate < startDate) {
    return null;
  }

  const divSql = `
    SELECT
      d.id,
      d.name,
      d.max_concurrent_leave_pct,
      COUNT(u.id) FILTER (WHERE u.is_active = TRUE)::int AS active_members
    FROM divisions d
    LEFT JOIN users u ON u.division_id = d.id
    WHERE d.id = $1
    GROUP BY d.id, d.name, d.max_concurrent_leave_pct
    LIMIT 1;
  `;

  const overlapParams = [divisionId, applicantUserId, startDate, endDate];
  let excludeClause = "";
  if (excludeRequestId) {
    overlapParams.push(excludeRequestId);
    excludeClause = `AND lr.id <> $${overlapParams.length}`;
  }

  const othersSql = `
    SELECT
      lr.user_id,
      u.full_name,
      TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    WHERE u.division_id = $1
      AND u.is_active = TRUE
      AND lr.user_id <> $2
      AND lr.status IN ('Pending', 'Approved by Leader', 'Approved')
      AND lr.start_date <= $4::date
      AND lr.end_date >= $3::date
      ${excludeClause};
  `;

  const [divRes, othersRes] = await Promise.all([
    query(divSql, [divisionId]),
    query(othersSql, overlapParams),
  ]);

  const divRow = divRes.rows[0];
  if (!divRow) return null;

  const activeMembers = Number(divRow.active_members || 0);
  const maxAllowedPct = Number(divRow.max_concurrent_leave_pct || 30);
  if (activeMembers <= 0) return null;

  // Hitung puncak rekan lain yang cuti bersamaan per hari dalam rentang (batas maks 90 hari iterasi)
  let peakOthersCount = 0;
  let peakDate = startDate;
  let peakOtherNames = [];
  let cursor = startDate;
  let safetyCounter = 0;

  while (cursor <= endDate && safetyCounter < 90) {
    const namesOnDay = new Set();
    for (const row of othersRes.rows) {
      if (row.start_date <= cursor && row.end_date >= cursor) {
        namesOnDay.add(row.full_name);
      }
    }
    if (namesOnDay.size > peakOthersCount) {
      peakOthersCount = namesOnDay.size;
      peakDate = cursor;
      peakOtherNames = Array.from(namesOnDay);
    }
    cursor = addCalendarDays(cursor, 1);
    safetyCounter += 1;
  }

  const concurrentCount = peakOthersCount + 1; // termasuk pemohon sendiri
  const projectedPct = Math.round((concurrentCount / activeMembers) * 100);
  const isExceeded = projectedPct > maxAllowedPct;

  return {
    divisionId: divRow.id,
    divisionName: divRow.name,
    activeMembers,
    concurrentCount,
    peakOthersCount,
    peakOtherNames,
    peakDate,
    projectedPct,
    maxAllowedPct,
    isExceeded,
    message: isExceeded
      ? `Divisi ${divRow.name} akan memiliki ${concurrentCount}/${activeMembers} anggota cuti bersamaan (${projectedPct}%), melebihi batas kapasitas tim ${maxAllowedPct}%.`
      : `Kapasitas Divisi ${divRow.name} masih aman (${concurrentCount}/${activeMembers} anggota = ${projectedPct}% <= batas ${maxAllowedPct}%).`,
  };
}
