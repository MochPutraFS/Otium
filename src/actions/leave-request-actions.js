"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  calculateWorkingDays,
  formatIndonesianDateRange,
  validateSubmissionLeadTime,
} from "@/lib/date-utils";
import { validateLeaveRequestPayload } from "@/lib/validators";

/**
 * Menerjemahkan error constraint PostgreSQL pada tabel `leave_requests` / `notifications`
 * menjadi kontrak respons `{ ok, status, error, fieldErrors }`.
 * @param {any} error
 */
function mapLeaveRequestPgError(error) {
  if (!error) return null;

  if (error.code === "23503") {
    return {
      ok: false,
      status: 400,
      error: "Referensi jenis cuti atau rekan pengganti tidak valid.",
    };
  }

  if (error.code === "23514") {
    return {
      ok: false,
      status: 400,
      error: "Data pengajuan cuti melanggar batasan sistem (tanggal/durasi/kuota).",
    };
  }

  if (error.code === "22P02") {
    return {
      ok: false,
      status: 400,
      error: "Format parameter pengajuan cuti tidak valid.",
    };
  }

  return null;
}

/**
 * Modul 5 — Submit Pengajuan Cuti Baru (Karyawan & Ketua Divisi).
 * Menjalankan seluruh 8 Garda Validasi secara berurutan di dalam transaksi atomik
 * (`withTransaction` + `SELECT ... FOR UPDATE`), memotong/hold kuota tahunan jika
 * `deducts_annual_quota = TRUE`, menyimpan `leave_requests`, dan mengirim notifikasi
 * otomatis ke rekan pengganti (`notifications`).
 * @param {object} payload
 */
