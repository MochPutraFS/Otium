"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { isCoreLeaveTypeCode } from "@/lib/leave-type-utils";
import {
  validateLeaveTypePayload,
  validateToggleLeaveTypeStatusPayload,
} from "@/lib/validators";

/**
 * Menerjemahkan error constraint PostgreSQL (`23505` / `23514`) pada tabel `leave_types`
 * menjadi kontrak respons yang ramah UI (`{ ok, status, error, fieldErrors }`).
 * @param {any} error
 */
function mapLeaveTypePgError(error) {
  if (!error) return null;

  if (error.code === "23505") {
    const constraint = String(error.constraint || "").toLowerCase();
    if (constraint.includes("code")) {
      return {
        ok: false,
        status: 409,
        error: "Kode jenis cuti sudah digunakan. Gunakan kode unik lain.",
        fieldErrors: {
          code: "Kode jenis cuti sudah terdaftar di sistem.",
        },
      };
    }
    if (constraint.includes("name")) {
      return {
        ok: false,
        status: 409,
        error: "Nama jenis cuti sudah terdaftar. Gunakan nama lain.",
        fieldErrors: {
          name: "Nama jenis cuti sudah terdaftar di sistem.",
        },
      };
    }
    return {
      ok: false,
      status: 409,
      error: "Data jenis cuti bentrok dengan kategori yang sudah terdaftar.",
    };
  }

  if (error.code === "23514") {
    return {
      ok: false,
      status: 400,
      error: "Nilai kuota maksimal harus lebih besar dari 0 hari.",
      fieldErrors: {
        maxQuota: "Kuota maksimal harus > 0 hari.",
      },
    };
  }

  return null;
}

/**
 * CMS Modul 4 — Create / Update Jenis Cuti Dinamis (Khusus Admin).
 * - Mode `create`: menambahkan kategori cuti baru ke tabel `leave_types`.
 * - Mode `edit`: memperbarui aturan jenis cuti; kolom `code` untuk kategori inti
 *   (`ANNUAL` dan `SICK`) dikunci di sisi server agar aturan bisnis sistem tidak terputus.
 * Seluruh operasi dijalankan dalam transaksi atomik (`withTransaction`) + `FOR UPDATE`.
 * @param {object} payload
 */
