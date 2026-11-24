"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  isPositiveInt,
  validateBlackoutPeriodPayload,
  validateDivisionCapacityPayload,
} from "@/lib/validators";

const POLICY_ALLOWED_ROLES = ["Admin", "HRD"];

function revalidatePolicyPaths() {
  revalidatePath("/admin/policies");
  revalidatePath("/leaves/new");
  revalidatePath("/calendar");
  revalidatePath("/approvals/hrd");
  revalidatePath("/dashboard");
}

/**
 * Fase 2 (8.6) — Perbarui batas persentase kapasitas cuti divisi (1–100%).
 * RBAC: Admin & HRD.
 */
export async function updateDivisionCapacityAction(
  divisionId,
  maxConcurrentLeavePct
) {
  try {
    const auth = await requireRole(POLICY_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateDivisionCapacityPayload(
      divisionId,
      maxConcurrentLeavePct
    );
    if (!validation.ok) {
      return validation;
    }

    const data = validation.data;

    const txResult = await withTransaction(async (client) => {
      const updateRes = await client.query(
        `
          UPDATE divisions
          SET max_concurrent_leave_pct = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, name, max_concurrent_leave_pct;
        `,
        [data.maxConcurrentLeavePct, data.divisionId]
      );

      if (updateRes.rowCount === 0) {
        return { ok: false, status: 404, error: "Divisi tidak ditemukan." };
      }

      return { ok: true, division: updateRes.rows[0] };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePolicyPaths();
    return {
      ok: true,
      message: `Batas kapasitas cuti Divisi "${txResult.division.name}" diperbarui menjadi ${txResult.division.max_concurrent_leave_pct}%.`,
    };
  } catch (error) {
    console.error("updateDivisionCapacityAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat memperbarui batas kapasitas divisi.",
    };
  }
}

/**
 * Fase 2 (8.6) — Tambah Periode Blackout baru (Admin & HRD).
 */
export async function createBlackoutPeriodAction(payload) {
  try {
    const auth = await requireRole(POLICY_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateBlackoutPeriodPayload(payload, {
      mode: "create",
    });
    if (!validation.ok) {
      return validation;
    }

    const data = validation.data;

    const txResult = await withTransaction(async (client) => {
      if (data.divisionId !== null) {
        const divRes = await client.query(
          `SELECT id FROM divisions WHERE id = $1 LIMIT 1;`,
          [data.divisionId]
        );
        if (divRes.rowCount === 0) {
          return {
            ok: false,
            status: 400,
            error: "Divisi yang dipilih tidak ditemukan.",
            fieldErrors: { divisionId: "Divisi tidak valid." },
          };
        }
      }

      const insertRes = await client.query(
        `
          INSERT INTO blackout_periods (
            name,
            start_date,
            end_date,
            reason,
            division_id,
            is_active,
            created_by
          )
          VALUES ($1, $2::date, $3::date, $4, $5, $6, $7)
          RETURNING id, name;
        `,
        [
          data.name,
          data.startDate,
          data.endDate,
          data.reason,
          data.divisionId,
          data.isActive,
          auth.user.id,
        ]
      );

      return { ok: true, blackout: insertRes.rows[0] };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePolicyPaths();
    return {
      ok: true,
      id: txResult.blackout.id,
      message: `Periode Blackout "${txResult.blackout.name}" berhasil ditambahkan.`,
    };
  } catch (error) {
    console.error("createBlackoutPeriodAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat menyimpan periode blackout.",
    };
  }
}

/**
 * Fase 2 (8.6) — Perbarui Periode Blackout (Admin & HRD).
 */
export async function updateBlackoutPeriodAction(blackoutId, payload) {
  try {
    const auth = await requireRole(POLICY_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateBlackoutPeriodPayload(
      { ...payload, id: blackoutId },
      { mode: "edit" }
    );
    if (!validation.ok) {
      return validation;
    }

    const data = validation.data;

    const txResult = await withTransaction(async (client) => {
      const lockRes = await client.query(
        `SELECT id FROM blackout_periods WHERE id = $1 FOR UPDATE;`,
        [data.id]
      );
      if (lockRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Periode blackout tidak ditemukan.",
        };
      }

      if (data.divisionId !== null) {
        const divRes = await client.query(
          `SELECT id FROM divisions WHERE id = $1 LIMIT 1;`,
          [data.divisionId]
        );
        if (divRes.rowCount === 0) {
          return {
            ok: false,
            status: 400,
            error: "Divisi yang dipilih tidak ditemukan.",
            fieldErrors: { divisionId: "Divisi tidak valid." },
          };
        }
      }

      const updateRes = await client.query(
        `
          UPDATE blackout_periods
          SET
            name = $1,
            start_date = $2::date,
            end_date = $3::date,
            reason = $4,
            division_id = $5,
            is_active = $6,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
          RETURNING id, name;
        `,
        [
          data.name,
          data.startDate,
          data.endDate,
          data.reason,
          data.divisionId,
          data.isActive,
          data.id,
        ]
      );

      return { ok: true, blackout: updateRes.rows[0] };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePolicyPaths();
    return {
      ok: true,
      message: `Periode Blackout "${txResult.blackout.name}" berhasil diperbarui.`,
    };
  } catch (error) {
    console.error("updateBlackoutPeriodAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat memperbarui periode blackout.",
    };
  }
}

/**
 * Fase 2 (8.6) — Toggle Aktif/Nonaktif Periode Blackout (Admin & HRD).
 */
export async function toggleBlackoutPeriodStatusAction(blackoutId, isActive) {
  try {
    const auth = await requireRole(POLICY_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (!isPositiveInt(blackoutId) || typeof isActive !== "boolean") {
      return { ok: false, status: 400, error: "Parameter tidak valid." };
    }

    const txResult = await withTransaction(async (client) => {
      const res = await client.query(
        `
          UPDATE blackout_periods
          SET is_active = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, name, is_active;
        `,
        [isActive, Number(blackoutId)]
      );
      if (res.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Periode blackout tidak ditemukan.",
        };
      }
      return { ok: true, blackout: res.rows[0] };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePolicyPaths();
    return {
      ok: true,
      message: `Periode Blackout "${txResult.blackout.name}" berhasil ${
        txResult.blackout.is_active ? "diaktifkan" : "dinonaktifkan"
      }.`,
    };
  } catch (error) {
    console.error("toggleBlackoutPeriodStatusAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat mengubah status periode blackout.",
    };
  }
}

/**
 * Fase 2 (8.6) — Hapus Periode Blackout (Admin & HRD).
 */
export async function deleteBlackoutPeriodAction(blackoutId) {
  try {
    const auth = await requireRole(POLICY_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (!isPositiveInt(blackoutId)) {
      return { ok: false, status: 400, error: "ID periode blackout tidak valid." };
    }

    const txResult = await withTransaction(async (client) => {
      const delRes = await client.query(
        `DELETE FROM blackout_periods WHERE id = $1 RETURNING id, name;`,
        [Number(blackoutId)]
      );
      if (delRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Periode blackout tidak ditemukan.",
        };
      }
      return { ok: true, deleted: delRes.rows[0] };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePolicyPaths();
    return {
      ok: true,
      message: `Periode Blackout "${txResult.deleted.name}" berhasil dihapus.`,
    };
  } catch (error) {
    console.error("deleteBlackoutPeriodAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat menghapus periode blackout.",
    };
  }
}
