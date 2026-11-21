import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderApprovalWorkspaceData } from "@/lib/approval-data";
import { validateLeaderApprovalQueryParams } from "@/lib/validators";

/**
 * GET /api/approvals/leader
 * Mengembalikan data antrean & riwayat verifikasi Tahap 1 milik divisi Ketua Divisi
 * secara langsung dari PostgreSQL (Two-Layer RBAC: hanya role 'Ketua Divisi').
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

    if (currentUser.role !== "Ketua Divisi") {
      return NextResponse.json(
        {
          ok: false,
          status: 403,
          error:
            "Akses ditolak. Endpoint ini khusus untuk pengguna ber-role Ketua Divisi.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const validation = validateLeaderApprovalQueryParams(searchParams);
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

    const workspaceData = await getLeaderApprovalWorkspaceData(
      currentUser.id,
      validation.data
    );

    if (!workspaceData) {
      return NextResponse.json(
        {
          ok: false,
          status: 401,
          error: "Akun Ketua Divisi tidak aktif atau tidak ditemukan.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: 200,
        leaderProfile: workspaceData.leaderProfile,
        counts: workspaceData.counts,
        leaveTypes: workspaceData.leaveTypes,
        requests: workspaceData.requests,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/approvals/leader error:", error);
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: "Gagal memuat daftar verifikasi cuti divisi.",
      },
      { status: 500 }
    );
  }
}
