import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getHolidaysWorkspaceData } from "@/lib/holiday-data";

/**
 * GET /api/admin/holidays
 * Mengembalikan daftar Hari Libur Nasional & Cuti Bersama secara realtime dari PostgreSQL.
 * Proteksi Two-Layer RBAC: hanya Admin & HRD.
 */
export async function GET(request) {
  try {
    const auth = await requireRole(["Admin", "HRD"]);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const data = await getHolidaysWorkspaceData({
      search: searchParams.get("search") || "",
      year: searchParams.get("year") || "ALL",
      type: searchParams.get("type") || "ALL",
      status: searchParams.get("status") || "ALL",
    });

    return NextResponse.json(
      {
        ok: true,
        holidays: data.holidays,
        todayIso: data.todayIso,
        currentYear: data.currentYear,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/holidays error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat daftar hari libur dari database." },
      { status: 500 }
    );
  }
}
