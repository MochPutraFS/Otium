"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  validateHrdBulkApprovePayload,
  validateHrdDecisionPayload,
  validateLeaderVerificationPayload,
} from "@/lib/validators";
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

/**
 * Helper internal: memeriksa apakah baris pengajuan memenuhi syarat Antrean Final HRD (2 Jalur).
 * - Jalur 1: Karyawan berstatus 'Approved by Leader'
 * - Jalur 2: Ketua Divisi berstatus 'Pending'
 * @param {{ applicant_role: string, status: string }} row
 */
function isEligibleForHrdFinal(row) {
  return (
    (row.applicant_role === "Karyawan" &&
      row.status === "Approved by Leader") ||
    (row.applicant_role === "Ketua Divisi" && row.status === "Pending")
  );
}

/**
 * Server Action Modul 6B: Persetujuan Final Tunggal oleh HRD (`Approve` / `Reject`).
 *
 * Garda Keamanan & Integritas:
 * 1. Two-Layer RBAC: hanya `HRD` aktif (`requireRole(["HRD"])`).
 * 2. Validasi payload: `Approve` (catatan opsional), `Reject` (alasan wajib >= 5 karakter).
 * 3. Row Lock `SELECT ... FOR UPDATE OF lr` & Guard 2 Jalur (`Jalur 1` Karyawan `Approved by Leader`
 *    atau `Jalur 2` Ketua Divisi `Pending`).
 * 4. Auto-Refund Kuota Anti-Double-Refund (`Guard #4`):
 *    saat `Reject` dan `lr.quota_deducted = TRUE`, saldo `users.remaining_leave_quota`
 *    dikembalikan (`+ total_days`) dan `lr.quota_deducted` langsung diset `FALSE`.
 * 5. Dual-Persistence: update kolom jejak di `leave_requests` DAN insert audit log ke `leave_approvals` (stage 2).
 * 6. Notifikasi otomatis ke Pemohon dalam transaksi yang sama.
 *
 * @param {number|string} requestId
 * @param {"Approve"|"Reject"} action
 * @param {string} [notes=""]
 */
