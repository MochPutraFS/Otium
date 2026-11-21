import { redirect } from "next/navigation";
import AdminLeaveTypesClient from "@/components/admin/AdminLeaveTypesClient";
import { getCurrentUser } from "@/lib/auth";
import { getAdminLeaveTypesWorkspaceData } from "@/lib/admin-leave-types-data";

export const metadata = {
  title: "Jenis Cuti Dinamis — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Halaman CMS Modul 4: Manajemen Jenis Cuti Dinamis (/admin/leave-types) — Pure Production.
 * Layer 2 RBAC: memverifikasi sesi aktif & role 'Admin' di PostgreSQL,
 * lalu memuat seluruh kategori jenis cuti beserta statistik & jumlah pemakaian.
 */
export default async function AdminLeaveTypesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (currentUser.role !== "Admin") {
    redirect("/dashboard?error=unauthorized_role");
  }

  const workspaceData = await getAdminLeaveTypesWorkspaceData();

  return (
    <AdminLeaveTypesClient
      initialLeaveTypes={workspaceData.leaveTypes}
      initialStats={workspaceData.stats}
    />
  );
}
