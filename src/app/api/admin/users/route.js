import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminUsersWorkspaceData } from "@/lib/admin-users-data";

/**
 * GET /api/admin/users
 * Mengembalikan daftar pengguna dan master divisi secara realtime dari PostgreSQL
 * dengan filter & sorting opsional via parameterized SQL.
 * Proteksi Two-Layer RBAC: hanya diizinkan untuk role 'Admin'.
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
    const data = await getAdminUsersWorkspaceData({
      search: searchParams.get("search") || "",
      role: searchParams.get("role") || "ALL",
      divisionId: searchParams.get("divisionId") || "ALL",
      status: searchParams.get("status") || "ALL",
      tenure: searchParams.get("tenure") || "ALL",
      sort: searchParams.get("sort") || "name_asc",
    });

    return NextResponse.json(
      {
        ok: true,
        users: data.users,
        divisions: data.divisions,
        todayIso: data.todayIso,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat daftar pengguna dari database." },
      { status: 500 }
    );
  }
}
