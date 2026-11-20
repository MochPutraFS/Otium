"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  isPositiveInt,
  validateAdminDivisionPayload,
  validateDeleteDivisionPayload,
} from "@/lib/validators";

/**
 * Menerjemahkan error constraint PostgreSQL (23505 / 23503) menjadi respons ramah UI.
 * @param {any} error
 */
function mapDivisionPgError(error) {
  if (!error) return null;

  if (error.code === "23505") {
    const constraint = String(error.constraint || "").toLowerCase();
    if (constraint.includes("name")) {
      return {
        ok: false,
        status: 409,
        error: "Nama divisi sudah digunakan. Pilih nama divisi lain.",
        fieldErrors: {
          name: "Nama divisi sudah terdaftar di sistem.",
        },
      };
    }
    if (constraint.includes("leader")) {
      return {
        ok: false,
        status: 409,
        error:
          "Ketua Divisi tersebut sudah memimpin divisi lain (aturan 1 Ketua = 1 Divisi).",
        fieldErrors: {
          leaderId: "Ketua Divisi ini sudah memimpin divisi aktif lain.",
        },
      };
    }
    return {
      ok: false,
      status: 409,
      error: "Data divisi bentrok dengan data yang sudah terdaftar.",
    };
  }

  if (error.code === "23503") {
    return {
      ok: false,
      status: 400,
      error: "Referensi Ketua Divisi tidak valid atau sudah tidak tersedia.",
      fieldErrors: {
        leaderId: "Kandidat Ketua Divisi tidak ditemukan.",
      },
    };
  }

  return null;
}

/**
 * CMS Modul 2 — Create Divisi Baru (Khusus Admin).
 * Menegakkan keunikan nama divisi, kepemimpinan tunggal (1 Ketua Divisi = maks 1 Divisi aktif),
 * serta sinkronisasi otomatis `users.division_id` sang Ketua Divisi dalam satu transaksi atomik.
 * @param {object} payload
 */
