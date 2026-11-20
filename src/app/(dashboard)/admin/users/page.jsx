import AdminUsersClient from "@/components/admin/AdminUsersClient";
import AdminRoleGuardNotice from "@/components/admin/AdminRoleGuardNotice";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";

export const metadata = {
  title: "Manajemen Pengguna — Otium Sistem Manajemen Cuti Karyawan",
};

// Halaman CMS Modul 1: Manajemen Pengguna — Khusus Admin (/admin/users)
export default async function AdminUsersPage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  if (activeUser.role !== "Admin") {
    return (
      <AdminRoleGuardNotice
        currentRoleName={activeUser.role}
        currentRoleKey={previewRoleKey}
        targetPath="/admin/users"
        moduleTitle="Manajemen Pengguna"
      />
    );
  }

  return <AdminUsersClient />;
}
