import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminDivisionsWorkspaceData } from "@/lib/admin-divisions-data";

/**
 * GET /api/admin/divisions
 * Mengembalikan daftar divisi, metadata Ketua Divisi, daftar anggota per divisi,
 * dan daftar kandidat Ketua Divisi yang tersedia secara realtime dari PostgreSQL.
 * Proteksi Two-Layer RBAC: khusus role 'Admin'.
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

    const data = await getAdminDivisionsWorkspaceData();

    return NextResponse.json(
      {
        ok: true,
        divisions: data.divisions,
        availableLeaders: data.availableLeaders,
        stats: data.stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/divisions error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat daftar divisi dari database." },
      { status: 500 }
    );
  }
}
