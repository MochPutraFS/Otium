import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getPoliciesWorkspaceData } from "@/lib/policy-data";

/**
 * GET /api/admin/policies
 * Mengembalikan daftar Periode Blackout dan konfigurasi batas kapasitas tim divisi.
 * RBAC: Khusus Admin & HRD.
 */
export async function GET() {
  try {
    const auth = await requireRole(["Admin", "HRD"]);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const data = await getPoliciesWorkspaceData();
    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/policies error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat kebijakan blackout & kapasitas tim." },
      { status: 500 }
    );
  }
}
