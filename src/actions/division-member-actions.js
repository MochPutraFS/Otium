"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  validateAssignMembersPayload,
  validateRemoveMemberPayload,
} from "@/lib/validators";

/**
 * CMS Modul 3 — Assign Anggota ke Divisi (Bulk Atomik, Khusus Admin).
 * Memastikan divisi tujuan ada dan seluruh kandidat yang dipilih ber-role 'Karyawan'
 * serta berstatus aktif sebelum memperbarui `users.division_id` dalam satu transaksi.
 * @param {number} divisionId
 * @param {number[]} userIds
 */
export async function assignMembersAction(divisionId, userIds) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateAssignMembersPayload(divisionId, userIds);
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
      };
    }

    const { divisionId: targetDivisionId, userIds: validUserIds } =
      validation.data;

    const txResult = await withTransaction(async (client) => {
      // 1. Kunci baris divisi tujuan
      const divRes = await client.query(
        `
          SELECT id, name
          FROM divisions
          WHERE id = $1
          FOR UPDATE;
        `,
        [targetDivisionId]
      );

      if (divRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Divisi tujuan tidak ditemukan.",
        };
      }

      const division = divRes.rows[0];

      // 2. Kunci baris seluruh kandidat & verifikasi role + status aktif
      const usersRes = await client.query(
        `
          SELECT id, full_name, role, is_active
          FROM users
          WHERE id = ANY($1::int[])
          FOR UPDATE;
        `,
        [validUserIds]
      );

      if (usersRes.rowCount !== validUserIds.length) {
        return {
          ok: false,
          status: 400,
          error: "Sebagian akun karyawan yang dipilih tidak ditemukan.",
        };
      }

      const invalidUser = usersRes.rows.find(
        (u) => u.role !== "Karyawan" || !u.is_active
      );
      if (invalidUser) {
        return {
          ok: false,
          status: 400,
          error: `"${invalidUser.full_name}" tidak dapat di-assign (hanya akun Karyawan aktif yang diizinkan).`,
        };
      }

      // 3. Perbarui division_id seluruh karyawan terpilih secara atomik
      const updateRes = await client.query(
        `
          UPDATE users
          SET division_id = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($2::int[])
            AND role = 'Karyawan'
            AND is_active = TRUE
          RETURNING id;
        `,
        [targetDivisionId, validUserIds]
      );

      return {
        ok: true,
        divisionName: division.name,
        assignedCount: updateRes.rowCount,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/admin/division-members");
    revalidatePath("/admin/divisions");
    revalidatePath("/admin/users");
    revalidatePath("/dashboard");

    return {
      ok: true,
      assignedCount: txResult.assignedCount,
      message: `${txResult.assignedCount} karyawan berhasil ditempatkan ke divisi ${txResult.divisionName}.`,
    };
  } catch (error) {
    console.error("assignMembersAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat menempatkan anggota ke divisi.",
    };
  }
}

/**
 * CMS Modul 3 — Keluarkan Anggota dari Divisi (Khusus Admin).
 * Hanya melepas atribut divisi (`UPDATE users SET division_id = NULL`), TIDAK menghapus akun.
 * Memblokir pelepasan Ketua Divisi aktif pada divisi tersebut (harus diganti dulu di Modul 2).
 * @param {number} divisionId
 * @param {number} userId
 */
export async function removeMemberAction(divisionId, userId) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateRemoveMemberPayload(divisionId, userId);
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
      };
    }

    const { divisionId: targetDivisionId, userId: targetUserId } =
      validation.data;

    const txResult = await withTransaction(async (client) => {
      // 1. Kunci baris divisi untuk memastikan keberadaan dan leader_id terkini
      const divRes = await client.query(
        `
          SELECT id, name, leader_id
          FROM divisions
          WHERE id = $1
          FOR UPDATE;
        `,
        [targetDivisionId]
      );

      if (divRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Divisi tidak ditemukan.",
        };
      }

      const division = divRes.rows[0];

      // 2. Garda Proteksi Ketua Divisi
      if (division.leader_id === targetUserId) {
        return {
          ok: false,
          status: 409,
          error:
            "Ketua Divisi aktif tidak dapat dikeluarkan langsung. Ganti Ketua Divisi terlebih dahulu di Modul 2 (Manajemen Divisi).",
        };
      }

      // 3. Lepas atribut divisi tanpa menghapus akun pengguna
      const updateRes = await client.query(
        `
          UPDATE users
          SET division_id = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND division_id = $2
          RETURNING id, full_name;
        `,
        [targetUserId, targetDivisionId]
      );

      if (updateRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Anggota tidak ditemukan pada divisi ini.",
        };
      }

      return {
        ok: true,
        divisionName: division.name,
        memberName: updateRes.rows[0].full_name,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/admin/division-members");
    revalidatePath("/admin/divisions");
    revalidatePath("/admin/users");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: `"${txResult.memberName}" dikeluarkan dari ${txResult.divisionName} (akun tetap aktif, division_id = NULL).`,
    };
  } catch (error) {
    console.error("removeMemberAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat mengeluarkan anggota dari divisi.",
    };
  }
}
