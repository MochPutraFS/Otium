import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminDivisionMembersWorkspaceData } from "@/lib/admin-divisions-data";

/**
 * GET /api/admin/division-members?divisionId=
 * Mengembalikan daftar divisi, seluruh anggota divisi, dan kandidat karyawan aktif
 * untuk workspace CMS Modul 3 (/admin/division-members) secara realtime dari PostgreSQL.
 * Proteksi Two-Layer RBAC: khusus role 'Admin'.
 */
export async function GET(request) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedDivisionId = searchParams.get("divisionId");
    const data = await getAdminDivisionMembersWorkspaceData(requestedDivisionId);

    return NextResponse.json(
      {
        ok: true,
        divisions: data.divisions,
        users: data.users,
        initialSelectedDivisionId: data.initialSelectedDivisionId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/division-members error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat data anggota divisi dari database." },
      { status: 500 }
    );
  }
}