export async function verifyByHrdAction(requestId, action, notes = "") {
  try {
    const auth = await requireRole(["HRD"]);
    if (!auth.ok) {
      return {
        ok: false,
        status: auth.status,
        error: auth.error,
        fieldErrors: {},
      };
    }

    const sessionUser = auth.user;

    const validation = validateHrdDecisionPayload(requestId, action, notes);
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
      // 1. Lock baris leave_requests & cek role pemohon
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
            lt.name AS leave_type_name
          FROM leave_requests lr
          JOIN users u ON lr.user_id = u.id
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

      // Garda 2 Jalur Persetujuan Final HRD
      if (!isEligibleForHrdFinal(target)) {
        const hint =
          target.applicant_role === "Karyawan" && target.status === "Pending"
            ? "Pengajuan Karyawan ini masih menunggu Verifikasi Tahap 1 oleh Ketua Divisi."
            : `Pengajuan ini sudah berstatus "${target.status}" sehingga tidak dapat diproses ulang oleh HRD.`;

        return {
          ok: false,
          status: 409,
          error: hint,
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
        // 2A. Update status final menjadi 'Approved'
        await client.query(
          `
            UPDATE leave_requests
            SET status = 'Approved',
                hrd_approver_id = $2,
                hrd_approved_at = CURRENT_TIMESTAMP,
                hrd_notes = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1;
          `,
          [validRequestId, sessionUser.id, storedNotes]
        );
      } else {
        // 2B. Reject Final + Auto-Refund Kuota Anti-Double-Refund (Guard #4)
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

        await client.query(
          `
            UPDATE leave_requests
            SET status = 'Rejected',
                hrd_approver_id = $2,
                hrd_approved_at = CURRENT_TIMESTAMP,
                hrd_notes = $3,
                rejected_by_role = 'HRD',
                rejection_reason = $3,
                quota_deducted = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1;
          `,
          [validRequestId, sessionUser.id, validNotes]
        );
      }

      // 3. Dual-Persistence: Catat riwayat permanen ke tabel leave_approvals (Stage 2)
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
          VALUES ($1, $2, $3, 'HRD', 2, $4, $5, CURRENT_TIMESTAMP);
        `,
        [
          validRequestId,
          sessionUser.id,
          sessionUser.fullName,
          isApprove ? "Approved" : "Rejected",
          storedNotes,
        ]
      );

      // 4. Notifikasi otomatis ke Pemohon
      if (isApprove) {
        const noteSuffix = storedNotes ? ` Catatan HRD: "${storedNotes}".` : "";
        await client.query(
          `
            INSERT INTO notifications (user_id, leave_request_id, title, message)
            VALUES ($1, $2, $3, $4);
          `,
          [
            target.user_id,
            validRequestId,
            "Pengajuan Cuti Disetujui Final (HRD)",
            `Pengajuan ${target.leave_type_name} Anda (${dateRangeLabel}, ${totalDays.toFixed(1)} hari) telah disetujui final oleh HRD ${sessionUser.fullName}.${noteSuffix} Surat Cuti Resmi (PDF) kini tersedia untuk diunduh.`,
          ]
        );
      } else {
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
            "Pengajuan Cuti Ditolak HRD",
            `Pengajuan ${target.leave_type_name} Anda (${dateRangeLabel}) ditolak oleh HRD ${sessionUser.fullName}. Alasan: "${validNotes}".${refundNote}`,
          ]
        );
      }

      return {
        ok: true,
        status: 200,
        requestId: validRequestId,
        newStatus: isApprove ? "Approved" : "Rejected",
        applicantName: target.applicant_name,
        refundedDays,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/approvals/hrd");
    revalidatePath("/approvals/leader");
    revalidatePath("/dashboard");
    revalidatePath("/leaves");

    return txResult;
  } catch (error) {
    console.error("verifyByHrdAction error:", error);
    return mapApprovalPgError(error);
  }
}

/**
 * Server Action Modul 6B: Multi-Approve Checkbox oleh HRD (Bulk Approval Atomik).
 *
 * Menyetujui banyak pengajuan sekaligus dalam SATU transaksi `BEGIN ... COMMIT` (`All-or-Nothing`):
 * 1. Lock seluruh baris terpilih dengan `WHERE lr.id = ANY($1::int[]) ORDER BY lr.id ASC FOR UPDATE OF lr`.
 * 2. Verifikasi setiap ID ditemukan DAN memenuhi syarat Jalur 1 atau Jalur 2.
 *    Jika 1 saja tidak valid, transaksi batal tanpa mengubah satu baris pun (`409 Conflict`).
 * 3. Batch `UPDATE leave_requests` menjadi `'Approved'`.
 * 4. Batch `INSERT INTO leave_approvals` menggunakan `unnest($1::int[])` (Stage 2).
 * 5. Batch `INSERT INTO notifications` ke seluruh pemohon terdampak.
 *
 * @param {Array<number|string>} requestIds
 * @param {string} [notes=""]
 */
export async function bulkApproveByHrdAction(requestIds, notes = "") {
  try {
    const auth = await requireRole(["HRD"]);
    if (!auth.ok) {
      return {
        ok: false,
        status: auth.status,
        error: auth.error,
        fieldErrors: {},
      };
    }

    const sessionUser = auth.user;

    const validation = validateHrdBulkApprovePayload(requestIds, notes);
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
        fieldErrors: validation.fieldErrors || {},
      };
    }

    const { requestIds: validIds, notes: validNotes } = validation.data;
    const storedNotes = validNotes || "Disetujui massal (Multi-Approve) HRD.";

    const txResult = await withTransaction(async (client) => {
      // 1. Lock seluruh baris terpilih secara terurut (ORDER BY lr.id ASC mencegah deadlock)
      const lockRes = await client.query(
        `
          SELECT
            lr.id,
            lr.user_id,
            lr.total_days,
            lr.status,
            lr.is_half_day,
            TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date,
            u.full_name AS applicant_name,
            u.role AS applicant_role,
            lt.name AS leave_type_name
          FROM leave_requests lr
          JOIN users u ON lr.user_id = u.id
          JOIN leave_types lt ON lr.leave_type_id = lt.id
          WHERE lr.id = ANY($1::int[])
          ORDER BY lr.id ASC
          FOR UPDATE OF lr;
        `,
        [validIds]
      );

      // Garda All-or-Nothing #1: semua ID wajib eksis di DB
      if (lockRes.rowCount !== validIds.length) {
        return {
          ok: false,
          status: 409,
          error:
            "Sebagian pengajuan terpilih tidak ditemukan di database. Transaksi massal dibatalkan (All-or-Nothing). Muat ulang halaman lalu coba kembali.",
          fieldErrors: {},
        };
      }

      // Garda All-or-Nothing #2: setiap baris wajib memenuhi Jalur 1 atau Jalur 2
      const invalidRows = lockRes.rows.filter(
        (row) => !isEligibleForHrdFinal(row)
      );
      if (invalidRows.length > 0) {
        const sample = invalidRows[0];
        return {
          ok: false,
          status: 409,
          error: `Transaksi massal dibatalkan karena pengajuan milik ${sample.applicant_name} (#${sample.id}) sudah berstatus "${sample.status}". Muat ulang antrean untuk menyinkronkan data terbaru.`,
          fieldErrors: {},
        };
      }

      // 2. Batch Update leave_requests menjadi 'Approved'
      await client.query(
        `
          UPDATE leave_requests
          SET status = 'Approved',
              hrd_approver_id = $2,
              hrd_approved_at = CURRENT_TIMESTAMP,
              hrd_notes = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[]);
        `,
        [validIds, sessionUser.id, storedNotes]
      );

      // 3. Batch Dual-Persistence ke leave_approvals (Stage 2) via unnest
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
          SELECT
            unnest($1::int[]),
            $2,
            $3,
            'HRD',
            2,
            'Approved',
            $4,
            CURRENT_TIMESTAMP;
        `,
        [validIds, sessionUser.id, sessionUser.fullName, storedNotes]
      );

      // 4. Notifikasi otomatis ke seluruh pemohon dalam batch
      for (const row of lockRes.rows) {
        const dateRangeLabel = formatIndonesianDateRange(
          row.start_date,
          row.end_date,
          Boolean(row.is_half_day)
        );
        const totalDays = Number(row.total_days).toFixed(1);
        await client.query(
          `
            INSERT INTO notifications (user_id, leave_request_id, title, message)
            VALUES ($1, $2, $3, $4);
          `,
          [
            row.user_id,
            row.id,
            "Pengajuan Cuti Disetujui Final (HRD)",
            `Pengajuan ${row.leave_type_name} Anda (${dateRangeLabel}, ${totalDays} hari) telah disetujui final oleh HRD ${sessionUser.fullName}. Catatan HRD: "${storedNotes}". Surat Cuti Resmi (PDF) kini tersedia untuk diunduh.`,
          ]
        );
      }

      return {
        ok: true,
        status: 200,
        approvedCount: lockRes.rowCount,
        approvedIds: validIds,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/approvals/hrd");
    revalidatePath("/approvals/leader");
    revalidatePath("/dashboard");
    revalidatePath("/leaves");

    return txResult;
  } catch (error) {
    console.error("bulkApproveByHrdAction error:", error);
    return mapApprovalPgError(error);
  }
}
