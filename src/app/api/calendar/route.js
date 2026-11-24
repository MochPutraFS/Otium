import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getCompanyCalendarData } from "@/lib/calendar-data";

/**
 * GET /api/calendar
 * Mengembalikan jadwal cuti perusahaan (disaring tanpa dokumen/alasan sensitif),
 * hari libur, dan periode blackout untuk bulan & divisi tertentu.
 * Akses: Seluruh 4 role aktif.
 */
export async function GET(request) {
  try {
    const auth = await requireRole([
      "Admin",
      "Karyawan",
      "Ketua Divisi",
      "HRD",
    ]);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const data = await getCompanyCalendarData({
      year: searchParams.get("year") ? Number(searchParams.get("year")) : undefined,
      month: searchParams.get("month")
        ? Number(searchParams.get("month"))
        : undefined,
      divisionId: searchParams.get("divisionId") || "ALL",
      status: searchParams.get("status") || "ALL",
    });

    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat kalender cuti perusahaan." },
      { status: 500 }
    );
  }
}
