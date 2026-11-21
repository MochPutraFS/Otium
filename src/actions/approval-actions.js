"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { validateLeaderVerificationPayload } from "@/lib/validators";
import { formatIndonesianDateRange } from "@/lib/date-utils";

/**
 * Memetakan kode error PostgreSQL pada mutasi persetujuan cuti ke pesan ramah pengguna.
 * @param {any} error
 */
function mapApprovalPgError(error) {
  const code = error?.code;

  if (code === "23505") {
    return {
      ok: false,
      status: 409,
      error:
        "Pengajuan cuti ini sudah memiliki catatan verifikasi pada tahap yang sama.",
      fieldErrors: {},
    };
  }

  if (code === "23503") {
    return {
      ok: false,
      status: 400,
      error:
        "Referensi data pengajuan atau akun approver tidak ditemukan di database.",
      fieldErrors: {},
    };
  }

  if (code === "22P02") {
    return {
      ok: false,
      status: 400,
      error: "Format parameter verifikasi pengajuan cuti tidak valid.",
      fieldErrors: {},
    };
  }

  if (code === "23514") {
    return {
      ok: false,
      status: 400,
      error:
        "Data verifikasi melanggar aturan integritas database (constraint check).",
      fieldErrors: {},
    };
  }

  return {
    ok: false,
    status: 500,
    error: "Terjadi kesalahan server saat memproses verifikasi pengajuan cuti.",
    fieldErrors: {},
  };
}

/**
 * Server Action Modul 6A: Verifikasi Tahap 1 oleh Ketua Divisi (`Approve` / `Reject`).
 *
 * Menerapkan seluruh garda keamanan & integritas database:
 * 1. Two-Layer RBAC: hanya `Ketua Divisi` aktif (`requireRole(["Ketua Divisi"])`).
 * 2. Validasi payload: `Approve` (catatan opsional), `Reject` (alasan wajib >= 5 karakter).
 * 3. Row Lock `SELECT ... FOR UPDATE OF lr` & Garda Otoritas Divisi (`Guard #2`):
 *    pemohon wajib `role = 'Karyawan'`, berada di divisi yang dipimpin (`d.leader_id = session.id`),
 *    bukan pengajuan milik sendiri, dan `status = 'Pending'`.
 * 4. Auto-Refund Kuota Anti-Double-Refund (`Guard #4`):
 *    saat `Reject` dan `lr.quota_deducted = TRUE`, saldo `users.remaining_leave_quota`
 *    dikembalikan (`+ total_days`) dan `lr.quota_deducted` langsung diset `FALSE`.
 * 5. Dual-Persistence: update kolom jejak di `leave_requests` DAN insert audit log ke `leave_approvals` (stage 1).
 * 6. Notifikasi otomatis dalam transaksi yang sama:
 *    - Saat `Approve`: kirim notifikasi ke Pemohon + seluruh akun `HRD` aktif.
 *    - Saat `Reject`: kirim notifikasi ke Pemohon (beserta alasan penolakan & info auto-refund jika berlaku).
 *
 * @param {number|string} requestId
 * @param {"Approve"|"Reject"} action
 * @param {string} [notes=""]
 */
