import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAvailableLeaders } from "@/lib/admin-divisions-data";

/**
 * GET /api/divisions/available-leaders?currentDivisionId=
 * Mengembalikan daftar pengguna aktif ber-role 'Ketua Divisi' yang belum memimpin
 * divisi mana pun (plus ketua divisi saat ini bila `currentDivisionId` diberikan).
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
    const currentDivisionId = searchParams.get("currentDivisionId");
    const leaders = await getAvailableLeaders(currentDivisionId);

    return NextResponse.json(
      {
        ok: true,
        leaders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/divisions/available-leaders error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Gagal memuat kandidat Ketua Divisi yang tersedia.",
      },
      { status: 500 }
    );
  }
}
