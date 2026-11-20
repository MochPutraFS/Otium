import { query } from "@/lib/db";
import { buildUserInitials } from "@/lib/auth";
import { formatIndonesianDate } from "@/lib/date-utils";

const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

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

/**
 * Format label hari & tanggal hari ini dalam bahasa Indonesia (contoh: "Sabtu, 21 Nov 2026").
 * @param {Date} [dateObj]
 */
export function formatIndonesianTodayLabel(dateObj = new Date()) {
  const dayName = DAY_NAMES_ID[dateObj.getDay()];
  const dayNum = String(dateObj.getDate()).padStart(2, "0");
  const monthName = MONTH_SHORT_ID[dateObj.getMonth()];
  return `${dayName}, ${dayNum} ${monthName} ${dateObj.getFullYear()}`;
}

/**
 * Format timestamp notifikasi menjadi label waktu relatif atau tanggal singkat.
 * @param {string | Date} value
 */
export function formatNotificationTimestamp(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} hari lalu`;

  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_SHORT_ID[date.getMonth()];
  return `${day} ${month} ${date.getFullYear()}`;
}

/**
 * Menurunkan kategori visual notifikasi secara deterministik dari judul / referensi.
 * @param {string} title
 * @param {number | null} leaveRequestId
 */
export function inferNotificationType(title = "", leaveRequestId = null) {
  const normalized = String(title).toLowerCase();
  if (normalized.includes("handover") || normalized.includes("pengganti")) {
    return "handover";
  }
  if (
    normalized.includes("disetujui") ||
    normalized.includes("ditolak") ||
    normalized.includes("persetujuan") ||
    normalized.includes("verifikasi") ||
    normalized.includes("cuti")
  ) {
    return "approval";
  }
  if (normalized.includes("kuota") || normalized.includes("pengingat")) {
    return "system";
  }
  return leaveRequestId ? "approval" : "info";
}

/**
 * Memformat lama masa kerja dari tahun & bulan PostgreSQL AGE().
 * @param {number} years
 * @param {number} months
 */
export function formatTenureLabel(years, months) {
  const safeYears = Math.max(0, Number(years) || 0);
  const safeMonths = Math.max(0, Number(months) || 0);

  if (safeYears === 0 && safeMonths === 0) {
    return "< 1 bulan";
  }
  if (safeYears === 0) {
    return `${safeMonths} bulan`;
  }
  if (safeMonths === 0) {
    return `${safeYears} tahun`;
  }
  return `${safeYears} thn ${safeMonths} bln`;
}

/**
 * Memetakan baris tabel notifications PostgreSQL ke objek serializable untuk client.
 * @param {object} row
 */
export function mapNotificationRow(row) {
  return {
    id: row.id,
    leaveRequestId: row.leave_request_id,
    title: row.title,
    message: row.message,
    isRead: Boolean(row.is_read),
    type: inferNotificationType(row.title, row.leave_request_id),
    createdAtIso:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    createdAtLabel: formatNotificationTimestamp(row.created_at),
  };
}

/**
 * Mengambil seluruh data realtime untuk App Shell (Sidebar badge, TopNavbar holiday, & Notifikasi).
 * @param {object} currentUser
 */
export async function getAppShellData(currentUser) {
  let pendingBadgePromise = Promise.resolve({ rows: [{ count: 0 }] });

  if (currentUser.role === "Ketua Divisi") {
    pendingBadgePromise = query(
      `
        SELECT COUNT(*)::int AS count
        FROM leave_requests lr
        JOIN users u ON lr.user_id = u.id
        JOIN divisions d ON u.division_id = d.id
        WHERE d.leader_id = $1
          AND u.role = 'Karyawan'
          AND lr.status = 'Pending';
      `,
      [currentUser.id]
    );
  } else if (currentUser.role === "HRD") {
    pendingBadgePromise = query(
      `
        SELECT COUNT(*)::int AS count
        FROM leave_requests lr
        JOIN users u ON lr.user_id = u.id
        WHERE (u.role = 'Karyawan' AND lr.status = 'Approved by Leader')
           OR (u.role = 'Ketua Divisi' AND lr.status = 'Pending');
      `
    );
  }

  const notificationsPromise = query(
    `
      SELECT id, leave_request_id, title, message, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 15;
    `,
    [currentUser.id]
  );

  const unreadCountPromise = query(
    `
      SELECT COUNT(*)::int AS unread_count
      FROM notifications
      WHERE user_id = $1
        AND is_read = FALSE;
    `,
    [currentUser.id]
  );

  const upcomingHolidayPromise = query(
    `
      SELECT
        TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date,
        name,
        holiday_type
      FROM holidays
      WHERE is_active = TRUE
        AND holiday_date >= CURRENT_DATE
      ORDER BY holiday_date ASC
      LIMIT 1;
    `
  );

  const [pendingRes, notifRes, unreadRes, holidayRes] = await Promise.all([
    pendingBadgePromise,
    notificationsPromise,
    unreadCountPromise,
    upcomingHolidayPromise,
  ]);

  const holidayRow = holidayRes.rows[0];
  const upcomingHoliday = holidayRow
    ? {
        dateIso: holidayRow.holiday_date,
        dateLabel: formatIndonesianDate(holidayRow.holiday_date),
        name: holidayRow.name,
        holidayType: holidayRow.holiday_type,
      }
    : null;

  return {
    pendingCount: Number(pendingRes.rows[0]?.count || 0),
    notifications: notifRes.rows.map(mapNotificationRow),
    unreadNotificationCount: Number(unreadRes.rows[0]?.unread_count || 0),
    todayLabel: formatIndonesianTodayLabel(new Date()),
    upcomingHoliday,
  };
}

/**
 * Mengambil data lengkap profil pengguna untuk Halaman /profile dari PostgreSQL.
 * @param {number} userId
 */
export async function getProfilePageData(userId) {
  const profileSql = `
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
      u.avatar_url,
      u.initial_leave_quota,
      u.remaining_leave_quota,
      TO_CHAR(u.join_date, 'YYYY-MM-DD') AS join_date_iso,
      (CURRENT_DATE >= (u.join_date + INTERVAL '1 year')) AS is_eligible_annual_leave,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.join_date))::int AS tenure_years,
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, u.join_date))::int AS tenure_months,
      u.is_active
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    LEFT JOIN users leader ON d.leader_id = leader.id
    WHERE u.id = $1
      AND u.is_active = TRUE
    LIMIT 1;
  `;

  const result = await query(profileSql, [userId]);
  const row = result.rows[0];
  if (!row) return null;

  let divisions = [];
  if (row.role === "Admin") {
    const divRes = await query(
      `SELECT id, name FROM divisions ORDER BY name ASC;`
    );
    divisions = divRes.rows.map((d) => ({
      id: d.id,
      name: d.name,
    }));
  }

  return {
    profile: {
      id: row.id,
      username: row.username,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      divisionId: row.division_id,
      divisionName: row.division_name || null,
      leaderName: row.leader_name || null,
      phone: row.phone || "",
      address: row.address || "",
      avatarUrl: row.avatar_url || null,
      initialLeaveQuota: Number(row.initial_leave_quota),
      remainingLeaveQuota: Number(row.remaining_leave_quota),
      joinDateIso: row.join_date_iso,
      joinDate: formatIndonesianDate(row.join_date_iso),
      tenureLabel: formatTenureLabel(row.tenure_years, row.tenure_months),
      isEligibleAnnualLeave: Boolean(row.is_eligible_annual_leave),
      isActive: Boolean(row.is_active),
      initials: buildUserInitials(row.full_name),
    },
    divisions,
  };
}
