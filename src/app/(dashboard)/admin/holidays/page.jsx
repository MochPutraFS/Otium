import { redirect } from "next/navigation";
import AdminHolidaysClient from "@/components/admin/AdminHolidaysClient";
import { getCurrentUser } from "@/lib/auth";
import { getHolidaysWorkspaceData } from "@/lib/holiday-data";

export const metadata = {
  title: "Hari Libur & Cuti Bersama — Otium Sistem Manajemen Cuti Karyawan",
};

const ALLOWED_ROLES = ["Admin", "HRD"];

/**
 * Halaman Fase 2 (8.3): CRUD Hari Libur Nasional & Cuti Bersama (/admin/holidays).
 * Layer 2 RBAC: khusus Admin & HRD.
 */
export default async function AdminHolidaysPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (!ALLOWED_ROLES.includes(currentUser.role)) {
    redirect("/dashboard?error=unauthorized_role");
  }

  const workspaceData = await getHolidaysWorkspaceData();

  return (
    <AdminHolidaysClient
      initialHolidays={workspaceData.holidays}
      todayIso={workspaceData.todayIso}
      currentYear={workspaceData.currentYear}
      actorRole={currentUser.role}
    />
  );
}