export async function submitLeaveRequestAction(payload) {
  try {
    // Garda 1: Autentikasi & Otorisasi Role (Two-Layer RBAC)
    const auth = await requireRole(["Karyawan", "Ketua Divisi"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    // Garda 2 (Bagian A): Validasi kelengkapan field & sanitasi dasar
    const validation = validateLeaveRequestPayload(payload);
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      };
    }

    const data = validation.data;

    if (data.handoverUserId === auth.user.id) {
      return {
        ok: false,
        status: 400,
        error: "Anda tidak dapat menunjuk diri sendiri sebagai rekan pengganti.",
        fieldErrors: {
          handoverUserId: "Pilih rekan lain dari divisi yang sama.",
        },
      };
    }

    const txResult = await withTransaction(async (client) => {
      // 1. Row Lock baris user pemohon untuk mencegah race condition kuota & overlap
      const userRes = await client.query(
        `
          SELECT
            id,
            full_name,
            role,
            division_id,
            remaining_leave_quota,
            TO_CHAR(join_date, 'YYYY-MM-DD') AS join_date,
            TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_today,
            (CURRENT_DATE >= (join_date + INTERVAL '1 year')::date) AS is_eligible_annual_leave
          FROM users
          WHERE id = $1
            AND is_active = TRUE
          FOR UPDATE;
        `,
        [auth.user.id]
      );

      if (userRes.rowCount === 0) {
        return {
          ok: false,
          status: 401,
          error: "Akun pengguna tidak aktif atau tidak ditemukan.",
        };
      }

      const applicant = userRes.rows[0];

      if (!applicant.division_id) {
        return {
          ok: false,
          status: 400,
          error:
            "Akun Anda belum tergabung dalam divisi mana pun. Hubungi Administrator sebelum mengajukan cuti.",
        };
      }

      // 2. Ambil aturan jenis cuti aktif dari database
      const leaveTypeRes = await client.query(
        `
          SELECT
            id,
            code,
            name,
            max_quota,
            min_submission_days,
            requires_attachment,
            deducts_annual_quota,
            requires_min_one_year_tenure
          FROM leave_types
          WHERE id = $1
            AND is_active = TRUE
          LIMIT 1;
        `,
        [data.leaveTypeId]
      );

      if (leaveTypeRes.rowCount === 0) {
        return {
          ok: false,
          status: 400,
          error: "Jenis cuti yang dipilih tidak tersedia atau sudah dinonaktifkan.",
          fieldErrors: {
            leaveTypeId: "Pilih jenis cuti yang masih aktif.",
          },
        };
      }

      const leaveType = leaveTypeRes.rows[0];

      // Garda 2 (Bagian B): Validasi rekan handover aktif di divisi yang sama
      const handoverRes = await client.query(
        `
          SELECT id, full_name
          FROM users
          WHERE id = $1
            AND division_id = $2
            AND is_active = TRUE
            AND id <> $3
          LIMIT 1;
        `,
        [data.handoverUserId, applicant.division_id, applicant.id]
      );

      if (handoverRes.rowCount === 0) {
        return {
          ok: false,
          status: 400,
          error:
            "Rekan pengganti harus merupakan pengguna aktif dari divisi yang sama.",
          fieldErrors: {
            handoverUserId: "Pilih rekan aktif dari divisi Anda sendiri.",
          },
        };
      }

      const handoverUser = handoverRes.rows[0];

      // Garda 3: Rekalkulasi hari kerja efektif di server (exclude Sabtu, Minggu, & holidays)
      const holidaysRes = await client.query(
        `
          SELECT TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date
          FROM holidays
          WHERE is_active = TRUE
            AND holiday_date BETWEEN $1::date AND $2::date;
        `,
        [data.startDate, data.endDate]
      );
      const holidayDates = holidaysRes.rows.map((h) => h.holiday_date);

      const totalDays = calculateWorkingDays(
        data.startDate,
        data.endDate,
        data.isHalfDay,
        holidayDates
      );

      if (totalDays <= 0) {
        const msg = data.isHalfDay
          ? "Cuti 0.5 hari harus jatuh pada hari kerja aktif (Senin–Jumat, bukan hari libur)."
          : "Rentang tanggal yang dipilih hanya berisi akhir pekan atau hari libur nasional.";
        return {
          ok: false,
          status: 400,
          error: msg,
          fieldErrors: { startDate: msg },
        };
      }

      // Garda 4: Cek syarat masa kerja minimal 1 tahun (untuk Cuti Tahunan / flag tenure)
      if (
        Boolean(leaveType.requires_min_one_year_tenure) &&
        !Boolean(applicant.is_eligible_annual_leave)
      ) {
        return {
          ok: false,
          status: 400,
          error:
            "Anda belum memenuhi syarat masa kerja minimal 1 tahun untuk mengajukan Cuti Tahunan.",
          fieldErrors: {
            leaveTypeId:
              "Masa kerja < 1 tahun belum eligible untuk Cuti Tahunan.",
          },
        };
      }

      // Garda 5: Cek batas waktu pengajuan (H-3 Tahunan, H-0..H+3 Sakit, dinamis lainnya)
      const leadCheck = validateSubmissionLeadTime(
        data.startDate,
        applicant.server_today,
        leaveType.code,
        Number(leaveType.min_submission_days),
        leaveType.name
      );

      if (!leadCheck.valid) {
        return {
          ok: false,
          status: 400,
          error: leadCheck.message,
          fieldErrors: { startDate: leadCheck.message },
        };
      }

      // Garda 6: Cek lampiran dokumen wajib (Surat Dokter / dokumen pendukung)
      if (Boolean(leaveType.requires_attachment) && !data.attachmentUrl) {
        return {
          ok: false,
          status: 400,
          error:
            "Wajib mengunggah Surat Dokter atau lampiran pendukung untuk jenis cuti ini.",
          fieldErrors: {
            attachmentUrl: "Lampiran pendukung wajib diunggah (PDF, JPG, PNG).",
          },
        };
      }

      // Garda 7: Cek bentrok tanggal (Anti-Overlap terhadap status aktif)
      const overlapRes = await client.query(
        `
          SELECT
            id,
            TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
            status
          FROM leave_requests
          WHERE user_id = $1
            AND status IN ('Pending', 'Approved by Leader', 'Approved')
            AND start_date <= $3::date
            AND end_date >= $2::date
          LIMIT 1;
        `,
        [applicant.id, data.startDate, data.endDate]
      );

      if (overlapRes.rowCount > 0) {
        const conflict = overlapRes.rows[0];
        const rangeLabel = formatIndonesianDateRange(
          conflict.start_date,
          conflict.end_date
        );
        const msg = `Tanggal pengajuan bentrok dengan jadwal cuti aktif Anda pada ${rangeLabel} (${conflict.status}).`;
        return {
          ok: false,
          status: 409,
          error: msg,
          fieldErrors: { startDate: msg },
        };
      }

      // Garda 8: Cek kecukupan kuota & hold kuota tahunan secara atomik
      const deductsAnnualQuota = Boolean(leaveType.deducts_annual_quota);
      const currentQuota = Number(applicant.remaining_leave_quota);
      const maxQuota = Number(leaveType.max_quota);
      let updatedRemainingQuota = currentQuota;

      if (deductsAnnualQuota) {
        if (totalDays > currentQuota) {
          return {
            ok: false,
            status: 400,
            error: `Sisa kuota cuti tahunan Anda (${currentQuota.toFixed(1)} hari) tidak mencukupi untuk pengajuan ${totalDays.toFixed(1)} hari.`,
          };
        }

        const deductRes = await client.query(
          `
            UPDATE users
            SET remaining_leave_quota = remaining_leave_quota - $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND remaining_leave_quota >= $2
            RETURNING remaining_leave_quota;
          `,
          [applicant.id, totalDays]
        );

        if (deductRes.rowCount === 0) {
          return {
            ok: false,
            status: 409,
            error: "Sisa kuota cuti tahunan Anda tidak mencukupi.",
          };
        }

        updatedRemainingQuota = Number(deductRes.rows[0].remaining_leave_quota);
      } else if (totalDays > maxQuota) {
        return {
          ok: false,
          status: 400,
          error: `Durasi ${totalDays.toFixed(1)} hari melebihi batas maksimal ${leaveType.name} (${maxQuota.toFixed(1)} hari).`,
        };
      }

      // Simpan transaksi pengajuan cuti
      const insertReqRes = await client.query(
        `
          INSERT INTO leave_requests (
            user_id,
            leave_type_id,
            is_half_day,
            submission_date,
            start_date,
            end_date,
            total_days,
            reason,
            handover_user_id,
            handover_notes,
            attachment_url,
            leave_address,
            emergency_phone,
            status,
            quota_deducted
          )
          VALUES (
            $1, $2, $3, CURRENT_DATE,
            $4::date, $5::date, $6, $7,
            $8, $9, $10,
            $11, $12, 'Pending', $13
          )
          RETURNING id, TO_CHAR(submission_date, 'YYYY-MM-DD') AS submission_date;
        `,
        [
          applicant.id,
          leaveType.id,
          data.isHalfDay,
          data.startDate,
          data.endDate,
          totalDays,
          data.reason,
          handoverUser.id,
          data.handoverNotes,
          data.attachmentUrl,
          data.leaveAddress,
          data.emergencyPhone,
          deductsAnnualQuota,
        ]
      );

      const createdRequest = insertReqRes.rows[0];
      const periodLabel = formatIndonesianDateRange(
        data.startDate,
        data.endDate,
        data.isHalfDay
      );
      const notifMessage = `${applicant.full_name} menunjuk Anda sebagai rekan pengganti selama ${leaveType.name} (${periodLabel}, ${totalDays.toFixed(1)} hari). Catatan tugas: ${data.handoverNotes}`;

      // Kirim notifikasi handover otomatis ke rekan pengganti
      await client.query(
        `
          INSERT INTO notifications (
            user_id,
            leave_request_id,
            title,
            message
          )
          VALUES ($1, $2, $3, $4);
        `,
        [
          handoverUser.id,
          createdRequest.id,
          "Penunjukan Rekan Pengganti (Handover)",
          notifMessage,
        ]
      );

      return {
        ok: true,
        status: 201,
        requestId: createdRequest.id,
        submissionDate: createdRequest.submission_date,
        totalDays,
        remainingLeaveQuota: updatedRemainingQuota,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/leaves");
    revalidatePath("/leaves/new");
    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath("/approvals/leader");
    revalidatePath("/approvals/hrd");

    return txResult;
  } catch (error) {
    const mapped = mapLeaveRequestPgError(error);
    if (mapped) return mapped;

    console.error("submitLeaveRequestAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat menyimpan pengajuan cuti. Silakan coba lagi.",
    };
  }
}
