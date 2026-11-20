import { query } from "@/lib/db";
import { buildUserInitials } from "@/lib/auth";
import { isPositiveInt } from "@/lib/validators";

/**
 * Memetakan baris anggota divisi dari PostgreSQL menjadi objek serializable client.
 * @param {object} row
 */
function mapMemberRow(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    initials: buildUserInitials(row.full_name),
    role: row.role,
    divisionId: row.division_id,
    divisionName: row.division_name || null,
    remainingLeaveQuota: Number(row.remaining_leave_quota),
    isActive: Boolean(row.is_active),
  };
}

/**
 * Mengambil daftar kandidat Ketua Divisi aktif yang belum memimpin divisi lain.
 * Bila `currentDivisionId` disertakan (saat Edit Divisi), Ketua Divisi saat ini
 * ikut disertakan dalam hasil dengan penanda `isCurrentLeader = true`.
 * @param {number | string | null} [currentDivisionId]
 */
export async function getAvailableLeaders(currentDivisionId = null) {
  const parsedCurrentId = isPositiveInt(currentDivisionId)
    ? Number(currentDivisionId)
    : null;

  const res = await query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.username,
        d.id AS current_led_division_id
      FROM users u
      LEFT JOIN divisions d ON d.leader_id = u.id
      WHERE u.role = 'Ketua Divisi'
        AND u.is_active = TRUE
        AND (d.id IS NULL OR d.id = $1)
      ORDER BY
        CASE WHEN d.id = $1 THEN 0 ELSE 1 END,
        LOWER(u.full_name) ASC,
        u.id ASC;
    `,
    [parsedCurrentId]
  );

  return res.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    username: row.username,
    isCurrentLeader:
      parsedCurrentId !== null && row.current_led_division_id === parsedCurrentId,
  }));
}

/**
 * Memuat seluruh data workspace CMS Modul 2: Manajemen Divisi (/admin/divisions).
 * Mengembalikan daftar divisi lengkap dengan metadata Ketua Divisi, daftar anggota per divisi,
 * serta jumlah kandidat Ketua Divisi yang bebas tugas.
 */
export async function getAdminDivisionsWorkspaceData() {
  const divisionsSql = `
    SELECT
      d.id,
      d.name,
      d.description,
      d.leader_id,
      TO_CHAR(d.created_at, 'YYYY-MM-DD') AS created_at,
      u.full_name AS leader_full_name,
      u.email AS leader_email,
      u.username AS leader_username,
      u.is_active AS leader_is_active
    FROM divisions d
    LEFT JOIN users u ON d.leader_id = u.id
    ORDER BY LOWER(d.name) ASC, d.id ASC;
  `;

  const membersSql = `
    SELECT
      u.id,
      u.username,
      u.email,
      u.full_name,
      u.role,
      u.division_id,
      u.remaining_leave_quota,
      u.is_active
    FROM users u
    WHERE u.division_id IS NOT NULL
    ORDER BY LOWER(u.full_name) ASC, u.id ASC;
  `;

  const [divisionsRes, membersRes, availableLeaders] = await Promise.all([
    query(divisionsSql),
    query(membersSql),
    getAvailableLeaders(null),
  ]);

  const membersByDivision = new Map();
  let totalAssignedMembers = 0;

  for (const row of membersRes.rows) {
    const member = mapMemberRow(row);
    totalAssignedMembers += 1;
    const list = membersByDivision.get(member.divisionId) || [];
    list.push(member);
    membersByDivision.set(member.divisionId, list);
  }

  const divisions = divisionsRes.rows.map((row) => {
    const members = membersByDivision.get(row.id) || [];
    const activeMemberCount = members.filter((m) => m.isActive).length;
    const leader = row.leader_id
      ? {
          id: row.leader_id,
          fullName: row.leader_full_name,
          email: row.leader_email,
          username: row.leader_username,
          initials: buildUserInitials(row.leader_full_name),
          isActive: Boolean(row.leader_is_active),
        }
      : null;

    return {
      id: row.id,
      name: row.name,
      description: row.description || "",
      leaderId: row.leader_id,
      leader,
      leaderName: leader ? leader.fullName : null,
      createdAt: row.created_at,
      members,
      memberCount: members.length,
      activeMemberCount,
    };
  });

  return {
    divisions,
    availableLeaders,
    stats: {
      totalDivisions: divisions.length,
      assignedMembersCount: totalAssignedMembers,
      availableLeadersCount: availableLeaders.length,
    },
  };
}

/**
 * Memuat seluruh data workspace CMS Modul 3: Manajemen Anggota Divisi (/admin/division-members).
 * Mengembalikan daftar ringkasan divisi, seluruh anggota yang memiliki divisi,
 * serta seluruh karyawan aktif yang bisa di-assign (unassigned & transfer dari divisi lain).
 * @param {number | string | null} [requestedDivisionId]
 */
export async function getAdminDivisionMembersWorkspaceData(
  requestedDivisionId = null
) {
  const divisionsSql = `
    SELECT
      d.id,
      d.name,
      d.description,
      d.leader_id,
      TO_CHAR(d.created_at, 'YYYY-MM-DD') AS created_at,
      u.full_name AS leader_full_name,
      u.email AS leader_email,
      u.username AS leader_username,
      COUNT(m.id)::int AS member_count
    FROM divisions d
    LEFT JOIN users u ON d.leader_id = u.id
    LEFT JOIN users m ON m.division_id = d.id
    GROUP BY d.id, u.full_name, u.email, u.username
    ORDER BY LOWER(d.name) ASC, d.id ASC;
  `;

  // Memuat seluruh user yang berada di divisi mana pun ATAU karyawan aktif tanpa divisi
  const relevantUsersSql = `
    SELECT
      u.id,
      u.username,
      u.email,
      u.full_name,
      u.role,
      u.division_id,
      d.name AS division_name,
      u.remaining_leave_quota,
      u.is_active
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    WHERE u.division_id IS NOT NULL
       OR (u.role = 'Karyawan' AND u.is_active = TRUE)
    ORDER BY LOWER(u.full_name) ASC, u.id ASC;
  `;

  const [divisionsRes, usersRes] = await Promise.all([
    query(divisionsSql),
    query(relevantUsersSql),
  ]);

  const divisions = divisionsRes.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || "",
    leaderId: row.leader_id,
    leader: row.leader_id
      ? {
          id: row.leader_id,
          fullName: row.leader_full_name,
          email: row.leader_email,
          username: row.leader_username,
          initials: buildUserInitials(row.leader_full_name),
        }
      : null,
    memberCount: Number(row.member_count || 0),
    createdAt: row.created_at,
  }));

  const users = usersRes.rows.map(mapMemberRow);

  const parsedRequested = isPositiveInt(requestedDivisionId)
    ? Number(requestedDivisionId)
    : null;

  const initialSelectedDivisionId =
    parsedRequested && divisions.some((d) => d.id === parsedRequested)
      ? parsedRequested
      : (divisions[0]?.id ?? null);

  return {
    divisions,
    users,
    initialSelectedDivisionId,
  };
}