export async function createDivisionAction(payload) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateAdminDivisionPayload(payload);
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      };
    }

    const { name, description, leaderId } = validation.data;

    const txResult = await withTransaction(async (client) => {
      // 1. Kunci baris kandidat Ketua Divisi & validasi role + status aktif
      const leaderRes = await client.query(
        `
          SELECT id, full_name, role, is_active
          FROM users
          WHERE id = $1
          FOR UPDATE;
        `,
        [leaderId]
      );

      if (leaderRes.rowCount === 0) {
        return {
          ok: false,
          status: 400,
          error: "Kandidat Ketua Divisi tidak ditemukan.",
          fieldErrors: { leaderId: "Kandidat Ketua Divisi tidak ditemukan." },
        };
      }

      const leader = leaderRes.rows[0];
      if (leader.role !== "Ketua Divisi" || !leader.is_active) {
        return {
          ok: false,
          status: 400,
          error:
            "Hanya pengguna aktif ber-role Ketua Divisi yang dapat memimpin divisi.",
          fieldErrors: {
            leaderId: "Pengguna harus ber-role Ketua Divisi dan berstatus Aktif.",
          },
        };
      }

      // 2. Cek keunikan nama divisi (case-insensitive)
      const dupNameRes = await client.query(
        `
          SELECT id
          FROM divisions
          WHERE LOWER(name) = LOWER($1)
          LIMIT 1;
        `,
        [name]
      );

      if (dupNameRes.rowCount > 0) {
        return {
          ok: false,
          status: 409,
          error: "Nama divisi sudah digunakan. Pilih nama divisi lain.",
          fieldErrors: { name: "Nama divisi sudah terdaftar di sistem." },
        };
      }

      // 3. Cek aturan kepemimpinan tunggal (1 Ketua = maks 1 Divisi)
      const busyLeaderRes = await client.query(
        `
          SELECT id, name
          FROM divisions
          WHERE leader_id = $1
          LIMIT 1;
        `,
        [leaderId]
      );

      if (busyLeaderRes.rowCount > 0) {
        return {
          ok: false,
          status: 409,
          error: `${leader.full_name} sudah memimpin divisi "${busyLeaderRes.rows[0].name}".`,
          fieldErrors: {
            leaderId: `Sudah memimpin divisi ${busyLeaderRes.rows[0].name}.`,
          },
        };
      }

      // 4. Sisipkan divisi baru
      const insertRes = await client.query(
        `
          INSERT INTO divisions (name, description, leader_id)
          VALUES ($1, $2, $3)
          RETURNING id, name;
        `,
        [name, description, leaderId]
      );

      const newDivision = insertRes.rows[0];

      // 5. Sinkronkan keanggotaan Ketua Divisi ke divisi barunya
      await client.query(
        `
          UPDATE users
          SET division_id = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `,
        [newDivision.id, leaderId]
      );

      return {
        ok: true,
        division: newDivision,
        leaderName: leader.full_name,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/admin/divisions");
    revalidatePath("/admin/division-members");
    revalidatePath("/admin/users");
    revalidatePath("/dashboard");

    return {
      ok: true,
      id: txResult.division.id,
      message: `Divisi "${txResult.division.name}" berhasil dibuat dengan Ketua Divisi ${txResult.leaderName}.`,
    };
  } catch (error) {
    const mapped = mapDivisionPgError(error);
    if (mapped) return mapped;
    console.error("createDivisionAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat membuat divisi baru.",
    };
  }
}

/**
 * CMS Modul 2 — Update Divisi (Khusus Admin).
 * Memperbarui nama, deskripsi, dan Ketua Divisi secara atomik.
 * Opsi A: Apabila Ketua Divisi diganti, ketua lama otomatis dilepas (`division_id = NULL`)
 * agar siap ditunjuk memimpin divisi lain, dan ketua baru disinkronkan ke divisi ini.
 * @param {number} divisionId
 * @param {object} payload
 */
export async function updateDivisionAction(divisionId, payload) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (!isPositiveInt(divisionId)) {
      return { ok: false, status: 400, error: "ID divisi tidak valid." };
    }

    const targetDivisionId = Number(divisionId);
    const validation = validateAdminDivisionPayload(payload);
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      };
    }

    const { name, description, leaderId } = validation.data;

    const txResult = await withTransaction(async (client) => {
      // 1. Kunci baris divisi target
      const existingRes = await client.query(
        `
          SELECT id, name, leader_id
          FROM divisions
          WHERE id = $1
          FOR UPDATE;
        `,
        [targetDivisionId]
      );

      if (existingRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Divisi yang dimaksud tidak ditemukan.",
        };
      }

      const existingDivision = existingRes.rows[0];

      // 2. Kunci baris kandidat Ketua Divisi baru & validasi role + status aktif
      const leaderRes = await client.query(
        `
          SELECT id, full_name, role, is_active
          FROM users
          WHERE id = $1
          FOR UPDATE;
        `,
        [leaderId]
      );

      if (leaderRes.rowCount === 0) {
        return {
          ok: false,
          status: 400,
          error: "Kandidat Ketua Divisi tidak ditemukan.",
          fieldErrors: { leaderId: "Kandidat Ketua Divisi tidak ditemukan." },
        };
      }

      const leader = leaderRes.rows[0];
      if (leader.role !== "Ketua Divisi" || !leader.is_active) {
        return {
          ok: false,
          status: 400,
          error:
            "Hanya pengguna aktif ber-role Ketua Divisi yang dapat memimpin divisi.",
          fieldErrors: {
            leaderId: "Pengguna harus ber-role Ketua Divisi dan berstatus Aktif.",
          },
        };
      }

      // 3. Cek keunikan nama divisi selain dirinya sendiri
      const dupNameRes = await client.query(
        `
          SELECT id
          FROM divisions
          WHERE LOWER(name) = LOWER($1)
            AND id <> $2
          LIMIT 1;
        `,
        [name, targetDivisionId]
      );

      if (dupNameRes.rowCount > 0) {
        return {
          ok: false,
          status: 409,
          error: "Nama divisi sudah digunakan oleh divisi lain.",
          fieldErrors: { name: "Nama divisi sudah digunakan oleh divisi lain." },
        };
      }

      // 4. Cek aturan 1 Ketua Divisi = maks 1 Divisi aktif
      const busyLeaderRes = await client.query(
        `
          SELECT id, name
          FROM divisions
          WHERE leader_id = $1
            AND id <> $2
          LIMIT 1;
        `,
        [leaderId, targetDivisionId]
      );

      if (busyLeaderRes.rowCount > 0) {
        return {
          ok: false,
          status: 409,
          error: `${leader.full_name} sudah memimpin divisi "${busyLeaderRes.rows[0].name}".`,
          fieldErrors: {
            leaderId: `Sudah memimpin divisi ${busyLeaderRes.rows[0].name}.`,
          },
        };
      }

      // 5. Perbarui baris divisi
      const updateRes = await client.query(
        `
          UPDATE divisions
          SET name = $1,
              description = $2,
              leader_id = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING id, name;
        `,
        [name, description, leaderId, targetDivisionId]
      );

      // 6. Opsi A: Jika Ketua Divisi berubah, lepas division_id ketua lama agar bersih & siap memimpin divisi lain
      if (
        existingDivision.leader_id !== null &&
        existingDivision.leader_id !== leaderId
      ) {
        await client.query(
          `
            UPDATE users
            SET division_id = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND division_id = $2;
          `,
          [existingDivision.leader_id, targetDivisionId]
        );
      }

      // 7. Sinkronkan division_id Ketua Divisi baru ke divisi ini
      await client.query(
        `
          UPDATE users
          SET division_id = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `,
        [targetDivisionId, leaderId]
      );

      return {
        ok: true,
        division: updateRes.rows[0],
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/admin/divisions");
    revalidatePath("/admin/division-members");
    revalidatePath("/admin/users");
    revalidatePath("/dashboard");

    return {
      ok: true,
      id: txResult.division.id,
      message: `Data divisi "${txResult.division.name}" berhasil diperbarui.`,
    };
  } catch (error) {
    const mapped = mapDivisionPgError(error);
    if (mapped) return mapped;
    console.error("updateDivisionAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat memperbarui data divisi.",
    };
  }
}

