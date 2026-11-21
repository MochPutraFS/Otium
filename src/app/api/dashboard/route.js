import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardDataForUser } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard
 * Mengembalikan data live dashboard sesuai role akun yang sedang login (Two-Layer RBAC).
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        {
          ok: false,
          status: 401,
          error: "Sesi tidak valid atau akun telah dinonaktifkan.",
        },
        { status: 401 }
      );
    }

    const { roleKey, data } = await getDashboardDataForUser(currentUser);

    return NextResponse.json(
      {
        ok: true,
        status: 200,
        roleKey,
        serverTodayIso: data.serverTodayIso || "",
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/dashboard] Gagal memuat data dashboard:", error);
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: "Terjadi kesalahan saat mengambil data dashboard dari database.",
      },
      { status: 500 }
    );
  }
}
