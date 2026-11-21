import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  buildClearSessionCookieOptions,
  requireRole,
} from "@/lib/auth";
import {
  calculateWorkingDays,
  formatIndonesianDateRange,
  getHolidaysInRange,
  validateSubmissionLeadTime,
} from "@/lib/date-utils";
import { validateAvailabilityPayload } from "@/lib/validators";

/**
 * POST /api/leaves/check-availability
 * Kalkulasi hari kerja efektif di server, validasi masa kerja 1 tahun,
 * batas waktu H-3/H+3, anti-overlap tanggal, dan simulasi kuota What-If.
 * RBAC: Khusus Karyawan & Ketua Divisi.
 */
export async function POST(request) {
  try {
    const auth = await requireRole(["Karyawan", "Ketua Divisi"]);
    if (!auth.ok) {
      const response = NextResponse.json(
        { ok: false, status: auth.status, error: auth.error },
        { status: auth.status }
      );
      if (auth.status === 401) {
        response.cookies.set(
          SESSION_COOKIE_NAME,
          "",
          buildClearSessionCookieOptions()
        );
      }
      return response;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, status: 400, error: "Body request harus berupa JSON yang valid." },
        { status: 400 }
      );
    }

    const validation = validateAvailabilityPayload(body);
    if (!validation.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: validation.status,
          error: validation.error,
          fieldErrors: validation.fieldErrors,
        },
        { status: validation.status }
      );
    }

    const { leaveTypeId, isHalfDay, startDate, endDate } = validation.data;

    const [userRes, leaveTypeRes, holidaysRes, overlapRes] = await Promise.all([
      query(
        `
          SELECT
            id,
            division_id,
            initial_leave_quota,
            remaining_leave_quota,
            TO_CHAR(join_date, 'YYYY-MM-DD') AS join_date,
            TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_today,
            (CURRENT_DATE >= (join_date + INTERVAL '1 year')::date) AS is_eligible_annual_leave
          FROM users
          WHERE id = $1 AND is_active = TRUE
          LIMIT 1;
        `,
        [auth.user.id]
      ),
      query(
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
          WHERE id = $1 AND is_active = TRUE
          LIMIT 1;
        `,
        [leaveTypeId]
      ),
      query(
        `
          SELECT
            TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date,
            name,
            holiday_type
          FROM holidays
          WHERE is_active = TRUE
            AND holiday_date BETWEEN $1::date AND $2::date
          ORDER BY holiday_date ASC;
        `,
        [startDate, endDate]
      ),
      query(
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
          ORDER BY start_date ASC
          LIMIT 1;
        `,
        [auth.user.id, startDate, endDate]
      ),
    ]);

    const userRow = userRes.rows[0];
    if (!userRow) {
      return NextResponse.json(
        { ok: false, status: 401, error: "Akun pengguna tidak aktif atau tidak ditemukan." },
        { status: 401 }
      );
    }

    const leaveType = leaveTypeRes.rows[0];
    if (!leaveType) {
      return NextResponse.json(
        {
          ok: false,
          status: 404,
          error: "Jenis cuti tidak ditemukan atau sudah dinonaktifkan.",
          fieldErrors: { leaveTypeId: "Jenis cuti tidak tersedia." },
        },
        { status: 404 }
      );
    }

    const holidays = holidaysRes.rows.map((h) => ({
      holidayDate: h.holiday_date,
      name: h.name,
      holidayType: h.holiday_type,
    }));
    const holidayDateList = holidays.map((h) => h.holidayDate);

    const totalWorkingDays = calculateWorkingDays(
      startDate,
      endDate,
      isHalfDay,
      holidayDateList
    );
    const holidayHits = getHolidaysInRange(startDate, endDate, holidays);

    const isEligibleAnnual = Boolean(userRow.is_eligible_annual_leave);
    const requiresMinOneYearTenure = Boolean(
      leaveType.requires_min_one_year_tenure
    );
    const isTenureEligible = !requiresMinOneYearTenure || isEligibleAnnual;

    const leadCheck = validateSubmissionLeadTime(
      startDate,
      userRow.server_today,
      leaveType.code,
      Number(leaveType.min_submission_days),
      leaveType.name
    );

    const overlapRow = overlapRes.rows[0] || null;
    const hasOverlap = Boolean(overlapRow);
    const overlapRange = overlapRow
      ? formatIndonesianDateRange(overlapRow.start_date, overlapRow.end_date)
      : null;

    const currentQuota = Number(userRow.remaining_leave_quota);
    const initialQuota = Number(userRow.initial_leave_quota);
    const maxQuota = Number(leaveType.max_quota);
    const deductsAnnualQuota = Boolean(leaveType.deducts_annual_quota);
    const estimatedRemainingQuota = deductsAnnualQuota
      ? Number((currentQuota - totalWorkingDays).toFixed(1))
      : currentQuota;

    const errors = [];
    let inlineDateError = "";

    if (!isTenureEligible) {
      errors.push(
        "Anda belum memenuhi syarat masa kerja minimal 1 tahun untuk mengajukan Cuti Tahunan."
      );
    }

    if (totalWorkingDays <= 0) {
      inlineDateError = isHalfDay
        ? "Cuti 0.5 hari harus jatuh pada hari kerja aktif (Senin–Jumat, bukan hari libur)."
        : "Rentang tanggal yang dipilih hanya berisi akhir pekan atau hari libur nasional.";
      errors.push(inlineDateError);
    } else if (!leadCheck.valid) {
      inlineDateError = leadCheck.message;
      errors.push(leadCheck.message);
    }

    if (hasOverlap) {
      const overlapMsg = `Tanggal bentrok (overlap) dengan pengajuan cuti aktif Anda pada ${overlapRange} (${overlapRow.status}).`;
      inlineDateError = overlapMsg;
      errors.push(overlapMsg);
    }

    if (deductsAnnualQuota) {
      if (totalWorkingDays > currentQuota) {
        errors.push(
          `Sisa kuota cuti tahunan Anda (${currentQuota.toFixed(1)} hari) tidak mencukupi untuk pengajuan ${totalWorkingDays.toFixed(1)} hari.`
        );
      }
    } else if (totalWorkingDays > maxQuota) {
      errors.push(
        `Durasi ${totalWorkingDays.toFixed(1)} hari melebihi batas maksimal ${leaveType.name} (${maxQuota.toFixed(1)} hari).`
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: 200,
        serverToday: userRow.server_today,
        totalWorkingDays,
        holidayHits,
        isTenureEligible,
        isLeadTimeValid: leadCheck.valid,
        leadTimeMessage: leadCheck.message,
        hasOverlap,
        overlapRange,
        currentQuota,
        initialQuota,
        maxQuota,
        deductsAnnualQuota,
        estimatedRemainingQuota,
        inlineDateError,
        errors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/leaves/check-availability error:", error);
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: "Terjadi kesalahan saat memverifikasi ketersediaan tanggal cuti.",
      },
      { status: 500 }
    );
  }
}
