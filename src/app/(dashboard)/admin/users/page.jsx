import { redirect } from "next/navigation";
import AdminUsersClient from "@/components/admin/AdminUsersClient";
import { getCurrentUser } from "@/lib/auth";
import { getAdminUsersWorkspaceData } from "@/lib/admin-users-data";

export const metadata = {
  title: "Manajemen Pengguna — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Halaman CMS Modul 1: Manajemen Pengguna (/admin/users) — Pure Production.
 * Menerapkan Layer 2 RBAC: memverifikasi ulang sesi aktif & role 'Admin' di PostgreSQL,
 * lalu memuat seluruh akun pengguna dan master divisi secara realtime dari database.
 */
export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (currentUser.role !== "Admin") {
    redirect("/dashboard?error=unauthorized_role");
  }

  const workspaceData = await getAdminUsersWorkspaceData();

  return (
    <AdminUsersClient
      initialUsers={workspaceData.users}
      divisions={workspaceData.divisions}
      currentAdminId={currentUser.id}
      todayIso={workspaceData.todayIso}
    />
  );
}