export async function verifyByLeaderAction(requestId, action, notes = "") {
  try {
    // Layer 2 RBAC: wajib Ketua Divisi aktif dari PostgreSQL
    const auth = await requireRole(["Ketua Divisi"]);
    if (!auth.ok) {
      return {
        ok: false,
        status: auth.status,
        error: auth.error,
        fieldErrors: {},
      };
    }

    const sessionUser = auth.user;

    // Validasi payload sisi server
    const validation = validateLeaderVerificationPayload(
      requestId,
      action,
      notes
    );
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
        fieldErrors: validation.fieldErrors || {},
      };
    }

    const {
      requestId: validRequestId,
      action: validAction,
      notes: validNotes,
    } = validation.data;

    const isApprove = validAction === "Approve";
    const storedNotes = validNotes || null;

    const txResult = await withTransaction(async (client) => {
      // 1. Lock baris leave_requests dan verifikasi kepemilikan divisi + status Pending
      const lockRes = await client.query(
        `
          SELECT
            lr.id,
            lr.user_id,
            lr.total_days,
            lr.status,
            lr.quota_deducted,
            lr.is_half_day,
            TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date,
            u.full_name AS applicant_name,
            u.role AS applicant_role,
            d.id AS division_id,
            d.name AS division_name,
            d.leader_id,
            lt.name AS leave_type_name
          FROM leave_requests lr
          JOIN users u ON lr.user_id = u.id
          LEFT JOIN divisions d ON u.division_id = d.id
          JOIN leave_types lt ON lr.leave_type_id = lt.id
          WHERE lr.id = $1
          FOR UPDATE OF lr;
        `,
        [validRequestId]
      );

      if (lockRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Pengajuan cuti tidak ditemukan.",
          fieldErrors: {},
        };
      }

      const target = lockRes.rows[0];

      // Garda Otoritas Divisi (Guard #2): tidak boleh verifikasi diri sendiri / non-Karyawan / lintas divisi
      if (Number(target.user_id) === Number(sessionUser.id)) {
        return {
          ok: false,
          status: 403,
          error:
            "Anda tidak diperbolehkan memverifikasi pengajuan cuti pribadi Anda sendiri. Pengajuan Ketua Divisi diproses langsung oleh HRD.",
          fieldErrors: {},
        };
      }

      if (target.applicant_role !== "Karyawan") {
        return {
          ok: false,
          status: 403,
          error:
            "Verifikasi Tahap 1 hanya berlaku untuk pengajuan cuti anggota ber-role Karyawan.",
          fieldErrors: {},
        };
      }

      if (
        target.leader_id === null ||
        Number(target.leader_id) !== Number(sessionUser.id)
      ) {
        return {
          ok: false,
          status: 403,
          error:
            "Anda hanya berwenang memverifikasi pengajuan cuti dari anggota divisi yang Anda pimpin.",
          fieldErrors: {},
        };
      }

      // Garda Status Pending (anti-race condition & anti-double-approval / double-refund)
      if (target.status !== "Pending") {
        return {
          ok: false,
          status: 409,
          error: `Pengajuan ini sudah berstatus "${target.status}" sehingga tidak dapat diverifikasi ulang.`,
          fieldErrors: {},
        };
      }

      const totalDays = Number(target.total_days);
      const dateRangeLabel = formatIndonesianDateRange(
        target.start_date,
        target.end_date,
        Boolean(target.is_half_day)
      );
      let refundedDays = 0;

      if (isApprove) {
        // 2A. Update status menjadi 'Approved by Leader'
        const updateRes = await client.query(
          `
            UPDATE leave_requests
            SET status = 'Approved by Leader',
                leader_approver_id = $2,
                leader_approved_at = CURRENT_TIMESTAMP,
                leader_notes = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND status = 'Pending'
            RETURNING id, status;
          `,
          [validRequestId, sessionUser.id, storedNotes]
        );

        if (updateRes.rowCount === 0) {
          return {
            ok: false,
            status: 409,
            error:
              "Pengajuan cuti telah diproses oleh transaksi lain. Silakan muat ulang halaman.",
            fieldErrors: {},
          };
        }
      } else {
        // 2B. Reject + Auto-Refund Kuota Anti-Double-Refund (Guard #4)
        if (Boolean(target.quota_deducted) && totalDays > 0) {
          await client.query(
            `SELECT id, remaining_leave_quota FROM users WHERE id = $1 FOR UPDATE;`,
            [target.user_id]
          );

          await client.query(
            `
              UPDATE users
              SET remaining_leave_quota = remaining_leave_quota + $2,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $1;
            `,
            [target.user_id, totalDays]
          );

          refundedDays = totalDays;
        }

        const rejectRes = await client.query(
          `
            UPDATE leave_requests
            SET status = 'Rejected',
                leader_approver_id = $2,
                leader_approved_at = CURRENT_TIMESTAMP,
                leader_notes = $3,
                rejected_by_role = 'Ketua Divisi',
                rejection_reason = $3,
                quota_deducted = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND status = 'Pending'
            RETURNING id, status;
          `,
          [validRequestId, sessionUser.id, validNotes]
        );

        if (rejectRes.rowCount === 0) {
          return {
            ok: false,
            status: 409,
            error:
              "Pengajuan cuti telah diproses oleh transaksi lain. Silakan muat ulang halaman.",
            fieldErrors: {},
          };
        }
      }

      // 3. Dual-Persistence: Catat riwayat permanen ke tabel leave_approvals (Stage 1)
      await client.query(
        `
          INSERT INTO leave_approvals (
            leave_request_id,
            approver_id,
            approver_name_snapshot,
            approver_role,
            approval_stage,
            action,
            notes,
            acted_at
          )
          VALUES ($1, $2, $3, 'Ketua Divisi', 1, $4, $5, CURRENT_TIMESTAMP);
        `,
        [
          validRequestId,
          sessionUser.id,
          sessionUser.fullName,
          isApprove ? "Approved" : "Rejected",
          storedNotes,
        ]
      );

      // 4. Notifikasi otomatis dalam transaksi yang sama
      if (isApprove) {
        // 4a. Notifikasi ke Pemohon
        const applicantMessage = storedNotes
          ? `Pengajuan ${target.leave_type_name} Anda (${dateRangeLabel}) telah disetujui Tahap 1 oleh Ketua Divisi ${sessionUser.fullName} dan diteruskan ke HRD. Catatan: "${storedNotes}".`
          : `Pengajuan ${target.leave_type_name} Anda (${dateRangeLabel}) telah disetujui Tahap 1 oleh Ketua Divisi ${sessionUser.fullName} dan diteruskan ke antrean Persetujuan Final HRD.`;

        await client.query(
          `
            INSERT INTO notifications (user_id, leave_request_id, title, message)
            VALUES ($1, $2, $3, $4);
          `,
          [
            target.user_id,
            validRequestId,
            "Disetujui Tahap 1 oleh Ketua Divisi",
            applicantMessage,
          ]
        );

        // 4b. Notifikasi ke seluruh akun HRD aktif (antrean Final Approval baru)
        const hrdMessage = `Pengajuan ${target.leave_type_name} milik ${target.applicant_name} (Divisi ${target.division_name || "-"}, ${dateRangeLabel}, ${totalDays.toFixed(1)} hari) telah diverifikasi Tahap 1 oleh ${sessionUser.fullName} dan menunggu Persetujuan Final HRD.`;

        await client.query(
          `
            INSERT INTO notifications (user_id, leave_request_id, title, message)
            SELECT u.id, $1, $2, $3
            FROM users u
            WHERE u.role = 'HRD'
              AND u.is_active = TRUE;
          `,
          [
            validRequestId,
            "Antrean Baru Persetujuan Final HRD",
            hrdMessage,
          ]
        );
      } else {
        // 4c. Notifikasi Penolakan ke Pemohon (beserta info Auto-Refund jika kuota dikembalikan)
        const refundNote =
          refundedDays > 0
            ? ` Saldo kuota cuti tahunan sebesar +${refundedDays.toFixed(1)} hari telah dikembalikan otomatis.`
            : "";

        await client.query(
          `
            INSERT INTO notifications (user_id, leave_request_id, title, message)
            VALUES ($1, $2, $3, $4);
          `,
          [
            target.user_id,
            validRequestId,
            "Pengajuan Cuti Ditolak Ketua Divisi",
            `Pengajuan ${target.leave_type_name} Anda (${dateRangeLabel}) ditolak oleh Ketua Divisi ${sessionUser.fullName}. Alasan: "${validNotes}".${refundNote}`,
          ]
        );
      }

      return {
        ok: true,
        status: 200,
        requestId: validRequestId,
        newStatus: isApprove ? "Approved by Leader" : "Rejected",
        applicantName: target.applicant_name,
        refundedDays,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    // Revalidasi cache seluruh halaman terdampak
    revalidatePath("/approvals/leader");
    revalidatePath("/approvals/hrd");
    revalidatePath("/dashboard");
    revalidatePath("/leaves");

    return txResult;
  } catch (error) {
    console.error("verifyByLeaderAction error:", error);
    return mapApprovalPgError(error);
  }
}
