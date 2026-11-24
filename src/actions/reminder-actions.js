"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { validateQuotaReminderPayload } from "@/lib/validators";

const REMINDER_ALLOWED_ROLES = ["Admin", "HRD"];
const REMINDER_TITLE = "Pengingat Kuota Cuti Tahunan Menjelang Akhir Tahun";

/**
 * Fase 2 (8.5) — Kirim Notifikasi Pengingat Kuota Hangus (Per Individu maupun Massal).
 * RBAC: Khusus Admin & HRD. Menulis baris notifikasi ke tabel `notifications` dalam satu
 * transaksi atomik PostgreSQL (BEGIN ... COMMIT).
 *
 * @param {Array<number | string>} userIds
 */
export async function sendExpiringQuotaReminderAction(userIds) {
  try {
    const auth = await requireRole(REMINDER_ALLOWED_ROLES);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateQuotaReminderPayload(userIds);
    if (!validation.ok) {
      return validation;
    }

    const targetIds = validation.data.userIds;

    const txResult = await withTransaction(async (client) => {
      const insertRes = await client.query(
        `
          INSERT INTO notifications (
            user_id,
            leave_request_id,
            title,
            message
          )
          SELECT
            u.id,
            NULL,
            $2,
            'Halo ' || u.full_name ||
              ', sisa kuota Cuti Tahunan Anda saat ini masih ' ||
              TO_CHAR(u.remaining_leave_quota, 'FM990.0') ||
              ' hari kerja (dari ' || TO_CHAR(u.initial_leave_quota, 'FM990.0') ||
              ' hari). Segera rencanakan jadwal cuti sebelum akhir tahun agar kuota Anda tidak hangus. (Dikirim oleh ' ||
              $3 || ')'
          FROM users u
          WHERE u.id = ANY($1::int[])
            AND u.is_active = TRUE
            AND u.role IN ('Karyawan', 'Ketua Divisi')
          RETURNING user_id;
        `,
        [targetIds, REMINDER_TITLE, `${auth.user.fullName} (${auth.user.role})`]
      );

      if (insertRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Tidak ada karyawan aktif yang valid untuk menerima pengingat.",
        };
      }

      return {
        ok: true,
        sentCount: insertRes.rowCount,
        sentUserIds: insertRes.rows.map((r) => r.user_id),
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/dashboard");

    return {
      ok: true,
      sentCount: txResult.sentCount,
      sentUserIds: txResult.sentUserIds,
      message:
        txResult.sentCount === 1
          ? "Notifikasi pengingat kuota hangus berhasil dikirim ke karyawan terkait."
          : `Notifikasi pengingat kuota hangus berhasil dikirim secara massal ke ${txResult.sentCount} karyawan.`,
    };
  } catch (error) {
    console.error("sendExpiringQuotaReminderAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat mengirim notifikasi pengingat kuota.",
    };
  }
}