/**
 * CMS Modul 2 — Delete Divisi (Khusus Admin, Wajib Double Confirmation).
 * Melepaskan relasi seluruh anggota (`UPDATE users SET division_id = NULL`) secara atomik
 * sebelum menghapus baris divisi — MENJAMIN 0 akun pengguna terhapus.
 * @param {number} divisionId
 * @param {{ isDoubleConfirmed: boolean }} payload
 */
export async function deleteDivisionAction(divisionId, payload = {}) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateDeleteDivisionPayload(divisionId, payload);
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
      };
    }

    const targetDivisionId = validation.data.divisionId;

    const txResult = await withTransaction(async (client) => {
      // 1. Kunci baris divisi target
      const existingRes = await client.query(
        `
          SELECT id, name
          FROM divisions
          WHERE id = $1
          FOR UPDATE;
        `,
        [targetDivisionId]
      );

      if (existingRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Divisi yang dimaksud tidak ditemukan atau sudah dihapus.",
        };
      }

      // 2. Lepas atribut divisi seluruh anggota (TANPA menghapus akun user)
      const releasedRes = await client.query(
        `
          UPDATE users
          SET division_id = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE division_id = $1
          RETURNING id;
        `,
        [targetDivisionId]
      );

      // 3. Hapus baris divisi (diperkuat constraint DDL ON DELETE SET NULL)
      const deleteRes = await client.query(
        `
          DELETE FROM divisions
          WHERE id = $1
          RETURNING id, name;
        `,
        [targetDivisionId]
      );

      return {
        ok: true,
        deletedDivision: deleteRes.rows[0],
        releasedCount: releasedRes.rowCount,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/admin/divisions");
    revalidatePath("/admin/division-members");
    revalidatePath("/admin/users");
    revalidatePath("/dashboard");

    return {
      ok: true,
      releasedCount: txResult.releasedCount,
      message: `Divisi "${txResult.deletedDivision.name}" berhasil dihapus. ${txResult.releasedCount} akun anggota tetap aman (division_id = NULL).`,
    };
  } catch (error) {
    console.error("deleteDivisionAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat menghapus divisi.",
    };
  }
}