export async function saveLeaveTypeAction(payload) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const isEdit =
      payload?.id !== undefined && payload?.id !== null && payload?.id !== "";
    const mode = isEdit ? "edit" : "create";

    const validation = validateLeaveTypePayload(payload, { mode });
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      };
    }

    const data = validation.data;

    const txResult = await withTransaction(async (client) => {
      if (mode === "create") {
        // 1. Cek duplikasi case-insensitive pada code & name
        const dupRes = await client.query(
          `
            SELECT id, code, name
            FROM leave_types
            WHERE UPPER(code) = UPPER($1) OR LOWER(name) = LOWER($2)
            LIMIT 1;
          `,
          [data.code, data.name]
        );

        if (dupRes.rowCount > 0) {
          const existing = dupRes.rows[0];
          const fieldErrors = {};
          if (existing.code.toUpperCase() === data.code) {
            fieldErrors.code = "Kode jenis cuti sudah digunakan.";
          }
          if (existing.name.toLowerCase() === data.name.toLowerCase()) {
            fieldErrors.name = "Nama jenis cuti sudah terdaftar.";
          }
          return {
            ok: false,
            status: 409,
            error: "Kode atau nama jenis cuti sudah terdaftar di sistem.",
            fieldErrors,
          };
        }

        // 2. Insert baris baru
        const insertRes = await client.query(
          `
            INSERT INTO leave_types (
              code,
              name,
              max_quota,
              min_submission_days,
              requires_attachment,
              deducts_annual_quota,
              requires_min_one_year_tenure,
              description,
              is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, code, name;
          `,
          [
            data.code,
            data.name,
            data.maxQuota,
            data.minSubmissionDays,
            data.requiresAttachment,
            data.deductsAnnualQuota,
            data.requiresMinOneYearTenure,
            data.description,
            data.isActive,
          ]
        );

        const created = insertRes.rows[0];
        return {
          ok: true,
          status: 201,
          id: created.id,
          message: `Jenis cuti "${created.name}" (${created.code}) berhasil ditambahkan.`,
        };
      }

      // Mode Edit: kunci baris target terlebih dahulu
      const targetRes = await client.query(
        `
          SELECT id, code, name
          FROM leave_types
          WHERE id = $1
          FOR UPDATE;
        `,
        [data.id]
      );

      if (targetRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Jenis cuti tidak ditemukan atau sudah tidak tersedia.",
        };
      }

      const currentRow = targetRes.rows[0];

      // Opsi A: Proteksi kode jenis cuti inti (ANNUAL & SICK) agar tidak berubah
      if (
        isCoreLeaveTypeCode(currentRow.code) &&
        data.code !== currentRow.code.toUpperCase()
      ) {
        return {
          ok: false,
          status: 400,
          error: `Kode sistem "${currentRow.code}" bersifat inti dan tidak dapat diubah.`,
          fieldErrors: {
            code: `Kode inti "${currentRow.code}" dikunci untuk menjaga aturan bisnis sistem.`,
          },
        };
      }

      // Cek duplikasi code / name terhadap baris lain
      const dupRes = await client.query(
        `
          SELECT id, code, name
          FROM leave_types
          WHERE (UPPER(code) = UPPER($1) OR LOWER(name) = LOWER($2))
            AND id <> $3
          LIMIT 1;
        `,
        [data.code, data.name, data.id]
      );

      if (dupRes.rowCount > 0) {
        const existing = dupRes.rows[0];
        const fieldErrors = {};
        if (existing.code.toUpperCase() === data.code) {
          fieldErrors.code = "Kode jenis cuti sudah digunakan kategori lain.";
        }
        if (existing.name.toLowerCase() === data.name.toLowerCase()) {
          fieldErrors.name = "Nama jenis cuti sudah digunakan kategori lain.";
        }
        return {
          ok: false,
          status: 409,
          error: "Kode atau nama jenis cuti bentrok dengan kategori lain.",
          fieldErrors,
        };
      }

      const updateRes = await client.query(
        `
          UPDATE leave_types
          SET
            code = $1,
            name = $2,
            max_quota = $3,
            min_submission_days = $4,
            requires_attachment = $5,
            deducts_annual_quota = $6,
            requires_min_one_year_tenure = $7,
            description = $8,
            is_active = $9,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $10
          RETURNING id, code, name;
        `,
        [
          data.code,
          data.name,
          data.maxQuota,
          data.minSubmissionDays,
          data.requiresAttachment,
          data.deductsAnnualQuota,
          data.requiresMinOneYearTenure,
          data.description,
          data.isActive,
          data.id,
        ]
      );

      const updated = updateRes.rows[0];
      return {
        ok: true,
        status: 200,
        id: updated.id,
        message: `Konfigurasi "${updated.name}" (${updated.code}) berhasil diperbarui.`,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/admin/leave-types");
    revalidatePath("/leaves/new");
    revalidatePath("/leaves");
    return txResult;
  } catch (error) {
    const mapped = mapLeaveTypePgError(error);
    if (mapped) return mapped;

    console.error("saveLeaveTypeAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan server saat menyimpan jenis cuti.",
    };
  }
}

/**
 * CMS Modul 4 — Toggle Status Aktif / Nonaktif Jenis Cuti (Khusus Admin).
 * Menggunakan transaksi atomik + `FOR UPDATE` untuk menjaga konsistensi status
 * tanpa menghapus baris (menjaga referential integrity `ON DELETE RESTRICT` di `leave_requests`).
 * @param {number | string} leaveTypeId
 * @param {boolean} nextIsActive
 */
export async function toggleLeaveTypeStatusAction(leaveTypeId, nextIsActive) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateToggleLeaveTypeStatusPayload(
      leaveTypeId,
      nextIsActive
    );
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
      };
    }

    const { leaveTypeId: targetId, isActive } = validation.data;

    const txResult = await withTransaction(async (client) => {
      const targetRes = await client.query(
        `
          SELECT id, code, name, is_active
          FROM leave_types
          WHERE id = $1
          FOR UPDATE;
        `,
        [targetId]
      );

      if (targetRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Jenis cuti tidak ditemukan.",
        };
      }

      const updateRes = await client.query(
        `
          UPDATE leave_types
          SET
            is_active = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, code, name, is_active;
        `,
        [isActive, targetId]
      );

      const updated = updateRes.rows[0];
      return {
        ok: true,
        status: 200,
        id: updated.id,
        isActive: Boolean(updated.is_active),
        message: `Jenis cuti "${updated.name}" diubah menjadi ${
          updated.is_active ? "Aktif" : "Nonaktif"
        }.`,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/admin/leave-types");
    revalidatePath("/leaves/new");
    revalidatePath("/leaves");
    return txResult;
  } catch (error) {
    console.error("toggleLeaveTypeStatusAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Gagal mengubah status aktif jenis cuti.",
    };
  }
}
