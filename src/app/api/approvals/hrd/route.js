import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getHrdApprovalWorkspaceData } from "@/lib/approval-data";
import { validateHrdApprovalQueryParams } from "@/lib/validators";

/**
 * GET /api/approvals/hrd
 * Mengembalikan data antrean Persetujuan Final HRD (Jalur 1 & Jalur 2) serta
 * seluruh pengajuan cuti perusahaan langsung dari PostgreSQL (Two-Layer RBAC: hanya role 'HRD').
 */
export async function GET(request) {
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

    if (currentUser.role !== "HRD") {
      return NextResponse.json(
        {
          ok: false,
          status: 403,
          error:
            "Akses ditolak. Endpoint ini khusus untuk pengguna ber-role HRD.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const validation = validateHrdApprovalQueryParams(searchParams);
    if (!validation.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: validation.status,
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const workspaceData = await getHrdApprovalWorkspaceData(
      currentUser.id,
      validation.data
    );

    if (!workspaceData) {
      return NextResponse.json(
        {
          ok: false,
          status: 401,
          error: "Akun HRD tidak aktif atau tidak ditemukan.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: 200,
        hrdProfile: workspaceData.hrdProfile,
        divisions: workspaceData.divisions,
        leaveTypes: workspaceData.leaveTypes,
        counts: workspaceData.counts,
        requests: workspaceData.requests,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/approvals/hrd error:", error);
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: "Gagal memuat daftar persetujuan final HRD.",
      },
      { status: 500 }
    );
  }
}
