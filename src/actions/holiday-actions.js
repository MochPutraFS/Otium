"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { isPositiveInt, validateHolidayPayload } from "@/lib/validators";

const HOLIDAY_ALLOWED_ROLES = ["Admin", "HRD"];

function mapHolidayPgError(error) {
  if (!error) return null;
  if (error.code === "23505") {
    return {
      ok: false,
      status: 409,
      error: "Tanggal hari libur tersebut sudah terdaftar di database.",
      fieldErrors: {
        holidayDate: "Tanggal hari libur sudah digunakan.",
      },
    };
  }
  if (error.code === "23514") {
    return {
      ok: false,
      status: 400,
      error: "Kategori hari libur tidak valid.",
    };
  }
  return null;
}

function revalidateHolidayPaths() {
  revalidatePath("/admin/holidays");
  revalidatePath("/leaves/new");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

/**
 * Fase 2 (8.3) — Tambah Hari Libur Nasional / Cuti Bersama (Admin & HRD).
 * @param {object} payload
 */
export async function createHolidayAction(payload) {
  try {
    const auth = await requireRole(HOLIDAY_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateHolidayPayload(payload, { mode: "create" });
    if (!validation.ok) {
      return validation;
    }

    const data = validation.data;

    const txResult = await withTransaction(async (client) => {
      const dupRes = await client.query(
        `SELECT id FROM holidays WHERE holiday_date = $1::date LIMIT 1;`,
        [data.holidayDate]
      );
      if (dupRes.rowCount > 0) {
        return {
          ok: false,
          status: 409,
          error: "Tanggal hari libur tersebut sudah terdaftar.",
          fieldErrors: {
            holidayDate: "Tanggal hari libur sudah ada di sistem.",
          },
        };
      }

      const insertRes = await client.query(
        `
          INSERT INTO holidays (
            holiday_date,
            name,
            holiday_type,
            is_active,
            created_by
          )
          VALUES ($1::date, $2, $3, $4, $5)
          RETURNING id, TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date, name;
        `,
        [
          data.holidayDate,
          data.name,
          data.holidayType,
          data.isActive,
          auth.user.id,
        ]
      );

      return { ok: true, holiday: insertRes.rows[0] };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidateHolidayPaths();
    return {
      ok: true,
      id: txResult.holiday.id,
      message: `Hari libur "${txResult.holiday.name}" berhasil ditambahkan.`,
    };
  } catch (error) {
    const mapped = mapHolidayPgError(error);
    if (mapped) return mapped;
    console.error("createHolidayAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat menyimpan hari libur baru.",
    };
  }
}

/**
 * Fase 2 (8.3) — Perbarui Hari Libur Nasional / Cuti Bersama (Admin & HRD).
 * @param {number|string} holidayId
 * @param {object} payload
 */
export async function updateHolidayAction(holidayId, payload) {
  try {
    const auth = await requireRole(HOLIDAY_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateHolidayPayload(
      { ...payload, id: holidayId },
      { mode: "edit" }
    );
    if (!validation.ok) {
      return validation;
    }

    const data = validation.data;

    const txResult = await withTransaction(async (client) => {
      const lockRes = await client.query(
        `SELECT id FROM holidays WHERE id = $1 FOR UPDATE;`,
        [data.id]
      );
      if (lockRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Data hari libur tidak ditemukan.",
        };
      }

      const dupRes = await client.query(
        `SELECT id FROM holidays WHERE holiday_date = $1::date AND id <> $2 LIMIT 1;`,
        [data.holidayDate, data.id]
      );
      if (dupRes.rowCount > 0) {
        return {
          ok: false,
          status: 409,
          error: "Tanggal hari libur tersebut sudah digunakan oleh entri lain.",
          fieldErrors: {
            holidayDate: "Tanggal hari libur sudah terdaftar.",
          },
        };
      }

      const updateRes = await client.query(
        `
          UPDATE holidays
          SET
            holiday_date = $1::date,
            name = $2,
            holiday_type = $3,
            is_active = $4
          WHERE id = $5
          RETURNING id, name;
        `,
        [data.holidayDate, data.name, data.holidayType, data.isActive, data.id]
      );

      return { ok: true, holiday: updateRes.rows[0] };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidateHolidayPaths();
    return {
      ok: true,
      message: `Hari libur "${txResult.holiday.name}" berhasil diperbarui.`,
    };
  } catch (error) {
    const mapped = mapHolidayPgError(error);
    if (mapped) return mapped;
    console.error("updateHolidayAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat memperbarui data hari libur.",
    };
  }
}

/**
 * Fase 2 (8.3) — Toggle Status Aktif/Nonaktif Hari Libur (Admin & HRD).
 * @param {number|string} holidayId
 * @param {boolean} isActive
 */
export async function toggleHolidayStatusAction(holidayId, isActive) {
  try {
    const auth = await requireRole(HOLIDAY_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (!isPositiveInt(holidayId) || typeof isActive !== "boolean") {
      return { ok: false, status: 400, error: "Parameter status hari libur tidak valid." };
    }

    const txResult = await withTransaction(async (client) => {
      const res = await client.query(
        `
          UPDATE holidays
          SET is_active = $1
          WHERE id = $2
          RETURNING id, name, is_active;
        `,
        [isActive, Number(holidayId)]
      );
      if (res.rowCount === 0) {
        return { ok: false, status: 404, error: "Data hari libur tidak ditemukan." };
      }
      return { ok: true, holiday: res.rows[0] };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidateHolidayPaths();
    return {
      ok: true,
      message: `Hari libur "${txResult.holiday.name}" berhasil ${
        txResult.holiday.is_active ? "diaktifkan" : "dinonaktifkan"
      }.`,
    };
  } catch (error) {
    console.error("toggleHolidayStatusAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat mengubah status hari libur.",
    };
  }
}

/**
 * Fase 2 (8.3) — Hapus Hari Libur (Admin & HRD).
 * @param {number|string} holidayId
 */
export async function deleteHolidayAction(holidayId) {
  try {
    const auth = await requireRole(HOLIDAY_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (!isPositiveInt(holidayId)) {
      return { ok: false, status: 400, error: "ID hari libur tidak valid." };
    }

    const txResult = await withTransaction(async (client) => {
      const delRes = await client.query(
        `DELETE FROM holidays WHERE id = $1 RETURNING id, name;`,
        [Number(holidayId)]
      );
      if (delRes.rowCount === 0) {
        return { ok: false, status: 404, error: "Data hari libur tidak ditemukan." };
      }
      return { ok: true, deleted: delRes.rows[0] };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidateHolidayPaths();
    return {
      ok: true,
      message: `Hari libur "${txResult.deleted.name}" berhasil dihapus.`,
    };
  } catch (error) {
    console.error("deleteHolidayAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat menghapus data hari libur.",
    };
  }
}
