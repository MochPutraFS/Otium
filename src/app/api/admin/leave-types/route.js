import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminLeaveTypesWorkspaceData } from "@/lib/admin-leave-types-data";

/**
 * GET /api/admin/leave-types
 * Mengembalikan seluruh jenis cuti dinamis beserta statistik & jumlah pemakaian
 * secara realtime dari PostgreSQL. Proteksi Two-Layer RBAC: khusus role 'Admin'.
 */
export async function GET() {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const data = await getAdminLeaveTypesWorkspaceData();

    return NextResponse.json(
      {
        ok: true,
        leaveTypes: data.leaveTypes,
        stats: data.stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/leave-types error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat daftar jenis cuti dari database." },
      { status: 500 }
    );
  }
}
