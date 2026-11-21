import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  buildClearSessionCookieOptions,
  requireRole,
} from "@/lib/auth";

/**
 * GET /api/divisions/[id]/colleagues
 * Mengambil daftar rekan aktif satu divisi (id <> session.id) untuk dropdown Handover.
 * RBAC: Karyawan, Ketua Divisi (hanya divisi miliknya sendiri), atau Admin.
 */
export async function GET(_request, context) {
  try {
    const auth = await requireRole(["Karyawan", "Ketua Divisi", "Admin"]);
    if (!auth.ok) {
      const response = NextResponse.json(
        { ok: false, status: auth.status, error: auth.error },
        { status: auth.status }
      );
      if (auth.status === 401) {
        response.cookies.set(
          SESSION_COOKIE_NAME,
          "",
          buildClearSessionCookieOptions()
        );
      }
      return response;
    }

    const resolvedParams = await context.params;
    const divisionId = Number(resolvedParams?.id);
    if (!Number.isInteger(divisionId) || divisionId <= 0) {
      return NextResponse.json(
        { ok: false, status: 400, error: "ID divisi tidak valid." },
        { status: 400 }
      );
    }

    // Resource ownership check: Karyawan & Ketua Divisi hanya boleh melihat rekan divisinya sendiri
    if (auth.user.role !== "Admin" && auth.user.divisionId !== divisionId) {
      return NextResponse.json(
        {
          ok: false,
          status: 403,
          error: "Anda hanya dapat mengakses daftar rekan pada divisi Anda sendiri.",
        },
        { status: 403 }
      );
    }

    const result = await query(
      `
        SELECT id, full_name, role
        FROM users
        WHERE division_id = $1
          AND is_active = TRUE
          AND id <> $2
        ORDER BY full_name ASC;
      `,
      [divisionId, auth.user.id]
    );

    return NextResponse.json(
      {
        ok: true,
        status: 200,
        colleagues: result.rows.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          role: row.role,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/divisions/[id]/colleagues error:", error);
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: "Gagal memuat daftar rekan satu divisi.",
      },
      { status: 500 }
    );
  }
}
