import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getLeaveHistoryWorkspaceData } from "@/lib/leave-request-data";
import { validateLeaveListQueryParams } from "@/lib/validators";

/**
 * GET /api/leaves
 * Mengembalikan daftar riwayat pengajuan cuti milik pemohon yang sedang login
 * dengan filter dinamis (status, leaveTypeId, dateFrom, dateTo, search, sortBy),
 * counter status, dan sisa kuota cuti tahunan realtime.
 */
export async function GET(request) {
  try {
    const auth = await requireRole(["Karyawan", "Ketua Divisi"]);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, status: auth.status, error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = validateLeaveListQueryParams(searchParams);
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, status: parsed.status, error: parsed.error },
        { status: parsed.status }
      );
    }

    const data = await getLeaveHistoryWorkspaceData(auth.user.id, parsed.data);
    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          status: 401,
          error: "Akun pengguna tidak aktif atau tidak ditemukan.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: 200,
        userProfile: data.userProfile,
        counts: data.counts,
        leaveTypes: data.leaveTypes,
        requests: data.requests,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/leaves error:", error);
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: "Gagal memuat daftar riwayat cuti dari server.",
      },
      { status: 500 }
    );
  }
}
