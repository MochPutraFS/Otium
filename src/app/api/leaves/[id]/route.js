import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLeaveRequestDetailById } from "@/lib/leave-request-data";
import { isPositiveInt } from "@/lib/validators";

/**
 * GET /api/leaves/[id]
 * Mengambil detail lengkap 1 pengajuan cuti beserta timeline persetujuan
 * dari tabel `leave_approvals` dengan Resource Ownership Guard:
 * pemilik pengajuan, Ketua Divisi divisinya, HRD, atau Admin.
 */
export async function GET(_request, context) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        {
          ok: false,
          status: 401,
          error: "Sesi tidak valid. Silakan login kembali.",
        },
        { status: 401 }
      );
    }

    const resolvedParams = await context.params;
    const rawId = resolvedParams?.id;
    if (!isPositiveInt(rawId)) {
      return NextResponse.json(
        {
          ok: false,
          status: 400,
          error: "ID pengajuan cuti tidak valid.",
        },
        { status: 400 }
      );
    }

    const result = await getLeaveRequestDetailById(Number(rawId), currentUser);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, status: result.status, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: 200,
        request: result.request,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/leaves/[id] error:", error);
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: "Gagal memuat detail pengajuan cuti.",
      },
      { status: 500 }
    );
  }
}
